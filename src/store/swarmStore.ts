import { create } from 'zustand'
import type { TestConfig, PatternType, TputPoint } from '../lib/types'
import { hostSwarm, joinSwarm, randomRoomId, type HostHandle, type NodeHandle } from '../lib/swarm/swarmNetwork'
import { runSwarmSlice, type SwarmSampleWindow } from '../lib/swarm/swarmEngine'
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

  startHost: (cfg: TestConfig, pattern: PatternType) => void
  startTestOnHost: () => void
  joinRoom: (roomId: string) => void
  leave: () => void
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

  startHost(cfg, pattern) {
    const roomId = randomRoomId()
    hostCfg = cfg
    hostPattern = pattern
    set({
      role: 'host', roomId, status: 'waiting', errorMsg: '',
      nodes: {}, agg: emptyAgg(), tputPts: [], progressPct: 0,
    })

    hostHandle = hostSwarm(
      roomId,
      nodeId => set(s => ({ nodes: { ...s.nodes, [nodeId]: { nodeId, connected: true, sent: 0, ok: 0, fail: 0 } } })),
      nodeId => set(s => ({ nodes: { ...s.nodes, [nodeId]: { ...s.nodes[nodeId], connected: false } } })),
      (nodeId, msg) => handleIncoming(nodeId, msg, set, get),
      err => set({ status: 'error', errorMsg: err.message || 'Peer connection error' }),
    )
  },

  startTestOnHost() {
    if (!hostHandle || !hostCfg || !hostPattern) return
    const cfg = hostCfg
    const pattern = hostPattern
    const nodeCount = Object.keys(get().nodes).length + 1 // +1 for the host itself
    const share = 1 / nodeCount
    const totalMs = getDurationMs(pattern, cfg)
    const startedAt = Date.now()

    set({ status: 'running', startedAt, totalMs, progressPct: 0, agg: emptyAgg(), tputPts: [] })
    hostHandle.broadcast({ kind: 'start', cfg, pattern, shareFraction: share })

    hostAbort = new AbortController()
    void runSwarmSlice(cfg, pattern, share, w => {
      handleIncoming('host-self', { kind: 'sample', nodeId: 'host-self', windowStartMs: w.windowStartMs, windowEndMs: w.windowEndMs, sent: w.sent, ok: w.ok, fail: w.fail, codes: w.codes, latencies: w.latencies }, set, get)
    }, hostAbort.signal).then(() => {
      set({ status: 'done', progressPct: 100 })
    })

    uiTimer = setInterval(() => {
      const el = Date.now() - startedAt
      set({ progressPct: Math.min(100, (el / totalMs) * 100) })
    }, 250)
  },

  joinRoom(roomId) {
    set({ role: 'node', roomId, status: 'waiting', errorMsg: '', agg: emptyAgg(), tputPts: [] })
    nodeHandle = joinSwarm(
      roomId,
      () => {},
      msg => {
        if (msg.kind === 'start') {
          set({ status: 'running', startedAt: Date.now(), totalMs: getDurationMs(msg.pattern, msg.cfg), progressPct: 0 })
          nodeAbort = new AbortController()
          void runSwarmSlice(msg.cfg, msg.pattern, msg.shareFraction, w => {
            nodeHandle?.send({ kind: 'sample', nodeId: 'me', windowStartMs: w.windowStartMs, windowEndMs: w.windowEndMs, sent: w.sent, ok: w.ok, fail: w.fail, codes: w.codes, latencies: w.latencies })
            set(s => ({ agg: mergeWindow(s.agg, w) }))
          }, nodeAbort.signal).then(() => set({ status: 'done', progressPct: 100 }))
        } else if (msg.kind === 'stop') {
          nodeAbort?.abort()
        }
      },
      () => set({ status: 'error', errorMsg: 'Host disconnected' }),
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
    lastTputSec = -1; tputAccum = 0
    set({
      role: 'idle', roomId: '', status: 'idle', errorMsg: '',
      nodes: {}, agg: emptyAgg(), tputPts: [], startedAt: 0, totalMs: 0, progressPct: 0,
    })
  },
}))

function handleIncoming(
  nodeId: string,
  msg: SwarmMessage,
  set: (partial: Partial<SwarmState> | ((s: SwarmState) => Partial<SwarmState>)) => void,
  get: () => SwarmState,
) {
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
