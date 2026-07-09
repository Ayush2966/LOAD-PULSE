import { describe, it, expect } from 'vitest'
import { calcApdex, checkSLA, type SLARule } from './apdex'

describe('calcApdex', () => {
  it('returns an Unacceptable zero-score result for an empty latency list', () => {
    const r = calcApdex([], 500)
    expect(r).toEqual({ score: 0, rating: 'Unacceptable', satisfied: 0, tolerating: 0, frustrated: 0, total: 0, threshold: 500 })
  })

  it('buckets latencies into satisfied / tolerating / frustrated at T and 4T', () => {
    const r = calcApdex([100, 500, 501, 2000, 2001], 500)
    expect(r.satisfied).toBe(2)
    expect(r.tolerating).toBe(2)
    expect(r.frustrated).toBe(1)
    expect(r.total).toBe(5)
    expect(r.score).toBe(0.6)
    expect(r.rating).toBe('Poor')
  })

  it.each([
    [94, 6, 'Excellent'],
    [85, 15, 'Good'],
    [70, 30, 'Fair'],
    [50, 50, 'Poor'],
    [0, 100, 'Unacceptable'],
  ])('rates %i%% satisfied / %i%% frustrated as %s', (satisfiedPct, frustratedPct, expectedRating) => {
    const latencies = [
      ...Array(satisfiedPct).fill(100),
      ...Array(frustratedPct).fill(3000),
    ]
    const r = calcApdex(latencies, 500)
    expect(r.rating).toBe(expectedRating)
    expect(r.score).toBeCloseTo(satisfiedPct / 100, 5)
  })

  it('defaults T to 500 when not provided', () => {
    expect(calcApdex([500]).threshold).toBe(500)
  })
})

describe('checkSLA', () => {
  const baseArgs = { successRate: 0.98, avg: 120, p95: 300, p99: 450, apdexScore: 0.9 }

  it('passes a gte rule when the actual value meets the threshold', () => {
    const rule: SLARule = { metric: 'successRate', operator: 'gte', value: 0.95, label: 'Success rate' }
    const [result] = checkSLA([rule], [], baseArgs.successRate, baseArgs.avg, baseArgs.p95, baseArgs.p99, baseArgs.apdexScore)
    expect(result.passed).toBe(true)
    expect(result.actual).toBe(0.98)
    expect(result.rule).toBe(rule)
  })

  it('fails a gte rule when the actual value is below the threshold', () => {
    const rule: SLARule = { metric: 'apdex', operator: 'gte', value: 0.95, label: 'Apdex' }
    const [result] = checkSLA([rule], [], baseArgs.successRate, baseArgs.avg, baseArgs.p95, baseArgs.p99, baseArgs.apdexScore)
    expect(result.passed).toBe(false)
  })

  it('passes an lte rule when the actual value is within the threshold', () => {
    const rule: SLARule = { metric: 'p95', operator: 'lte', value: 500, label: 'P95 latency' }
    const [result] = checkSLA([rule], [], baseArgs.successRate, baseArgs.avg, baseArgs.p95, baseArgs.p99, baseArgs.apdexScore)
    expect(result.passed).toBe(true)
  })

  it('fails an lte rule when the actual value exceeds the threshold', () => {
    const rule: SLARule = { metric: 'p99', operator: 'lte', value: 100, label: 'P99 latency' }
    const [result] = checkSLA([rule], [], baseArgs.successRate, baseArgs.avg, baseArgs.p95, baseArgs.p99, baseArgs.apdexScore)
    expect(result.passed).toBe(false)
  })

  it('evaluates multiple rules independently', () => {
    const rules: SLARule[] = [
      { metric: 'successRate', operator: 'gte', value: 0.5, label: 'SR' },
      { metric: 'avg', operator: 'lte', value: 10, label: 'Avg' },
    ]
    const results = checkSLA(rules, [], baseArgs.successRate, baseArgs.avg, baseArgs.p95, baseArgs.p99, baseArgs.apdexScore)
    expect(results.map(r => r.passed)).toEqual([true, false])
  })
})
