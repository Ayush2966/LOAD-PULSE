import { useState, useEffect } from 'react'
import { parseCurl } from '../lib/curlParser'
import type { ParsedCurl } from '../lib/types'

interface Props {
  onParsed: (p: ParsedCurl | null) => void
}

export default function CurlInput({ onParsed }: Props) {
  const [raw, setRaw] = useState('')
  const [err, setErr] = useState('')
  const [parsed, setParsed] = useState<ParsedCurl | null>(null)

  useEffect(() => {
    function onSetCurl(e: Event) {
      const curl = (e as CustomEvent<string>).detail
      setRaw(curl)
      if (!curl.trim()) { setErr(''); setParsed(null); onParsed(null); return }
      try {
        const p = parseCurl(curl)
        setErr('')
        setParsed(p)
        onParsed(p)
      } catch (ex: unknown) {
        setErr((ex as Error).message || 'Parse error')
        setParsed(null)
        onParsed(null)
      }
    }
    window.addEventListener('loadpulse:setcurl', onSetCurl)
    return () => window.removeEventListener('loadpulse:setcurl', onSetCurl)
  }, [onParsed])

  function handleChange(val: string) {
    setRaw(val)
    if (!val.trim()) { setErr(''); setParsed(null); onParsed(null); return }
    try {
      const p = parseCurl(val)
      setErr('')
      setParsed(p)
      onParsed(p)
    } catch (e: unknown) {
      setErr((e as Error).message || 'Parse error')
      setParsed(null)
      onParsed(null)
    }
  }

  const headerCount = parsed ? Object.keys(parsed.headers).length : 0

  return (
    <div>
      <div className="card-title">cURL Command</div>
      <textarea
        className="curl-area w-full"
        placeholder={'curl https://api.example.com/endpoint \\\n  -H "Authorization: Bearer {{token}}" \\\n  -d \'{"key":"{{uuid}}"}\''}
        value={raw}
        onChange={e => handleChange(e.target.value)}
        spellCheck={false}
      />
      {err && <div className="curl-error">⚠ {err}</div>}
      {parsed && !err && (
        <div className="mt-8">
          <div className="pill-row">
            <span className="pill">{parsed.method}</span>
            <span className="pill" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parsed.url}</span>
            {headerCount > 0 && <span className="pill">{headerCount} header{headerCount > 1 ? 's' : ''}</span>}
            {parsed.body && <span className="pill">body</span>}
          </div>
          <div className="curl-ok mt-8">✓ Valid cURL — variables like {'{{uuid}}'}, {'{{seq}}'}, {'{{phone}}'}, {'{{email}}'} auto-injected (see Docs §3)</div>
        </div>
      )}
    </div>
  )
}
