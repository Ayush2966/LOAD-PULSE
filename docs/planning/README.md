# LoadPulse — Planning Docs

Index of planning/architecture docs for this project. Written to match the actual code in `src/lib`, `src/store`, `src/pages`, and `cli/`.

1. [PRD](01-prd.md) — features, goals, non-goals
2. [Information Architecture](02-information-architecture.md) — page/section structure
3. [User Flow](03-user-flow.md) — web, share, and CI flows
4. [System Design](04-system-design.md) — shared core, Web/CLI split, build pipeline
5. [Report/Config Schema](05-report-schema.md) — `TestConfig` / `ReportData` / `RunRecord` contracts + versioning rules
6. [Design System](06-design-system.md) — theming, color roles, chart conventions (scaffold — fill in as UI stabilizes)
7. [Test Plan](07-test-plan.md) — unit/integration coverage priorities, release regression checklist
8. [CI/CD & Release Plan](08-ci-cd-release-plan.md) — build artifacts, versioning, rollback
9. [CLI Design Spec](09-cli-design.md) — flags, exit codes, config file, CI contract
10. [Project Build History](10-project-build-history.md) — how the repo/CLI-CI mode was built, git history, local Desktop setup

**Not included** (intentionally skipped — see reasoning in-chat): DB design, auth/compliance plan, server infra/scalability plan — LoadPulse is a no-backend, client-side tool.
