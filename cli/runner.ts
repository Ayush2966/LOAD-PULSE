import { getRps, getDurationMs, getConcur, getTimeout } from '../src/lib/loadPatterns.ts'
import { fireRequest, makeSemaphore, scheduleBurst } from '../src/lib/fetcher.ts'
import { resetUniqueVars } from '../src/lib/variableInjector.ts'
import { percentile } from '../src/lib/percentile.ts'
import type { TestConfig, PatternType, ReportData, FailureGroup, ChartPoint } from '../src/lib/types.ts'

export interface RunSnapshot {
  sent: number
  ok: number
  fail: number
  /** Requests dropped because the endpoint couldn't keep up with the target rate. */
  skipped: number
  elapsedMs: number
  totalMs: number
}

export async function runTest(
  cfg: TestConfig,
  pattern: PatternType,
  onTick: (snap: RunSnapshot) => void,
  abortSignal?: AbortSignal,
): Promise<ReportData> {
  resetUniqueVars()
  const totalMs = getDurationMs(pattern, cfg)
  const concur = getConcur(pattern, cfg)
  const timeout = getTimeout(pattern, cfg)
  const sem = makeSemaphore(concur)
  const startTime = Date.now()

  const stopController = new AbortController()
  abortSignal?.addEventListener('abort', () => stopController.abort())

  let sent = 0, ok = 0, fail = 0, skipped = 0
  const chartPts: ChartPoint[] = []
  const failures: Record<string, FailureGroup> = {}
  let stopped = false
  let accum = 0

  async function fireOne() {
    if (stopped) return
    await sem.acquire()
    if (stopped) { sem.release(); return }

    const result = await fireRequest(
      cfg.parsed, timeout,
      cfg.scMin, cfg.scMax,
      cfg.latThreshOn, cfg.latThresh,
      cfg.bodyCheckOn, cfg.bodyCheck,
      cfg.captureBody, stopController.signal,
    )
    sem.release()

    sent++
    if (result.ok) ok++
    else fail++
    chartPts.push({ t: Date.now() - startTime, lat: result.lat, ok: result.ok })
    if (chartPts.length > 10000) chartPts.shift()

    if (!result.ok) {
      const key = result.reason
      if (!failures[key]) failures[key] = { count: 0, type: result.badgeType, status: result.status, bodies: [] }
      failures[key].count++
      if (result.bodyText && failures[key].bodies.length < 2) {
        failures[key].bodies.push(result.bodyText)
      }
    }

    if (cfg.errStopOn && sent >= 10) {
      const rate = (fail / sent) * 100
      if (rate > cfg.errStopPct) {
        stopped = true
        stopController.abort()
      }
    }
  }

  accum = getRps(pattern, 0, totalMs, cfg) * 0.1
  const tickInterval = setInterval(() => {
    if (stopped) return
    const el = Date.now() - startTime
    const rps = getRps(pattern, el, totalMs, cfg)
    accum += rps * 0.1
    const n = Math.floor(accum)
    accum -= n
    // backpressure: never schedule more than the semaphore can hold, so a slow
    // endpoint can't build an unbounded backlog of unstarted requests
    skipped += scheduleBurst(sem, n, fireOne)
  }, 100)

  const uiInterval = setInterval(() => {
    onTick({ sent, ok, fail, skipped, elapsedMs: Date.now() - startTime, totalMs })
  }, 250)

  await new Promise<void>(resolve => {
    const timer = setTimeout(() => {
      stopped = true
      stopController.abort()
      clearInterval(tickInterval)
      clearInterval(uiInterval)
      resolve()
    }, totalMs)

    abortSignal?.addEventListener('abort', () => {
      clearTimeout(timer)
      stopped = true
      stopController.abort()
      clearInterval(tickInterval)
      clearInterval(uiInterval)
      resolve()
    })
  })

  // brief settle window for in-flight requests
  await new Promise(r => setTimeout(r, 300))

  const lats = chartPts.map(p => p.lat)
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
  const sr = sent ? ((ok / sent) * 100).toFixed(1) : '0.0'
  const avg = lats.length ? Math.round(lats.reduce((a, b) => a + b, 0) / lats.length) : 0
  const p95 = percentile(lats, 95)
  const p99 = percentile(lats, 99)
  const maxL = lats.length ? Math.max(...lats) : 0
  const rps = (sent / Math.max(0.1, parseFloat(elapsed))).toFixed(2)

  return {
    meta: {
      url: cfg.parsed.url,
      method: cfg.parsed.method,
      pattern,
      elapsed,
      rps,
      total: sent,
      ok,
      fail,
      successRate: sr,
      avgLatMs: avg,
      p95Ms: p95,
      p99Ms: p99,
      maxLatMs: maxL,
    },
    failures,
  }
}
