// Index a pre-sorted (ascending) array for the p-th percentile. Callers that
// compute many percentiles off the same data should sort once and reuse it
// rather than paying an O(n log n) sort per percentile.
export function percentileSorted(sorted: number[], p: number): number {
  if (!sorted.length) return 0
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]
}

export function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0
  return percentileSorted([...arr].sort((a, b) => a - b), p)
}

// Count how many elements of a pre-sorted (ascending) array are <= value.
// Binary search for the first element greater than value; its index is the
// count. O(log n) instead of the O(n) a linear filter would cost.
export function countAtMost(sorted: number[], value: number): number {
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (sorted[mid] <= value) lo = mid + 1
    else hi = mid
  }
  return lo
}
