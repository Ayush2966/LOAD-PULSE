import type { ParsedCurl } from './types'
import { applyVars, type VarSpace } from './variableInjector'

export interface FetchResult {
  ok: boolean
  status: number | null
  lat: number
  msg: string
  bodyText: string | null
  reason: string
  badgeType: 'net' | 'h4' | 'h5' | 'ok'
}

function badgeType(s: number): 'h5' | 'h4' | 'ok' {
  if (s >= 500) return 'h5'
  if (s >= 400) return 'h4'
  return 'ok'
}

export async function fireRequest(
  opts: ParsedCurl,
  timeout: number,
  scMin: number,
  scMax: number,
  latThreshOn: boolean,
  latThresh: number,
  bodyCheckOn: boolean,
  bodyCheck: string,
  captureBody: boolean,
  signal: AbortSignal,
  varSpace?: VarSpace,
): Promise<FetchResult> {
  const o = applyVars(opts, varSpace)
  const t0 = Date.now()
  const ctrl = new AbortController()
  const combined = AbortSignal.any ? AbortSignal.any([ctrl.signal, signal]) : ctrl.signal
  const th = setTimeout(() => ctrl.abort(), timeout)

  try {
    const fo: RequestInit = { method: o.method, headers: o.headers, signal: combined }
    if (o.body !== null) fo.body = o.body

    const res = await fetch(o.url, fo)
    clearTimeout(th)
    const lat = Date.now() - t0

    // Read the body whenever it is needed: for the content assertion (on any
    // status) or to capture a failed response for display. This is decoupled
    // from res.ok so the assertion actually runs on 2xx responses instead of
    // being silently skipped.
    let bodyTxt: string | null = null
    if (bodyCheckOn || (captureBody && !res.ok)) {
      try { bodyTxt = await res.text() } catch { /* ignore */ }
    }

    const codeOk = res.status >= scMin && res.status <= scMax
    const latOk = !latThreshOn || lat <= latThresh
    // A body assertion requires a body that contains the needle; a missing or
    // unreadable body is a failure, not a vacuous pass.
    const bodyOk = !bodyCheckOn || (bodyTxt !== null && bodyTxt.includes(bodyCheck))
    const success = codeOk && latOk && bodyOk

    const reasons: string[] = []
    if (!codeOk) reasons.push(`HTTP ${res.status} ${res.statusText}`.trim())
    if (!latOk) reasons.push(`Latency ${lat}ms > threshold`)
    if (!bodyOk) reasons.push(`Body missing "${bodyCheck}"`)
    const reason = reasons.join(', ') || res.statusText || 'OK'

    return {
      ok: success,
      status: res.status,
      lat,
      msg: success ? res.statusText || 'OK' : reason,
      // Surface a capped body sample for failed requests when the user opted to
      // capture bodies (the full text above is only used for the assertion).
      bodyText: captureBody && !success && bodyTxt !== null ? bodyTxt.slice(0, 300) : null,
      reason,
      badgeType: badgeType(res.status),
    }
  } catch (e: unknown) {
    clearTimeout(th)
    const lat = Date.now() - t0
    const err = e as Error
    const reason = err.name === 'AbortError'
      ? `Timeout (>${timeout}ms)`
      : err.message || 'Network Error'
    return { ok: false, status: null, lat, msg: reason, bodyText: null, reason, badgeType: 'net' }
  }
}

export interface Semaphore {
  acquire(): Promise<void>
  release(): void
  /** The concurrency ceiling this semaphore was created with. */
  readonly max: number
  /** Requests currently occupying a slot. */
  readonly inFlight: number
  /** Requests that have called acquire() but are still queued for a slot. */
  readonly waiting: number
  /** inFlight + waiting — the total work the semaphore is holding onto. */
  readonly pending: number
}

export function makeSemaphore(max: number): Semaphore {
  let inFlight = 0
  const queue: Array<() => void> = []

  function acquire(): Promise<void> {
    if (inFlight < max) { inFlight++; return Promise.resolve() }
    return new Promise(r => queue.push(r))
  }

  function release(): void {
    inFlight--
    if (queue.length && inFlight < max) { inFlight++; queue.shift()!() }
  }

  return {
    acquire,
    release,
    max,
    get inFlight() { return inFlight },
    get waiting() { return queue.length },
    get pending() { return inFlight + queue.length },
  }
}

/**
 * How deep the semaphore's pending work may grow, as a multiple of its
 * concurrency ceiling, before the scheduler applies backpressure. A small
 * buffer beyond the in-flight slots keeps the pipe full between ticks (a
 * freed slot always has a waiter ready) without letting unstarted requests
 * pile up without bound when the target rate outpaces what the endpoint can
 * complete. See scheduleBurst.
 */
export const SATURATION_FACTOR = 2

/**
 * Schedule up to `n` requests through `sem`, applying backpressure. Once the
 * semaphore's pending depth (in-flight + waiting) reaches its saturation
 * ceiling, the remaining requests for this burst are dropped instead of queued
 * forever — the fix for unbounded memory growth when the target rate exceeds
 * achievable throughput. Returns how many were skipped so callers can surface
 * that the target rate can't be met.
 *
 * `fire` must acquire a slot synchronously up to its first await (the semaphore
 * does), so pending depth is up to date between iterations of this loop.
 */
export function scheduleBurst(sem: Semaphore, n: number, fire: () => void): number {
  const ceiling = sem.max * SATURATION_FACTOR
  let skipped = 0
  while (n-- > 0) {
    if (sem.pending >= ceiling) { skipped++; continue }
    fire()
  }
  return skipped
}
