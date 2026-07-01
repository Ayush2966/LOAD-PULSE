import { useState, useCallback, useEffect } from 'react'
import { useTestStore } from '../store/testStore'
import { useHistoryStore } from '../store/historyStore'
import { describeTest } from '../lib/loadPatterns'
import type { ParsedCurl, PatternType, StepConfig, TestConfig } from '../lib/types'

import CurlInput from '../components/CurlInput'
import PatternPicker from '../components/PatternPicker'
import StepEditor from '../components/StepEditor'
import SuccessCriteria from '../components/SuccessCriteria'
import Presets from '../components/Presets'
import LiveStats from '../components/LiveStats'
import ProgressBar from '../components/ProgressBar'
import StatusDist from '../components/StatusDist'
import LogFeed from '../components/LogFeed'
import ReportView from '../components/ReportView'
import LatencyChart from '../components/LatencyChart'
import ThroughputChart from '../components/ThroughputChart'
import { parseCurl } from '../lib/curlParser'

interface FormState {
  constRate: number; constRateUnit: 's' | 'm'; constDur: number; constDurUnit: 's' | 'm'
  rampStart: number; rampEnd: number; rampDur: number; rampDurUnit: 's' | 'm'; rampConcur: number
  steps: StepConfig[]; stepConcur: number; stepTimeout: number
  spikeBase: number; spikeRate: number; spikeDur: number; spikeBurst: number
  soakRate: number; soakDur: number; soakDurUnit: 's' | 'm'; soakConcur: number
  timeout: number; concur: number
  scMin: number; scMax: number
  latThreshOn: boolean; latThresh: number
  bodyCheckOn: boolean; bodyCheck: string
  errStopOn: boolean; errStopPct: number
  captureBody: boolean
}

const DEFAULT_FORM: FormState = {
  constRate: 10, constRateUnit: 's', constDur: 30, constDurUnit: 's',
  rampStart: 1, rampEnd: 20, rampDur: 30, rampDurUnit: 's', rampConcur: 20,
  steps: [{ rate: 5, dur: 10 }, { rate: 15, dur: 10 }, { rate: 30, dur: 10 }],
  stepConcur: 30, stepTimeout: 5000,
  spikeBase: 5, spikeRate: 100, spikeDur: 60, spikeBurst: 10,
  soakRate: 5, soakDur: 5, soakDurUnit: 'm', soakConcur: 10,
  timeout: 10000, concur: 20,
  scMin: 200, scMax: 299,
  latThreshOn: false, latThresh: 2000,
  bodyCheckOn: false, bodyCheck: '',
  errStopOn: false, errStopPct: 50,
  captureBody: true,
}

function buildConfig(parsed: ParsedCurl, pattern: PatternType, form: FormState): TestConfig {
  return { parsed, pattern, ...form }
}

