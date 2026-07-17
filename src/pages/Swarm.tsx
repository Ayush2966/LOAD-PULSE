import { useState, useEffect } from 'react'
import { useSwarmStore, swarmSummary } from '../store/swarmStore'
import type { ParsedCurl, PatternType, TestConfig } from '../lib/types'
import CurlInput from '../components/CurlInput'
import PatternPicker from '../components/PatternPicker'
import ProgressBar from '../components/ProgressBar'
import ThroughputChart from '../components/ThroughputChart'
import StatusDist from '../components/StatusDist'
import QrCode from '../components/QrCode'
import NodeLatencyBars from '../components/NodeLatencyBars'

const DEFAULT_FORM = {
  constRate: 10, constRateUnit: 's' as const, constDur: 30, constDurUnit: 's' as const,
  rampStart: 1, rampEnd: 20, rampDur: 30, rampDurUnit: 's' as const, rampConcur: 20,
  steps: [{ rate: 5, dur: 10 }], stepConcur: 30, stepTimeout: 5000,
  spikeBase: 5, spikeRate: 100, spikeDur: 60, spikeBurst: 10,
  soakRate: 5, soakDur: 5, soakDurUnit: 'm' as const, soakConcur: 10,
  timeout: 10000, concur: 20,
  scMin: 200, scMax: 299,
  latThreshOn: false, latThresh: 2000,
  bodyCheckOn: false, bodyCheck: '',
  errStopOn: false, errStopPct: 50,
  captureBody: false,
}

