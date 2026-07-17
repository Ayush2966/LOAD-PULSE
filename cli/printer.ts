import type { ReportData } from '../src/lib/types.ts'
import type { Gates } from './config.ts'
import type { RunSnapshot } from './runner.ts'

// ── ANSI helpers ──────────────────────────────────────────────────────────────
const isTTY = process.stdout.isTTY ?? false

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  white:  '\x1b[97m',
}

function c(code: string, text: string): string {
  return isTTY ? `${code}${text}${C.reset}` : text
}

const bold   = (s: string) => c(C.bold,   s)
const dim    = (s: string) => c(C.dim,    s)
const green  = (s: string) => c(C.green,  s)
const red    = (s: string) => c(C.red,    s)
const yellow = (s: string) => c(C.yellow, s)
const cyan   = (s: string) => c(C.cyan,   s)

// ── Progress bar ──────────────────────────────────────────────────────────────
const SPINNER = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏']
let spinIdx = 0

function progressBar(pct: number, width = 28): string {
  const filled = Math.round(pct * width)
  const bar = '█'.repeat(filled) + dim('░'.repeat(width - filled))
  return `[${bar}]`
}

let lastLineLen = 0

export function printProgress(snap: RunSnapshot): void {
  if (!isTTY) return
  const pct = Math.min(1, snap.elapsedMs / snap.totalMs)
  const elapsed = (snap.elapsedMs / 1000).toFixed(1)
  const total   = (snap.totalMs   / 1000).toFixed(0)
  const rps     = snap.elapsedMs > 0 ? (snap.ok / (snap.elapsedMs / 1000)).toFixed(1) : '—'
  const sr      = snap.sent > 0 ? ((snap.ok / snap.sent) * 100).toFixed(1) : '—'

  const spin = SPINNER[spinIdx++ % SPINNER.length]
  const bar  = progressBar(pct)
  // only shown once the endpoint falls behind the target rate — a saturation signal
  const skippedSeg = snap.skipped > 0 ? `  ${yellow('skipped ' + snap.skipped)}` : ''
  const line = `  ${cyan(spin)}  ${bar} ${dim(elapsed + 's / ' + total + 's')}  sent ${bold(String(snap.sent))}  ok ${green(String(snap.ok))}  fail ${snap.fail > 0 ? red(String(snap.fail)) : dim('0')}${skippedSeg}  SR ${sr}%  RPS ${rps}`

  // overwrite the same terminal line
  process.stderr.write('\r' + line)
  lastLineLen = line.replace(/\x1b\[[0-9;]*m/g, '').length
}

export function clearProgress(): void {
  if (!isTTY) return
  process.stderr.write('\r' + ' '.repeat(lastLineLen + 4) + '\r')
}

// ── Banner ────────────────────────────────────────────────────────────────────
export function printBanner(pattern: string, url: string, quiet: boolean): void {
  if (quiet) return
  process.stderr.write('\n')
  process.stderr.write(`  ${bold('LoadPulse')}  ${dim(pattern)}  ${dim('→')}  ${cyan(url)}\n`)
  process.stderr.write('\n')
}

// ── Final report table ────────────────────────────────────────────────────────
function row(label: string, value: string, label2 = '', value2 = ''): string {
  const l1 = label.padEnd(14)
  const v1 = value.padStart(8)
  if (!label2) return `  ${dim(l1)} ${bold(v1)}`
  const l2 = label2.padEnd(14)
  const v2 = value2.padStart(8)
  return `  ${dim(l1)} ${bold(v1)}    ${dim(l2)} ${bold(v2)}`
}

export function printReport(report: ReportData, quiet: boolean): void {
  if (quiet) return
  const m = report.meta
  const bar = '─'.repeat(52)

  process.stderr.write(`\n  ${dim(bar)}\n`)
  process.stderr.write(`  ${bold('Results')}\n`)
  process.stderr.write(`  ${dim(bar)}\n`)
  process.stderr.write(row('Total',     String(m.total),            'Avg latency', m.avgLatMs + 'ms') + '\n')
  process.stderr.write(row('Success',   String(m.ok),               'P95',         m.p95Ms    + 'ms') + '\n')
  process.stderr.write(row('Failed',    String(m.fail),             'P99',         m.p99Ms    + 'ms') + '\n')
  process.stderr.write(row('Success %', m.successRate + '%',        'Max',         m.maxLatMs + 'ms') + '\n')
  process.stderr.write(row('RPS',       m.rps,                      'Elapsed',     m.elapsed  + 's')  + '\n')
  process.stderr.write(`  ${dim(bar)}\n`)

  if (Object.keys(report.failures).length > 0) {
    process.stderr.write(`\n  ${yellow('Failures')}\n`)
    for (const [reason, g] of Object.entries(report.failures)) {
      process.stderr.write(`  ${red('✗')} ${dim(String(g.count).padStart(5) + 'x')}  ${reason}\n`)
      for (const body of g.bodies) {
        process.stderr.write(`         ${dim(body.slice(0, 80))}\n`)
      }
    }
  }
}

// ── Gate evaluation ───────────────────────────────────────────────────────────
export interface GateResult {
  label: string
  actual: number
  threshold: number
  passed: boolean
  direction: 'gte' | 'lte'
}

export function evaluateGates(report: ReportData, gates: Gates): GateResult[] {
  const m = report.meta
  const results: GateResult[] = []

  if (gates.failUnder !== undefined) {
    results.push({
      label:     'Success rate',
      actual:    parseFloat(m.successRate),
      threshold: gates.failUnder,
      passed:    parseFloat(m.successRate) >= gates.failUnder,
      direction: 'gte',
    })
  }
  if (gates.p95Under !== undefined) {
    results.push({ label: 'P95 latency', actual: m.p95Ms,    threshold: gates.p95Under, passed: m.p95Ms    <= gates.p95Under, direction: 'lte' })
  }
  if (gates.p99Under !== undefined) {
    results.push({ label: 'P99 latency', actual: m.p99Ms,    threshold: gates.p99Under, passed: m.p99Ms    <= gates.p99Under, direction: 'lte' })
  }
  if (gates.avgUnder !== undefined) {
    results.push({ label: 'Avg latency', actual: m.avgLatMs, threshold: gates.avgUnder, passed: m.avgLatMs <= gates.avgUnder, direction: 'lte' })
  }

  return results
}

export function printGates(gateResults: GateResult[], quiet: boolean): void {
  if (quiet || gateResults.length === 0) return
  process.stderr.write(`\n  ${bold('Gates')}\n`)
  for (const g of gateResults) {
    const op      = g.direction === 'gte' ? '≥' : '≤'
    const unit    = g.label.includes('latency') ? 'ms' : '%'
    const passing = g.passed ? green('✓') : red('✗')
    const thresh  = dim(`${op} ${g.threshold}${unit}`)
    const actual  = `${g.actual}${unit}`
    const status  = g.passed ? green('PASS') : red('FAIL')
    process.stderr.write(`  ${passing}  ${g.label.padEnd(14)} ${bold(actual.padStart(8))}  ${thresh.padEnd(16)}  ${status}\n`)
  }
}

export function printSummary(passed: boolean, elapsed: string, quiet: boolean): void {
  if (quiet) return
  process.stderr.write('\n')
  if (passed) {
    process.stderr.write(`  ${green('✓')} ${bold('All gates passed')} — test completed in ${elapsed}s\n\n`)
  } else {
    process.stderr.write(`  ${red('✗')} ${bold('One or more gates failed')} — test completed in ${elapsed}s\n\n`)
  }
}

export function printUsage(): void {
  process.stdout.write(`
${bold('LoadPulse CLI')}  —  API load testing from your terminal

${bold('Usage')}
  loadpulse run [config.json] [options]
  loadpulse run --curl "curl ..." [options]

${bold('Options')}
  --config <path>      Path to a JSON config file
  --curl   <string>    cURL command to test
  --pattern <type>     Load pattern: constant | ramp | step | spike | soak  [default: constant]
  --rate    <n>        Requests per second                                   [default: 10]
  --duration <n>       Duration in seconds                                   [default: 30]
  --concurrency <n>    Max concurrent requests                               [default: 20]
  --timeout <ms>       Per-request timeout in ms                             [default: 10000]

${bold('Pass/Fail Gates')}
  --fail-under <pct>   Exit 1 if success rate < n%
  --p95-under  <ms>    Exit 1 if P95 latency > ms
  --p99-under  <ms>    Exit 1 if P99 latency > ms
  --avg-under  <ms>    Exit 1 if avg latency > ms

${bold('Output')}
  --json               Print final report as JSON to stdout (progress → stderr)
  --quiet              Suppress all output except errors

${bold('Exit codes')}
  0   All gates passed (or no gates defined)
  1   One or more gates failed
  2   Configuration or parse error

${bold('Examples')}
  loadpulse run --curl "curl https://api.example.com/health" --rate 20 --duration 60 --fail-under 99
  loadpulse run loadpulse.json --p95-under 500
  loadpulse run loadpulse.json --json > report.json

${bold('Config file format')}  (loadpulse.json)
  {
    "curl": "curl -X POST https://api.example.com/users ...",
    "pattern": "constant",
    "rate": 20,
    "duration": 60,
    "concurrency": 25,
    "gates": { "failUnder": 99, "p95Under": 500 }
  }
`)
}
