import { describe, it, expect } from 'vitest'
import { percentile, percentileSorted, countAtMost } from './percentile'

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

describe('percentileSorted', () => {
  it('returns 0 for an empty array', () => {
    expect(percentileSorted([], 95)).toBe(0)
  })

  it('indexes a pre-sorted array without re-sorting', () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1)
    expect(percentileSorted(sorted, 50)).toBe(50)
    expect(percentileSorted(sorted, 95)).toBe(95)
    expect(percentileSorted(sorted, 99)).toBe(99)
  })

  it('handles a single-element array', () => {
    expect(percentileSorted([42], 95)).toBe(42)
  })

  it('does not mutate the input array', () => {
    const arr = [10, 20, 30]
    percentileSorted(arr, 50)
    expect(arr).toEqual([10, 20, 30])
  })

  it('matches percentile() when fed the same data pre-sorted', () => {
    const raw = [50, 10, 30, 20, 40]
    const sorted = [...raw].sort((a, b) => a - b)
    for (const p of [50, 90, 95, 99]) {
      expect(percentileSorted(sorted, p)).toBe(percentile(raw, p))
    }
  })
})

describe('countAtMost', () => {
  it('returns 0 for an empty array', () => {
    expect(countAtMost([], 5)).toBe(0)
  })

  it('counts elements less than or equal to the value', () => {
    expect(countAtMost([10, 20, 30, 40, 50], 30)).toBe(3)
  })

  it('includes elements equal to the value', () => {
    expect(countAtMost([10, 20, 20, 20, 30], 20)).toBe(4)
  })

  it('returns 0 when the value is below every element', () => {
    expect(countAtMost([10, 20, 30], 5)).toBe(0)
  })

  it('returns the length when the value is at or above every element', () => {
    expect(countAtMost([10, 20, 30], 30)).toBe(3)
    expect(countAtMost([10, 20, 30], 999)).toBe(3)
  })

  it('agrees with a linear filter over a large sample', () => {
    const arr = Array.from({ length: 2000 }, (_, i) => i)
    for (const v of [0, 1, 999, 1000, 1999, 5000]) {
      expect(countAtMost(arr, v)).toBe(arr.filter(l => l <= v).length)
    }
  })
})
