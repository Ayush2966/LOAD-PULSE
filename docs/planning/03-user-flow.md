# User Flow (LoadPulse)

## Primary flow — Web App (diagram)
```mermaid
flowchart TD
    A[Land on Test Builder] --> B[Paste cURL / Import Postman collection]
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
    I --> J[fetcher.ts drives requests per loadPatterns.ts schedule]
    J --> K[Live charts update:\nlatency, throughput, status codes]
    K --> L{Duration elapsed OR\nerror-rate threshold hit?}
    L -- Not yet --> J
    L -- Yes --> M[Test ends]
    M --> N[Results: Apdex, percentiles, failure groups]
    N --> O[Export: Config JSON / Report JSON / Share URL]
```

## Primary flow — Web App (steps)
```
1. Land on Test Builder
2. Paste cURL command (or import Postman collection)
        ↓ curlParser.ts / postmanParser.ts
3. Config auto-fills: URL, method, headers, body
4. Pick a load pattern (Constant / Ramp / Step / Spike / Soak)
5. Set concurrency, duration/rate params
6. (Optional) Configure success criteria
   (status range, latency threshold, body keyword, error-rate auto-stop)
7. (Optional) Add a chaining step
   (run an auth request first → extract token → inject into headers/body)
8. Click "Run"
        ↓ fetcher.ts drives requests per loadPatterns.ts schedule
9. Watch live charts update (latency, throughput, status codes)
10. Test ends (duration elapsed / auto-stopped on error threshold)
11. View results: Apdex score, percentiles, failure groups
12. Export: Config JSON | Report JSON | Share URL
```

## Secondary flow — Share a report
```mermaid
flowchart LR
    A[User clicks Share] --> B[shareReport.ts encodes\nReportData into URL]
    B --> C[URL copied / sent to teammate]
    C --> D[Teammate opens URL]
    D --> E[Report renders client-side\nno server round-trip]
```
```
1. User clicks "Share"
        ↓ shareReport.ts encodes ReportData into URL
2. URL copied / sent to teammate
3. Teammate opens URL → report renders client-side, no server round-trip
```

## Secondary flow — CLI in CI
```mermaid
flowchart TD
    A[Export Config JSON from Web UI\nor hand-write loadpulse.json] --> B["loadpulse run loadpulse.json --fail-under 99 --p95-under 500"]
    B --> C[cli/runner.ts executes\nsame load engine as web app]
    C --> D[cli/printer.ts prints\nlive/summary output]
    D --> E{Gates passed?}
    E -- Yes --> F[Exit 0]
    E -- No, SLA failed --> G[Exit 1 — block deploy]
    E -- Config error --> H[Exit 2]
    D --> I["Optional: --json > report.json\narchived as CI artifact"]
```
```
1. Export Config JSON from the Web UI (or hand-write loadpulse.json)
2. `loadpulse run loadpulse.json --fail-under 99 --p95-under 500`
        ↓ cli/runner.ts executes the same load engine as the web app
3. `cli/printer.ts` prints live/summary output to terminal
4. Process exits: 0 (pass) / 1 (SLA gate failed) / 2 (config error)
5. Optional: `--json > report.json` archived as a CI artifact
```

## Error / edge paths
- Invalid cURL string → parser error shown inline, user corrects and re-imports
- Network failure mid-test → captured as a failure group (`type: 'net'`), test continues
- Error rate crosses `errStopPct` → test auto-stops early, partial report generated
