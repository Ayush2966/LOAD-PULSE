#!/usr/bin/env node
import { resolveConfig, buildTestConfig, resolveOutputFlags } from './config.ts'
import { runTest } from './runner.ts'
import {
  printBanner, printProgress, clearProgress,
  printReport, evaluateGates, printGates, printSummary, printUsage,
} from './printer.ts'

const argv = process.argv

// show help
if (argv.includes('--help') || argv.includes('-h') || argv.slice(2)[0] === 'help') {
  printUsage()
  process.exit(0)
}

// require a subcommand or at least one option
const positional = argv.slice(2).filter(a => !a.startsWith('-'))
const hasRun = positional[0] === 'run' || positional.length > 0 || argv.slice(2).some(a => a.startsWith('--'))
if (!hasRun) {
  printUsage()
  process.exit(0)
}

const { outputJson, quiet } = resolveOutputFlags(argv)

async function main(): Promise<void> {
  let cfg
  try {
    cfg = resolveConfig(argv)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write(`\n  Error: ${msg}\n\n  Run loadpulse --help for usage.\n\n`)
    process.exit(2)
  }

  const { testConfig, pattern } = buildTestConfig(cfg)

  printBanner(pattern, testConfig.parsed.url, quiet)

  // handle Ctrl-C cleanly
  const ac = new AbortController()
  process.on('SIGINT', () => {
    clearProgress()
    process.stderr.write('\n  Stopping test...\n')
    ac.abort()
  })

  const report = await runTest(testConfig, pattern, snap => printProgress(snap), ac.signal)

  clearProgress()

  if (outputJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n')
  }

  printReport(report, quiet)

  const gateResults = evaluateGates(report, cfg.gates)
  printGates(gateResults, quiet)

  const allPassed = gateResults.every(g => g.passed)
  printSummary(gateResults.length === 0 || allPassed, report.meta.elapsed, quiet)

  process.exit(allPassed ? 0 : 1)
}

main().catch(err => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`\n  Fatal: ${msg}\n\n`)
  process.exit(2)
})
