# CLI Design Spec (LoadPulse)

Source: `cli/index.ts`, `cli/config.ts`, `cli/runner.ts`, `cli/printer.ts`

## 1. Command shape
```bash
loadpulse run --curl "<cURL string>" [flags]
loadpulse run <config-file.json> [flags]
loadpulse --help
```

## 2. Flags (confirm exhaustive list against `cli/index.ts`)
| Flag | Purpose |
|---|---|
| `--curl` | Inline cURL command (alternative to a config file) |
| `--rate` | Requests per second (constant pattern shorthand) |
| `--duration` | Test duration in seconds |
| `--fail-under` | Minimum success-rate % required to pass (SLA gate) |
| `--p95-under` | Max acceptable p95 latency (ms) to pass |
| `--json` | Emit `ReportData` as JSON to stdout instead of human-readable summary |

> Keep this table in sync with `loadpulse --help` output — treat mismatches as a doc bug.

## 3. Exit codes (contract — do not change without a major version bump)
| Code | Meaning |
|---|---|
| `0` | All configured gates passed |
| `1` | A gate failed (success-rate / latency threshold) — should block a deploy in CI |
| `2` | Config error (bad cURL, invalid JSON config, missing required flag) |

## 4. Config file (`loadpulse.json`)
- Same shape as `TestConfig` (see `05-report-schema.md`)
- Exported directly from the Web UI via "⬇ Export Config" — CLI flags override matching config-file fields when both are present

## 5. Output modes
- **Default (human)**: live progress via `cli/printer.ts`, then a summary table
- **`--json`**: suppress human output, print only the final `ReportData` JSON (pipeable to a file for CI artifacts)

## 6. CI usage contract
```bash
loadpulse run loadpulse.json --json > report.json
echo $?   # 0/1/2 — gate the pipeline on this
```
This is the integration point most external users depend on — treat flag names, JSON shape, and exit codes as a stable public API.
