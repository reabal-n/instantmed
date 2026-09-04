# Task 5 report — release conversion, cash, and guest linkage

## Outcome

Implemented an aggregate-only release measurement read model, CLI receipt, and compact Business analytics table. The slice separates PostHog start-cohort conversion from database cash truth, pairs D+7 and D+14 with equal-length baselines, withholds incomplete cohorts, and keeps guest-account linkage horizon-aware. No production source was queried or mutated, no patient-level value was written to an artifact, and no deployment was performed.

## Changes

- Added a server-only PostHog start-cohort reader for valid RFC UUID v4 flow IDs. It reports separate starts, checkout initiations, server purchases, repeat-Rx medication progression, mobile completion, validation blocks, unresolved validation blocks, service steers, and clinical hard blocks.
- Coverage now uses the weakest non-empty required core event rather than a weighted total. Zero blocker rows are neutral. A separate `uniqExact` start count validates the returned flow rows, and a 50,001-row sentinel fails closed on truncation.
- Added a server-only paid guest-order linkage reader. `guest_email IS NOT NULL` is a query predicate only; email is never selected. A link requires both current `auth_user_id` and `email_verified_at >= paid_at`, with inclusive 24-hour, 7-day, and 14-day horizons and an aggregate negative-timestamp anomaly count.
- Added a cash snapshot composed from the existing complete customer-growth revenue evidence. Cohort membership is half-open by `paid_at`; refunds, reversals, disputes, and reinstatements are observed through an independent `asOf`. Refund and dispute order counts are distinct intake-level aggregates.
- Added explicit `available`, `degraded`, `unavailable`, and cohort/horizon pending states with nullable values. Failed and immature reads never become zero.
- Added strict CLI arguments, a package invocation that loads `.env.local`, recursive sensitive-key/value rejection, and atomic mode-0600 JSON output. The admin boundary uses strict immutable release SHA/timestamp configuration documented in `.env.example`.
- Kept exactly five primary dashboard cards and embedded the table in the canonical funnel card. It shows paired Baseline 7d/D+7 and Baseline 14d/D+14 rows, starts-to-checkout, starts-to-paid, medication completion, 24-hour guest linkage, refund numerator/denominator, exact cohort bounds, cutoff, and status with no drill-down.
- Broadened sensitive tracker/account-completion contracts to prohibit analytics imports, hooks, and calls while preserving central post-conversion exclusions.
- Corrected only the existing ordinary medication-validation analytics payload to include `resolution: "shown"`. Clinical rules, questions, errors, blockers, and submission behavior are unchanged.

## Strict TDD evidence

RED was observed before implementation:

1. The initial four-file focused run failed because the three Task 5 implementation modules did not exist; the existing secure-route contract remained green.
2. Dashboard/package contracts failed on the missing read, table, and package invocation.
3. Cohort-maturity and paired-baseline contracts failed seven assertions before pending whole-cohort states and paired windows existed.
4. `intake-analytics-events.test.ts` failed one assertion because ordinary medication validation did not emit `resolution: "shown"`.
5. Privacy and receipt metadata contracts failed before recursive guest-email rejection and source/top-level `reason`/`asOf` fields were added.
6. The measurement-quality hardening run failed 6 of 23 tests: weighted coverage hid a 0%-covered core event, overflow and exact-count mismatches stayed available, checkout conversion was absent from the table, and the release environment boundary was undocumented.
7. The before-cohort `asOf` boundary failed 1 of 8 readout tests because cash validation threw instead of returning an in-progress nullable cohort.

Final focused GREEN:

```text
corepack pnpm exec vitest run \
  lib/__tests__/guest-account-linkage.test.ts \
  lib/__tests__/posthog-release-conversion.test.ts \
  lib/__tests__/release-friction-readout.test.ts \
  lib/__tests__/secure-request-tracker-contract.test.ts \
  lib/__tests__/business-dashboard-contract.test.ts \
  lib/__tests__/intake-analytics-events.test.ts

Test Files  6 passed (6)
Tests       58 passed (58)
```

## Other verification

```text
corepack pnpm exec eslint --max-warnings 0 <Task 5 TypeScript/TSX paths>
exit 0

corepack pnpm exec eslint --max-warnings 0 --no-warn-ignored scripts/release-friction-readout.ts
exit 0

git diff --check
exit 0
```

A direct CLI run used an empty environment and valid synthetic release arguments. It exited 0, made no live query, and returned an aggregate-only JSON receipt with every unavailable source represented by nullable values and fixed reasons.

`corepack pnpm typecheck` passed earlier in this slice. The final rerun is temporarily blocked only by concurrent Task 2 intentional RED work: `stripe-hosted-e2e-preflight.test.ts` imports three not-yet-created Task 2 files and currently contains Task 2 typing failures. No Task 5 path appeared in that diagnostic.

Browser verification was not run against `/admin/analytics`: rendering that authenticated page with the available workspace environment would query configured external data sources, which this task explicitly forbids. The five-card placement, table semantics, labels, and no-drilldown boundary are pinned by the Business dashboard contract; a clean authenticated browser pass remains an integration/release check.

## Configuration and remaining risk

The admin table remains explicitly unavailable until the promoted deployment supplies:

- `INSTANTMED_RELEASE_MEASUREMENT_SHA`: exact 40-character deployment Git SHA.
- `INSTANTMED_RELEASE_MEASUREMENT_AT`: canonical UTC Vercel ready timestamp including milliseconds.
- Existing server-side PostHog project credentials for PostHog evidence.

The HogQL was verified through mock transports and source contracts, not a live PostHog project. A read-only integration check should validate provider query compatibility after release configuration. Database and PostHog failures remain fail-soft and visible; they do not silently substitute zeros.
