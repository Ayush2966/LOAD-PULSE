# ⚡ LoadPulse

> API load testing — from a single cURL command to a multi-device swarm to CI-gated SLA checks.

LoadPulse is a browser-based load testing tool with a companion CLI. Paste any cURL command, pick a load pattern, and get live latency charts, percentile breakdowns, Apdex scores, and shareable reports — no account, no server, no setup. Need more throughput? Run a **distributed swarm** across several browsers or devices over WebRTC. Wiring it into a pipeline? The **CLI** gates deploys on SLA with a clean exit code.

[![CI](https://github.com/Ayush2966/LOAD-PULSE/actions/workflows/ci.yml/badge.svg)](https://github.com/Ayush2966/LOAD-PULSE/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/loadpulse)](https://www.npmjs.com/package/loadpulse)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

- **cURL import** — paste any cURL command, or import a Postman collection (v2.0/v2.1)
- **Dynamic variables** — inject `{{uuid}}`, `{{seq}}`, `{{email}}`, `{{phone}}`, `{{random_int}}`, `{{random_str}}`, `{{timestamp}}` for unique, idempotent test data
- **5 load patterns** — Constant, Ramp, Step, Spike, Soak
- **Live charts** — latency over time, throughput per second, status distribution, latency histogram
- **Success criteria** — status code ranges, latency threshold, body keyword check, auto-stop on error rate
- **Request chaining** — run an auth/setup step first, extract a token, inject it into the load test
- **Apdex & SLA** — industry-standard satisfaction score with a configurable T value, plus pass/fail SLA rules
- **Distributed swarm** — run one load test across multiple browsers/devices over WebRTC (peer-to-peer, no backend); join by room code, link, or QR
- **History & compare** — local run history with side-by-side A/B comparison
- **Exports** — Share URL, JSON, Markdown, CSV, Excel (`.xlsx`), and CLI config JSON
- **Shareable reports** — encode a full report into a URL, no backend needed
- **CLI** — run from the terminal, gate deploys on SLA, pipe JSON reports to CI artifacts
- **Installable PWA** — add to home screen / desktop, works offline

---

## CLI — quick start

The CLI is published on npm. Requires Node 20+.

```bash
npm install -g loadpulse
```

```bash
# Run a test against any endpoint
loadpulse run --curl "curl https://api.example.com/health" \
  --rate 20 --duration 60 --fail-under 99 --p95-under 500

# Use a config file (export from the UI with ⬇ Export Config)
loadpulse run loadpulse.json

# Save a JSON report for CI artifacts (report → stdout, progress → stderr)
loadpulse run loadpulse.json --json > report.json

# Help
loadpulse --help
```

**Exit codes:** `0` all gates passed (or no gates defined) · `1` a gate failed (block the deploy) · `2` config or parse error

See the full CLI reference in the [Docs tab](https://ayush2966.github.io/LOAD-PULSE) or run `loadpulse --help`.

> **Note:** the CLI runs a single parsed cURL and honours the status-code range gate plus `--fail-under` / `--p95-under` / `--p99-under` / `--avg-under`. Request chaining, Postman import, and swarm mode are web-app features and are not part of the CLI.

---

## Web app — local development

**Requirements:** Node 20+, npm 10+

```bash
# 1. Clone
git clone https://github.com/Ayush2966/LOAD-PULSE.git
cd LOAD-PULSE

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
# → http://localhost:5173
```

```bash
# Build for production (typecheck + web build → dist/)
npm run build

# Build the CLI bundle (→ dist-cli/loadpulse.mjs)
npm run build:cli

# Run the CLI from source, no build needed
npm run loadpulse -- run --curl "curl https://api.example.com" --rate 10 --duration 5

# Lint
npm run lint

# Test
npm run test
```

---

## Contributing

Contributions are welcome — bug fixes, new features, docs improvements. Please follow the workflow below so changes are easy to review.

### 1. Find or open an issue

Before writing code, check [open issues](https://github.com/Ayush2966/LOAD-PULSE/issues).

- **Bug?** Open an issue with steps to reproduce, expected vs actual behaviour, and your OS / Node version.
- **Feature?** Open an issue describing the use case first. Wait for a ✅ from a maintainer before spending time on a PR — saves everyone effort if the direction needs discussion.
- **Small fix** (typo, broken link, obvious bug)? You can skip the issue and go straight to a PR.

### 2. Fork and clone

```bash
# Fork on GitHub (click Fork top-right), then:
git clone https://github.com/YOUR_USERNAME/LOAD-PULSE.git
cd LOAD-PULSE
npm install
```

### 3. Create a branch

Branch off `main`. Use a short, descriptive name:

```bash
git checkout -b fix/curl-parser-basic-auth
# or
git checkout -b feat/environment-variables
```

| Prefix | When to use |
|--------|-------------|
| `feat/` | New feature |
| `fix/` | Bug fix |
| `docs/` | Documentation only |
| `refactor/` | Code change with no behaviour change |
| `chore/` | Build scripts, deps, config |

### 4. Make your changes

- Keep each PR focused — one concern per PR.
- Run `npm run lint`, `npm run build`, and `npm run test` before pushing to make sure nothing is broken.
- If you touch the CLI, run `npm run build:cli` and test with `npm run loadpulse -- --help`.
- No new comments that describe *what* the code does — only add a comment when the *why* is non-obvious.

### 5. Commit

Write commit messages in the imperative mood, present tense:

```
feat: add environment variable manager
fix: handle empty body in cURL parser
docs: add CLI section to Docs page
```

### 6. Open a pull request to `main`

```bash
git push origin your-branch-name
```

Then on GitHub:

1. Go to your fork → click **Compare & pull request**
2. Set base: `Ayush2966/LOAD-PULSE` → `main`
3. Fill in the PR template:
   - **What does this change?** — one sentence
   - **Why?** — link the issue (`Closes #42`)
   - **How was it tested?** — steps to verify
4. Mark as **Draft** if it's not ready for review yet

### 7. Review process

- A maintainer will review within a few days.
- Address feedback with new commits (don't force-push during review).
- Once approved, the maintainer will squash-merge into `main`.

Every push and PR to `main` runs the CI workflow (lint → typecheck/build → test, plus a dogfooded CLI SLA-gate demo). Keep it green.

---

## Raising an issue

Use the GitHub issue tracker at [github.com/Ayush2966/LOAD-PULSE/issues](https://github.com/Ayush2966/LOAD-PULSE/issues).

**Bug report — include:**
- Steps to reproduce
- Expected behaviour vs what actually happened
- Browser / OS / Node version
- Any console errors (open DevTools → Console)

**Feature request — include:**
- The problem you're trying to solve
- What you'd like to see
- Any prior art or references

---

## Project structure

```
src/
  components/   UI components (charts, inputs, report views, QR, per-node bars)
  lib/          Pure logic — curl/postman parsers, load patterns, fetcher,
                apdex, percentile, chaining, variable injection, exporters
    swarm/      Distributed swarm engine + WebRTC networking (PeerJS)
  pages/        Route-level pages (Run, History, Compare, Swarm, Docs, SharedReport)
  store/        Zustand stores (testStore, historyStore, swarmStore)
cli/
  index.ts      Entry point + orchestration + exit codes
  config.ts     Arg parsing + config file loader
  runner.ts     Async test runner (no Zustand, works in Node)
  printer.ts    Terminal output + gate evaluation
docs/planning/  Architecture & planning docs (PRD, IA, system design, schema, …)
dist/           Built web app (git-ignored, generated by npm run build)
dist-cli/       Built CLI bundle (git-ignored, generated by npm run build:cli)
```

---

## License

MIT © [Ayush Jain](https://github.com/Ayush2966)
