# ⚡ LoadPulse

> API load testing — from a single cURL command to CI-gated SLA checks.

LoadPulse is a browser-based load testing tool with a companion CLI. Paste any cURL command, pick a load pattern, and get live latency charts, percentile breakdowns, Apdex scores, and shareable reports — no account, no server, no setup.

[![npm](https://img.shields.io/npm/v/loadpulse)](https://www.npmjs.com/package/loadpulse)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

- **cURL import** — paste any cURL or import a Postman collection
- **5 load patterns** — Constant, Ramp, Step, Spike, Soak
- **Live charts** — latency over time, throughput per second, status distribution
- **Success criteria** — status code ranges, latency threshold, body keyword check, auto-stop on error rate
- **Request chaining** — extract tokens from auth steps and inject into the load test
- **Apdex & SLA** — industry-standard satisfaction score with configurable T value
- **Shareable reports** — encode full reports in a URL, no backend needed
- **CLI** — run from the terminal, gate deploys on SLA, pipe JSON reports to CI artifacts

---

## CLI — quick start

The CLI is published on npm. Requires Node 18+.

```bash
npm install -g loadpulse
```

```bash
# Run a test against any endpoint
loadpulse run --curl "curl https://api.example.com/health" \
  --rate 20 --duration 60 --fail-under 99 --p95-under 500

# Use a config file (export from the UI with ⬇ Export Config)
loadpulse run loadpulse.json

# Save a JSON report for CI artifacts
loadpulse run loadpulse.json --json > report.json

# Help
loadpulse --help
```

**Exit codes:** `0` all gates passed · `1` gate failed (block the deploy) · `2` config error

See the full CLI reference in the [Docs tab](https://ayush2966.github.io/LOAD-PULSE) or run `loadpulse --help`.

---

## Web app — local development

**Requirements:** Node 18+, npm 9+

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
# Build for production
npm run build

# Build the CLI bundle
npm run build:cli

# Lint
npm run lint
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
- Run `npm run build` before pushing to make sure nothing is broken.
- If you touch the CLI, run `npm run build:cli` and test with `npx tsx cli/index.ts --help`.
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
  components/   UI components (charts, inputs, report views)
  lib/          Pure logic — curl parser, load patterns, fetcher, exporters
  pages/        Route-level pages (Run, History, Compare, Docs, SharedReport)
  store/        Zustand stores (testStore, historyStore)
cli/
  index.ts      Entry point + arg parsing
  runner.ts     Async test runner (no Zustand, works in Node)
  config.ts     Config file loader
  printer.ts    Terminal output + gate evaluation
dist-cli/       Built CLI bundle (git-ignored, generated by npm run build:cli)
```

---

## License

MIT © [Ayush Jain](https://github.com/Ayush2966)
