import { describe, it, expect } from 'vitest'
import { pushTputPoint, MAX_TPUT_PTS } from './tputPoints'
import type { TputPoint } from './types'

describe('pushTputPoint', () => {
  it('appends a point when below the cap', () => {
    const pts: TputPoint[] = [{ t: 0, rps: 10 }]
    const next = pushTputPoint(pts, { t: 1000, rps: 20 })
    expect(next).toEqual([{ t: 0, rps: 10 }, { t: 1000, rps: 20 }])
  })

  it('does not mutate the input array', () => {
    const pts: TputPoint[] = [{ t: 0, rps: 10 }]
    pushTputPoint(pts, { t: 1000, rps: 20 })
    expect(pts).toEqual([{ t: 0, rps: 10 }])
  })

  it('caps length at MAX_TPUT_PTS, dropping the oldest points on a long soak', () => {
    let pts: TputPoint[] = []
    // one point per second for longer than the retention window
    for (let i = 0; i < MAX_TPUT_PTS + 500; i++) {
      pts = pushTputPoint(pts, { t: i * 1000, rps: i })
    }
    expect(pts).toHaveLength(MAX_TPUT_PTS)
    // the oldest 500 points were dropped; the newest is retained
    expect(pts[0]).toEqual({ t: 500 * 1000, rps: 500 })
    expect(pts[pts.length - 1]).toEqual({ t: (MAX_TPUT_PTS + 499) * 1000, rps: MAX_TPUT_PTS + 499 })
  })
})
