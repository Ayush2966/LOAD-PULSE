import * as XLSX from 'xlsx'
import type { LogEntry, ReportData } from './types'

export function exportCSV(rows: object[], filename: string) {
  const keys = Object.keys(rows[0] || {})
  const header = keys.join(',')
  const lines = rows.map(r =>
    keys.map(k => {
      const v = String((r as Record<string, unknown>)[k] ?? '')
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"`
        : v
    }).join(',')
  )
  const csv = [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export function exportExcel(log: LogEntry[], report: ReportData, filename: string) {
  const wb = XLSX.utils.book_new()

  const logRows = log.map(e => ({
    Time: e.t,
    Status: e.status ?? 'ERR',
    Latency_ms: e.lat,
    OK: e.ok ? 'yes' : 'no',
    Message: e.msg,
  }))
  const ws1 = XLSX.utils.json_to_sheet(logRows.length ? logRows : [{ Time: '', Status: '', Latency_ms: '', OK: '', Message: '' }])
  XLSX.utils.book_append_sheet(wb, ws1, 'Request Log')

  const m = report.meta
  const summaryRows = [
    { Metric: 'URL', Value: m.url },
    { Metric: 'Method', Value: m.method },
    { Metric: 'Pattern', Value: m.pattern },
    { Metric: 'Total Requests', Value: m.total },
    { Metric: 'Successful', Value: m.ok },
    { Metric: 'Failed', Value: m.fail },
    { Metric: 'Success Rate', Value: m.successRate + '%' },
    { Metric: 'Elapsed (s)', Value: m.elapsed },
    { Metric: 'Req/s', Value: m.rps },
    { Metric: 'Avg Latency (ms)', Value: m.avgLatMs },
    { Metric: 'p95 Latency (ms)', Value: m.p95Ms },
    { Metric: 'p99 Latency (ms)', Value: m.p99Ms },
    { Metric: 'Max Latency (ms)', Value: m.maxLatMs },
  ]
  const ws2 = XLSX.utils.json_to_sheet(summaryRows)
  XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

  const failRows = Object.entries(report.failures).map(([reason, f]) => ({
    Reason: reason,
    Count: f.count,
    Type: f.type,
    Sample_Body: f.bodies[0] ?? '',
  }))
  if (failRows.length) {
    const ws3 = XLSX.utils.json_to_sheet(failRows)
    XLSX.utils.book_append_sheet(wb, ws3, 'Failures')
  }

  XLSX.writeFile(wb, filename)
}
