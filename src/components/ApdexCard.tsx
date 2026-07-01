import { useState } from 'react'
import { calcApdex, checkSLA, type SLARule } from '../lib/apdex'

interface Props {
  latencies: number[]
  successRate: number
  avg: number
  p95: number
  p99: number
}

const DEFAULT_SLA: SLARule[] = [
  { metric: 'successRate', operator: 'gte', value: 99, label: 'Success rate ≥ 99%' },
  { metric: 'p95', operator: 'lte', value: 1000, label: 'p95 latency ≤ 1000ms' },
  { metric: 'p99', operator: 'lte', value: 2000, label: 'p99 latency ≤ 2000ms' },
  { metric: 'apdex', operator: 'gte', value: 0.85, label: 'Apdex score ≥ 0.85' },
]

function ratingColor(rating: string): string {
  return ({ Excellent: '#2ea043', Good: '#388bfd', Fair: '#d29922', Poor: '#f85149', Unacceptable: '#b91c1c' } as Record<string, string>)[rating] ?? '#6e7681'
}

export default function ApdexCard({ latencies, successRate, avg, p95, p99 }: Props) {
  const [T, setT] = useState(500)
  const [rules, setRules] = useState<SLARule[]>(DEFAULT_SLA)

  const apdex = calcApdex(latencies, T)
  const slaResults = checkSLA(rules, latencies, successRate, avg, p95, p99, apdex.score)
  const allPassed = slaResults.every(r => r.passed)
  const passCount = slaResults.filter(r => r.passed).length

  function updateRule(i: number, patch: Partial<SLARule>) {
    setRules(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Apdex */}
      <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text3)', marginBottom: 12 }}>Apdex Score</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: ratingColor(apdex.rating), fontVariantNumeric: 'tabular-nums' }}>
            {apdex.score.toFixed(2)}
          </div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: ratingColor(apdex.rating) }}>{apdex.rating}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>T = {T}ms</div>
          </div>
        </div>
        <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 20, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ height: '100%', width: (apdex.score * 100) + '%', background: ratingColor(apdex.rating), borderRadius: 20, transition: 'width .4s' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, fontFamily: 'var(--font-mono)', marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ color: '#2ea043' }}>✓ {apdex.satisfied} satisfied</span>
          <span style={{ color: '#d29922' }}>~ {apdex.tolerating} tolerating</span>
          <span style={{ color: '#f85149' }}>✗ {apdex.frustrated} frustrated</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Target T</span>
          <input type="number" min={50} value={T} onChange={e => setT(+e.target.value)} style={{ width: 70, fontSize: 12, padding: '3px 7px' }} />
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>ms</span>
        </div>
      </div>

      {/* SLA */}
      <div style={{ background: 'var(--bg2)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px', color: 'var(--text3)' }}>SLA Check</div>
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: allPassed ? 'rgba(46,160,67,.15)' : 'rgba(248,81,73,.15)',
            color: allPassed ? '#2ea043' : '#f85149',
            border: `1px solid ${allPassed ? 'rgba(46,160,67,.3)' : 'rgba(248,81,73,.3)'}`,
          }}>
            {allPassed ? '✓ ALL PASS' : `${passCount}/${slaResults.length} PASS`}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {slaResults.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{r.passed ? '✅' : '❌'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.rule.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
                  actual: {r.rule.metric === 'apdex' ? r.actual.toFixed(2) : r.rule.metric === 'successRate' ? r.actual.toFixed(1) + '%' : Math.round(r.actual) + 'ms'}
                </div>
              </div>
              <input
                type="number" min={0} value={r.rule.value}
                onChange={e => updateRule(i, { value: +e.target.value })}
                style={{ width: 62, fontSize: 11, padding: '2px 6px', flexShrink: 0 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
