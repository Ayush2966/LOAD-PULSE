export interface ParsedCurl {
  url: string
  method: string
  headers: Record<string, string>
  body: string | null
}

export interface ChartPoint {
  t: number
  lat: number
  ok: boolean
}

export interface TputPoint {
  t: number
  rps: number
}

export interface LogEntry {
  t: string
  ok: boolean
  status: number | null
  lat: number
  msg: string
}

export interface FailureGroup {
  count: number
  type: 'net' | 'h4' | 'h5' | 'ok'
  status: number | null
  bodies: string[]
}

export interface StepConfig {
  rate: number
  dur: number
}

export interface TestConfig {
  parsed: ParsedCurl
  pattern: PatternType
  // constant
  constRate: number
  constRateUnit: 's' | 'm'
  constDur: number
  constDurUnit: 's' | 'm'
  // ramp
  rampStart: number
  rampEnd: number
  rampDur: number
  rampDurUnit: 's' | 'm'
  rampConcur: number
  // step
  steps: StepConfig[]
  stepConcur: number
  stepTimeout: number
  // spike
  spikeBase: number
  spikeRate: number
  spikeDur: number
  spikeBurst: number
  // soak
  soakRate: number
  soakDur: number
  soakDurUnit: 's' | 'm'
  soakConcur: number
  // shared
  timeout: number
  concur: number
  // success criteria
  scMin: number
  scMax: number
  latThreshOn: boolean
  latThresh: number
  bodyCheckOn: boolean
  bodyCheck: string
  errStopOn: boolean
  errStopPct: number
  captureBody: boolean
}

export type PatternType = 'constant' | 'ramp' | 'step' | 'spike' | 'soak'

export interface RunRecord {
  id: number
  url: string
  method: string
  pattern: string
  elapsed: string
  rps: string
  total: number
  ok: number
  fail: number
  sr: string
  avg: number
  p95: number
  p99: number
}

export interface ReportData {
  meta: {
    url: string
    method: string
    pattern: string
    elapsed: string
    rps: string
    total: number
    ok: number
    fail: number
    successRate: string
    avgLatMs: number
    p95Ms: number
    p99Ms: number
    maxLatMs: number
  }
  failures: Record<string, FailureGroup>
}
