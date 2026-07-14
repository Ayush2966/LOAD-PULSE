import { useState } from 'react'
import type { ReportData, LogEntry } from '../lib/types'
import LatencyChart from './LatencyChart'
import ThroughputChart from './ThroughputChart'
import Histogram from './Histogram'
import PercentileTable from './PercentileTable'
import ApdexCard from './ApdexCard'
import { useTestStore } from '../store/testStore'
import { exportCSV, exportExcel } from '../lib/exporter'
import { buildShareUrl } from '../lib/shareReport'

interface Props { report: ReportData; log?: LogEntry[]; latencies?: number[] }

export default function ReportView({ report, log = [], latencies }: Props) {
  const { chartPts, tputPts } = useTestStore()
  const [exportingExcel, setExportingExcel] = useState(false)
  const m = report.meta
  const sr = parseFloat(m.successRate)
  const srClass = sr >= 99 ? 'text-green' : sr >= 90 ? '' : 'text-red'

  const failEntries = Object.entries(report.failures)

  async function handleExcel() {
    setExportingExcel(true)
    try {
      await exportExcel(log, report, 'loadpulse-report.xlsx')
    } finally {
      setExportingExcel(false)
    }
  }

  function exportJson() {
    const b = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'loadpulse-report.json'; a.click()
  }

  function copyMd() {
    const rows = Object.entries(report.failures).map(([k, f]) => `| ${k} | ${f.count} | ${(f.count / m.total * 100).toFixed(1)}% |`).join('\n')
    navigator.clipboard.writeText(`## LoadPulse Report\n**${m.method} ${m.url}**\n\n| Metric | Value |\n|---|---|\n| Total | ${m.total} |\n| Success | ${m.ok} (${m.successRate}%) |\n| Failed | ${m.fail} |\n| Req/s | ${m.rps} |\n| Avg | ${m.avgLatMs}ms |\n| p95 | ${m.p95Ms}ms |\n| p99 | ${m.p99Ms}ms |\n\n### Failures\n| Reason | Count | % |\n|---|---|---|\n${rows || '| — | 0 | 0% |'}`)
  }

  function handleCSV() {
    if (log.length) {
      exportCSV(log.map(e => ({
        time: e.t,
        status: e.status ?? 'ERR',
        latency_ms: e.lat,
        ok: e.ok ? 'yes' : 'no',
        message: e.msg,
      })), 'loadpulse-log.csv')
    } else {
      exportCSV([{
        url: m.url, method: m.method, total: m.total, ok: m.ok, fail: m.fail,
        success_rate: m.successRate + '%', rps: m.rps, avg_ms: m.avgLatMs,
        p95_ms: m.p95Ms, p99_ms: m.p99Ms, max_ms: m.maxLatMs,
      }], 'loadpulse-summary.csv')
    }
  }

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

      {latencies && latencies.length > 0 && (
        <div className="card mb-16">
          <div className="card-title mb-12">Apdex Score & SLA</div>
          <ApdexCard
            latencies={latencies}
            successRate={parseFloat(m.successRate)}
            avg={m.avgLatMs}
            p95={m.p95Ms}
            p99={m.p99Ms}
          />
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

      <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={(e) => {
          const btn = e.currentTarget
          const orig = btn.textContent
          const url = buildShareUrl(report)
          navigator.clipboard.writeText(url).then(() => {
            btn.textContent = '✓ Copied!'
            setTimeout(() => { btn.textContent = orig }, 2000)
          }).catch(() => {
            btn.textContent = '✗ Copy failed'
            setTimeout(() => { btn.textContent = orig }, 2000)
          })
        }}>🔗 Share Report</button>
        <button className="btn btn-ghost" onClick={exportJson}>↓ JSON</button>
        <button className="btn btn-ghost" onClick={copyMd}>⎘ Markdown</button>
        <button className="btn btn-ghost" onClick={handleCSV}>↓ CSV</button>
        <button className="btn btn-ghost" onClick={handleExcel} disabled={exportingExcel}>
          {exportingExcel ? 'Preparing…' : '↓ Excel (.xlsx)'}
        </button>
      </div>
    </div>
  )
}
