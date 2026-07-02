import type { TestConfig, PatternType } from '../types'

export interface SwarmStartMsg {
  kind: 'start'
  cfg: TestConfig
  pattern: PatternType
  shareFraction: number
}

export interface SwarmStopMsg {
  kind: 'stop'
}

export interface SwarmSampleMsg {
  kind: 'sample'
  nodeId: string
  sent: number
  ok: number
  fail: number
  codes: Record<number, number>
  latencies: number[]
  windowStartMs: number
  windowEndMs: number
}

export type SwarmMessage = SwarmStartMsg | SwarmStopMsg | SwarmSampleMsg

export interface SwarmNodeState {
  nodeId: string
  connected: boolean
  sent: number
  ok: number
  fail: number
}
