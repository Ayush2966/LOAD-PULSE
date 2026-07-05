import { create } from 'zustand'
import type { TestConfig, PatternType, TputPoint } from '../lib/types'
import { hostSwarm, joinSwarm, randomRoomId, type HostHandle, type NodeHandle } from '../lib/swarm/swarmNetwork'
import { runSwarmSlice, type SwarmSampleWindow, type ShareRef } from '../lib/swarm/swarmEngine'
import { getDurationMs } from '../lib/loadPatterns'
import { percentile } from '../lib/percentile'
import type { SwarmMessage, SwarmNodeState } from '../lib/swarm/types'

interface AggStats {
  sent: number
  ok: number
  fail: number
  codes: Record<number, number>
  latencies: number[]
}

const emptyAgg = (): AggStats => ({ sent: 0, ok: 0, fail: 0, codes: {}, latencies: [] })

interface SwarmState {
  role: 'idle' | 'host' | 'node'
  roomId: string
  status: 'idle' | 'waiting' | 'running' | 'done' | 'error'
  errorMsg: string
  nodes: Record<string, SwarmNodeState>
  agg: AggStats
  tputPts: TputPoint[]
  startedAt: number
  totalMs: number
  progressPct: number

  startHost: (cfg: TestConfig, pattern: PatternType, passcode: string) => void
  startTestOnHost: () => void
  joinRoom: (roomId: string, passcode: string) => void
  leave: () => void
  exportReport: () => void
}

let hostHandle: HostHandle | null = null
let nodeHandle: NodeHandle | null = null
let hostAbort: AbortController | null = null
let nodeAbort: AbortController | null = null
let hostCfg: TestConfig | null = null
let hostPattern: PatternType | null = null
let uiTimer: ReturnType<typeof setInterval> | null = null
let lastTputSec = -1
let tputAccum = 0
let hostShareRef: ShareRef | null = null
let nodeShareRef: ShareRef | null = null
let hostPasscode = ''

/** Recomputes each node's fair share from the current connected-node count and broadcasts it, so a node joining or leaving mid-run redistributes load instead of leaving stale shares. */
function rebalanceHost(get: () => SwarmState): number {
  const connectedRemote = Object.values(get().nodes).filter(n => n.nodeId !== 'host-self' && n.connected).length
  const share = 1 / (connectedRemote + 1)
  if (hostShareRef) hostShareRef.value = share
  hostHandle?.broadcast({ kind: 'rebalance', shareFraction: share })
  return share
}

function mergeWindow(agg: AggStats, w: SwarmSampleWindow): AggStats {
  const codes = { ...agg.codes }
  for (const [k, v] of Object.entries(w.codes)) codes[Number(k)] = (codes[Number(k)] || 0) + v
  return {
    sent: agg.sent + w.sent,
    ok: agg.ok + w.ok,
    fail: agg.fail + w.fail,
    codes,
    latencies: [...agg.latencies, ...w.latencies].slice(-5000),
  }
}

