# Report / Config JSON Schema (LoadPulse)

Source of truth: `src/lib/types.ts`. This doc exists so CLI, Web export, and share-URL encoding never drift out of sync.

## TestConfig (input — export/import, `loadpulse.json`)
```ts
interface TestConfig {
  parsed: { url: string; method: string; headers: Record<string,string>; body: string | null }
  pattern: 'constant' | 'ramp' | 'step' | 'spike' | 'soak'

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

## ReportData (output — CLI `--json`, Web export, share URL)
```ts
interface ReportData {
  meta: {
    url: string; method: string; pattern: string
    elapsed: string; rps: string
    total: number; ok: number; fail: number
    successRate: string
    avgLatMs: number; p95Ms: number; p99Ms: number; maxLatMs: number
  }
  failures: Record<string, {
    count: number
    type: 'net' | 'h4' | 'h5' | 'ok'
    status: number | null
    bodies: string[]
  }>
}
```

## RunRecord (local history only, not exported)
```ts
interface RunRecord {
  id: number; url: string; method: string; pattern: string
  elapsed: string; rps: string
  total: number; ok: number; fail: number; sr: string
  avg: number; p95: number; p99: number
}
```

## Versioning rules
1. **Never rename or remove a field** used by an already-published CLI version — treat `TestConfig`/`ReportData` as a public API.
2. New optional fields are additive only; give them safe defaults so old configs still load.
3. If a breaking change is unavoidable, bump a `schemaVersion` field and handle migration in `cli/config.ts` and the Web import path.
4. `bodies: string[]` in failure groups should be size-capped before URL-encoding a shareable report (URL length limits).