export default function Swarm() {
  const { role, roomId, status, errorMsg, nodes, agg, tputPts, progressPct, startHost, startTestOnHost, joinRoom, leave, exportReport, kickNode } = useSwarmStore()
  const [parsed, setParsed] = useState<ParsedCurl | null>(null)
  const [pattern, setPattern] = useState<PatternType>('constant')
  const [joinCode, setJoinCode] = useState('')
  const [hostPass, setHostPass] = useState('')
  const [joinPass, setJoinPass] = useState('')

  useEffect(() => () => { if (useSwarmStore.getState().role !== 'idle') leave() }, [])

  // auto-fill room code if opened via a shared join link (?join=<code>)
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('join')
    if (code) setJoinCode(code)
  }, [])

  const remoteNodes = Object.values(nodes).filter(n => n.nodeId !== 'host-self')
  const nodeCount = remoteNodes.length + (role === 'host' ? 1 : 0)
  const summary = swarmSummary(agg)
  const joinUrl = roomId ? `${window.location.origin}/swarm?join=${roomId}` : ''

  function handleHostStart() {
    if (!parsed) return
    const cfg: TestConfig = { parsed, pattern, ...DEFAULT_FORM }
    startHost(cfg, pattern, hostPass.trim())
  }

  return (
    <div className="run-page">
      <div className="card">
        <div className="card-title">🐝 Swarm Mode</div>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
          Turn multiple browsers into a distributed load-generation cluster — no server, no cloud workers.
          Peer-to-peer over WebRTC. One person hosts, others join with a room code and each device fires its
          share of the load; results aggregate live on the host.
        </p>
      </div>

      {role === 'idle' && (
        <div className="config-row">
          <div className="card config-pattern">
            <div className="card-title">Host a swarm test</div>
            <div style={{ marginTop: 12 }}>
              <CurlInput onParsed={setParsed} />
            </div>
            <div style={{ marginTop: 12 }}>
              <PatternPicker value={pattern} onChange={setPattern} />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Passcode (optional)</label>
              <input
                type="text"
                value={hostPass}
                onChange={e => setHostPass(e.target.value)}
                placeholder="Leave blank for an open room"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!parsed} onClick={handleHostStart}>
              Create swarm room
            </button>
          </div>

          <div className="card config-criteria">
            <div className="card-title">Join a swarm</div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Room code</label>
              <input
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                placeholder="e.g. a1b2c3"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">Passcode (if required)</label>
              <input
                type="text"
                value={joinPass}
                onChange={e => setJoinPass(e.target.value)}
                placeholder="Leave blank for an open room"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </div>
            <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={!joinCode.trim()} onClick={() => joinRoom(joinCode.trim(), joinPass.trim())}>
              Join as a node
            </button>
          </div>
        </div>
      )}

      {role === 'host' && status === 'waiting' && (
        <div className="card">
          <div className="card-title">Room ready — share this with your swarm</div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <code style={{ fontSize: 20, padding: '6px 12px', background: 'var(--bg2)', borderRadius: 6 }}>{roomId}</code>
                <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(joinUrl)}>Copy link</button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>📱 Scan the QR to join from a phone or another device</div>
              {hostPass.trim() && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>🔒 Passcode required — share it separately (it isn’t in the link or QR)</div>
              )}
            </div>
            <QrCode value={joinUrl} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 8 }}>
            {nodeCount - 1} node(s) joined (plus you, the host). Start whenever ready — each joined device gets an equal share of the configured rate.
          </p>
          {remoteNodes.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {remoteNodes.map(n => (
                <div key={n.nodeId} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{n.nodeId.slice(0, 10)}</span>
                  <span style={{ color: n.connected ? '#2ea043' : '#f85149' }}>{n.connected ? '🟢' : '🔴'}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => kickNode(n.nodeId)} title="Remove this node from the swarm">Kick</button>
                </div>
              ))}
            </div>
          )}
          <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={startTestOnHost}>▶ Start swarm test</button>
          <button className="btn btn-ghost" style={{ marginLeft: 8 }} onClick={leave}>Cancel</button>
        </div>
      )}

      {role === 'node' && status === 'waiting' && (
        <div className="card">
          <div className="card-title">Connected — waiting for host to start…</div>
          <p style={{ fontSize: 12, color: 'var(--text3)' }}>Room: {roomId}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="card">
          <div style={{ color: '#f85149' }}>✗ {errorMsg}</div>
          <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={leave}>Back</button>
        </div>
      )}

      {(status === 'running' || status === 'done') && (
        <>
          <div className="card">
            <div className="card-title">
              {role === 'host' ? `Swarm running — ${nodeCount} node(s)` : `Reporting to swarm — room ${roomId}`}
              {status === 'done' && '  ✓ done'}
            </div>
            <ProgressBar pct={progressPct} />
          </div>

          {role === 'host' && (
            <>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="card-title">Aggregated stats (all nodes)</div>
                  <button className="btn btn-ghost btn-sm" onClick={exportReport} title="Download swarm report as JSON">
                    ⬇ Export Report
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 24, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  <span>Sent: {summary.sent}</span>
                  <span>OK: {summary.ok}</span>
                  <span>Fail: {summary.fail}</span>
                  {summary.skipped > 0 && (
                    <span className="text-yellow" title="Requests dropped because endpoints couldn't keep up with the target rate">Skipped: {summary.skipped}</span>
                  )}
                  <span>Success: {summary.successRate}%</span>
                  <span>Avg: {summary.avg}ms</span>
                  <span>p95: {summary.p95}ms</span>
                  <span>p99: {summary.p99}ms</span>
                </div>
              </div>

              <div className="charts-grid">
                <div className="card">
                  <div className="card-title">Combined throughput (req/s)</div>
                  <ThroughputChart points={tputPts} />
                </div>
                <div className="card">
                  <div className="card-title">Status distribution</div>
                  <StatusDist codes={agg.codes} total={agg.sent} />
                </div>
              </div>

              <div className="card">
                <div className="card-title">Per-node latency</div>
                <NodeLatencyBars nodes={Object.values(nodes)} />
              </div>

              <div className="card">
                <div className="card-title">Nodes</div>
                <table className="hist-table">
                  <thead><tr><th>Node</th><th>Status</th><th>Sent</th><th>OK</th><th>Fail</th><th></th></tr></thead>
                  <tbody>
                    <tr><td>host (you)</td><td>connected</td><td colSpan={4}>included in aggregate above</td></tr>
                    {remoteNodes.map(n => (
                      <tr key={n.nodeId}>
                        <td>{n.nodeId.slice(0, 10)}</td>
                        <td>{n.connected ? '🟢 connected' : '🔴 left'}</td>
                        <td>{n.sent}</td><td>{n.ok}</td><td>{n.fail}</td>
                        <td>{n.connected && <button className="btn btn-ghost btn-sm" onClick={() => kickNode(n.nodeId)} title="Remove this node from the swarm">Kick</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {role === 'node' && (
            <div className="card">
              <div className="card-title">Your contribution</div>
              <div style={{ display: 'flex', gap: 24, marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                <span>Sent: {agg.sent}</span>
                <span>OK: {agg.ok}</span>
                <span>Fail: {agg.fail}</span>
              </div>
            </div>
          )}

          <button className="btn btn-ghost" onClick={leave}>{status === 'done' ? 'Close' : 'Leave swarm'}</button>
        </>
      )}
    </div>
  )
}
