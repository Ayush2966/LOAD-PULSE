# PRD — Product Requirement Document (LoadPulse)

## 1. Problem
Developers need to load-test an API quickly without setting up a server, account, or heavy tooling like JMeter/k6. Existing tools require config-file authoring or backend infra.

## 2. Goal
Let a user paste a single cURL command (or import a Postman collection) and get a running load test with live metrics — in the browser, or from the CLI in CI — with zero backend.

## 3. Target Users
- Backend/API developers doing ad-hoc load checks
- DevOps/SRE gating deploys on SLA in CI pipelines
- QA engineers validating latency budgets before release

## 4. Core Features (current)
| Feature | Description | Status |
|---|---|---|
| cURL import | Parse a pasted cURL string or Postman collection into a request config | ✅ Shipped |
| Load patterns | Constant, Ramp, Step, Spike, Soak (`src/lib/loadPatterns.ts`) | ✅ Shipped |
| Live charts | Latency-over-time, throughput/sec, status distribution | ✅ Shipped |
| Success criteria | Status range, latency threshold, body keyword, auto-stop on error % | ✅ Shipped |
| Request chaining | Extract token from a prior response, inject into the load test (`chainExecutor.ts`, `variableInjector.ts`) | ✅ Shipped |
| Apdex & SLA | Configurable T-value satisfaction score (`apdex.ts`) | ✅ Shipped |
| Shareable reports | Report encoded into a URL, no backend (`shareReport.ts`) | ✅ Shipped |
| CLI | `loadpulse run` — terminal execution, CI gating, JSON report output | ✅ Shipped |

## 5. Non-goals
- No distributed/multi-node load generation (single machine/browser only)
- No user accounts, saved history across devices, or backend storage
- No protocol support beyond HTTP(S) (no gRPC, WebSocket load testing)

## 6. Success Metrics
- Time from "paste cURL" to "first chart rendering" < 5s
- CLI exit codes correctly gate CI pipelines (0/1/2 — see README)
- Report JSON schema stays backward-compatible across versions

## 7. Open Questions
- Do we need multi-endpoint (sequenced) load tests beyond chaining a single auth step?
- Should the CLI support a distributed mode (multiple workers) for higher throughput?
