import { useEffect, useState } from 'react'
import { decodeReport } from '../lib/shareReport'
import type { ReportData } from '../lib/types'
import ReportView from '../components/ReportView'

export default function SharedReport() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    const match = hash.match(/data=([^&]+)/)
    if (!match) { setError(true); return }
    const decoded = decodeReport(match[1])
    if (!decoded) { setError(true); return }
    setReport(decoded)
  }, [])

  if (error) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>Invalid or expired share link</div>
      <div style={{ fontSize: 13 }}>The report data in this URL could not be decoded.</div>
      <a href="/" style={{ display: 'inline-block', marginTop: 20, fontSize: 13 }}>← Go to LoadPulse</a>
    </div>
  )

  if (!report) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text3)', fontSize: 13 }}>
      Loading report…
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '12px 16px', background: 'var(--bg1)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Shared LoadPulse Report</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{report.meta.method} {report.meta.url}</div>
          </div>
          <a href="/" className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', textDecoration: 'none' }}>Open LoadPulse →</a>
        </div>
        <ReportView report={report} />
      </div>
    </div>
  )
}
