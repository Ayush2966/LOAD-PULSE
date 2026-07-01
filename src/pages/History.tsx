import { useHistoryStore } from '../store/historyStore'

export default function History() {
  const { runs, clearAll } = useHistoryStore()

  return (
    <div>
      <div className="flex items-center justify-between mb-16">
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Run History</h2>
        {runs.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll}>Clear All</button>
        )}
      </div>

      {runs.length === 0 ? (
        <div className="hist-empty">No runs yet. Go to Run tab and start a test.</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="hist-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Method</th>
                <th>Pattern</th>
                <th>Elapsed</th>
                <th>RPS</th>
                <th>Total</th>
                <th>OK</th>
                <th>Fail</th>
                <th>Success%</th>
                <th>Avg</th>
                <th>P95</th>
                <th>P99</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => {
                const sr = parseFloat(r.sr)
                const srClass = sr >= 99 ? 'text-green' : sr < 90 ? 'text-red' : ''
                return (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{r.url}</td>
                    <td><span className="badge badge-blue">{r.method}</span></td>
                    <td>{r.pattern}</td>
                    <td>{r.elapsed}s</td>
                    <td>{r.rps}</td>
                    <td>{r.total}</td>
                    <td className="text-green">{r.ok}</td>
                    <td className={r.fail > 0 ? 'text-red' : ''}>{r.fail}</td>
                    <td className={srClass}>{r.sr}%</td>
                    <td>{r.avg}ms</td>
                    <td>{r.p95}ms</td>
                    <td>{r.p99}ms</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
