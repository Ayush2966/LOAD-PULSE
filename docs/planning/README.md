# LoadPulse — Planning Docs

Index of planning/architecture docs for this project. Written to match the actual code in `src/lib`, `src/store`, `src/pages`, `src/lib/swarm`, and `cli/`.

1. [PRD](01-prd.md) — features, goals, non-goals (incl. distributed swarm, now shipped)
2. [Information Architecture](02-information-architecture.md) — routes (Run/History/Compare/Swarm/Docs/SharedReport) + section structure
3. [User Flow](03-user-flow.md) — web, swarm, share, history/compare, and CI flows
4. [System Design](04-system-design.md) — shared core, Web/Swarm/CLI split, build pipeline
5. [Report/Config Schema](05-report-schema.md) — `TestConfig` / `CliExportConfig` / `ReportData` / `RunRecord` / swarm message contracts + versioning rules
6. [Design System](06-design-system.md) — theming, color tokens (`src/index.css`), chart conventions, component inventory
7. [Test Plan](07-test-plan.md) — actual vitest coverage, gaps, release regression checklist
8. [CI/CD & Release Plan](08-ci-cd-release-plan.md) — build artifacts, the actual `ci.yml`, versioning, rollback
9. [CLI Design Spec](09-cli-design.md) — flags, exit codes, config file (`CliExportConfig`), CI contract
10. [Project Build History](10-project-build-history.md) — how the repo/CLI/CI came together, real git history, local setup

**Not included** (intentionally skipped): DB design, auth/compliance plan, server infra/scalability plan — LoadPulse is a no-backend, client-side tool. The distributed **swarm** feature is peer-to-peer (WebRTC), so it adds no server tier either.
