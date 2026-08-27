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

## Fix round 1

### Scope and commits

- Revision base: `d9dbaa376ece6a88c9c862a7c92095ab2a8a086e`
- Fix implementation: `7f8388e89a3d783e6edec8dd71281f25e1a9acce` (`fix(growth): harden specialty cohort recovery`)
- No worktree, push, deployment, remote migration, linked Supabase command, Ads mutation, external-system mutation, or user-owned `output/` change was made.

### Files

- Production fixes: `lib/growth/specialty-experience-attribution.ts`, `lib/stripe/guest-checkout.ts`
- Runtime behavior tests: `lib/__tests__/specialty-experience-attribution-contract.test.ts`, `lib/__tests__/specialty-experience-payment-propagation.test.ts`, `lib/__tests__/specialty-experience-payment-finalization.test.ts`, `lib/__tests__/stripe/checkout-operating-hours.test.ts`, `lib/__tests__/stripe-checkout-retry.test.ts`
- Source-shape coverage removed where executable payment behavior now exists: `lib/__tests__/flow-instance-attribution-contract.test.ts`, `lib/__tests__/specialty-experience-attribution-contract.test.ts`
- Local database harness: `scripts/test-specialty-experience-attribution-db.sh`, `scripts/sql/specialty-experience-attribution-db.test.sql`, and the `db:test:specialty-attribution` package script.

### RED evidence

Before either production fix, this focused command was run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-experience-attribution-contract.test.ts \
  lib/__tests__/specialty-experience-payment-propagation.test.ts \
  lib/__tests__/stripe/checkout-operating-hours.test.ts \
  lib/__tests__/stripe-checkout-retry.test.ts \
  lib/__tests__/specialty-experience-payment-finalization.test.ts
```

It exited nonzero with 2 failed and 69 passed tests. The failures were the intended reviewer findings:

- a non-null unknown persisted marker was replaced by the later valid candidate;
- rebuilt duplicate guest checkout arguments had the Session marker but no `payment_intent_data.metadata` marker.

The authenticated initial builder, initial guest checkout, retry, and finalizer DB-over-Session tests already passed in RED, proving those paths rather than merely finding identifier strings in source.

### GREEN and regression evidence

- The same focused command passed: 5 files, 71 tests.
- The original Task 4 focused command passed: 5 files, 33 tests.
- The payment/draft regression command from the original report passed: 13 files, 175 tests.
- Supabase migration-history, SECURITY DEFINER ACL-ratchet, and search-path static contracts passed: 3 files, 21 tests.
- Scoped ESLint with `--max-warnings 0` passed over every changed TypeScript file.
- `corepack pnpm typecheck` passed.
- `bash -n scripts/test-specialty-experience-attribution-db.sh`, `git diff --check`, and `git diff --cached --check` passed.

### Database execution evidence

The committed harness is local-only: it targets the fixed Supabase CLI container derived from `supabase/config.toml` (`supabase_db_witzcrovsoumktyndqgz`) via `docker exec`; it accepts no URL, project ref, credentials, `--linked`, or remote mode. It exits nonzero when the local container or an invariant is unavailable.

The SQL transaction checks both migrated columns, coexistence of the existing updated-at and flow-identity triggers with the new growth trigger, null-to-value and value-to-different/null draft behavior, service identity protection, the existing checkout-claim/conversion RPC, and realised-intake immutability. The shell then uses two local PostgreSQL connections to verify the first concurrent non-null writer remains authoritative. Fixed test identifiers are rolled back or cleaned with their discard tombstone so the harness is repeatable.

Attempted command:

```bash
corepack pnpm db:test:specialty-attribution
```

It exited 1 before any SQL because Docker could not find the local container: `Local Supabase DB container supabase_db_witzcrovsoumktyndqgz is unavailable.` No linked or remote fallback was used.

Required local pre-apply gate when Docker is available:

```bash
corepack pnpm dlx supabase@2.72.7 start
corepack pnpm dlx supabase@2.72.7 db reset --local
corepack pnpm db:test:specialty-attribution
corepack pnpm dlx supabase@2.72.7 db lint --local --schema public,extensions --fail-on error
```

### Self-review and remaining concern

- Persisted truth now wins by slot presence: any non-null database value is normalized and returned, including `null` for unknown or wrong-service values. Only a genuinely null/undefined stored slot consults the candidate.
- Duplicate guest recovery builds one metadata object and assigns it to both Checkout Session and PaymentIntent metadata. The recovery idempotency key, current-session invalidation, attach compare-and-set, confirmation, and retryability checks are unchanged.
- Executable tests now cover authenticated initial, initial guest, rebuilt guest, retry, and confirmed-payment precedence. The remaining migration-shape and forbidden-clinical-tree assertions are retained because those are static schema/privacy boundaries rather than practical application runtime behavior.
- The only remaining concern is environmental: the committed PostgreSQL concurrency and trigger/RPC harness, and local Supabase lint, remain unexecuted until a local Docker/Supabase stack is available. They are an explicit pre-apply gate; no remote evidence was substituted.
