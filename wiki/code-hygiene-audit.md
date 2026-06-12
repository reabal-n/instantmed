# Code Hygiene Audit

Audit date: 2026-06-12. Scope: read-only scan plus documentation bookkeeping fixes planned in this branch.

## Current Status

| Check | Result |
|-------|--------|
| `git status --short --branch` before edits | Clean `main` |
| `bash scripts/check-orphaned-files.sh` | Passed |
| `bash scripts/check-route-conflicts.sh` | Passed |
| `pnpm lint` | Passed |
| `pnpm doc:audit` | Passed: 8 files, 66 tests, markdown count 89 |

## Findings

| Finding | Risk | Plan |
|---------|------|------|
| No `/wiki` folder existed | Future sessions over-read broad code folders | Add wiki as a first routing layer |
| `docs/bookkeeping/file-map.md` text said 79 docs while `expected-md-count` and `doc:audit` said 89 | Confusing documentation surface for future agents | Update file-map text and add wiki section |
| `docs/ARCHITECTURE.md` had stale counts for `components`, `lib`, migrations, and blog MDX | Misleading repo inventory | Refresh counts from current checkout |
| `docs/ARCHITECTURE.md` listed 23 cron routes, current count is 24 | Minor ops inventory drift | Refresh count |
| Large request, staff, data, SEO, and email files remain | Maintenance risk, but not a safe first-pass docs refactor | Capture as deferred refactor candidates |
| Production code has a few intentional escape hatches (`eslint-disable`, dev console fallbacks, `any` in analytics typing) | Low to moderate type-safety/locality risk | Review one bounded target at a time |

## Largest Hotspots

These are not automatically bad. They are places future refactors should inspect for seams and locality before editing.

| Path | Approx lines | Why it matters |
|------|--------------|----------------|
| `lib/blog/visuals.ts` | 4,428 | Large registry; may be acceptable data shape but hard to scan |
| `app/doctor/queue/actions.ts` | 1,484 | Clinical/staff mutation surface; high blast radius |
| `app/doctor/queue/queue-client.tsx` | 1,237 | Staff UI state and interactions |
| `app/doctor/queue/queue-table.tsx` | 1,236 | Staff table UI and review affordances |
| `lib/data/intakes/queries.ts` | 1,199 | Central queue/ledger read model |
| `components/request/steps/patient-details-step.tsx` | 1,055 | Identity, address, prescribing fields |
| `app/patient/settings/settings-client.tsx` | 1,039 | Patient account and identity UI |
| `components/request/request-flow.tsx` | 919 | Intake orchestration and draft behavior |
| `app/admin/features/feature-flag-detail.tsx` | 869 | Operational controls UI |
| `lib/email/send/reconstruct.ts` | 866 | Email reconstruction logic |

## Guardrail Health

The repo already has useful hygiene gates. Do not duplicate them in new scripts unless a concrete gap appears.

- Doc surface: `pnpm doc:audit`
- Route conflicts: `scripts/check-route-conflicts.sh`
- Retired/dead files: `scripts/check-orphaned-files.sh`
- Stack pins: `scripts/check-stack-pins.sh`
- Design tokens: `scripts/verify-tokens.sh`
- Portal legacy classes: `scripts/check-portal-no-legacy-classes.sh`
- CI coverage: `.github/workflows/ci.yml`

## First Pass Boundary

This branch should only add the wiki and tiny mechanical docs fixes. It must not change product direction, clinical policy, pricing, routes, database schema, runtime behavior, or stack versions.
