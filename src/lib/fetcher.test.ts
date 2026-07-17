import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { fireRequest, makeSemaphore, scheduleBurst, SATURATION_FACTOR } from './fetcher'
import type { ParsedCurl } from './types'

let server: http.Server
let baseUrl: string

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname === '/ok') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('hello')
    } else if (url.pathname === '/fail') {
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end('server error')
    } else if (url.pathname === '/needle') {
      const has = url.searchParams.get('has') === '1'
      res.writeHead(500, { 'Content-Type': 'text/plain' })
      res.end(has ? 'the needle is here' : 'no match here')
    } else if (url.pathname === '/empty') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end()
    } else if (url.pathname === '/slow') {
      const ms = Number(url.searchParams.get('ms') ?? '0')
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('slow-ok')
      }, ms)
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()))
})

function parsed(path: string): ParsedCurl {
  return { url: `${baseUrl}${path}`, method: 'GET', headers: {}, body: null }
}

describe('fireRequest', () => {
  it('succeeds when the status code is within range', async () => {
    const r = await fireRequest(parsed('/ok'), 5000, 200, 299, false, 0, false, '', false, new AbortController().signal)
    expect(r.ok).toBe(true)
    expect(r.status).toBe(200)
    expect(r.badgeType).toBe('ok')
  })

  it('fails when the status code is outside the configured range', async () => {
    const r = await fireRequest(parsed('/fail'), 5000, 200, 299, false, 0, false, '', false, new AbortController().signal)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(500)
    expect(r.badgeType).toBe('h5')
    expect(r.reason).toContain('HTTP 500')
  })

  it('fails when latency exceeds the configured threshold', async () => {
    const r = await fireRequest(parsed('/slow?ms=100'), 5000, 200, 299, true, 10, false, '', false, new AbortController().signal)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('Latency')
  })

  it('fails the body check when the response body does not contain the needle, on a non-2xx response', async () => {
    const r = await fireRequest(parsed('/needle?has=0'), 5000, 500, 599, false, 0, true, 'needle', true, new AbortController().signal)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('Body missing "needle"')
  })

  it('passes the body check when the response body contains the needle, on a non-2xx response', async () => {
    const r = await fireRequest(parsed('/needle?has=1'), 5000, 500, 599, false, 0, true, 'needle', true, new AbortController().signal)
    expect(r.ok).toBe(true)
  })

  it('fails the body check on a 2xx response whose body lacks the needle (even with captureBody off)', async () => {
    // /ok returns 200 "hello"; the needle is absent. The assertion must run and
    // fail — the 2xx status must not let the body check pass vacuously.
    const r = await fireRequest(parsed('/ok'), 5000, 200, 299, false, 0, true, 'success', false, new AbortController().signal)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('Body missing "success"')
  })

  it('passes the body check on a 2xx response that contains the needle', async () => {
    const r = await fireRequest(parsed('/ok'), 5000, 200, 299, false, 0, true, 'hello', false, new AbortController().signal)
    expect(r.ok).toBe(true)
  })

  it('fails the body check on a 2xx response with an empty body (missing body is a failure)', async () => {
    const r = await fireRequest(parsed('/empty'), 5000, 200, 299, false, 0, true, 'anything', false, new AbortController().signal)
    expect(r.ok).toBe(false)
    expect(r.reason).toContain('Body missing')
  })

  it('times out and reports a net failure when the server is slower than the timeout', async () => {
    const r = await fireRequest(parsed('/slow?ms=200'), 20, 200, 299, false, 0, false, '', false, new AbortController().signal)
    expect(r.ok).toBe(false)
    expect(r.status).toBeNull()
    expect(r.badgeType).toBe('net')
    expect(r.reason).toContain('Timeout')
  })

  it('reports a net failure when the connection is refused', async () => {
    const deadServer = http.createServer()
    await new Promise<void>(resolve => deadServer.listen(0, '127.0.0.1', resolve))
    const { port } = deadServer.address() as AddressInfo
    await new Promise<void>(resolve => deadServer.close(() => resolve()))

    const r = await fireRequest(
      { url: `http://127.0.0.1:${port}`, method: 'GET', headers: {}, body: null },
      5000, 200, 299, false, 0, false, '', false, new AbortController().signal,
    )
    expect(r.ok).toBe(false)
    expect(r.status).toBeNull()
    expect(r.badgeType).toBe('net')
    expect(r.reason.length).toBeGreaterThan(0)
  })
})

describe('makeSemaphore depth', () => {
  it('reports in-flight, waiting, and total pending counts', async () => {
    const sem = makeSemaphore(2)
    expect(sem.max).toBe(2)
    expect(sem.inFlight).toBe(0)
    expect(sem.pending).toBe(0)

    await sem.acquire()
    expect(sem.inFlight).toBe(1)

    await sem.acquire()
    expect(sem.inFlight).toBe(2)
    expect(sem.pending).toBe(2)

    // third acquire cannot start — it waits
    void sem.acquire()
    expect(sem.waiting).toBe(1)
    expect(sem.pending).toBe(3)

    // releasing a slot hands it to the waiter
    sem.release()
    expect(sem.waiting).toBe(0)
    expect(sem.inFlight).toBe(2)
    expect(sem.pending).toBe(2)
  })
})

describe('scheduleBurst backpressure', () => {
  it('fires everything and skips nothing while under the saturation ceiling', () => {
    const sem = makeSemaphore(10)
    let fired = 0
    const fire = () => { fired++; void sem.acquire().then(() => sem.release()) }

    const skipped = scheduleBurst(sem, 3, fire)

    expect(fired).toBe(3)
    expect(skipped).toBe(0)
  })

  it('stops scheduling once pending hits the ceiling and counts the rest as skipped', () => {
    const sem = makeSemaphore(2)
    const ceiling = sem.max * SATURATION_FACTOR
    let fired = 0
    // a fire that acquires but never releases — the endpoint is saturated
    const fire = () => { fired++; void sem.acquire() }

    const skipped = scheduleBurst(sem, 100, fire)

    expect(fired).toBe(ceiling)
    expect(skipped).toBe(100 - ceiling)
    expect(sem.pending).toBe(ceiling)
  })

  it('keeps pending bounded across repeated saturated ticks (no unbounded queue growth)', () => {
    const sem = makeSemaphore(4)
    const ceiling = sem.max * SATURATION_FACTOR
    const fire = () => { void sem.acquire() }

    let totalSkipped = 0
    for (let tick = 0; tick < 50; tick++) {
      totalSkipped += scheduleBurst(sem, 200, fire)
      // the queue never grows beyond the ceiling no matter how many ticks pile up
      expect(sem.pending).toBeLessThanOrEqual(ceiling)
    }

    // first tick admits `ceiling`, every later tick admits nothing
    expect(totalSkipped).toBe(50 * 200 - ceiling)
  })

  it('resumes scheduling as completing requests free capacity', () => {
    const sem = makeSemaphore(2)
    const ceiling = sem.max * SATURATION_FACTOR
    let fired = 0
    const fire = () => { fired++; void sem.acquire() }

    scheduleBurst(sem, 100, fire) // fills to the ceiling
    expect(sem.pending).toBe(ceiling)

    sem.release() // one request completes, freeing one unit of pending capacity
    const skipped = scheduleBurst(sem, 100, fire)

    expect(fired).toBe(ceiling + 1) // exactly one more admitted
    expect(skipped).toBe(99)
    expect(sem.pending).toBe(ceiling)
  })
})
