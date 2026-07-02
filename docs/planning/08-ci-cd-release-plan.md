# CI/CD & Release Plan (LoadPulse)

## 1. Build artifacts
| Artifact | Command | Output | Destination |
|---|---|---|---|
| Web App | `npm run build` | `dist/` (Vite static build) | GitHub Pages (`/docs` route + app) |
| CLI bundle | `npm run build:cli` | `dist-cli/loadpulse.mjs` | Published to npm as `loadpulse` |

`prepare` script auto-runs `build:cli` on `npm install`/`npm publish` — keep this in sync if the build pipeline changes.

## 2. CI pipeline (recommended stages, verify against actual `.github/workflows` if present)
```
1. Install deps        → npm install
2. Lint                → npm run lint (oxlint)
3. Type-check + build   → npm run build
4. Build CLI            → npm run build:cli
5. Test                  → (see 07-test-plan.md — add `npm test` once a test runner is added)
6. On main branch merge:
   a. Deploy dist/ → GitHub Pages
   b. On version tag: npm publish
```

## 3. Versioning
- Follow semver (`package.json` version field)
- Bump **major** on any breaking change to `TestConfig`/`ReportData` schema (see `05-report-schema.md`)
- Bump **minor** for new load patterns, new CLI flags, new success-criteria types
- Bump **patch** for bug fixes

## 4. Release checklist
- [ ] Version bumped in `package.json`
- [ ] README CLI examples still accurate
- [ ] `dist-cli/loadpulse.mjs` builds and `loadpulse --help` runs correctly
- [ ] Regression checklist from `07-test-plan.md` passed
- [ ] Git tag created, GitHub release notes written
- [ ] `npm publish` executed (confirm 2FA/auth before running)

## 5. Rollback plan
- npm: `npm deprecate loadpulse@<bad-version> "known issue, use <good-version>"` — npm doesn't support unpublish after 72h in most cases, so deprecate + ship a patch fast
- GitHub Pages: redeploy the previous commit's `dist/` if a Web App release breaks
