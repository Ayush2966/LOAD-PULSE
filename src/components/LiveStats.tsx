import { useTestStore } from '../store/testStore'

export default function LiveStats() {
  const { stats, elapsedSec, actualRps, thresholdMsg } = useTestStore()
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
    </div>
  )
}
