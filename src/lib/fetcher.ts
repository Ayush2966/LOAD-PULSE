import type { ParsedCurl } from './types'
import { applyVars } from './variableInjector'

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
): Promise<FetchResult> {
  const o = applyVars(opts)
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

    let bodyTxt: string | null = null
    if (captureBody && !res.ok) {
      try { bodyTxt = (await res.text()).slice(0, 300) } catch { /* ignore */ }
    }

    const codeOk = res.status >= scMin && res.status <= scMax
    const latOk = !latThreshOn || lat <= latThresh
    const bodyOk = !bodyCheckOn || !bodyTxt || bodyTxt.includes(bodyCheck)
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
      bodyText: bodyTxt,
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

export function makeSemaphore(max: number) {
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

  return { acquire, release }
}
