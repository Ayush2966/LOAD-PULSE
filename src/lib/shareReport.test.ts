import { describe, it, expect } from 'vitest'
import { encodeReport, decodeReport } from './shareReport'
import type { ReportData, ChartPoint, TputPoint } from './types'

function makeReport(): ReportData {
  return {
    meta: {
      url: 'https://api.example.com/orders', method: 'POST', pattern: 'ramp',
      elapsed: '12.34', rps: '48.20', total: 600, ok: 594, fail: 6,
      successRate: '99.0', avgLatMs: 120, p95Ms: 300, p99Ms: 800, maxLatMs: 1200,
    },
    failures: {
      'HTTP 500': { count: 6, type: 'h5', status: 500, bodies: ['{"error":"boom"}'] },
    },
  }
}

function makePayload(nPoints: number) {
  const chartPts: ChartPoint[] = []
  for (let i = 0; i < nPoints; i++) chartPts.push({ t: i * 50, lat: 100 + (i % 200), ok: i % 17 !== 0 })
  const tputPts: TputPoint[] = []
  for (let i = 0; i < 60; i++) tputPts.push({ t: i * 1000, rps: 40 + (i % 10) })
  return { report: makeReport(), chartPts, tputPts }
}

describe('shareReport', () => {
  it('round-trips a full payload including chart and throughput points', async () => {
    const payload = makePayload(2000)
    const token = await encodeReport(payload)
    const decoded = await decodeReport(token)
    expect(decoded).toEqual(payload)
  })

  it('compresses — the token is smaller than the raw JSON for a large payload', async () => {
    const payload = makePayload(2000)
    const token = await encodeReport(payload)
    expect(token.length).toBeLessThan(JSON.stringify(payload).length)
  })

  it('produces a URL-safe token (no +, / or = characters)', async () => {
    const token = await encodeReport(makePayload(2000))
    expect(token).not.toMatch(/[+/=]/)
  })

  it('returns null for a malformed token', async () => {
    expect(await decodeReport('!!!not-valid!!!')).toBeNull()
  })

  it('still decodes a legacy plain-Base64 report (no series) into a payload', async () => {
    const report = makeReport()
    const legacy = btoa(unescape(encodeURIComponent(JSON.stringify(report))))
    const decoded = await decodeReport(legacy)
    expect(decoded?.report).toEqual(report)
    expect(decoded?.chartPts).toEqual([])
    expect(decoded?.tputPts).toEqual([])
  })
})