export default function Run() {
  const [parsed, setParsed] = useState<ParsedCurl | null>(null)
  const [pattern, setPattern] = useState<PatternType>('constant')
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [showCriteria, setShowCriteria] = useState(false)

  const { running, status, stats, chartPts, tputPts, logBuf, progressPct, report, thresholdMsg } = useTestStore()
  const { startTest, stopTest, reset } = useTestStore()
  const { addRun } = useHistoryStore()

  const patch = useCallback((p: Partial<FormState>) => setForm(f => ({ ...f, ...p })), [])

  const isDone = status === 'done' || status === 'stopped' || status === 'threshold'
  const isActive = running || isDone

  // Auto-save to history once on completion
  useEffect(() => {
    if (isDone && report && report.meta.total > 0) {
      report.meta.pattern = pattern
      addRun(report, pattern)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!running && parsed) handleStart()
      }
      if (e.key === 'Escape' && running) {
        stopTest('manual')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [running, parsed])

  function handleStart() {
    if (!parsed) return
    reset()
    startTest(buildConfig(parsed, pattern, form), pattern)
  }

  const desc = parsed ? describeTest(pattern, buildConfig(parsed, pattern, form), form.steps) : ''

  function handlePreset(curl: string) {
    try { setParsed(parseCurl(curl)) } catch { /* ignore */ }
  }

  const ni = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    patch({ [field]: Number(e.target.value) } as Partial<FormState>)
  const ns = (field: keyof FormState) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    patch({ [field]: e.target.value } as Partial<FormState>)

  return (
    <div className="run-page">

      {/* ── cURL ── */}
      <div className="card">
        <CurlInput onParsed={setParsed} />
      </div>

      {/* ── Config row: pattern + criteria ── */}
      <div className="config-row">
        <div className="card config-pattern">
          <PatternPicker value={pattern} onChange={setPattern} />

          {pattern === 'constant' && (
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Rate</label>
                <div className="input-unit">
                  <input type="number" min={1} value={form.constRate} onChange={ni('constRate')} />
                  <select value={form.constRateUnit} onChange={ns('constRateUnit')}><option value="s">/ s</option><option value="m">/ min</option></select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <div className="input-unit">
                  <input type="number" min={1} value={form.constDur} onChange={ni('constDur')} />
                  <select value={form.constDurUnit} onChange={ns('constDurUnit')}><option value="s">s</option><option value="m">min</option></select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Concurrency</label>
                <input type="number" min={1} max={500} value={form.concur} onChange={ni('concur')} />
              </div>
              <div className="form-group">
                <label className="form-label">Timeout (ms)</label>
                <input type="number" min={100} value={form.timeout} onChange={ni('timeout')} />
              </div>
            </div>
          )}

          {pattern === 'ramp' && (
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Start (req/s)</label><input type="number" min={0} value={form.rampStart} onChange={ni('rampStart')} /></div>
              <div className="form-group"><label className="form-label">End (req/s)</label><input type="number" min={1} value={form.rampEnd} onChange={ni('rampEnd')} /></div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <div className="input-unit">
                  <input type="number" min={1} value={form.rampDur} onChange={ni('rampDur')} />
                  <select value={form.rampDurUnit} onChange={ns('rampDurUnit')}><option value="s">s</option><option value="m">min</option></select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Concurrency</label><input type="number" min={1} value={form.rampConcur} onChange={ni('rampConcur')} /></div>
              <div className="form-group"><label className="form-label">Timeout (ms)</label><input type="number" min={100} value={form.timeout} onChange={ni('timeout')} /></div>
            </div>
          )}

          {pattern === 'step' && (
            <StepEditor
              steps={form.steps} onChange={steps => patch({ steps })}
              concur={form.stepConcur} onConcurChange={n => patch({ stepConcur: n })}
              timeout={form.stepTimeout} onTimeoutChange={n => patch({ stepTimeout: n })}
            />
          )}

          {pattern === 'spike' && (
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Base (req/s)</label><input type="number" min={0} value={form.spikeBase} onChange={ni('spikeBase')} /></div>
              <div className="form-group"><label className="form-label">Spike (req/s)</label><input type="number" min={1} value={form.spikeRate} onChange={ni('spikeRate')} /></div>
              <div className="form-group"><label className="form-label">Total dur (s)</label><input type="number" min={10} value={form.spikeDur} onChange={ni('spikeDur')} /></div>
              <div className="form-group"><label className="form-label">Burst dur (s)</label><input type="number" min={1} value={form.spikeBurst} onChange={ni('spikeBurst')} /></div>
              <div className="form-group"><label className="form-label">Timeout (ms)</label><input type="number" min={100} value={form.timeout} onChange={ni('timeout')} /></div>
              <div className="form-group"><label className="form-label">Concurrency</label><input type="number" min={1} value={form.concur} onChange={ni('concur')} /></div>
            </div>
          )}

          {pattern === 'soak' && (
            <div className="form-grid-2">
              <div className="form-group"><label className="form-label">Rate (req/s)</label><input type="number" min={1} value={form.soakRate} onChange={ni('soakRate')} /></div>
              <div className="form-group">
                <label className="form-label">Duration</label>
                <div className="input-unit">
                  <input type="number" min={1} value={form.soakDur} onChange={ni('soakDur')} />
                  <select value={form.soakDurUnit} onChange={ns('soakDurUnit')}><option value="s">s</option><option value="m">min</option></select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Concurrency</label><input type="number" min={1} value={form.soakConcur} onChange={ni('soakConcur')} /></div>
              <div className="form-group"><label className="form-label">Timeout (ms)</label><input type="number" min={100} value={form.timeout} onChange={ni('timeout')} /></div>
            </div>
          )}

          {desc && <div className="desc-bar">{desc}</div>}
        </div>

        <div className="card config-criteria">
          <button
            className="card-title criteria-toggle"
            onClick={() => setShowCriteria(s => !s)}
          >
            Success Criteria <span className="criteria-chevron">{showCriteria ? '▲' : '▼'}</span>
          </button>
          {showCriteria && (
            <div style={{ marginTop: 12 }}>
              <SuccessCriteria cfg={form} set={p => patch(p as Partial<FormState>)} />
            </div>
          )}
          {!showCriteria && (
            <div className="criteria-summary">
              <span>Status {form.scMin}–{form.scMax}</span>
              {form.latThreshOn && <span>· Lat ≤ {form.latThresh}ms</span>}
              {form.errStopOn && <span>· Stop @ {form.errStopPct}% err</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── Presets ── */}
      <div className="card">
        <Presets onSelect={handlePreset} />
      </div>

      {/* ── Action bar ── */}
      <div className="action-bar">
        {!running ? (
          <button className="btn btn-primary btn-run" disabled={!parsed} onClick={handleStart}>
            ▶ Run Test
          </button>
        ) : (
          <button className="btn btn-danger btn-run" onClick={() => stopTest('manual')}>
            ■ Stop
          </button>
        )}
        {(isDone || (status === 'idle' && stats.sent > 0)) && (
          <button className="btn btn-ghost" onClick={reset}>Reset</button>
        )}
        {!parsed && <span className="action-hint">Paste a cURL command above to start</span>}
        <span className="action-hint" style={{ fontSize: 11, marginLeft: 'auto' }}>⌘↵ run · Esc stop</span>
        {thresholdMsg && <span className="threshold-msg">{thresholdMsg}</span>}
      </div>

      {/* ── Live output (only when active) ── */}
      {isActive && (
        <>
          <ProgressBar pct={progressPct} />

          <LiveStats />

          <div className="charts-grid">
            <div className="card">
              <div className="card-title">Latency over time</div>
              <LatencyChart points={chartPts} />
            </div>
            <div className="card">
              <div className="card-title">Throughput (req/s)</div>
              <ThroughputChart points={tputPts} />
            </div>
          </div>

          <div className="card">
            <div className="card-title">Status distribution</div>
            <StatusDist codes={stats.codes} total={stats.sent} />
          </div>

          <div className="card">
            <div className="card-title">Request log</div>
            <LogFeed entries={logBuf} />
          </div>
        </>
      )}

      {/* ── Final report ── */}
      {isDone && report && <ReportView report={report} />}
    </div>
  )
}
