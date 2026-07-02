import type { ParsedCurl, PatternType, StepConfig } from './types'

export interface CliExportConfig {
  curl: string
  pattern: PatternType
  rate: number
  rateUnit: 's' | 'm'
  duration: number
  durationUnit: 's' | 'm'
  concurrency: number
  timeout: number
  statusMin: number
  statusMax: number
  rampStart?: number
  rampEnd?: number
  steps?: StepConfig[]
  spikeBase?: number
  spikeBurst?: number
  gates: {
    failUnder?: number
    p95Under?: number
    p99Under?: number
    avgUnder?: number
  }
}

interface FormLike {
  constRate: number
  constRateUnit: 's' | 'm'
  constDur: number
  constDurUnit: 's' | 'm'
  rampStart: number
  rampEnd: number
  rampDur: number
  rampDurUnit: 's' | 'm'
  rampConcur: number
  steps: StepConfig[]
  stepConcur: number
  stepTimeout: number
  spikeBase: number
  spikeRate: number
  spikeDur: number
  spikeBurst: number
  soakRate: number
  soakDur: number
  soakDurUnit: 's' | 'm'
  soakConcur: number
  timeout: number
  concur: number
  scMin: number
  scMax: number
}

function reconstructCurl(parsed: ParsedCurl): string {
  const parts = ['curl']
  if (parsed.method !== 'GET' && parsed.method !== (parsed.body !== null ? 'POST' : 'GET')) {
    parts.push(`-X ${parsed.method}`)
  }
  for (const [k, v] of Object.entries(parsed.headers)) {
    parts.push(`-H "${k}: ${v.replace(/"/g, '\\"')}"`)
  }
  if (parsed.body !== null) {
    parts.push(`-d '${parsed.body.replace(/'/g, "\\'")}'`)
    if (!parsed.method || parsed.method === 'GET') parts.splice(1, 0, '-X POST')
  }
  parts.push(`"${parsed.url}"`)
  return parts.join(' \\\n  ')
}

export function buildExportConfig(
  parsed: ParsedCurl,
  pattern: PatternType,
  form: FormLike,
): CliExportConfig {
  const base: CliExportConfig = {
    curl:        reconstructCurl(parsed),
    pattern,
    rate:        form.constRate,
    rateUnit:    form.constRateUnit,
    duration:    form.constDur,
    durationUnit: form.constDurUnit,
    concurrency: form.concur,
    timeout:     form.timeout,
    statusMin:   form.scMin,
    statusMax:   form.scMax,
    gates:       {},
  }

  switch (pattern) {
    case 'ramp':
      base.rampStart    = form.rampStart
      base.rampEnd      = form.rampEnd
      base.rate         = form.rampEnd
      base.duration     = form.rampDur
      base.durationUnit = form.rampDurUnit
      base.concurrency  = form.rampConcur
      break
    case 'step':
      base.steps       = form.steps
      base.concurrency = form.stepConcur
      base.timeout     = form.stepTimeout
      break
    case 'spike':
      base.spikeBase   = form.spikeBase
      base.rate        = form.spikeRate
      base.duration    = form.spikeDur
      base.spikeBurst  = form.spikeBurst
      break
    case 'soak':
      base.rate         = form.soakRate
      base.duration     = form.soakDur
      base.durationUnit = form.soakDurUnit
      base.concurrency  = form.soakConcur
      break
  }

  return base
}

export function downloadJson(config: CliExportConfig, filename = 'loadpulse.json'): void {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
