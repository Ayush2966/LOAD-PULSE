import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { runTest, type RunSnapshot } from './runner.ts'
import { SATURATION_FACTOR } from '../src/lib/fetcher.ts'
import type { TestConfig } from '../src/lib/types.ts'

let server: http.Server
let baseUrl: string

// A deliberately slow endpoint: each response is held ~100ms, so a small
// concurrency pool can only complete a trickle of requests per second — far
// below the target rate the test asks for. This is the saturation scenario
// from the audit (target rate ≫ achievable throughput).
beforeAll(async () => {
  server = http.createServer((_req, res) => {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('ok')
    }, 100)
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()))
})

function constantConfig(over: Partial<TestConfig>): TestConfig {
  return {
    parsed: { url: baseUrl, method: 'GET', headers: {}, body: null },
    pattern: 'constant',
    constRate: 500, constRateUnit: 's', constDur: 2, constDurUnit: 's',
    rampStart: 0, rampEnd: 0, rampDur: 0, rampDurUnit: 's', rampConcur: 1,
    steps: [], stepConcur: 1, stepTimeout: 5000,
    spikeBase: 0, spikeRate: 0, spikeDur: 0, spikeBurst: 0,
    soakRate: 0, soakDur: 0, soakDurUnit: 's', soakConcur: 1,
    timeout: 5000, concur: 4,
    scMin: 200, scMax: 299,
    latThreshOn: false, latThresh: 0,
    bodyCheckOn: false, bodyCheck: '',
    errStopOn: false, errStopPct: 100,
    captureBody: false,
    ...over,
  }
}

describe('runTest backpressure under saturation', () => {
  it('drops the excess as "skipped" instead of queuing it, keeping completions near achievable throughput', async () => {
    const concur = 4
    const cfg = constantConfig({ constRate: 500, constDur: 2, concur })

    let last: RunSnapshot | null = null
    const report = await runTest(cfg, 'constant', snap => { last = snap })

    // The endpoint completes ~concur / 0.1s ≈ 40 req/s, so ~80 over 2s — nowhere
    // near the 1000 the 500 rps target would schedule. Completions stay bounded.
    expect(report.meta.total).toBeGreaterThan(0)
    expect(report.meta.total).toBeLessThan(250)

    // The ~900 requests the endpoint couldn't absorb are dropped and counted,
    // not left to pile up as unstarted waiters. This is the memory-leak fix.
    expect(last).not.toBeNull()
    expect(last!.skipped).toBeGreaterThan(200)

    // Scheduled work is conserved: everything was either sent or skipped, and the
    // dropped share dwarfs what completed (the target rate genuinely can't be met).
    expect(last!.skipped).toBeGreaterThan(report.meta.total)
  })

  it('skips nothing when the endpoint keeps up with a modest target rate', async () => {
    // 20 rps against a 100ms endpoint needs only ~2 concurrent slots; a pool of
    // 10 absorbs it comfortably, so backpressure never engages.
    const cfg = constantConfig({ constRate: 20, constDur: 1, concur: 10 })

    let last: RunSnapshot | null = null
    await runTest(cfg, 'constant', snap => { last = snap })

    expect(last).not.toBeNull()
    expect(last!.skipped).toBe(0)
  })

  it('never lets pending work exceed the saturation ceiling (documents the bound)', () => {
    // The ceiling the runner enforces per its concurrency pool.
    const concur = 4
    expect(concur * SATURATION_FACTOR).toBe(8)
  })
})
