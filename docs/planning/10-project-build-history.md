# How LoadPulse Was Built — Setup, CLI/CI Mode, Local Dev (Detailed)

This doc explains **how the project actually came together**: repo setup, how the CLI was added, how CI was added, how to get it onto your machine, and how everything wires together end to end. Reconstructed from `git log`, `package.json`, `.github/workflows/ci.yml`, and the `cli/` + `tsconfig.cli.json` source.

---

## 1. Project origin (git history)

Actual `main` history (19 commits, oldest → newest):

```
eafbbe8  first commit
37769ba  Add LoadPulse app — Vite + React + TypeScript load tester   ← base web app scaffolded
0248895  Feature main (#6)
33607b2  feat: add /docs route with full usage guide (#7)
8ef5543  Feature/common main (#11)
9910830  feat: introduce LoadPulse CLI for load testing (#12)          ← CLI/CI-gate mode added
a48fd3b  docs: overhaul README for LoadPulse ... (#14)
b762562  Main docs (#15)
99a1886  Main prod (#24)
d6ad87d  feat: unique test-data variables for idempotency testing (#29)
55afe40  Feat/test infra and ci (#30)                                  ← vitest suite added
d629c14  perf: route-level lazy-load Swarm/Docs/History/Compare, dynamic-import xlsx (#32)
379a9ff  ci: add GitHub Actions workflow with dogfooded SLA gate demo (#33)  ← real GitHub Actions CI
8bec063  ci: add GitHub Actions workflow with dogfooded SLA gate demo (#34)
6cbbdcc  fix: propagate cleared/invalid curl state to parent onParsed callback (#35)
baa9f07  fix: stop latency/throughput charts from growing unbounded (#36)
b8097b1  fix: capture Share Report button ref before async clipboard write (#37)
59887f0  fix: increase histogram chart height for better visibility (#38)
41ebabd  fix: stop live charts-grid from duplicating ReportView's charts (#39)
```

Workflow used throughout: **one feature branch per feature → PR → squash-merge to `main`**. The local/remote branch list still shows the pattern — a sample:
```
feature/apdex-sla              feature/latency-percentiles
feature/pwa                    feature/request-chaining
feature/csv-export             feature/postman-import
feature/shareable-reports      feature/unique-test-data-vars
feature/CI-CLI-mode            feat/test-infra-and-ci
feature/mobile-hamburger-nav   perf/lazy-load-routes-xlsx
ci/add-github-actions-workflow experiment/swarm-test
feature/swarm-qr-join          feature/swarm-rebalance
feature/swarm-kick-node        feature/swarm-per-node-latency
feature/swarm-room-passcode    feature/swarm-export-report
feature/turn-server-fallback   fix/…  (several)
```
The **distributed swarm** feature was built across the `feature/swarm-*` branches (QR join, passcode rooms, rebalance, kick-node, per-node latency, export, TURN fallback) and merged into `main` via the umbrella `Main prod (#24)`-style merges — it's visible in the branch list and the shipped `src/lib/swarm/` + `src/pages/Swarm.tsx` code even though individual swarm PRs are squashed in the `main` log.

---

## 2. How the CLI ("CI/CLI mode") was built

