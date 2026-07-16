# User Flow (LoadPulse)

## Primary flow — Web App (diagram)
```mermaid
flowchart TD
    A[Land on Run / Test Builder] --> B[Paste cURL / Import Postman / pick Preset]
    B --> C{Parse OK?}
    C -- No --> B1[Show inline parser error] --> B
    C -- Yes --> D[Config auto-fills: URL, method, headers, body]
    D --> E[Pick load pattern\nConstant / Ramp / Step / Spike / Soak]
    E --> F[Set concurrency + duration/rate params]
    F --> G{Add success criteria?}
    G -- Yes --> G1[Status range / latency threshold /\nbody keyword / error-rate auto-stop]
    G -- No --> H
    G1 --> H{Add chaining step?}
    H -- Yes --> H1[Auth request → extract token → inject into main request]
    H -- No --> I[Click Run]
    H1 --> I
    I --> J["fetcher.ts drives requests per loadPatterns.ts schedule\n(dynamic {{vars}} injected per request)"]
    J --> K["Live charts update:\nlatency, throughput, status codes, histogram"]
    K --> L{Duration elapsed OR\nerror-rate threshold hit?}
    L -- Not yet --> J
    L -- Yes --> M[Test ends]
    M --> N[Results: Apdex, percentiles, failure groups]
    N --> O[Export: Share URL / JSON / Markdown / CSV / Excel / Config JSON\n+ auto-saved to local History]
```

## Primary flow — Web App (steps)
```
1. Land on Run / Test Builder
2. Paste cURL command (or import Postman collection / pick a preset)
        ↓ curlParser.ts / postmanParser.ts
3. Config auto-fills: URL, method, headers, body
4. Pick a load pattern (Constant / Ramp / Step / Spike / Soak)
5. Set concurrency, duration/rate params
6. (Optional) Configure success criteria
   (status range, latency threshold, body keyword, error-rate auto-stop)
7. (Optional) Add a chaining step
   (run an auth request first → extract token → inject into headers/body)
8. Click "Run"  (⌘/Ctrl+Enter; Esc to stop)
        ↓ fetcher.ts drives requests per loadPatterns.ts schedule
        ↓ variableInjector.ts expands {{uuid}}/{{seq}}/{{email}}/… per request
9. Watch live charts update (latency, throughput, status codes, histogram)
10. Test ends (duration elapsed / auto-stopped on error threshold)
11. View results: Apdex score, percentiles, failure groups
12. Export (Share URL / JSON / Markdown / CSV / Excel / Config JSON); run is auto-saved to History
```

## Secondary flow — Distributed swarm
```mermaid
flowchart TD
    H0[Host opens /swarm] --> H1[Paste cURL + pick pattern\n+ optional passcode]
    H1 --> H2[Create swarm room\n→ room code + join link + QR]
    H2 --> H3[Nodes join: scan QR / open ?join=code / enter code]
    H3 --> H4{Passcode required?}
    H4 -- Yes --> H5[Node sends passcode → host authorises] --> H6
    H4 -- No --> H6["Node in waiting room\n(host can kick)"]
    H6 --> H7[Host clicks Start swarm test]
    H7 --> H8[Each node runs its share of the rate\nover WebRTC; host rebalances as nodes join/leave]
    H8 --> H9[Nodes stream ~1s sample windows to host]
    H9 --> H10[Host shows aggregated stats,\nper-node latency bars, combined charts]
    H10 --> H11[Export swarm report JSON]
```
```
1. Host opens /swarm, pastes cURL, picks a pattern, optionally sets a passcode
2. "Create swarm room" → PeerJS claims id loadpulse-swarm-<code>; UI shows code + link + QR
3. Nodes join by scanning the QR, opening the ?join=<code> link, or typing the code (+ passcode)
4. Host sees connected nodes in a waiting room and can kick any node
5. Host clicks "Start swarm test" → each node runs runSwarmSlice for its live share fraction
6. Nodes emit batched sample windows over the WebRTC data channel
7. Host aggregates sent/ok/fail/percentiles across all nodes and renders combined charts + per-node bars
8. Host exports a JSON swarm report
```

## Secondary flow — History & Compare
```
1. Every completed run is prepended to local history (historyStore, last 10, localStorage _alt2_hist)
2. /history lists past runs (URL, method, pattern, elapsed, RPS, totals, success%, avg/p95/p99)
3. /compare → pick Run A and Run B → side-by-side win/lose diff on success%, RPS, avg, p95, p99, fail
```

## Secondary flow — Share a report
```mermaid
flowchart LR
    A[User clicks Share] --> B[shareReport.ts JSON→base64\ninto /report#data=... fragment]
    B --> C[URL copied / sent to teammate]
    C --> D[Teammate opens URL]
    D --> E[SharedReport decodes hash\n→ renders client-side, no server round-trip]
```
```
1. User clicks "Share"
        ↓ shareReport.ts JSON.stringify → base64 → /report#data=<base64>
2. URL copied / sent to teammate (payload is in the URL fragment, never sent to a server)
3. Teammate opens URL → SharedReport decodes it → report renders client-side
```

## Secondary flow — CLI in CI
```mermaid
flowchart TD
    A[Export Config JSON from Web UI\nor hand-write loadpulse.json] --> B["loadpulse run loadpulse.json --fail-under 99 --p95-under 500"]
    B --> C[cli/runner.ts executes\nsame load engine as web app]
    C --> D[cli/printer.ts prints\nlive/summary output → stderr]
    D --> E{Gates passed?}
    E -- Yes / no gates --> F[Exit 0]
    E -- No, SLA failed --> G[Exit 1 — block deploy]
    E -- Config/parse error --> H[Exit 2]
    D --> I["Optional: --json > report.json\n(JSON → stdout, archived as CI artifact)"]
```
```
1. Export Config JSON from the Web UI (loadpulse.json, a CliExportConfig) or hand-write it
2. `loadpulse run loadpulse.json --fail-under 99 --p95-under 500`
        ↓ cli/runner.ts executes the same core engine as the web app
3. `cli/printer.ts` prints live/summary output to the terminal (stderr)
4. Process exits: 0 (pass or no gates) / 1 (a gate failed) / 2 (config/parse error)
5. Optional: `--json > report.json` — report JSON goes to stdout, archived as a CI artifact
```

## Error / edge paths
- Invalid cURL string → parser error shown inline, user corrects and re-imports
- Network failure mid-test → captured as a failure group (`type: 'net'`), test continues
- Error rate crosses `errStopPct` → test auto-stops early, partial report generated
- CLI Ctrl-C (SIGINT) → aborts in-flight requests, then still prints the report and evaluates gates on the partial data (exit 0/1 by gate result)
- Swarm node behind a strict NAT → falls back to the public TURN relay; if that fails, the node can't join
- Swarm host disconnects → the room's well-known peer id is lost; nodes stop receiving control messages
