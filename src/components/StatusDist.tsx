interface Props { codes: Record<number, number>; total: number }

const RANGES = [
  { label: '2xx', min: 200, max: 299, color: '#2ea043' },
  { label: '3xx', min: 300, max: 399, color: '#388bfd' },
  { label: '4xx', min: 400, max: 499, color: '#d29922' },
  { label: '5xx', min: 500, max: 599, color: '#da3633' },
  { label: 'Err', min: 0, max: 0, color: '#6e7681' },
]

export default function StatusDist({ codes, total }: Props) {
  const buckets = RANGES.map(r => {
    const count = Object.entries(codes).reduce((acc, [k, v]) => {
      const n = Number(k)
      if (r.label === 'Err') return acc
      return n >= r.min && n <= r.max ? acc + v : acc
    }, 0)
    return { ...r, count }
  })
  const errCount = total - buckets.reduce((a, b) => a + b.count, 0)
  buckets[buckets.length - 1].count = Math.max(0, errCount)

  return (
    <div>
      {buckets.filter(b => b.count > 0).map(b => (
        <div key={b.label} className="dist-row">
          <span className="dist-label">{b.label}</span>
          <div className="dist-bar-wrap">
            <div className="dist-bar" style={{ width: total ? `${b.count / total * 100}%` : '0%', background: b.color }} />
          </div>
          <span className="dist-count">{b.count}</span>
        </div>
      ))}
      {total === 0 && <div style={{ color: 'var(--text3)', fontSize: 12 }}>No data yet</div>}
    </div>
  )
}
