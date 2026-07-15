# PRD — Product Requirement Document (LoadPulse)

## 1. Problem
Developers need to load-test an API quickly without setting up a server, account, or heavy tooling like JMeter/k6. Existing tools require config-file authoring or backend infra.

## 2. Goal
Let a user paste a single cURL command (or import a Postman collection) and get a running load test with live metrics — in the browser, across a swarm of browsers/devices, or from the CLI in CI — with zero backend.

## 3. Target Users
- Backend/API developers doing ad-hoc load checks
- DevOps/SRE gating deploys on SLA in CI pipelines
- QA engineers validating latency budgets before release
- Teams pooling several machines/devices for higher throughput without provisioning servers

## 4. Core Features (current)
| Feature | Description | Status |
|---|---|---|
| cURL / Postman import | Parse a pasted cURL string or a Postman v2.0/v2.1 collection into a request config (`curlParser.ts`, `postmanParser.ts`) | ✅ Shipped |
| Dynamic variables | Inject `{{uuid}}`, `{{seq}}`, `{{email}}`, `{{phone}}`, `{{random_int}}`, `{{random_str}}`, `{{timestamp}}`, `{{repeat_uuid:n}}` for unique/idempotent test data (`variableInjector.ts`) | ✅ Shipped |
| Load patterns | Constant, Ramp, Step, Spike, Soak (`src/lib/loadPatterns.ts`) | ✅ Shipped |
| Live charts | Latency-over-time, throughput/sec, status distribution, latency histogram | ✅ Shipped |
| Success criteria | Status range, latency threshold, body keyword, auto-stop on error % | ✅ Shipped |
| Request chaining | Extract token from a prior response, inject into the load test (`chainExecutor.ts`, `variableInjector.ts`) | ✅ Shipped |
| Apdex & SLA | Configurable T-value satisfaction score + pass/fail SLA rules (`apdex.ts`) | ✅ Shipped |
| Distributed swarm | Run one test across multiple browsers/devices over WebRTC (PeerJS, peer-to-peer, no backend); join by room code / link / QR, with passcode rooms, kick, and live rebalancing (`src/lib/swarm/`, `Swarm.tsx`) | ✅ Shipped |
| History & compare | Local run history + side-by-side A/B comparison (`historyStore.ts`, `History.tsx`, `Compare.tsx`) | ✅ Shipped |
| Exports | Share URL, JSON, Markdown, CSV, Excel (`.xlsx`), and CLI config JSON (`exporter.ts`, `shareReport.ts`, `exportConfig.ts`) | ✅ Shipped |
| CLI | `loadpulse run` — terminal execution, CI gating, JSON report output | ✅ Shipped |
| Installable PWA | Offline-capable, add-to-home-screen (`vite-plugin-pwa`) | ✅ Shipped |

## 5. Non-goals
- No **server-provisioned** worker fleet — the swarm is peer-to-peer across user-controlled browsers/devices, not cloud workers we host or scale for the user
- No user accounts, saved history across devices, or backend storage (history is local to the browser)
- No protocol support beyond HTTP(S) (no gRPC or WebSocket load testing)
- CLI is intentionally a subset of the web app — no chaining, Postman import, or swarm in the CLI (see `09-cli-design.md`)

## 6. Success Metrics
- Time from "paste cURL" to "first chart rendering" < 5s
- CLI exit codes correctly gate CI pipelines (0/1/2 — see `09-cli-design.md`)
- Report JSON schema stays backward-compatible across versions
- A swarm of N nodes together approximates the configured aggregate request rate (host rebalances shares as nodes join/leave)

## 7. Open Questions
- Do we need multi-endpoint (sequenced) load tests beyond chaining a single auth step?
- Should the **CLI** gain a distributed mode? (The web app already answers this via peer-to-peer swarm; the CLI is still single-process.)
- Should swarm ship first-party TURN infrastructure? (Today it relies on public STUN + a shared demo TURN relay, which caps reliability behind strict NATs.)
