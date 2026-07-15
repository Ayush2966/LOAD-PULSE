# Report / Config JSON Schema (LoadPulse)

Source of truth: `src/lib/types.ts` (shared contracts), `src/lib/exportConfig.ts` (CLI config), `src/lib/swarm/types.ts` (swarm messages). This doc exists so CLI, Web export, and share-URL encoding never drift out of sync.

## TestConfig (in-app run state — `src/lib/types.ts`)
This is the web app's internal config. It is **not** the file the CLI reads — the UI flattens it into a `CliExportConfig` (below) on export.
```ts
type PatternType = 'constant' | 'ramp' | 'step' | 'spike' | 'soak'

interface TestConfig {
  parsed: { url: string; method: string; headers: Record<string,string>; body: string | null }
  pattern: PatternType

  // constant pattern
  constRate: number; constRateUnit: 's' | 'm'
  constDur: number;  constDurUnit: 's' | 'm'

  // ramp pattern
  rampStart: number; rampEnd: number
  rampDur: number;   rampDurUnit: 's' | 'm'
  rampConcur: number

  // step pattern
  steps: { rate: number; dur: number }[]
  stepConcur: number
  stepTimeout: number

  // spike pattern
  spikeBase: number; spikeRate: number
  spikeDur: number;  spikeBurst: number

  // soak pattern
  soakRate: number; soakDur: number; soakDurUnit: 's' | 'm'
  soakConcur: number

  // shared
  timeout: number
  concur: number

  // success criteria
  scMin: number; scMax: number
  latThreshOn: boolean; latThresh: number
  bodyCheckOn: boolean; bodyCheck: string
  errStopOn: boolean;   errStopPct: number
  captureBody: boolean
}
```

## CliExportConfig (the actual `loadpulse.json` — `src/lib/exportConfig.ts`)
This is what the UI's "⬇ Export Config" button writes and what the CLI (`cli/config.ts` `CliConfig`) reads — a **flattened** shape, not `TestConfig`. Pattern-specific rates are folded into the generic `rate`/`duration`/`concurrency` fields (e.g. spike's rate and ramp's end both land in `rate`), which is exactly how the CLI reads them back.
```ts
interface CliExportConfig {
  curl: string
  pattern: 'constant' | 'ramp' | 'step' | 'spike' | 'soak'
  rate: number;        rateUnit: 's' | 'm'
  duration: number;    durationUnit: 's' | 'm'
  concurrency: number
  timeout: number
  statusMin: number;   statusMax: number
  rampStart?: number;  rampEnd?: number
  steps?: { rate: number; dur: number }[]
  spikeBase?: number;  spikeBurst?: number
  gates: {
    failUnder?: number   // min success-rate %      (--fail-under)
    p95Under?: number    // max p95 latency (ms)     (--p95-under)
    p99Under?: number    // max p99 latency (ms)     (--p99-under)
    avgUnder?: number    // max avg latency (ms)     (--avg-under)
  }
}
```
> The UI always emits `gates: {}` (empty) — gates are added by hand in the JSON or via CLI flags. There is **no runtime validation** on load; missing fields fall back to CLI defaults.

## ReportData (output — CLI `--json`, Web export, share URL)
```ts
interface FailureGroup {
  count: number
  type: 'net' | 'h4' | 'h5' | 'ok'
  status: number | null
  bodies: string[]
}

interface ReportData {
  meta: {
    url: string; method: string; pattern: string
    elapsed: string; rps: string
    total: number; ok: number; fail: number
    successRate: string
    avgLatMs: number; p95Ms: number; p99Ms: number; maxLatMs: number
  }
  failures: Record<string, FailureGroup>
}
```
> Notes: `ReportData` carries **no** per-request timeseries or Apdex — those are computed in the UI/CLI presentation layer, not in the payload. `meta.pattern` may be empty (`''`) in a web-shared report (the solo report builder leaves it blank); the pattern is preserved separately on the `RunRecord`.

## RunRecord (local history only, not exported)
```ts
interface RunRecord {
  id: number            // Date.now()
  url: string; method: string; pattern: string
  elapsed: string; rps: string
  total: number; ok: number; fail: number; sr: string
  avg: number; p95: number; p99: number
}
```
Persisted by `historyStore` to `localStorage` under key **`_alt2_hist`**, newest-first, **capped to the 10 most recent** runs. There is no `partialize`, `version`, or `migrate` configured (zustand default version 0).

## Swarm messages (`src/lib/swarm/types.ts`)
Exchanged over WebRTC data channels; not persisted.
```ts
type SwarmMessage =
  | { kind: 'start'; cfg: TestConfig; pattern: PatternType; shareFraction: number; seqBase: number }
  | { kind: 'stop' }
  | { kind: 'rebalance'; shareFraction: number }
  | { kind: 'auth'; passcode: string }
  | { kind: 'authresult'; ok: boolean }
  | { kind: 'kick' }
  | { kind: 'sample'; nodeId: string; sent: number; ok: number; fail: number;
      codes: Record<number, number>; latencies: number[];
      windowStartMs: number; windowEndMs: number }

interface SwarmNodeState {
  nodeId: string; connected: boolean
  sent: number; ok: number; fail: number; lat: number[]
}
```
`seqBase` gives each node a disjoint `{{seq}}` block (host uses 0) so unique variables never collide across the swarm.

## Versioning rules
1. **Never rename or remove a field** used by an already-published CLI version — treat `CliExportConfig`/`ReportData` as a public API.
2. New fields are additive and optional; give them safe defaults so old configs still load.
3. There is **currently no `schemaVersion` field and no migration path** (history relies on zustand's default version 0). If a breaking change becomes unavoidable, introduce a `schemaVersion` and handle migration in `cli/config.ts`, `historyStore` (`migrate`), and the Web import path.
4. ⚠️ `bodies: string[]` in failure groups is **not** size-capped before URL-encoding a shareable report today (`shareReport.ts` does no truncation). This is a known gap — large failure sets can overflow URL length limits. Cap/omit bodies before encoding when this bites.
