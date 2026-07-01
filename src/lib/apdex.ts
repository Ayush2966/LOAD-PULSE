export interface ApdexResult {
  score: number
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Unacceptable'
  satisfied: number
  tolerating: number
  frustrated: number
  total: number
  threshold: number
}

export function calcApdex(latencies: number[], T = 500): ApdexResult {
  const total = latencies.length
  if (!total) return { score: 0, rating: 'Unacceptable', satisfied: 0, tolerating: 0, frustrated: 0, total: 0, threshold: T }

  let satisfied = 0, tolerating = 0, frustrated = 0
  for (const l of latencies) {
    if (l <= T) satisfied++
    else if (l <= T * 4) tolerating++
    else frustrated++
  }

  const score = Math.round(((satisfied + tolerating / 2) / total) * 100) / 100

  let rating: ApdexResult['rating']
  if (score >= 0.94) rating = 'Excellent'
  else if (score >= 0.85) rating = 'Good'
  else if (score >= 0.70) rating = 'Fair'
  else if (score >= 0.50) rating = 'Poor'
  else rating = 'Unacceptable'

  return { score, rating, satisfied, tolerating, frustrated, total, threshold: T }
}

export interface SLARule {
  metric: 'successRate' | 'p95' | 'p99' | 'avg' | 'apdex'
  operator: 'gte' | 'lte'
  value: number
  label: string
}

export interface SLAResult {
  rule: SLARule
  actual: number
  passed: boolean
}

export function checkSLA(rules: SLARule[], _latencies: number[], successRate: number, avg: number, p95: number, p99: number, apdexScore: number): SLAResult[] {
  return rules.map(rule => {
    const actuals: Record<SLARule['metric'], number> = { successRate, p95, p99, avg, apdex: apdexScore }
    const actual = actuals[rule.metric]
    const passed = rule.operator === 'gte' ? actual >= rule.value : actual <= rule.value
    return { rule, actual, passed }
  })
}
