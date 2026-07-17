import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { fireRequest } from './fetcher'
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
