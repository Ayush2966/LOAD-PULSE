import { create } from 'zustand'
import type { ParsedCurl, ChartPoint, TputPoint, LogEntry, FailureGroup, TestConfig, PatternType, ReportData } from '../lib/types'
import { getRps, getDurationMs, getConcur, getTimeout } from '../lib/loadPatterns'
import { fireRequest, makeSemaphore } from '../lib/fetcher'
import { resetUniqueVars } from '../lib/variableInjector'
import { percentile } from '../lib/percentile'

interface TestStats {
  sent: number
  ok: number
  fail: number
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

  startTest: (cfg: TestConfig, pattern: PatternType) => void
  stopTest: (reason: 'manual' | 'done' | 'threshold') => void
  reset: () => void
}

const emptyStats = (): TestStats => ({ sent: 0, ok: 0, fail: 0, codes: {} })

export const useTestStore = create<TestState>((set, get) => {
  let tickH: ReturnType<typeof setInterval> | null = null
  let timerH: ReturnType<typeof setTimeout> | null = null
  let uiH: ReturnType<typeof setInterval> | null = null
  let stopController: AbortController | null = null
  let accum = 0
  let lastTputSec = -1
  let tputSecCount = 0

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
      meta: { url: parsed?.url ?? '', method: parsed?.method ?? '', pattern: '', elapsed, rps, total: sent, ok, fail, successRate: sr, avgLatMs: avg, p95Ms: p95, p99Ms: p99, maxLatMs: maxL },
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

    reset() {
      clearHandles()
      stopController?.abort()
      set({
        running: false, stopped: false, status: 'idle',
        stats: emptyStats(), chartPts: [], tputPts: [], logBuf: [],
        failures: {}, startTime: 0, totalMs: 0, progressPct: 0,
        report: null, thresholdMsg: '', elapsedSec: 0, actualRps: '—',
      })
    },

    startTest(cfg, pattern) {
      clearHandles()
      stopController?.abort()
      stopController = new AbortController()
      accum = 0; lastTputSec = -1; tputSecCount = 0
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
        report: null, thresholdMsg: '',
      })

      const signal = stopController.signal

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

        set(s => {
          const stats = { ...s.stats }
          stats.sent++
          if (result.ok) stats.ok++
          else stats.fail++
          if (result.status !== null) {
            stats.codes = { ...stats.codes, [result.status]: (stats.codes[result.status] || 0) + 1 }
          }

          const tStr = ((Date.now() - startTime) / 1000).toFixed(2) + 's'
          const logEntry: LogEntry = { t: tStr, ok: result.ok, status: result.status, lat: result.lat, msg: result.msg }
          const logBuf = [logEntry, ...s.logBuf].slice(0, 150)

          const chartPts = [...s.chartPts, { t: Date.now() - startTime, lat: result.lat, ok: result.ok }]
          if (chartPts.length > 2000) chartPts.shift()

          const failures = { ...s.failures }
          if (!result.ok) {
            const key = result.reason
            if (!failures[key]) failures[key] = { count: 0, type: result.badgeType, status: result.status, bodies: [] }
            else failures[key] = { ...failures[key] }
            failures[key] = { ...failures[key], count: failures[key].count + 1 }
            if (result.bodyText && failures[key].bodies.length < 2) {
              failures[key] = { ...failures[key], bodies: [...failures[key].bodies, result.bodyText] }
            }
          }

          // threshold check
          let thresholdMsg = s.thresholdMsg
          let shouldStop = false
          if (cfg.errStopOn && stats.sent >= 10) {
            const rate = stats.fail / stats.sent * 100
            if (rate > cfg.errStopPct) {
              thresholdMsg = `Auto-stopped: error rate ${rate.toFixed(1)}% exceeded ${cfg.errStopPct}% threshold`
              shouldStop = true
            }
          }

          if (shouldStop) setTimeout(() => get().stopTest('threshold'), 0)

          return { stats, logBuf, chartPts, failures, thresholdMsg }
        })
        tputSecCount++
      }

      // tick every 100ms
      accum = getRps(pattern, 0, totalMs, cfg) * 0.1
      tickH = setInterval(() => {
        if (get().stopped) return
        const el = Date.now() - startTime
        const rps = getRps(pattern, el, totalMs, cfg)
        accum += rps * 0.1
        let n = Math.floor(accum); accum -= n
        while (n-- > 0) fireOne()

        const sec = Math.floor(el / 1000)
        if (sec !== lastTputSec) {
          if (lastTputSec >= 0 && tputSecCount > 0) {
            set(s => ({ tputPts: [...s.tputPts, { t: lastTputSec * 1000, rps: tputSecCount }] }))
          }
          lastTputSec = sec; tputSecCount = 0
        }
      }, 100)

      timerH = setTimeout(() => get().stopTest('done'), totalMs)

      uiH = setInterval(() => {
        const el = Date.now() - startTime
        const s = get()
        set({
          elapsedSec: Math.floor(el / 1000),
          actualRps: (s.stats.sent / Math.max(0.1, el / 1000)).toFixed(1),
          progressPct: Math.min(100, el / totalMs * 100),
        })
      }, 250)
    },

    stopTest(reason) {
      if (get().stopped) return
      clearHandles()
      stopController?.abort()

      // final tput point
      if (lastTputSec >= 0 && tputSecCount > 0) {
        set(s => ({ tputPts: [...s.tputPts, { t: lastTputSec * 1000, rps: tputSecCount }] }))
      }

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
