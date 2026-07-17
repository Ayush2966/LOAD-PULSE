import { create } from 'zustand'
import type { ParsedCurl, ChartPoint, TputPoint, LogEntry, FailureGroup, TestConfig, PatternType, ReportData } from '../lib/types'
import { getRps, getDurationMs, getConcur, getTimeout } from '../lib/loadPatterns'
import { fireRequest, makeSemaphore, scheduleBurst } from '../lib/fetcher'
import { resetUniqueVars } from '../lib/variableInjector'
import { percentile, percentileSorted } from '../lib/percentile'
import { pushTputPoint } from '../lib/tputPoints'
import { RingBuffer } from '../lib/ringBuffer'

/**
 * Most recent latency points kept for the live chart. Older points are dropped
 * so a high-rps or long-running test can't grow the buffer without bound.
 */
const CHART_MAX_PTS = 2000
/** Most recent request-log rows kept for the live feed (newest first). */
const LOG_MAX_ROWS = 150

interface TestStats {
  sent: number
  ok: number
  fail: number
  /** Requests dropped because the endpoint couldn't keep up with the target rate. */
  skipped: number
  codes: Record<number, number>
}

interface TestState {
  running: boolean
  stopped: boolean
  status: 'idle' | 'running' | 'done' | 'stopped' | 'threshold'
  stats: TestStats
  chartPts: ChartPoint[]
  tputPts: TputPoint[]
  logBuf: LogEntry[]
  failures: Record<string, FailureGroup>
  startTime: number
  totalMs: number
  progressPct: number
  report: ReportData | null
  thresholdMsg: string
  elapsedSec: number
  actualRps: string
  livePercentiles: { p50: number; p95: number; p99: number } | null

  startTest: (cfg: TestConfig, pattern: PatternType) => void
  stopTest: (reason: 'manual' | 'done' | 'threshold') => void
  reset: () => void
}

const emptyStats = (): TestStats => ({ sent: 0, ok: 0, fail: 0, skipped: 0, codes: {} })

