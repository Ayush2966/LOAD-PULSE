# Test Plan (LoadPulse)

Correctness of the load engine *is* the product — a wrong percentile or Apdex score breaks user trust. Prioritize accordingly.

## 1. Unit tests — core lib (`src/lib`)
| Module | What to verify |
|---|---|
| `loadPatterns.ts` | Each pattern (constant/ramp/step/spike/soak) produces the correct request-rate schedule for given params; edge cases: rate=0, dur=0, single step |
| `percentile.ts` | p95/p99 math correct against known sample sets; behavior with < 20 samples (small-n edge case) |
| `apdex.ts` | Score formula matches the Apdex spec for satisfied/tolerating/frustrated thresholds at various T values |
| `curlParser.ts` | Parses method, headers, body, URL correctly from varied real-world cURL strings (multi-line, quoted args, `-H`, `-d`, `--data-raw`) |
| `postmanParser.ts` | Correctly maps a Postman collection export into `ParsedCurl`/`TestConfig` |
| `chainExecutor.ts` / `variableInjector.ts` | Extracted variable correctly injected into headers/body of the main request; failure when extraction path doesn't match |
| `shareReport.ts` / `exportConfig.ts` / `exporter.ts` | Round-trip: encode → decode returns identical `ReportData`/`TestConfig`; large payload truncation behavior |

## 2. Integration tests
- Full run: `TestConfig` → `fetcher.ts` executes against a mock HTTP server → `ReportData` output matches expected metrics
- Success criteria: status range / latency threshold / body keyword / auto-stop-on-error each correctly pass/fail a run
- CLI: `loadpulse run <config>` against a mock server → correct exit code (0/1/2) for pass/SLA-fail/config-error cases

## 3. Web ↔ CLI parity tests
- Same `TestConfig` run through Web engine and CLI engine → same `ReportData.meta` (within timing tolerance)

## 4. Manual / exploratory
- Real-world cURL commands from popular APIs (GitHub, Stripe docs) imported and sanity-checked
- Large load runs (high concurrency/rate) checked for browser tab responsiveness
- Share-URL tested across browsers for length limits

## 5. Regression checklist before release
- [ ] All 5 load patterns produce visually correct rate curves
- [ ] Report JSON schema unchanged or version-bumped (see `05-report-schema.md`)
- [ ] CLI exit codes verified for all 3 cases
- [ ] `npm run lint` clean (`oxlint`)
- [ ] `npm run build` and `npm run build:cli` both succeed
