# Task 5 report — release conversion, cash, and guest linkage

## Outcome

Implemented an aggregate-only release measurement read model, CLI receipt, and compact Business analytics table. The corrected slice separates PostHog start-cohort conversion from database cash truth, pairs D+7 and D+14 with equal-length baselines and matched post-cohort follow-up, withholds incomplete cohorts, and uses only horizon-mature orders for guest-link rates. No production source was queried or mutated by this implementation pass, no patient-level value was written to an artifact, and no deployment was performed.

## Changes

- Added a server-only PostHog start-cohort reader for valid RFC UUID v4 flow IDs. It reports separate starts, checkout initiations, server purchases, repeat-Rx medication progression, validation blocks, unresolved validation blocks, service steers, and clinical hard blocks. The mobile completion numerator is the strict subset of mobile medication viewers with a later medication completion, including cross-device completions without allowing mobile-only completion events to inflate the rate.
- Coverage now uses an honest event-time `[from,to)` instrumentation window and the weakest non-empty required core event rather than a weighted total. All generated boundaries use the provider-compatible UTC form `toDateTime64('YYYY-MM-DD HH:mm:ss.SSS', 3, 'UTC')`. Zero blocker rows are neutral.
- Every provider flow row must have the exact expected shape, a valid v4 flow ID, and a valid in-cohort `started_at` before exact-count reconciliation. Duplicate, malformed, out-of-window, over-limit, and count-mismatched results fail closed.
- Added a server-only paid guest-order linkage reader. `guest_email IS NOT NULL` is a query predicate only; email is never selected. Inclusive 24-hour, 7-day, and 14-day rates use only orders whose full horizon has matured. Separate `currentlyLinkedAtReadOrders` and `currentlyUnlinkedAtReadOrders` fields explicitly describe current profile state at read time rather than durable historical linkage.
- Added a cash snapshot composed from the existing complete customer-growth revenue evidence. Cohort membership is half-open by `paid_at`; refunds, reversals, disputes, and reinstatements are observed through the same matched follow-up exposure for baseline and release. It now exposes prescription-scoped paid orders, timestamp-backed declines, and canonical-ledger refund counts/cents/rates for Task 8.
- Added explicit `available`, `degraded`, `unavailable`, and cohort/horizon pending states with nullable values. Failed and immature reads never become zero.
- Added strict CLI arguments, a package invocation that loads `.env.local`, recursive sensitive-key/value rejection, and atomic mode-0600 JSON output. `--release-at` is mandatory and visible in every invocation; future and calendar-invalid boundaries are rejected without starting a source read. `.env.example` and `docs/OPERATIONS.md` document deploy/promote, capture SHA and READY time, set Production env, redeploy, and verify.
- Kept exactly five primary dashboard cards and embedded the table in the canonical funnel card. It shows paired Baseline 7d/D+7 and Baseline 14d/D+14 rows, starts-to-checkout, starts-to-paid, mobile medication completion with numerator/denominator, mature 24-hour guest linkage, overall refunds, prescription decline/refund rates, exact cohort bounds, matched follow-up cutoff, and status with no drill-down.
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
8. The independent-review correction first failed 19 of 55 focused assertions: the implementation accepted malformed/out-of-window flow rows, emitted two-argument/non-UTC ClickHouse timestamps, let post-window events affect coverage, gave baseline and release different follow-up exposure, used non-mature guest denominators, omitted mobile counts and prescription cash metrics, treated linkage as durable history, and did not make `--release-at` operational.
9. A final adversarial linkage test failed because the current-at-read aggregate was still bounded by the historical observation cutoff; the implementation was then corrected to keep current profile state and historical horizon attribution separate.
10. The final review correction failed 2 of 28 focused tests: independent mobile-view/mobile-completion counts produced an impossible 150% rate for cross-device/resumed flows, and a regex-shaped but calendar-invalid configured release timestamp threw `RangeError` instead of returning the documented unavailable state.

Final focused GREEN:

```text
corepack pnpm exec vitest run \
  lib/__tests__/guest-account-linkage.test.ts \
  lib/__tests__/posthog-release-conversion.test.ts \
  lib/__tests__/release-friction-readout.test.ts \
  lib/__tests__/secure-request-tracker-contract.test.ts \
  lib/__tests__/business-dashboard-contract.test.ts \
  lib/__tests__/intake-analytics-events.test.ts \
  lib/__tests__/customer-growth-baseline.test.ts

Test Files  7 passed (7)
Tests       88 passed (88)
```

## Other verification

```text
corepack pnpm exec eslint --max-warnings 0 <Task 5 TypeScript/TSX paths>
exit 0

corepack pnpm exec eslint --max-warnings 0 --no-warn-ignored scripts/release-friction-readout.ts
exit 0

corepack pnpm typecheck
exit 0

git diff --check
exit 0
```

A direct CLI run intentionally omitted `--release-at`. It exited 1 before any source read and printed the exact usage string with the required immutable ready-time argument.

Browser verification was not run against `/admin/analytics`: rendering that authenticated page with the available workspace environment would query configured external data sources, which this task explicitly forbids. The five-card placement, table semantics, labels, and no-drilldown boundary are pinned by the Business dashboard contract; a clean authenticated browser pass remains an integration/release check.

## Configuration and remaining risk

The admin table remains explicitly unavailable until the promoted deployment supplies:

- `INSTANTMED_RELEASE_MEASUREMENT_SHA`: exact 40-character deployment Git SHA.
- `INSTANTMED_RELEASE_MEASUREMENT_AT`: canonical UTC Vercel ready timestamp including milliseconds.
- Existing server-side PostHog project credentials for PostHog evidence.

The provider request payloads are asserted through mock transports, including every `toDateTime64` call, the event-time coverage bounds, exact-count query, overflow sentinel, and absence of prohibited identifiers. Independent review separately supplied a read-only live aggregate smoke result proving that the three-argument UTC form is accepted and returns aggregate evidence without IDs or PHI; this correction did not query production itself. Database and PostHog failures remain fail-soft and visible; they do not silently substitute zeros.
