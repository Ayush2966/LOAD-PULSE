import type { TestConfig, PatternType } from '../types'
import { getRps, getDurationMs, getConcur, getTimeout } from '../loadPatterns'
import { fireRequest, makeSemaphore } from '../fetcher'

export interface SwarmSampleWindow {
  sent: number
  ok: number
  fail: number
  codes: Record<number, number>
  latencies: number[]
  windowStartMs: number
  windowEndMs: number
}

const REPORT_INTERVAL_MS = 1000

/**
 * Runs this node's slice of a swarm load test: same engine as the solo test
 * runner (loadPatterns + fetcher), but the target rate is scaled by
 * shareFraction so N nodes together approximate the full configured rate.
 * Emits a batched sample window roughly once a second instead of per-request
 * chart points, since results travel over a WebRTC data channel.
 */
export function runSwarmSlice(
  cfg: TestConfig,
  pattern: PatternType,
  shareFraction: number,
  onSample: (w: SwarmSampleWindow) => void,
  signal: AbortSignal,
): Promise<void> {
  return new Promise(resolve => {
    const totalMs = getDurationMs(pattern, cfg)
    const concur = Math.max(1, Math.round(getConcur(pattern, cfg) * shareFraction))
    const timeout = getTimeout(pattern, cfg)
    const sem = makeSemaphore(concur)
    const startTime = Date.now()

    let accum = 0
    let stopped = false
    let win: SwarmSampleWindow = { sent: 0, ok: 0, fail: 0, codes: {}, latencies: [], windowStartMs: 0, windowEndMs: 0 }

    function flushWindow() {
      const el = Date.now() - startTime
      win.windowEndMs = el
      if (win.sent > 0) onSample(win)
      win = { sent: 0, ok: 0, fail: 0, codes: {}, latencies: [], windowStartMs: el, windowEndMs: el }
    }

    async function fireOne() {
      if (stopped) return
      await sem.acquire()
      if (stopped) { sem.release(); return }

      const result = await fireRequest(
        cfg.parsed, timeout,
        cfg.scMin, cfg.scMax,
        cfg.latThreshOn, cfg.latThresh,
        cfg.bodyCheckOn, cfg.bodyCheck,
        false, signal,
      )
      sem.release()
      if (stopped) return

      win.sent++
      if (result.ok) win.ok++
      else win.fail++
      if (result.status !== null) win.codes[result.status] = (win.codes[result.status] || 0) + 1
      win.latencies.push(result.lat)
    }

    accum = getRps(pattern, 0, totalMs, cfg) * shareFraction * 0.1
    const tickH = setInterval(() => {
      if (stopped) return
      const el = Date.now() - startTime
      const rps = getRps(pattern, el, totalMs, cfg) * shareFraction
      accum += rps * 0.1
      let n = Math.floor(accum); accum -= n
      while (n-- > 0) void fireOne()
    }, 100)

    const reportH = setInterval(flushWindow, REPORT_INTERVAL_MS)

    function finish() {
      if (stopped) return
      stopped = true
      clearInterval(tickH)
      clearInterval(reportH)
      flushWindow()
      resolve()
    }

    const timerH = setTimeout(finish, totalMs)
    signal.addEventListener('abort', () => { clearTimeout(timerH); finish() })
  })
}
