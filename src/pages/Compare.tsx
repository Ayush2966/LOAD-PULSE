import { useState } from 'react'
import { useHistoryStore } from '../store/historyStore'
import type { RunRecord } from '../lib/types'

function better(a: number, b: number, lowerIsBetter: boolean): { a: boolean; b: boolean } {
  if (a === b) return { a: false, b: false }
  return lowerIsBetter
    ? { a: a < b, b: b < a }
    : { a: a > b, b: b > a }
}

function ComparePair({ a, b }: { a: RunRecord; b: RunRecord }) {
  const rows: { label: string; av: string | number; bv: string | number; lower?: boolean }[] = [
    { label: 'Success%', av: parseFloat(a.sr), bv: parseFloat(b.sr), lower: false },
    { label: 'RPS', av: parseFloat(a.rps), bv: parseFloat(b.rps), lower: false },
    { label: 'Avg lat', av: a.avg, bv: b.avg, lower: true },
    { label: 'P95', av: a.p95, bv: b.p95, lower: true },
    { label: 'P99', av: a.p99, bv: b.p99, lower: true },
    { label: 'Fail', av: a.fail, bv: b.fail, lower: true },
  ]

  return (
    <div className="card">
      <div className="card-title">Comparison</div>
      <div className="compare-grid">
        <div className="compare-col">
          <h3>Run A</h3>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginBottom: 8, wordBreak: 'break-all' }}>{a.url}</div>
          {rows.map(r => {
            const w = better(r.av as number, r.bv as number, r.lower ?? true)
            return (
              <div key={r.label} className="cmp-row">
                <span className="cmp-k">{r.label}</span>
                <span className={w.a ? 'cmp-win' : w.b ? 'cmp-lose' : 'cmp-v'}>{r.av}</span>
              </div>
            )
          })}
        </div>
        <div className="compare-col">
          <h3>Run B</h3>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', marginBottom: 8, wordBreak: 'break-all' }}>{b.url}</div>
          {rows.map(r => {
            const w = better(r.av as number, r.bv as number, r.lower ?? true)
            return (
              <div key={r.label} className="cmp-row">
                <span className="cmp-k">{r.label}</span>
                <span className={w.b ? 'cmp-win' : w.a ? 'cmp-lose' : 'cmp-v'}>{r.bv}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Compare() {
  const { runs } = useHistoryStore()
  const [selA, setSelA] = useState<number>(-1)
  const [selB, setSelB] = useState<number>(-1)

  const runA = runs.find(r => r.id === selA)
  const runB = runs.find(r => r.id === selB)

  if (runs.length === 0) {
    return <div className="hist-empty">No runs yet. Complete at least two runs to compare.</div>
  }

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Compare Runs</h2>
      <div className="form-row mb-16">
        <div className="form-group">
          <label className="form-label">Run A</label>
          <select value={selA} onChange={e => setSelA(Number(e.target.value))} style={{ fontFamily: 'var(--font)', fontSize: 13 }}>
            <option value={-1}>Select a run…</option>
            {runs.map(r => (
              <option key={r.id} value={r.id}>{r.method} {r.url.slice(0, 50)} — {r.sr}% ok</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Run B</label>
          <select value={selB} onChange={e => setSelB(Number(e.target.value))} style={{ fontFamily: 'var(--font)', fontSize: 13 }}>
            <option value={-1}>Select a run…</option>
            {runs.map(r => (
              <option key={r.id} value={r.id}>{r.method} {r.url.slice(0, 50)} — {r.sr}% ok</option>
            ))}
          </select>
        </div>
      </div>
      {runA && runB && runA.id !== runB.id && <ComparePair a={runA} b={runB} />}
      {runA && runB && runA.id === runB.id && (
        <div style={{ color: 'var(--text3)', fontSize: 13 }}>Select two different runs.</div>
      )}
    </div>
  )
}
