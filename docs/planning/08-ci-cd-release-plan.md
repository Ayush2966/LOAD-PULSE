# CI/CD & Release Plan (LoadPulse)

## 1. Build artifacts
| Artifact | Command | Output | Destination |
|---|---|---|---|
| Web App | `npm run build` | `dist/` (Vite static build + PWA assets: `sw.js`, `manifest.webmanifest`) | GitHub Pages / any static host |
| CLI bundle | `npm run build:cli` | `dist-cli/loadpulse.mjs` (single esbuild ESM file) | Published to npm as `loadpulse` |

`prepare` auto-runs `build:cli` on `npm install`/`npm publish`, so the published package always ships a fresh CLI build. Only `dist-cli/` is in the npm `files` allowlist — the web app is **not** published to npm.

## 2. CI pipeline — actual (`.github/workflows/ci.yml`)
Workflow name **CI**. Triggers: `push` to `main`, `pull_request` targeting `main`, and manual `workflow_dispatch`. Two jobs, both `ubuntu-latest`, `actions/setup-node@v4` with **Node 20** + npm cache, `npm ci`:

```
job: build  ("Lint, typecheck/build, test")
  1. npm run lint     (oxlint)
  2. npm run build    (tsc -b typecheck + vite web build)
  3. npm run test     (vitest)

job: dogfood-cli  ("Dogfood CLI (SLA gate demo)")   [needs: build]
  1. npm run build:cli
  2. node dist-cli/loadpulse.mjs run --curl "curl https://api.github.com/zen" \
       --rate 5 --duration 5 --concurrency 5 --fail-under 95 --p95-under 3000 \
       --json > demo-report.json      (continue-on-error: true — hits a live endpoint)
  3. Report gate outcome (if: always())
  4. Upload demo-report.json as artifact "loadpulse-demo-report" (if: always())
```

**Not automated:** there is **no npm-publish job** and **no GitHub Pages deploy job** in CI. Publishing to npm and deploying the web app are manual (see §4). The dogfood job is a real-binary smoke test, deliberately non-blocking.

## 3. Versioning
- Follow semver (`package.json` `version` field; currently `1.0.0`)
- Bump **major** on any breaking change to `CliExportConfig`/`ReportData` schema (see `05-report-schema.md`)
- Bump **minor** for new load patterns, new CLI flags, new success-criteria types, new swarm capabilities
- Bump **patch** for bug fixes

## 4. Release checklist (manual)
- [ ] Version bumped in `package.json`
- [ ] `npm run lint`, `npm run build`, `npm run test` all green (CI enforces on PR)
- [ ] README + `docs/planning` CLI examples still accurate
- [ ] `dist-cli/loadpulse.mjs` builds and `loadpulse --help` runs correctly
- [ ] Regression checklist from `07-test-plan.md` passed
- [ ] Git tag created, GitHub release notes written
- [ ] `npm publish` executed manually (confirm 2FA/auth before running) — CI does not publish
- [ ] Web app deployed (GitHub Pages settings / manual `dist/` upload) — CI does not deploy

## 5. Rollback plan
- **npm:** `npm deprecate loadpulse@<bad-version> "known issue, use <good-version>"` — npm doesn't support unpublish after 72h in most cases, so deprecate + ship a patch fast
- **Web app:** redeploy the previous commit's `dist/` if a release breaks

## 6. Future CI additions (not yet present)
- Publish-on-tag job (`npm publish` gated on a version tag + `NODE_AUTH_TOKEN`)
- GitHub Pages deploy job for `dist/`
- CLI unit tests wired into the `build` job (see `07-test-plan.md` §2)
