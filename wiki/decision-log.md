# Decision Log

## 2026-06-12: Add Wiki As Navigation Layer

Decision: create `/wiki` as the first routing layer after `CLAUDE.md`.

Reason: future Claude/Codex sessions need a compact context map that points to canonical docs and implementation entry points without broad repo scanning.

Consequence: wiki files are counted in `pnpm doc:audit` through `docs/bookkeeping/expected-md-count` and mapped in `docs/bookkeeping/file-map.md`.

## 2026-06-12: Wiki Does Not Replace Canonical Docs

Decision: keep `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/CLINICAL.md`, `docs/SECURITY.md`, `docs/OPERATIONS.md`, `docs/TESTING.md`, `DESIGN.md`, and `PRODUCT.md` as the canonical sources of truth.

Reason: duplicating policy and implementation detail into a second canon creates drift. The wiki should route readers, not re-legislate the platform.

Consequence: wiki pages should stay concise and link to canonical docs for detail.

## 2026-06-12: First Pass Is Docs Plus Tiny Fixes

Decision: first implementation pass only adds the wiki and mechanical documentation bookkeeping updates.

Reason: the repo already has strong hygiene gates, and behavior-changing refactors need focused tests and separate review.

Consequence: code refactors are recorded in `wiki/refactor-plan.md` and deferred.

## 2026-06-12: Counted Doc Surface Becomes 97

Decision: adding 8 wiki markdown files increases the counted doc surface from 89 to 97.

Reason: `scripts/doc-audit.sh` counts root-level wiki markdown files unless explicitly excluded. Keeping them counted makes the wiki visible to the existing doc discipline.

Consequence: `docs/bookkeeping/expected-md-count` and `docs/bookkeeping/file-map.md` must be updated with the wiki.

## 2026-06-12: Request URL Seeding Is A Pure Decision Helper

Decision: keep first-render `/request` URL handoff logic in `lib/request/initial-url-seeding.ts`.

Reason: consult subtype, certificate type, and duration URL params are conversion-sensitive and should be testable without mounting the full request flow.

Consequence: future changes to URL-seeded intake behavior should update the helper and its focused Vitest contract before editing `components/request/request-flow.tsx`.

## 2026-06-12: Enhanced Conversion Client Payload Is Typed

Decision: define explicit `EnhancedConversionsUserData` and address payload types in `lib/analytics/conversion-tracking.ts`.

Reason: Google Ads enhanced conversion payload keys are strict, and a loose `Record<string, any>` made drift easier to miss.

Consequence: future client-side enhanced-conversion changes should update the typed builder and `lib/__tests__/conversion-tracking.test.ts` together.

## 2026-06-12: Doctor Queue Actions Stay Unsplitted Until Better Tests Exist

Decision: record the current doctor queue action/guard map before moving queue server-action code.

Reason: `app/doctor/queue/actions.ts` owns clinical decision, prescribing, refund, claim, and capability enforcement paths. Existing guard coverage is useful but mostly source-contract based, not enough for broad extraction.

Consequence: future Batch 4 work should start with a focused test around one pure helper, beginning with renewal-note formatting, before moving any code out of the server-action module.