export const useTestStore = create<TestState>((set, get) => {
  let tickH: ReturnType<typeof setInterval> | null = null
  let timerH: ReturnType<typeof setTimeout> | null = null
  let uiH: ReturnType<typeof setInterval> | null = null
  let stopController: AbortController | null = null
  let accum = 0
  let lastTputSec = -1
  let tputSecCount = 0
  let runPattern: PatternType = 'constant'
  // Set by startTest so stopTest can force a final flush of the pending buffers
  // (see startTest for why per-request results are buffered rather than committed).
  let flushUi: ((final: boolean) => void) | null = null

  function clearHandles() {
    if (tickH) { clearInterval(tickH); tickH = null }
    if (timerH) { clearTimeout(timerH); timerH = null }
    if (uiH) { clearInterval(uiH); uiH = null }
  }

  function buildReport(state: TestState): ReportData {
    const lats = state.chartPts.map(p => p.lat)
    const { ok, fail, sent } = state.stats
    const elapsed = ((Date.now() - state.startTime) / 1000).toFixed(2)
    const sr = sent ? (ok / sent * 100).toFixed(1) : '0.0'
    const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0
    const p95 = percentile(lats, 95)
    const p99 = percentile(lats, 99)
    const maxL = lats.length ? Math.max(...lats) : 0
    const rps = (sent / Math.max(0.1, parseFloat(elapsed))).toFixed(2)
    const parsed = (state as unknown as { _parsed: ParsedCurl })._parsed
    return {
      meta: { url: parsed?.url ?? '', method: parsed?.method ?? '', pattern: runPattern, elapsed, rps, total: sent, ok, fail, successRate: sr, avgLatMs: avg, p95Ms: p95, p99Ms: p99, maxLatMs: maxL },
      failures: state.failures,
    }
  }

  return {
    running: false,
    stopped: false,
    status: 'idle',
    stats: emptyStats(),
    chartPts: [],
    tputPts: [],
    logBuf: [],
    failures: {},
    startTime: 0,
    totalMs: 0,
    progressPct: 0,
    report: null,
    thresholdMsg: '',
    elapsedSec: 0,
    actualRps: '—',
    livePercentiles: null,

    reset() {
      clearHandles()
      stopController?.abort()
      flushUi = null
      set({
        running: false, stopped: false, status: 'idle',
        stats: emptyStats(), chartPts: [], tputPts: [], logBuf: [],
        failures: {}, startTime: 0, totalMs: 0, progressPct: 0,
        report: null, thresholdMsg: '', elapsedSec: 0, actualRps: '—',
        livePercentiles: null,
      })
    },

    startTest(cfg, pattern) {
      clearHandles()
      stopController?.abort()
      stopController = new AbortController()
      accum = 0; lastTputSec = -1; tputSecCount = 0; runPattern = pattern
      resetUniqueVars()

      const totalMs = getDurationMs(pattern, cfg)
      const concur = getConcur(pattern, cfg)
      const timeout = getTimeout(pattern, cfg)
      const sem = makeSemaphore(concur)
      const startTime = Date.now()

      // stash parsed for report
      ;(get() as unknown as Record<string, unknown>)._parsed = cfg.parsed

      set({
        running: true, stopped: false, status: 'running',
        stats: emptyStats(), chartPts: [], tputPts: [], logBuf: [],
        failures: {}, startTime, totalMs, progressPct: 0,
        report: null, thresholdMsg: '', livePercentiles: null,
      })

      const signal = stopController.signal

      // Per-request results are accumulated into these mutable buffers and
      // committed to the store on the 250ms UI tick (~4x/s) rather than via a
      // set() per completed request. At high rps that collapses hundreds of full
      // Run re-renders per second — each redrawing both canvases and 150 log
      // rows — down to ~4, and drops the O(n) chartPts spread-copy per request.
      const statsBuf: TestStats = emptyStats()
      const chartRing = new RingBuffer<ChartPoint>(CHART_MAX_PTS)
      const logRing: LogEntry[] = [] // newest first, capped at LOG_MAX_ROWS
      const failuresBuf: Record<string, FailureGroup> = {}
      let tputBuf: TputPoint[] = []
      let thresholdMsg = ''
      let thresholdFired = false
      let uiDirty = false   // stats/chart/log changed since the last flush
      let tputDirty = false // a throughput point was added since the last flush

      const doFlush = (final: boolean) => {
        const el = Date.now() - startTime
        const patch: Partial<TestState> = {
          elapsedSec: Math.floor(el / 1000),
          actualRps: (statsBuf.sent / Math.max(0.1, el / 1000)).toFixed(1),
          progressPct: Math.min(100, el / totalMs * 100),
        }

        // On stop, close out the in-progress second as a final throughput point
        // (mirrors the per-second rollover in the tick below).
        if (final && lastTputSec >= 0 && tputSecCount > 0) {
          tputBuf = pushTputPoint(tputBuf, { t: lastTputSec * 1000, rps: tputSecCount })
          tputSecCount = 0
          tputDirty = true
        }

        if (uiDirty || final) {
          const chartPts = chartRing.toArray()
          patch.stats = { ...statsBuf, codes: { ...statsBuf.codes } }
          patch.chartPts = chartPts
          patch.logBuf = logRing.slice()
          // Percentiles are derived here (~4/sec) rather than in LiveStats'
          // render: one sort per flush replaces re-sorting on every re-render.
          if (chartPts.length > 10) {
            const sorted = chartPts.map(p => p.lat).sort((a, b) => a - b)
            patch.livePercentiles = {
              p50: percentileSorted(sorted, 50),
              p95: percentileSorted(sorted, 95),
              p99: percentileSorted(sorted, 99),
            }
          }
          uiDirty = false
        }

        if (tputDirty || final) {
          patch.tputPts = tputBuf.slice()
          tputDirty = false
        }

        // failures aren't shown live (only in the final report), so committing
        // them once on stop is enough — buildReport reads this snapshot.
        if (final) patch.failures = { ...failuresBuf }
        if (thresholdMsg) patch.thresholdMsg = thresholdMsg
        set(patch)
      }
      flushUi = doFlush

      async function fireOne() {
        if (get().stopped) return
        await sem.acquire()
        if (get().stopped) { sem.release(); return }

        const result = await fireRequest(
          cfg.parsed, timeout,
          cfg.scMin, cfg.scMax,
          cfg.latThreshOn, cfg.latThresh,
          cfg.bodyCheckOn, cfg.bodyCheck,
          cfg.captureBody, signal,
        )
        sem.release()

        statsBuf.sent++
        if (result.ok) statsBuf.ok++
        else statsBuf.fail++
        if (result.status !== null) {
          statsBuf.codes[result.status] = (statsBuf.codes[result.status] || 0) + 1
        }

        const tStr = ((Date.now() - startTime) / 1000).toFixed(2) + 's'
        logRing.unshift({ t: tStr, ok: result.ok, status: result.status, lat: result.lat, msg: result.msg })
        if (logRing.length > LOG_MAX_ROWS) logRing.pop()

        chartRing.push({ t: Date.now() - startTime, lat: result.lat, ok: result.ok })

        if (!result.ok) {
          const key = result.reason
          let g = failuresBuf[key]
          if (!g) { g = { count: 0, type: result.badgeType, status: result.status, bodies: [] }; failuresBuf[key] = g }
          g.count++
          if (result.bodyText && g.bodies.length < 2) g.bodies.push(result.bodyText)
        }

        uiDirty = true
        tputSecCount++

        // Error-rate threshold: checked per request on the buffered stats so
        // auto-stop stays responsive instead of waiting for the next flush.
        if (cfg.errStopOn && !thresholdFired && statsBuf.sent >= 10) {
          const rate = statsBuf.fail / statsBuf.sent * 100
          if (rate > cfg.errStopPct) {
            thresholdFired = true
            thresholdMsg = `Auto-stopped: error rate ${rate.toFixed(1)}% exceeded ${cfg.errStopPct}% threshold`
            setTimeout(() => get().stopTest('threshold'), 0)
          }
        }
      }

      // tick every 100ms
      accum = getRps(pattern, 0, totalMs, cfg) * 0.1
      tickH = setInterval(() => {
        if (get().stopped) return
        const el = Date.now() - startTime
        const rps = getRps(pattern, el, totalMs, cfg)
        accum += rps * 0.1
        const n = Math.floor(accum); accum -= n
        // backpressure: never schedule more than the semaphore can hold, so a
        // slow endpoint (or a backgrounded tab) can't build an unbounded backlog
        // of unstarted requests. Dropped requests are surfaced as "skipped".
        const skipped = scheduleBurst(sem, n, fireOne)
        if (skipped > 0) { statsBuf.skipped += skipped; uiDirty = true }

        const sec = Math.floor(el / 1000)
        if (sec !== lastTputSec) {
          if (lastTputSec >= 0 && tputSecCount > 0) {
            tputBuf = pushTputPoint(tputBuf, { t: lastTputSec * 1000, rps: tputSecCount })
            tputDirty = true
          }
          lastTputSec = sec; tputSecCount = 0
        }
      }, 100)

      timerH = setTimeout(() => get().stopTest('done'), totalMs)

      uiH = setInterval(() => doFlush(false), 250)
    },

    stopTest(reason) {
      if (get().stopped) return
      clearHandles()
      stopController?.abort()

      // Commit whatever is still buffered (incl. the final throughput point) so
      // the last live frame is accurate and buildReport reads a complete snapshot.
      flushUi?.(true)
      flushUi = null

      const statusMap = { manual: 'stopped', done: 'done', threshold: 'threshold' } as const
      set(s => ({
        running: false,
        stopped: true,
        status: statusMap[reason],
        progressPct: 100,
        report: buildReport(s as TestState),
      }))
    },
  }
})
