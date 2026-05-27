# Release Log

Short production release notes for operator handoff. Keep this lightweight: commit, deploy, checks, and rollback anchor only.

## 2026-05-07

- Commit: `a14c634ff` (`Stabilize merged release gates`)
- Deployment: `dpl_7ccrC5nhuR7Lgb185M3tW72KZjMp`
- Alias: `https://instantmed.com.au`
- Checks: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm build:release`, `scripts/check-orphaned-files.sh`, `scripts/check-bundle-size.sh`
- Smoke: `/` returned `200`; `/api/health` returned `{"status":"ok"}`
- Rollback anchor: previous production `1b106b3a7`
