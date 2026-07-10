import { describe, it, expect } from 'vitest'
import { percentile } from './percentile'

describe('percentile', () => {
  it('returns 0 for an empty array', () => {
    expect(percentile([], 95)).toBe(0)
  })

  it('computes p95 over a 1..100 sample set', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(arr, 95)).toBe(95)
  })

  it('computes p99 over a 1..100 sample set', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentile(arr, 99)).toBe(99)
  })

  it('computes p50 on a small (< 20) sample set', () => {
    expect(percentile([10, 20, 30], 50)).toBe(20)
  })

  it('handles a single-element array', () => {
    expect(percentile([42], 95)).toBe(42)
  })

  it('does not mutate the input array', () => {
    const arr = [30, 10, 20]
    percentile(arr, 50)
    expect(arr).toEqual([30, 10, 20])
  })

  it('sorts unordered input before computing the percentile', () => {
    expect(percentile([50, 10, 30, 20, 40], 50)).toBe(30)
  })
})
