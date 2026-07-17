import type { TestConfig, PatternType } from '../types'

export interface SwarmStartMsg {
  kind: 'start'
  cfg: TestConfig
  pattern: PatternType
  shareFraction: number
  /** Host-assigned disjoint {{seq}} block base for this node (host itself uses 0), so unique variables never collide across the swarm. */
  seqBase: number
}

export interface SwarmStopMsg {
  kind: 'stop'
}

export interface SwarmRebalanceMsg {
  kind: 'rebalance'
  shareFraction: number
}

export interface SwarmAuthMsg {
  kind: 'auth'
  passcode: string
}

export interface SwarmAuthResultMsg {
  kind: 'authresult'
  ok: boolean
}

export interface SwarmKickMsg {
  kind: 'kick'
}

export interface SwarmSampleMsg {
  kind: 'sample'
  nodeId: string
  sent: number
  ok: number
  fail: number
  skipped: number
  codes: Record<number, number>
  latencies: number[]
  windowStartMs: number
  windowEndMs: number
}

export type SwarmMessage = SwarmStartMsg | SwarmStopMsg | SwarmRebalanceMsg | SwarmKickMsg | SwarmSampleMsg | SwarmAuthMsg | SwarmAuthResultMsg

export interface SwarmNodeState {
  nodeId: string
  connected: boolean
  sent: number
  ok: number
  fail: number
  lat: number[]
}