export const useSwarmStore = create<SwarmState>((set, get) => ({
  role: 'idle',
  roomId: '',
  status: 'idle',
  errorMsg: '',
  nodes: {},
  agg: emptyAgg(),
  tputPts: [],
  startedAt: 0,
  totalMs: 0,
  progressPct: 0,

  startHost(cfg, pattern, passcode) {
    const roomId = randomRoomId()
    hostCfg = cfg
    hostPattern = pattern
    hostPasscode = passcode
    set({
      role: 'host', roomId, status: 'waiting', errorMsg: '',
      nodes: {}, agg: emptyAgg(), tputPts: [], progressPct: 0,
    })

    hostHandle = hostSwarm(
      roomId,
      // a connection opening isn't admission — the node is added only after it
      // passes the passcode challenge (handled in handleIncoming on 'auth')
      () => {},
      nodeId => {
        // guard: only touch state if this peer was actually admitted, so a
        // rejected (unauthenticated) peer closing doesn't create a junk entry
        set(s => (s.nodes[nodeId] ? { nodes: { ...s.nodes, [nodeId]: { ...s.nodes[nodeId], connected: false } } } : {}))
        if (get().status === 'running') rebalanceHost(get)
      },
      (nodeId, msg) => handleIncoming(nodeId, msg, set, get),
      err => set({ status: 'error', errorMsg: err.message || 'Peer connection error' }),
    )
  },

  startTestOnHost() {
    if (!hostHandle || !hostCfg || !hostPattern) return
    const cfg = hostCfg
    const pattern = hostPattern
    const connectedRemote = Object.values(get().nodes).filter(n => n.connected).length
    const share = 1 / (connectedRemote + 1) // +1 for the host itself
    const totalMs = getDurationMs(pattern, cfg)
    const startedAt = Date.now()

    set({ status: 'running', startedAt, totalMs, progressPct: 0, agg: emptyAgg(), tputPts: [] })
    hostHandle.broadcast({ kind: 'start', cfg, pattern, shareFraction: share })

    hostShareRef = { value: share }
    hostAbort = new AbortController()
    void runSwarmSlice(cfg, pattern, hostShareRef, w => {
      handleIncoming('host-self', { kind: 'sample', nodeId: 'host-self', windowStartMs: w.windowStartMs, windowEndMs: w.windowEndMs, sent: w.sent, ok: w.ok, fail: w.fail, codes: w.codes, latencies: w.latencies }, set, get)
    }, hostAbort.signal).then(() => {
      set({ status: 'done', progressPct: 100 })
      hostShareRef = null
    })

    uiTimer = setInterval(() => {
      const el = Date.now() - startedAt
      set({ progressPct: Math.min(100, (el / totalMs) * 100) })
    }, 250)
  },

  joinRoom(roomId, passcode) {
    set({ role: 'node', roomId, status: 'waiting', errorMsg: '', agg: emptyAgg(), tputPts: [] })
    nodeHandle = joinSwarm(
      roomId,
      // prove we know the passcode as soon as the channel opens; the host
      // admits us (or drops the connection) based on this
      () => nodeHandle?.send({ kind: 'auth', passcode }),
      msg => {
        if (msg.kind === 'authresult') {
          if (!msg.ok) { set({ status: 'error', errorMsg: 'Incorrect passcode' }); nodeHandle?.close() }
          return
        }
        if (msg.kind === 'start') {
          set({ status: 'running', startedAt: Date.now(), totalMs: getDurationMs(msg.pattern, msg.cfg), progressPct: 0 })
          nodeShareRef = { value: msg.shareFraction }
          nodeAbort = new AbortController()
          void runSwarmSlice(msg.cfg, msg.pattern, nodeShareRef, w => {
            nodeHandle?.send({ kind: 'sample', nodeId: 'me', windowStartMs: w.windowStartMs, windowEndMs: w.windowEndMs, sent: w.sent, ok: w.ok, fail: w.fail, codes: w.codes, latencies: w.latencies })
            set(s => ({ agg: mergeWindow(s.agg, w) }))
          }, nodeAbort.signal).then(() => {
            set({ status: 'done', progressPct: 100 })
            nodeShareRef = null
          })
        } else if (msg.kind === 'rebalance') {
          if (nodeShareRef) nodeShareRef.value = msg.shareFraction
        } else if (msg.kind === 'stop') {
          nodeAbort?.abort()
        }
      },
      // don't clobber a more specific error (e.g. wrong passcode) that already
      // triggered this close
      () => set(s => (s.status === 'error' ? {} : { status: 'error', errorMsg: 'Host disconnected' })),
      err => set({ status: 'error', errorMsg: err.message || 'Peer connection error' }),
    )
  },

  leave() {
    hostAbort?.abort()
    nodeAbort?.abort()
    if (uiTimer) { clearInterval(uiTimer); uiTimer = null }
    hostHandle?.close()
    nodeHandle?.close()
    hostHandle = null; nodeHandle = null; hostCfg = null; hostPattern = null
    hostShareRef = null; nodeShareRef = null; hostPasscode = ''
    lastTputSec = -1; tputAccum = 0
    set({
      role: 'idle', roomId: '', status: 'idle', errorMsg: '',
      nodes: {}, agg: emptyAgg(), tputPts: [], startedAt: 0, totalMs: 0, progressPct: 0,
    })
  },

  exportReport() {
    const report = buildSwarmReport(get(), hostCfg, hostPattern)
    if (!report) return
    downloadSwarmReport(report)
  },
}))

