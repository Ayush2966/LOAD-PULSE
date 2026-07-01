import { percentile } from '../lib/percentile'

interface Props {
  latencies: number[]
}

const PERCENTILES = [50, 75, 90, 95, 99, 99.9]

export default function PercentileTable({ latencies }: Props) {
  if (!latencies.length) return null

  const sorted = [...latencies].sort((a, b) => a - b)
  const max = sorted[sorted.length - 1]

  const rows = PERCENTILES.map(p => ({
    label: `p${p}`,
    value: percentile(sorted, p),
  }))
  rows.push({ label: 'max', value: max })

  const maxVal = Math.max(...rows.map(r => r.value), 1)

  function colorFor(ms: number): string {
    if (ms < 100) return '#2ea043'
    if (ms < 500) return '#388bfd'
    if (ms < 1000) return '#d29922'
    return '#f85149'
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text3)',
        textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10
      }}>
        Latency percentiles
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {rows.map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 42, fontSize: 11, fontFamily: 'var(--font-mono)',
              color: 'var(--text3)', textAlign: 'right', flexShrink: 0
            }}>
              {r.label}
            </span>
            <div style={{
              flex: 1, height: 8, background: 'var(--bg2)',
              borderRadius: 4, overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: (r.value / maxVal * 100) + '%',
                background: colorFor(r.value),
                borderRadius: 4,
                transition: 'width .4s ease',
              }} />
            </div>
            <span style={{
              width: 68, fontSize: 12, fontFamily: 'var(--font-mono)',
              color: colorFor(r.value), textAlign: 'right', flexShrink: 0,
              fontVariantNumeric: 'tabular-nums'
            }}>
              {r.value >= 1000
                ? (r.value / 1000).toFixed(2) + 's'
                : r.value + 'ms'}
            </span>
            <span style={{
              width: 48, fontSize: 10, color: 'var(--text3)',
              fontFamily: 'var(--font-mono)', flexShrink: 0
            }}>
              {latencies.filter(l => l <= r.value).length} req
            </span>
          </div>
        ))}
      </div>
      <div style={{
        display: 'flex', gap: 16, marginTop: 12,
        fontSize: 10, color: 'var(--text3)'
      }}>
        <span style={{ color: '#2ea043' }}>● &lt;100ms fast</span>
        <span style={{ color: '#388bfd' }}>● &lt;500ms ok</span>
        <span style={{ color: '#d29922' }}>● &lt;1s slow</span>
        <span style={{ color: '#f85149' }}>● &gt;1s critical</span>
      </div>
    </div>
  )
}
