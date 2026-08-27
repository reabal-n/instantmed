# Task 4 report — persist the cohort outside clinical answers

Status: **DONE_WITH_CONCERNS**

## Scope and base

- Task base: `d8a836af0758dc6976525d63d9a7436eb6de4d17`
- Implementation commit: `391487a36dc81c5880b7289195af08ce3a9e1e62` (`feat(growth): persist specialty experience cohorts`)
- No worktree, push, deployment, remote migration, Ads mutation, external-system mutation, or user-owned `output/` change was made.

## Files

Database and type contract:

- `supabase/migrations/20260828090000_specialty_experience_attribution.sql`
- `types/db.ts`
- `lib/growth/specialty-experience-attribution.ts`

Fresh-flow claim and draft recovery:

- `app/request/page.tsx`
- `components/request/request-flow.tsx`
- `components/request/hooks/use-flow-analytics.ts`
- `components/request/store.ts`
- `lib/request/draft-storage.ts`
- `lib/request/server-draft.ts`
- `app/api/draft/route.ts`
- `lib/request/server-draft-conversion.ts`

Checkout, retry, Stripe, and confirmed-payment propagation:

- `components/request/steps/review-step.tsx`
- `app/actions/unified-checkout.ts`
- `lib/stripe/checkout/types.ts`
- `lib/stripe/checkout/persistence.ts`
- `lib/stripe/checkout/stripe-session.ts`
- `lib/stripe/checkout.ts`
- `lib/stripe/guest-checkout.ts`
- `lib/stripe/checkout/retry-payment.ts`
- `lib/stripe/confirmed-payment-finalization.ts`

Privacy and contract coverage:

- `lib/analytics/posthog-privacy.ts`
- `lib/__tests__/specialty-experience-attribution-contract.test.ts`
- `lib/__tests__/flow-instance-attribution-contract.test.ts`
- `lib/__tests__/posthog-personless-analytics.test.ts`
- `lib/__tests__/server-draft-conversion.test.ts`

Every production path named in Task 4 changed. `components/request/hooks/use-flow-analytics.ts` is an additional necessary path because it is the runtime owner of the client `intake_started` event.

## RED evidence

The required focused command was run before implementation:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-experience-registry.test.ts \
  lib/__tests__/specialty-experience-attribution-contract.test.ts \
  lib/__tests__/flow-instance-attribution-contract.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts \
  lib/__tests__/conversion-value-accuracy-contract.test.ts
```

It exited RED: the attribution helper module did not exist, the marker was absent from the draft/payment propagation contract, and the PostHog sanitizer retained a malformed marker.

A follow-up privacy test was also witnessed RED (`1 failed, 10 passed`) before generalised dropping of `click_id`, `search_terms`, and nested `*_answers` properties.

## GREEN evidence

Required focused command:

- 5 test files passed
- 35 tests passed

Payment/draft regression command:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/draft-storage.test.ts \
  lib/__tests__/draft-route-privacy.test.ts \
  lib/__tests__/request-store-hydration.test.ts \
  lib/__tests__/request-store-server-recovery.test.ts \
  lib/__tests__/server-draft-conversion.test.ts \
  lib/__tests__/server-draft-recovery.test.ts \
  lib/__tests__/server-draft-session.test.ts \
  lib/__tests__/server-draft-flush.test.ts \
  lib/__tests__/request-store-analytics.test.ts \
  lib/__tests__/intake-analytics-events.test.ts \
  lib/__tests__/stripe-checkout-retry.test.ts \
  lib/__tests__/confirmed-payment-finalization-contract.test.ts \
  lib/__tests__/guest-checkout-operational-contract.test.ts
```

- 13 test files passed
- 174 tests passed

Other verification:

- `corepack pnpm exec vitest run lib/__tests__/supabase-migration-history-contract.test.ts lib/__tests__/security-definer-acl-ratchet.test.ts lib/__tests__/audit-search-path-hardening-migration-contract.test.ts` — 3 files / 21 tests passed.
- `corepack pnpm typecheck` — passed.
- Scoped ESLint over every changed TypeScript/TSX file with `--max-warnings 0` — passed.
- `git diff --check` and `git diff --cached --check` — passed.

## Migration/static evidence

- The migration adds nullable text columns only; existing rows remain `null` and no backfill or table rewrite is requested.
- Both columns have a maximum length and opaque `spx_` format check plus comments declaring them non-clinical.
- `partial_intakes` uses a `BEFORE UPDATE` trigger with `coalesce(old, new)` so the first non-null value wins under row locking.
- `intakes` rejects every post-insert value change with a `23514` trigger.
- Both trigger functions are `SECURITY INVOKER`, set an empty `search_path`, and revoke direct execution from `public`, `anon`, and `authenticated`.
- The repo migration-history, ACL-ratchet, and search-path static contracts passed.
- `corepack pnpm dlx supabase@2.72.7 db lint --local --schema public,extensions --fail-on error` could not run because no local PostgreSQL/Docker stack was listening on `127.0.0.1:54322`. Linked/remote lint was deliberately not used because this task prohibits external-system and remote-migration access.

## Self-review

- Fresh claim: only the page-normalised, current, service-matched landing token can call the store's set-once claim; untagged starts remain null and no active registry value is inferred.
- Restore authority: local and server drafts normalise known persisted IDs without consulting current activation status. Checkout reads the database-owned partial/intake marker before considering the client candidate.
- Payment integrity: retry metadata comes from the immutable intake row. Confirmed payment prefers the intake row over Checkout Session metadata. Existing stale-Session guards, current `payment_id` compare-and-set checks, retryability gates, and payment idempotency keys were not changed.
- Privacy: the marker is a separate column/property, never an answer. The forbidden clinical, AI, email, and Parchment trees contain no marker reference. PostHog admits only an exact code-owned opaque ID and drops raw answers, search terms, click IDs, and free-text reason fields.
- Failure mode: malformed, unknown, inactive fresh URL claims, and wrong-service values become null; marker validation never returns a patient-facing error or blocks checkout/fulfilment.

## Concern

The only remaining concern is environmental: Supabase's local schema lint could not execute without the local Docker/Postgres service. No live or linked database check was substituted. CI or a developer with the local Supabase stack should run the pinned lint command before applying the migration.
