import { useTestStore } from '../store/testStore'
import { percentile } from '../lib/percentile'

export default function LiveStats() {
  const { stats, elapsedSec, actualRps, thresholdMsg, chartPts } = useTestStore()
  const livePercentiles = chartPts.length > 10 ? {
    p50: percentile(chartPts.map(p => p.lat), 50),
    p95: percentile(chartPts.map(p => p.lat), 95),
    p99: percentile(chartPts.map(p => p.lat), 99),
  } : null
  const sr = stats.sent ? (stats.ok / stats.sent * 100).toFixed(1) : '—'

  return (
    <div>
      {thresholdMsg && (
        <div style={{ background: 'var(--red-t)', border: '1px solid var(--red)', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#f85149' }}>
          {thresholdMsg}
        </div>
      )}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">Sent</div>
          <div className="stat-value">{stats.sent}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">OK</div>
          <div className="stat-value text-green">{stats.ok}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Fail</div>
          <div className="stat-value text-red">{stats.fail}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Success</div>
          <div className="stat-value">{sr}{sr !== '—' ? '%' : ''}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">RPS</div>
          <div className="stat-value">{actualRps}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Elapsed</div>
          <div className="stat-value">{elapsedSec}s</div>
        </div>
      </div>
      {stats.sent > 10 && livePercentiles && (
        <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text3)', flexWrap: 'wrap' }}>
          <span>p50 <span style={{ color: 'var(--text)' }}>{livePercentiles.p50}ms</span></span>
          <span>p95 <span style={{ color: 'var(--text)' }}>{livePercentiles.p95}ms</span></span>
          <span>p99 <span style={{ color: 'var(--text)' }}>{livePercentiles.p99}ms</span></span>
        </div>
      )}
    </div>
  )
}
