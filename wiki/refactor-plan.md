# Refactor Plan

This is a follow-up plan. Do not bundle these with the first wiki pass unless separately approved.

## Batch 1: Doc Navigation Hardening

1. Add the wiki and wire it into `CLAUDE.md`.
2. Regenerate `AGENTS.md`.
3. Update `docs/bookkeeping/file-map.md` and `docs/bookkeeping/expected-md-count`.
4. Refresh stale inventory counts in `docs/ARCHITECTURE.md`.
5. Run `pnpm doc:audit`, route/orphan checks, lint, and `git diff --check`.

## Batch 2: Request Flow Hook Review

Status: completed on 2026-06-12. URL seeding now lives in `lib/request/initial-url-seeding.ts` with focused Vitest coverage; `components/request/request-flow.tsx` keeps only the health-profile dependency suppression.

Goal: reduce hook dependency suppressions in `components/request/request-flow.tsx` without changing intake behavior.

Tiny commits:

1. Add or identify focused tests covering URL-seeded consult subtype, cert type, and duration behavior.
2. Extract mount-only URL seeding into a named helper/hook with explicit intent.
3. Replace broad `eslint-disable react-hooks/exhaustive-deps` comments only where the helper makes dependencies honest.
4. Verify med-cert, ED, hair-loss, and coming-soon subtype behavior.

Verification completed: focused Vitest coverage for URL-seeded consult subtype, cert type, and duration behavior; lint; typecheck; targeted Chromium Playwright specs for consult subtypes and medical-certificate pre-seeding.

Risk: intake draft restoration and URL handoff behavior are conversion-sensitive. Do not refactor without focused tests.

## Batch 3: Conversion Tracking Type Tightening

Goal: remove the `Record<string, any>` escape hatch in `lib/analytics/conversion-tracking.ts`.

Tiny commits:

1. Define a typed enhanced-conversion user-data shape.
2. Replace `any` with explicit optional fields for hashed email, phone, first name, last name, and address.
3. Add a focused unit test for user-data payload shape if practical.
4. Verify lint and typecheck.

Risk: Google Ads enhanced conversion payload shape is strict. Keep wire shape unchanged.

## Batch 4: Staff Queue Locality Review

Goal: make the doctor queue mutation/UI surface easier to understand without weakening clinical ownership guards.

Tiny commits:

1. Map current actions in `app/doctor/queue/actions.ts` by outcome and required guard.
2. Move pure formatting or payload-building helpers only if tests already cover behavior.
3. Keep server-side claim/ownership enforcement in the mutation path.
4. Run focused doctor queue tests after each small move.

Risk: staff queue actions are clinical operations, not cosmetic UI code. Do not split files until the enforcement path is proven.

## Out Of Scope Until Approved

- Product/service expansion.
- Route retirement beyond already guarded aliases.
- Database migrations.
- Pricing/refund policy.
- Clinical rules.
- Stack upgrades.
- Full rewrites of large components.
