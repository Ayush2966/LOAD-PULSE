import type { TestConfig } from '../lib/types'

type SC = Pick<TestConfig, 'scMin' | 'scMax' | 'latThreshOn' | 'latThresh' | 'bodyCheckOn' | 'bodyCheck' | 'errStopOn' | 'errStopPct' | 'captureBody'>
type SetSC = (patch: Partial<SC>) => void

interface Props { cfg: SC; set: SetSC }

export default function SuccessCriteria({ cfg, set }: Props) {
  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Status Min</label>
          <input type="number" min={100} max={599} value={cfg.scMin} onChange={e => set({ scMin: Number(e.target.value) })} />
        </div>
        <div className="form-group">
          <label className="form-label">Status Max</label>
          <input type="number" min={100} max={599} value={cfg.scMax} onChange={e => set({ scMax: Number(e.target.value) })} />
        </div>
      </div>

      <div className="toggle-row mb-8">
        <input type="checkbox" id="lat-on" checked={cfg.latThreshOn} onChange={e => set({ latThreshOn: e.target.checked })} />
        <label htmlFor="lat-on">Latency threshold</label>
        {cfg.latThreshOn && (
          <div className="input-unit" style={{ marginLeft: 8 }}>
            <input type="number" min={1} value={cfg.latThresh} onChange={e => set({ latThresh: Number(e.target.value) })} style={{ width: 70 }} />
            <select style={{ width: 'auto' }} disabled><option>ms</option></select>
          </div>
        )}
      </div>

      <div className="toggle-row mb-8">
        <input type="checkbox" id="body-on" checked={cfg.bodyCheckOn} onChange={e => set({ bodyCheckOn: e.target.checked })} />
        <label htmlFor="body-on">Body must contain</label>
        {cfg.bodyCheckOn && (
          <input type="text" placeholder="success" value={cfg.bodyCheck} onChange={e => set({ bodyCheck: e.target.value })}
            style={{ marginLeft: 8, flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
        )}
      </div>

      <div className="toggle-row mb-8">
        <input type="checkbox" id="errstop-on" checked={cfg.errStopOn} onChange={e => set({ errStopOn: e.target.checked })} />
        <label htmlFor="errstop-on">Auto-stop if error rate &gt;</label>
        {cfg.errStopOn && (
          <div className="input-unit" style={{ marginLeft: 8 }}>
            <input type="number" min={1} max={100} value={cfg.errStopPct} onChange={e => set({ errStopPct: Number(e.target.value) })} style={{ width: 60 }} />
            <select style={{ width: 'auto' }} disabled><option>%</option></select>
          </div>
        )}
      </div>

      <div className="toggle-row">
        <input type="checkbox" id="cap-body" checked={cfg.captureBody} onChange={e => set({ captureBody: e.target.checked })} />
        <label htmlFor="cap-body">Capture error body (up to 300 chars)</label>
      </div>
    </div>
  )
}