function handleIncoming(
  nodeId: string,
  msg: SwarmMessage,
  set: (partial: Partial<SwarmState> | ((s: SwarmState) => Partial<SwarmState>)) => void,
  get: () => SwarmState,
) {
  if (msg.kind === 'auth') {
    const ok = msg.passcode === hostPasscode
    const conn = hostHandle?.connections.get(nodeId)
    conn?.send({ kind: 'authresult', ok })
    if (ok) {
      set(s => ({ nodes: { ...s.nodes, [nodeId]: { nodeId, connected: true, sent: 0, ok: 0, fail: 0 } } }))
      // a node admitted mid-run missed the original 'start' broadcast — catch it up
      if (get().status === 'running' && hostCfg && hostPattern) {
        const share = rebalanceHost(get)
        if (conn?.open) conn.send({ kind: 'start', cfg: hostCfg, pattern: hostPattern, shareFraction: share })
      }
    } else {
      // let the authresult flush over the data channel before dropping the peer
      setTimeout(() => hostHandle?.connections.get(nodeId)?.close(), 300)
    }
    return
  }
  if (msg.kind !== 'sample') return

  set(s => {
    const agg = mergeWindow(s.agg, msg)
    const nodes = { ...s.nodes }
    if (nodes[nodeId]) {
      nodes[nodeId] = { ...nodes[nodeId], sent: nodes[nodeId].sent + msg.sent, ok: nodes[nodeId].ok + msg.ok, fail: nodes[nodeId].fail + msg.fail }
    } else if (nodeId === 'host-self') {
      nodes[nodeId] = { nodeId, connected: true, sent: msg.sent, ok: msg.ok, fail: msg.fail }
    }

    const startedAt = s.startedAt
    const sec = Math.floor((Date.now() - startedAt) / 1000)
    let tputPts = s.tputPts
    if (sec !== lastTputSec) {
      if (lastTputSec >= 0) tputPts = [...tputPts, { t: lastTputSec * 1000, rps: tputAccum }]
      lastTputSec = sec
      tputAccum = msg.sent
    } else {
      tputAccum += msg.sent
    }

    return { agg, nodes, tputPts }
  })
  void get
}

export function swarmSummary(agg: AggStats) {
  const avg = agg.latencies.length ? Math.round(agg.latencies.reduce((a, b) => a + b, 0) / agg.latencies.length) : 0
  return {
    sent: agg.sent,
    ok: agg.ok,
    fail: agg.fail,
    successRate: agg.sent ? ((agg.ok / agg.sent) * 100).toFixed(1) : '0.0',
    avg,
    p95: percentile(agg.latencies, 95),
    p99: percentile(agg.latencies, 99),
  }
}

/**
 * Swarm report JSON. Mirrors the solo/CLI ReportData.meta shape so tooling can
 * read either, and adds swarm-specific fields: nodeCount and a per-node
 * breakdown. Failures aren't grouped by reason (swarm samples carry status
 * codes, not reason strings), so a statusCodes distribution is included instead.
 */
export interface SwarmReport {
  meta: {
    url: string; method: string; pattern: string
    elapsed: string; rps: string
    total: number; ok: number; fail: number
    successRate: string
    avgLatMs: number; p95Ms: number; p99Ms: number; maxLatMs: number
    nodeCount: number
  }
  nodes: Array<{ label: string; sent: number; ok: number; fail: number; connected: boolean }>
  statusCodes: Record<number, number>
}

export function buildSwarmReport(
  state: SwarmState,
  cfg: TestConfig | null,
  pattern: PatternType | null,
): SwarmReport | null {
  if (state.role !== 'host' || (state.status !== 'done' && state.status !== 'running')) return null
  const { agg } = state
  const s = swarmSummary(agg)
  const elapsedSec = state.totalMs / 1000
  const nodeEntries = Object.values(state.nodes)
  const nodeCount = nodeEntries.filter(n => n.connected || n.nodeId === 'host-self').length
  return {
    meta: {
      url: cfg?.parsed.url ?? '',
      method: cfg?.parsed.method ?? '',
      pattern: pattern ?? '',
      elapsed: elapsedSec.toFixed(2),
      rps: (agg.sent / Math.max(0.1, elapsedSec)).toFixed(2),
      total: agg.sent,
      ok: agg.ok,
      fail: agg.fail,
      successRate: s.successRate,
      avgLatMs: s.avg,
      p95Ms: s.p95,
      p99Ms: s.p99,
      maxLatMs: agg.latencies.length ? Math.max(...agg.latencies) : 0,
      nodeCount,
    },
    nodes: nodeEntries.map(n => ({
      label: n.nodeId === 'host-self' ? 'host (you)' : n.nodeId,
      sent: n.sent, ok: n.ok, fail: n.fail, connected: n.connected,
    })),
    statusCodes: agg.codes,
  }
}

function downloadSwarmReport(report: SwarmReport, filename = 'loadpulse-swarm-report.json'): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
