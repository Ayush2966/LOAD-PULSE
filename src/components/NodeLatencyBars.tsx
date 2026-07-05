import type { SwarmNodeState } from '../lib/swarm/types'
import { percentile } from '../lib/percentile'

interface Props {
  nodes: SwarmNodeState[]
}

interface Row {
  label: string
  avg: number
  p95: number
  count: number
}

function labelFor(n: SwarmNodeState): string {
  return n.nodeId === 'host-self' ? 'host (you)' : n.nodeId.slice(0, 10)
}

/** Compares each node's latency so it's obvious which node/network is the slow one. Bars are scaled to the slowest node's p95 (which is highlighted). */
export default function NodeLatencyBars({ nodes }: Props) {
  const rows: Row[] = nodes
    .filter(n => n.lat.length > 0)
    .map(n => ({
      label: labelFor(n),
      avg: Math.round(n.lat.reduce((a, b) => a + b, 0) / n.lat.length),
      p95: percentile(n.lat, 95),
      count: n.lat.length,
    }))

  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--text3)' }}>No latency samples yet</div>
  }

  const maxP95 = Math.max(...rows.map(r => r.p95), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map(r => {
        const slowest = r.p95 === maxP95 && rows.length > 1
        const fill = slowest ? '#da3633' : 'var(--accent, #388bfd)'
        return (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', width: 90, flexShrink: 0, color: 'var(--text2)' }}>{r.label}</span>
            <div style={{ flex: 1, background: 'var(--bg2)', borderRadius: 4, height: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: `${(r.avg / maxP95) * 100}%`, background: fill, height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', width: 150, flexShrink: 0, textAlign: 'right', color: 'var(--text3)' }}>
              avg {r.avg}ms · p95 {r.p95}ms
            </span>
          </div>
        )
      })}
    </div>
  )
}
