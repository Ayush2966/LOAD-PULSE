import type { TputPoint } from './types'

/**
 * Max throughput points retained for the live chart. One point is produced per
 * elapsed second, so this bounds a multi-hour soak to its most recent window
 * (~33 min) instead of growing without limit — keeping memory, the per-append
 * copy, and the chart redraw all bounded. Mirrors the chartPts cap.
 */
export const MAX_TPUT_PTS = 2000

/** Appends a throughput point, keeping only the most recent MAX_TPUT_PTS. */
export function pushTputPoint(pts: TputPoint[], point: TputPoint): TputPoint[] {
  const next = [...pts, point]
  if (next.length > MAX_TPUT_PTS) next.shift()
  return next
}
