export function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]
}
