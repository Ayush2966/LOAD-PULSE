import { useState, useRef } from 'react'
import { parsePostmanCollection } from '../lib/postmanParser'
import type { PostmanRequest } from '../lib/postmanParser'

interface Props {
  onSelect: (curl: string) => void
  onClose: () => void
}

export default function PostmanImport({ onSelect, onClose }: Props) {
  const [requests, setRequests] = useState<PostmanRequest[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [loaded, setLoaded] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function processJson(text: string) {
    try {
      const json = JSON.parse(text)
      const reqs = parsePostmanCollection(json)
      if (reqs.length === 0) throw new Error('No requests found in collection')
      setRequests(reqs)
      setLoaded(true)
      setError('')
    } catch (e) {
      setError((e as Error).message)
      setRequests([])
      setLoaded(false)
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => processJson(ev.target?.result as string)
    reader.readAsText(file)
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    processJson(e.clipboardData.getData('text'))
  }

  const filtered = requests.filter(r => {
    if (!query) return true
    const q = query.toLowerCase()
    return r.name.toLowerCase().includes(q) || r.url.toLowerCase().includes(q) || r.folder.toLowerCase().includes(q)
  })

  // Group by folder
  const grouped: Record<string, PostmanRequest[]> = {}
  for (const r of filtered) {
    const key = r.folder || '(root)'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  }

  function pick(req: PostmanRequest) {
    const parts: string[] = [`curl -X ${req.method} '${req.url}'`]
    for (const [k, v] of Object.entries(req.headers)) {
      parts.push(`  -H '${k}: ${v}'`)
    }
    if (req.body) {
      const escaped = req.body.replace(/'/g, "'\\''")
      parts.push(`  -d '${escaped}'`)
    }
    const curl = parts.join(' \\\n')
    onSelect(curl)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--bg1)', border: '1px solid var(--border)', borderRadius: 10,
        width: 'min(640px, 96vw)', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        padding: 20, gap: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>📦 Import from Postman</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {!loaded ? (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>
                Choose .json file
              </button>
              <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={handleFile} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>— or paste JSON below —</div>
            <textarea
              className="curl-area"
              style={{ height: 120, fontFamily: 'var(--font-mono)', fontSize: 11 }}
              placeholder="Paste Postman Collection JSON here…"
              onPaste={handlePaste}
              onChange={() => {}}
            />
            {error && <div className="curl-error">⚠ {error}</div>}
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Export a collection from Postman: Collections → ··· → Export → Collection v2.1
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search requests…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{
                  flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '6px 10px', color: 'var(--text1)', fontSize: 13,
                }}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => { setLoaded(false); setRequests([]); setQuery('') }}>
                ← Back
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {Object.entries(grouped).map(([folder, reqs]) => (
                <div key={folder}>
                  {folder !== '(root)' && (
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase',
                      letterSpacing: '0.05em', padding: '6px 0 2px',
                    }}>{folder}</div>
                  )}
                  {reqs.map((req, i) => (
                    <button
                      key={i}
                      onClick={() => pick(req)}
                      style={{
                        width: '100%', textAlign: 'left', background: 'var(--bg2)',
                        border: '1px solid var(--border)', borderRadius: 6,
                        padding: '8px 10px', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: 8, marginBottom: 2,
                      }}
                      className="postman-req-btn"
                    >
                      <span style={{
                        fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        background: methodColor(req.method) + '22', color: methodColor(req.method),
                        borderRadius: 4, padding: '2px 5px', minWidth: 40, textAlign: 'center',
                      }}>{req.method}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--text1)', fontWeight: 500 }}>{req.name}</div>
                        <div style={{
                          fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{req.url}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 24 }}>No requests match</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function methodColor(method: string): string {
  switch (method) {
    case 'GET': return '#2ea043'
    case 'POST': return '#388bfd'
    case 'PUT': return '#d29922'
    case 'PATCH': return '#bc8cff'
    case 'DELETE': return '#f85149'
    default: return 'var(--text2)'
  }
}