The `loadpulse` CLI is purpose-built so a CI pipeline can run a load test and **gate a deploy** on the result (pass/fail exit code). Two related-but-distinct things exist today:
1. **The CLI as a CI *integration point*** — added in `feat: introduce LoadPulse CLI` (#12). Any pipeline can call `loadpulse run … && deploy` and branch on the exit code.
2. **This repo's own GitHub Actions CI** — added later in #33/#34 (`.github/workflows/ci.yml`). It lints, builds, tests, **and dogfoods the CLI** as an SLA-gate demo (see §2.5). *(Earlier versions of this doc said no `.github/workflows/` existed — that is no longer true.)*

### 2.1 What the CLI is (current `cli/`)
```
cli/config.ts    183 lines  — arg parsing + loadpulse.json (CliExportConfig) loader + defaults
cli/index.ts      72 lines  — entrypoint, orchestration, exit-code logic (0/1/2)
cli/printer.ts   214 lines  — terminal output (banner, live progress, report, gates, usage)
cli/runner.ts    139 lines  — drives the load test (reuses the src/lib engine)
tsconfig.cli.json  26 lines — separate TS project for the CLI
src/lib/exportConfig.ts     — "Export Config" (CliExportConfig) used by the CLI
src/components/ExportConfigButton.tsx — Web UI button to export a loadpulse.json
package.json                — bin, build:cli, prepare, loadpulse scripts
```

### 2.2 Why a *separate* TypeScript project (`tsconfig.cli.json`)
The CLI runs in **Node**, the web app in the **browser** — different `lib`/`types` targets. `tsconfig.cli.json` includes only what the CLI needs:
```json
"include": [
  "cli/**/*.ts",
  "src/lib/types.ts",
  "src/lib/curlParser.ts",
  "src/lib/fetcher.ts",
  "src/lib/loadPatterns.ts",
  "src/lib/percentile.ts",
  "src/lib/variableInjector.ts"
]
```
This documents the "shared core" design from `04-system-design.md` — the CLI imports the same `src/lib/*` files the web app uses, so the load-testing logic is identical. **Caveat:** `tsconfig.cli.json` is *not* referenced by the root `tsc -b` and no script invokes it, so the CLI is currently **not type-checked** in the build — esbuild only transpiles/bundles it. Type-checking the CLI would be a worthwhile CI addition.

### 2.3 How the CLI is packaged
```json
"bin": { "loadpulse": "dist-cli/loadpulse.mjs" },
"files": ["dist-cli/"],
"scripts": {
  "build:cli": "esbuild cli/index.ts --bundle --platform=node --target=node18 --outfile=dist-cli/loadpulse.mjs --format=esm && chmod +x dist-cli/loadpulse.mjs",
  "prepare": "npm run build:cli",
  "loadpulse": "tsx cli/index.ts"
}
```
- `esbuild` bundles `cli/index.ts` (+ everything it imports from `src/lib`) into **one file**: `dist-cli/loadpulse.mjs`.
- `--target=node18` sets output compatibility; note `package.json` `engines` requires **Node ≥20** to install/run.
- `chmod +x` makes it directly executable; `"bin"` symlinks it to a global `loadpulse` on `npm install -g`.
- `"prepare"` auto-runs the CLI build on `npm install`/`npm publish`, so the published package always ships a fresh build. Only `dist-cli/` is published.
- `npm run loadpulse` runs the **unbundled** TS via `tsx` for fast local iteration.

### 2.4 How the CLI enforces "CI gating" (the core mechanic)
`cli/index.ts` builds a report, evaluates gates, and exits:
```ts
const results = evaluateGates(report, gates)     // --fail-under / --p95-under / --p99-under / --avg-under
const allPassed = results.every(g => g.passed)   // [].every() === true → no gates ⇒ pass
process.exit(allPassed ? 0 : 1)                  // config/parse errors exit 2 in the catch blocks
```
- Gates = the `--fail-under` / `--p95-under` / `--p99-under` / `--avg-under` thresholds (see `09-cli-design.md`).
- Run → `runner.ts` produces `ReportData` → `evaluateGates` checks it → **exit 0/1** is the CI integration. Exit `2` = config/parse error (thrown and caught separately).
- Any CI system just runs `loadpulse run config.json` as a step and checks the exit code — that's the entire contract.

### 2.5 This repo's GitHub Actions CI (`.github/workflows/ci.yml`) — now present
Triggers on push/PR to `main` + manual dispatch, Node 20:
```yaml
jobs:
  build:         # npm ci → lint → build (tsc -b + vite) → test (vitest)
  dogfood-cli:   # needs: build
    #  npm run build:cli
    #  node dist-cli/loadpulse.mjs run --curl "curl https://api.github.com/zen" \
    #    --rate 5 --duration 5 --concurrency 5 --fail-under 95 --p95-under 3000 --json
    #  (continue-on-error: hits a live endpoint) → upload demo-report.json artifact
```
The `dogfood-cli` job **is** §2.4 in action: the repo's own CI uses the CLI's SLA gate against a public endpoint. It does **not** publish to npm or deploy Pages — those remain manual (see `08-ci-cd-release-plan.md`).

---

## 3. How to get it onto your machine — two separate things

### 3.1 Using LoadPulse (as an end user) — no cloning needed
```bash
npm install -g loadpulse
loadpulse run --curl "curl https://api.example.com/health" --rate 20 --duration 60 --fail-under 99 --p95-under 500
```
This pulls the published npm package (`dist-cli/loadpulse.mjs`, already built) — nothing to build yourself. Requires Node 20+.

### 3.2 Working on the source
```bash
git clone https://github.com/Ayush2966/LOAD-PULSE.git
cd LOAD-PULSE
npm install          # installs deps AND triggers "prepare" → builds the CLI once
npm run dev          # starts the web app → http://localhost:5173
```
Default branch is `main`; remote `origin` → `https://github.com/Ayush2966/LOAD-PULSE.git`.

### 3.3 Local commands cheat-sheet (from `package.json`)
| Command | What it does |
|---|---|
| `npm install` | Install deps; also runs `prepare` → builds CLI |
| `npm run dev` | Vite dev server for the web app |
| `npm run build` | Type-check (`tsc -b`) + production web build → `dist/` |
| `npm run build:cli` | Bundle CLI → `dist-cli/loadpulse.mjs` |
| `npm run loadpulse -- run <config>` | Run the CLI from source (no build, via `tsx`) |
| `npm run test` | Run the vitest suite once |
| `npm run lint` | `oxlint` static analysis |
| `npm run preview` | Preview the production web build locally |

---

## 4. End-to-end picture

```mermaid
flowchart TD
    subgraph History["Build history"]
        A[first commit] --> B[Vite+React+TS scaffold]
        B --> C[Feature branches merged one by one\n(apdex, chaining, postman, shareable, swarm, …)]
        C --> D["CLI added (#12):\ncli/*.ts + tsconfig.cli.json + package.json bin"]
        D --> E["Test infra + vitest (#30)"]
        E --> F["GitHub Actions CI + CLI dogfood (#33/#34)"]
    end

    subgraph GetIt["Getting it onto a machine"]
        G["End user:\nnpm install -g loadpulse"]
        H["Contributor:\ngit clone → npm install → npm run dev"]
    end

    subgraph Runtime["Runtime — CLI/CI gate"]
        I[loadpulse run config.json] --> J[cli/runner.ts\nreuses src/lib engine]
        J --> K[ReportData produced]
        K --> L[evaluateGates checks\n--fail-under / --p95/p99/avg-under]
        L --> M{All gates passed?}
        M -- Yes / none --> N[exit 0 → CI proceeds]
        M -- No --> O[exit 1 → CI blocks deploy]
    end

    F --> G
    F --> H
    G --> I
    H --> I
```

---

## 5. Key takeaways
- The `loadpulse` CLI is the thing CI pipelines call to gate deploys; the repo **also** now has its own GitHub Actions CI (`ci.yml`) that lints/builds/tests and dogfoods that very CLI.
- The CLI shares the exact same load-testing engine (`src/lib/*`) as the web app — built once, used from web, swarm, and CLI (see `04-system-design.md`).
- Desktop setup is a standard `git clone` + `npm install` (dev) or `npm install -g loadpulse` (just using it) — Node **20+**.
- Publishing to npm and deploying the web app are still **manual** — CI does not automate them (see `08-ci-cd-release-plan.md` §6 for proposed additions).
