# CLI Design Spec (LoadPulse)

Source: `cli/index.ts` (orchestration + exit codes), `cli/config.ts` (arg + config parsing), `cli/runner.ts` (execution), `cli/printer.ts` (output + gate evaluation).

## 1. Command shape
```bash
loadpulse run --curl "<cURL string>" [flags]
loadpulse run <config-file.json> [flags]
loadpulse --help
```
- `run` is an optional subcommand token (skipped by the parser). Any non-dash positional is treated as the config-file path (last one wins; the extension is **not** checked despite the inline hint).
- Flags are **space-separated only** — `--rate 20`. The `--flag=value` form is not supported.

## 2. Flags (exhaustive, from `parseArgs`)
| Flag | Alias | Default | Purpose |
|---|---|---|---|
| `--config <path>` | — | none | Path to a JSON config file |
| `--curl <string>` | — | *(required)* | cURL command to load-test (or set `curl` in the config file) |
| `--pattern <type>` | — | `constant` | `constant` \| `ramp` \| `step` \| `spike` \| `soak` (not validated) |
| `--rate <n>` | — | `10` | Requests per second |
| `--duration <n>` | — | `30` | Duration in seconds |
| `--concurrency <n>` | — | `20` | Max concurrent requests |
| `--timeout <ms>` | — | `10000` | Per-request timeout (ms) |
| `--fail-under <pct>` | — | unset | **Gate:** min success rate % (pass if `successRate >= n`) |
| `--p95-under <ms>` | — | unset | **Gate:** max p95 latency (pass if `p95 <= n`) |
| `--p99-under <ms>` | — | unset | **Gate:** max p99 latency (pass if `p99 <= n`) |
| `--avg-under <ms>` | — | unset | **Gate:** max avg latency (pass if `avg <= n`) |
| `--json` | `--output json` | off | Print `ReportData` JSON to **stdout** |
| `--quiet` | — | off | Suppress all output except errors |
| `--help` | `-h`, or `help` | — | Print usage to stdout, exit 0 |

Parsing subtleties:
- `curl/pattern/rate/duration/concurrency/timeout` use truthy checks, so a value of `0` is **ignored** (falls back to config/default), and non-numeric input silently falls back.
- Gate flags use `!== undefined`, so `0` is honored; a non-numeric gate value becomes `NaN`, which fails every comparison ⇒ that gate fails.
- There is **no flag** for `rateUnit`, `durationUnit`, `statusMin/statusMax`, or pattern-specific params (`rampStart/rampEnd`, `steps`, `spikeBase/spikeBurst`, `soak*`) — those are config-file only.

## 3. Exit codes (contract — do not change without a major version bump)
| Code | Meaning |
|---|---|
| `0` | All configured gates passed **or no gates were defined** (`[].every()` is `true`); also `--help` and the no-args usage screen |
| `1` | At least one defined gate failed — should block a deploy in CI |
| `2` | Config/parse error (missing cURL, unreadable/invalid JSON config) or any other uncaught/fatal error |

`Ctrl-C` (SIGINT) aborts in-flight requests, then still builds the report and evaluates gates on the **partial** data (exits 0/1 by gate result) — it has no dedicated exit code.

## 4. Config file (`loadpulse.json`)
- Shape is **`CliExportConfig`** (a flattened config), **not** the web app's internal `TestConfig` — see `05-report-schema.md`.
- Exported directly from the Web UI via "⬇ Export Config". The UI always writes `gates: {}`, so users add gates by hand or via flags.
- Loaded with `JSON.parse` + a TypeScript cast — **no runtime validation**. Missing fields fall back to defaults (`pattern:constant, rate:10, duration:30, concurrency:20, timeout:10000, status:200–299`).
- Config-file gates and flag gates **merge**, with flags overriding per key.

## 5. Output modes
- **Default (human):** banner + live progress + summary table + gate results, all written to **stderr** via `cli/printer.ts`
- **`--json`:** prints the final `ReportData` JSON to **stdout**. It does **not** suppress the human output (that still goes to stderr) — so `--json > report.json` captures only the JSON. Use `--quiet` to silence stderr too.
- `ReportData` carries no timeseries or Apdex — just `meta` + `failures` (see `05-report-schema.md`).

## 6. Scope — CLI vs. web app
- **Patterns:** all 5 supported, but only generic knobs (`rate`/`duration`/`concurrency`/`timeout`) are flags; pattern-specific params require a config file. (Spike concurrency is hardcoded to 50 by the engine.)
- **Success criteria:** CLI honors the **status-code range only**. Latency-threshold, body-keyword, and error-rate auto-stop exist in `TestConfig` but are hardcoded **off** in the CLI path.
- **Dynamic variables** (`{{uuid}}`, `{{seq}}`, …) **do** work in the CLI (`variableInjector` is reset per run).
- **Not in the CLI:** request chaining, Postman import, swarm/distributed, Apdex output, charts, run history, share/QR.

## 7. `--help` output (from `printUsage`)
```
LoadPulse CLI  —  API load testing from your terminal

Usage
  loadpulse run [config.json] [options]
  loadpulse run --curl "curl ..." [options]

Options
  --config <path>      Path to a JSON config file
  --curl   <string>    cURL command to test
  --pattern <type>     Load pattern: constant | ramp | step | spike | soak  [default: constant]
  --rate    <n>        Requests per second                                   [default: 10]
  --duration <n>       Duration in seconds                                   [default: 30]
  --concurrency <n>    Max concurrent requests                               [default: 20]
  --timeout <ms>       Per-request timeout in ms                             [default: 10000]

Pass/Fail Gates
  --fail-under <pct>   Exit 1 if success rate < n%
  --p95-under  <ms>    Exit 1 if P95 latency > ms
  --p99-under  <ms>    Exit 1 if P99 latency > ms
  --avg-under  <ms>    Exit 1 if avg latency > ms

Output
  --json               Print final report as JSON to stdout (progress → stderr)
  --quiet              Suppress all output except errors

Exit codes
  0   All gates passed (or no gates defined)
  1   One or more gates failed
  2   Configuration or parse error
```

## 8. CI usage contract
```bash
loadpulse run loadpulse.json --json > report.json
echo $?   # 0/1/2 — gate the pipeline on this
```
This is the integration point external users depend on — treat flag names, JSON shape, and exit codes as a stable public API. Keep §2/§7 in sync with `loadpulse --help`; treat any mismatch as a doc bug.
