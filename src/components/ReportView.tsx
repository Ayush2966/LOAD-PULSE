import type { ReportData } from '../lib/types'
import LatencyChart from './LatencyChart'
import ThroughputChart from './ThroughputChart'
import Histogram from './Histogram'
import PercentileTable from './PercentileTable'
import { useTestStore } from '../store/testStore'

interface Props { report: ReportData; latencies?: number[] }

export default function ReportView({ report, latencies }: Props) {
  const { chartPts, tputPts } = useTestStore()
  const m = report.meta
  const sr = parseFloat(m.successRate)
  const srClass = sr >= 99 ? 'text-green' : sr >= 90 ? '' : 'text-red'

  const failEntries = Object.entries(report.failures)

  return (
    <div>
      <div className="section-sep" />
      <div className="card-title mb-12">Final Report</div>

      <div className="stats-grid mb-16">
        <div className="stat-box">
          <div className="stat-label">Total</div>
          <div className="stat-value">{m.total}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">OK</div>
          <div className="stat-value text-green">{m.ok}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Fail</div>
          <div className="stat-value text-red">{m.fail}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Success Rate</div>
          <div className={`stat-value ${srClass}`}>{m.successRate}%</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Avg lat</div>
          <div className="stat-value">{m.avgLatMs}ms</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">P95</div>
          <div className="stat-value">{m.p95Ms}ms</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">P99</div>
          <div className="stat-value">{m.p99Ms}ms</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Max lat</div>
          <div className="stat-value">{m.maxLatMs}ms</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">RPS</div>
          <div className="stat-value">{m.rps}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Elapsed</div>
          <div className="stat-value">{m.elapsed}s</div>
        </div>
      </div>

      <div className="card mb-8">
        <div className="card-title">Latency Over Time</div>
        <LatencyChart points={chartPts} />
      </div>

      <div className="card mb-8">
        <div className="card-title">Throughput (req/s)</div>
        <ThroughputChart points={tputPts} />
      </div>

      <div className="card mb-16">
        <div className="card-title">Latency Distribution</div>
        <Histogram points={chartPts} />
      </div>

      {latencies && latencies.length > 0 && (
        <div className="card mb-16">
          <PercentileTable latencies={latencies} />
        </div>
      )}

      {failEntries.length > 0 && (
        <div>
          <div className="card-title mb-8">Failure Breakdown</div>
          {failEntries.map(([reason, g]) => (
            <div key={reason} className="failure-item">
              <div className="failure-header">
                <span className="text-sm text-muted">{reason}</span>
                <span className={`badge ${g.type === 'net' ? 'badge-gray' : g.type === 'h5' ? 'badge-red' : 'badge-yellow'}`}>
                  {g.count}×
                </span>
              </div>
              {g.bodies.map((b, i) => (
                <div key={i} className="failure-body">{b}</div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
