# Test Plan (LoadPulse)

Correctness of the load engine *is* the product — a wrong percentile or Apdex score breaks user trust. Prioritize accordingly.

**Runner:** [Vitest](https://vitest.dev) — `npm run test` (`vitest run`). Config `vitest.config.ts`: `environment: 'node'`, `include: ['src/**/*.test.ts', 'cli/**/*.test.ts']`. Tests run in CI on every push/PR to `main`.

## 1. Unit tests — current coverage (`src/lib/*.test.ts`)
| Module | Status | What's verified |
|---|---|---|
| `loadPatterns.ts` | ✅ `loadPatterns.test.ts` | `getRps` (constant s/m, ramp interpolation + clamp, step selection/fallback, spike burst window, soak), `getDurationMs` (all 5 + step no-steps fallback), `getConcur` (per-pattern; spike hardcoded 50), `getTimeout` |
| `percentile.ts` | ✅ `percentile.test.ts` | p95/p99 over 1..100, empty→0, small-set p50, single element, sorts unordered input, no input mutation |
| `apdex.ts` | ✅ `apdex.test.ts` | `calcApdex` bucketing at T/4T, rating thresholds, default T=500; `checkSLA` gte/lte rules on successRate/apdex/p95/p99/avg |
| `curlParser.ts` | ✅ `curlParser.test.ts` | bare GET, `-X`/`-H`/`-d`, backslash-newline, `--data-raw`, quoted headers, `--json`, `-u` Basic auth, scheme-less→https, body-implies-POST, throws on no URL |
| `fetcher.ts` | ✅ `fetcher.test.ts` | `fireRequest` against a real in-process `node:http` server: status-in-range, out-of-range fail, latency-threshold fail, body-keyword pass/fail, timeout→net, connection-refused→net |

## 2. Coverage gaps (no tests yet — prioritized)
| Module | Why it matters |
|---|---|
| `chainExecutor.ts` / `variableInjector.ts` | Variable extraction/injection and `{{seq}}` uniqueness (incl. swarm disjoint blocks) are correctness-critical for idempotency testing |
| `postmanParser.ts` | Collection → cURL conversion (folders, auth, body types) has many branches |
| `shareReport.ts` | Round-trip encode→decode must return an identical `ReportData`; large-payload behavior (see `05-report-schema.md` §4) |
| `exportConfig.ts` / `exporter.ts` | `buildExportConfig` field mapping; CSV/Excel output shape |
| `cli/*` | **No CLI tests exist** despite `cli/**/*.test.ts` being in the vitest include glob — arg parsing, config resolution, gate evaluation, and exit codes (0/1/2) are the external contract and should be covered |
| `src/lib/swarm/*` | Share-fraction math, rebalancing, sample aggregation (hard to unit-test without a WebRTC harness — candidate for a mocked-transport test) |

## 3. Integration tests
- Full run: `TestConfig` → `fetcher.ts` executes against a mock HTTP server → `ReportData` output matches expected metrics (partially covered by `fetcher.test.ts`)
- Success criteria: status range / latency threshold / body keyword / auto-stop-on-error each correctly pass/fail a run
- CLI: `loadpulse run <config>` against a mock server → correct exit code (0/1/2) for pass / gate-fail / config-error cases — **not yet automated**; only dogfooded in CI (see below)

## 4. Web ↔ CLI parity
- Same `CliExportConfig` run through the Web engine and CLI engine → same `ReportData.meta` (within timing tolerance). Both import the same `src/lib` core, so parity is structural — worth a guard test.

## 5. CI dogfood (`.github/workflows/ci.yml`, `dogfood-cli` job)
- Builds the CLI, runs `loadpulse run --curl "curl https://api.github.com/zen" --rate 5 --duration 5 --fail-under 95 --p95-under 3000 --json`, uploads the report artifact. Non-blocking (`continue-on-error`) because it hits a live third-party endpoint. This is a smoke test of the real binary, not a substitute for §3.

## 6. Manual / exploratory
- Real-world cURL commands from popular APIs (GitHub, Stripe docs) imported and sanity-checked
- Large load runs (high concurrency/rate) checked for browser tab responsiveness
- Share-URL tested across browsers for length limits
- **Swarm:** multi-device join via QR/link, passcode rooms, kick, rebalancing as nodes join/leave, NAT traversal (STUN/TURN) — currently manual only

## 7. Regression checklist before release
- [ ] All 5 load patterns produce visually correct rate curves
- [ ] `npm run test` green (vitest)
- [ ] Report JSON / `CliExportConfig` schema unchanged or version-introduced (see `05-report-schema.md`)
- [ ] CLI exit codes verified for all 3 cases (0 pass/no-gates, 1 gate-fail, 2 config error)
- [ ] `npm run lint` clean (`oxlint`)
- [ ] `npm run build` and `npm run build:cli` both succeed
- [ ] Swarm smoke test with ≥2 devices (host + 1 joiner)
