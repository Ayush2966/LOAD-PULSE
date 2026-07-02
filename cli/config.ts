import { readFileSync } from 'node:fs'
import { parseCurl } from '../src/lib/curlParser.ts'
import type { TestConfig, PatternType } from '../src/lib/types.ts'

export interface Gates {
  failUnder?: number   // min success rate %
  p95Under?: number    // max p95 ms
  p99Under?: number    // max p99 ms
  avgUnder?: number    // max avg ms
}

export interface CliConfig {
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
  // ramp-specific
  rampStart?: number
  rampEnd?: number
  // step-specific
  steps?: Array<{ rate: number; dur: number }>
  // spike-specific
  spikeBase?: number
  spikeBurst?: number
  // shared gates
  gates: Gates
}

export const DEFAULT_CONFIG: Partial<CliConfig> = {
  pattern: 'constant',
  rate: 10,
  rateUnit: 's',
  duration: 30,
  durationUnit: 's',
  concurrency: 20,
  timeout: 10000,
  statusMin: 200,
  statusMax: 299,
  gates: {},
}

export function loadConfigFile(filePath: string): CliConfig {
  const raw = readFileSync(filePath, 'utf8')
  return JSON.parse(raw) as CliConfig
}

interface ParsedArgs {
  configFile?: string
  curl?: string
  pattern?: string
  rate?: number
  duration?: number
  concurrency?: number
  timeout?: number
  failUnder?: number
  p95Under?: number
  p99Under?: number
  avgUnder?: number
  outputJson?: boolean
  quiet?: boolean
}

export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {}
  const a = argv.slice(2) // skip node + script

  // skip the 'run' subcommand if present
  let i = a[0] === 'run' ? 1 : 0

  while (i < a.length) {
    const flag = a[i]
    switch (flag) {
      case '--config':     args.configFile   = a[++i]; break
      case '--curl':       args.curl         = a[++i]; break
      case '--pattern':    args.pattern      = a[++i]; break
      case '--rate':       args.rate         = Number(a[++i]); break
      case '--duration':   args.duration     = Number(a[++i]); break
      case '--concurrency': args.concurrency = Number(a[++i]); break
      case '--timeout':    args.timeout      = Number(a[++i]); break
      case '--fail-under': args.failUnder    = Number(a[++i]); break
      case '--p95-under':  args.p95Under     = Number(a[++i]); break
      case '--p99-under':  args.p99Under     = Number(a[++i]); break
      case '--avg-under':  args.avgUnder     = Number(a[++i]); break
      case '--output':     if (a[++i] === 'json') args.outputJson = true; break
      case '--json':       args.outputJson   = true; break
      case '--quiet':      args.quiet        = true; break
      default:
        // positional: treat as config file path if it ends in .json
        if (!flag.startsWith('-')) args.configFile = flag
    }
    i++
  }
  return args
}

export function resolveConfig(argv: string[]): CliConfig {
  const args = parseArgs(argv)

  let base: Partial<CliConfig> = { ...DEFAULT_CONFIG, gates: {} }

  if (args.configFile) {
    const fromFile = loadConfigFile(args.configFile)
    base = { ...base, ...fromFile, gates: { ...(base.gates ?? {}), ...(fromFile.gates ?? {}) } }
  }

  if (args.curl)        base.curl        = args.curl
  if (args.pattern)     base.pattern     = args.pattern as PatternType
  if (args.rate)        base.rate        = args.rate
  if (args.duration)    base.duration    = args.duration
  if (args.concurrency) base.concurrency = args.concurrency
  if (args.timeout)     base.timeout     = args.timeout
  if (args.failUnder !== undefined) base.gates!.failUnder = args.failUnder
  if (args.p95Under  !== undefined) base.gates!.p95Under  = args.p95Under
  if (args.p99Under  !== undefined) base.gates!.p99Under  = args.p99Under
  if (args.avgUnder  !== undefined) base.gates!.avgUnder  = args.avgUnder

  if (!base.curl) {
    throw new Error('No cURL provided. Use --curl "curl ..." or set "curl" in your config file.')
  }

  return base as CliConfig
}

export function buildTestConfig(cfg: CliConfig): { testConfig: TestConfig; pattern: PatternType } {
  const parsed = parseCurl(cfg.curl)
  const pattern = cfg.pattern

  const testConfig: TestConfig = {
    parsed,
    pattern,
    // constant
    constRate:     cfg.rate ?? 10,
    constRateUnit: cfg.rateUnit ?? 's',
    constDur:      cfg.duration ?? 30,
    constDurUnit:  cfg.durationUnit ?? 's',
    // ramp
    rampStart:    cfg.rampStart ?? 1,
    rampEnd:      cfg.rampEnd   ?? (cfg.rate ?? 20),
    rampDur:      cfg.duration  ?? 30,
    rampDurUnit:  cfg.durationUnit ?? 's',
    rampConcur:   cfg.concurrency  ?? 20,
    // step
    steps:        cfg.steps ?? [{ rate: cfg.rate ?? 10, dur: cfg.duration ?? 30 }],
    stepConcur:   cfg.concurrency ?? 20,
    stepTimeout:  cfg.timeout     ?? 10000,
    // spike
    spikeBase:  cfg.spikeBase  ?? 5,
    spikeRate:  cfg.rate       ?? 50,
    spikeDur:   cfg.duration   ?? 60,
    spikeBurst: cfg.spikeBurst ?? 10,
    // soak
    soakRate:     cfg.rate        ?? 5,
    soakDur:      cfg.duration    ?? 300,
    soakDurUnit:  cfg.durationUnit ?? 's',
    soakConcur:   cfg.concurrency  ?? 10,
    // shared
    timeout: cfg.timeout     ?? 10000,
    concur:  cfg.concurrency ?? 20,
    // success criteria
    scMin:         cfg.statusMin ?? 200,
    scMax:         cfg.statusMax ?? 299,
    latThreshOn:   false,
    latThresh:     2000,
    bodyCheckOn:   false,
    bodyCheck:     '',
    errStopOn:     false,
    errStopPct:    50,
    captureBody:   true,
  }

  return { testConfig, pattern }
}

export function resolveOutputFlags(argv: string[]): { outputJson: boolean; quiet: boolean } {
  const args = parseArgs(argv)
  return { outputJson: args.outputJson ?? false, quiet: args.quiet ?? false }
}
