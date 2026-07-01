import type { ChainStep, Extractor } from '../lib/chainExecutor'

interface Props {
  steps: ChainStep[]
  onChange: (steps: ChainStep[]) => void
}

function newStep(): ChainStep {
  return { id: Math.random().toString(36).slice(2), curl: '', extractors: [] }
}
function newExtractor(): Extractor {
  return { varName: '', source: 'body', path: '' }
}

export default function ChainBuilder({ steps, onChange }: Props) {
  function updateStep(id: string, patch: Partial<ChainStep>) {
    onChange(steps.map(s => s.id === id ? { ...s, ...patch } : s))
  }
  function removeStep(id: string) {
    onChange(steps.filter(s => s.id !== id))
  }
  function addExtractor(stepId: string) {
    const step = steps.find(s => s.id === stepId)
    if (!step) return
    updateStep(stepId, { extractors: [...step.extractors, newExtractor()] })
  }
  function updateExtractor(stepId: string, i: number, patch: Partial<Extractor>) {
    const step = steps.find(s => s.id === stepId)
    if (!step) return
    const extractors = step.extractors.map((e, idx) => idx === i ? { ...e, ...patch } : e)
    updateStep(stepId, { extractors })
  }
  function removeExtractor(stepId: string, i: number) {
    const step = steps.find(s => s.id === stepId)
    if (!step) return
    updateStep(stepId, { extractors: step.extractors.filter((_, idx) => idx !== i) })
  }

  return (
    <div>
      {steps.map((step, si) => (
        <div key={step.id} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 6, padding: 12, marginBottom: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)',
              color: '#fff', fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>{si + 1}</span>
            <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 600 }}>
              {si === 0 ? 'Setup request (runs once before load test)' : `Chain step ${si + 1}`}
            </span>
            <button
              onClick={() => removeStep(step.id)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}
            >×</button>
          </div>

          <textarea
            value={step.curl}
            onChange={e => updateStep(step.id, { curl: e.target.value })}
            placeholder={si === 0
              ? "curl -X POST https://api.example.com/auth -d '{\"user\":\"admin\",\"pass\":\"secret\"}'"
              : 'Use {{chain.token}} in your main cURL command'}
            style={{
              width: '100%', minHeight: 68, background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 4,
              color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: 11.5,
              lineHeight: 1.7, padding: '8px 10px', resize: 'vertical', outline: 'none'
            }}
          />

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
              Extract variables from response
            </div>
            {step.extractors.map((ex, ei) => (
              <div key={ei} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>chain.</span>
                <input
                  value={ex.varName}
                  onChange={e => updateExtractor(step.id, ei, { varName: e.target.value })}
                  placeholder="token"
                  style={{ width: 80, fontSize: 11, padding: '3px 7px' }}
                />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>from</span>
                <select
                  value={ex.source}
                  onChange={e => updateExtractor(step.id, ei, { source: e.target.value as 'body' | 'header' })}
                  style={{ fontSize: 11, padding: '3px 6px' }}
                >
                  <option value="body">body</option>
                  <option value="header">header</option>
                </select>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>path</span>
                <input
                  value={ex.path}
                  onChange={e => updateExtractor(step.id, ei, { path: e.target.value })}
                  placeholder={ex.source === 'body' ? 'data.token' : 'Authorization'}
                  style={{ flex: 1, minWidth: 80, fontSize: 11, padding: '3px 7px' }}
                />
                <button
                  onClick={() => removeExtractor(step.id, ei)}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 14 }}
                >×</button>
              </div>
            ))}
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 2, fontSize: 11 }}
              onClick={() => addExtractor(step.id)}
            >
              + Extract variable
            </button>
          </div>
        </div>
      ))}

      <button className="btn btn-ghost btn-sm" onClick={() => onChange([...steps, newStep()])}>
        + Add chain step
      </button>

      {steps.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)', background: 'var(--bg2)', borderRadius: 4, padding: '7px 10px' }}>
          💡 Use <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{'{{chain.varName}}'}</code> in your main cURL command to inject extracted values.
        </div>
      )}
    </div>
  )
}
