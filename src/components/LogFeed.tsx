import { memo } from 'react'
import type { LogEntry } from '../lib/types'

interface Props { entries: LogEntry[] }

function LogFeed({ entries }: Props) {
  return (
    <div className="log-feed">
      {entries.length === 0 && (
        <div style={{ padding: '12px', color: 'var(--text3)', textAlign: 'center' }}>Waiting for requests…</div>
      )}
      {entries.map((e, i) => (
        <div key={i} className="log-row">
          <span className="log-t">{e.t}</span>
          <span className={e.ok ? 'badge badge-green' : 'badge badge-red'} style={{ minWidth: 36, justifyContent: 'center' }}>
            {e.status ?? '—'}
          </span>
          <span className="log-lat">{e.lat}ms</span>
          <span className="log-msg">{e.msg}</span>
        </div>
      ))}
    </div>
  )
}

// Memoized so the 150-row list only re-renders when `entries` changes by
// reference — a fresh array only on the ~4/sec flush, not on every Run render.
export default memo(LogFeed)
