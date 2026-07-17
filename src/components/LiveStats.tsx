import { useTestStore } from '../store/testStore'

export default function LiveStats() {
  // Select only the fields this component displays so it re-renders on those
  // alone (not on every chartPts/tputPts/logBuf mutation). Percentiles are
  // pre-computed on the store's throttled tick, so nothing sorts in render.
  const stats = useTestStore(s => s.stats)
  const elapsedSec = useTestStore(s => s.elapsedSec)
  const actualRps = useTestStore(s => s.actualRps)
  const thresholdMsg = useTestStore(s => s.thresholdMsg)
  const livePercentiles = useTestStore(s => s.livePercentiles)
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
        {stats.skipped > 0 && (
          <div className="stat-box" title="Requests dropped because the endpoint couldn't keep up with the target rate">
            <div className="stat-label">Skipped</div>
            <div className="stat-value text-yellow">{stats.skipped}</div>
          </div>
        )}
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
