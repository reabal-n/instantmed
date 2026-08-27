# Task 9 Report: Hair Reproductive Safety Parity

## Status

DONE

Implementation commit: `391dcdd9f3ca4c6547b9d465b14021ea3cbc612e`

Series base supplied for this task: `2272d66dfa3c5515d4433476ed8fe50ad269ad88`

## Outcome

Hair loss now has defense-in-depth server enforcement for the already-visible reproductive contraindication. An exact `hairReproductive: "yes"` answer declines through the shared safety engine for the canonical consult service and the two existing Hair aliases. Exact `"no"` and `"na"` answers remain eligible to proceed to the rest of safety evaluation.

Server completeness now requires the already-existing `hairReproductive` answer only for Hair loss. Missing, blank, invalid, null, or boolean values are not silently treated as safe; they enter the existing recoverable `REQUEST_MORE_INFO` payment hold before safety evaluation. ED, women's health, and other consult subtypes do not inherit this requirement.

The authenticated/normal validator, recovered guest/draft checkout, and retry-payment paths all use the same rule. A contraindicating persisted Hair answer stops before Stripe session retrieval, expiry, creation, or replacement persistence.

No intake question, step, order, style, terminal-block copy, correction behavior, or client-side validation behavior changed.

## Mandatory Skill Constraints

The `instantmed-clinical-safety-review` skill required the change to preserve the full safety chain: clinical policy, routing, existing UI block, server enforcement, persistence/recovery, and focused tests. It prohibited relying on the visible client block alone or widening clinical policy beyond the documented Hair contraindication.

The `instantmed-checkout-payment-review` skill required completeness to run before clinical rule evaluation, missing safety data to remain a recoverable payment hold rather than a decline, authenticated/guest/retry parity, and proof that contraindicating recovered answers cannot reach Stripe or create/reuse a Checkout Session.

## Strict TDD Evidence

### RED

The first focused contract was added before production changes:

```bash
corepack pnpm exec vitest run lib/__tests__/consult-validators.test.ts
```

Witnessed result: 1 failed and 31 passed. The new Hair case expected `DECLINE` but the existing server safety engine returned `ALLOW`.

The expanded pre-implementation run was:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/checkout-safety-ordering.test.ts \
  lib/__tests__/missing-safety-payment-hold.test.ts \
  lib/__tests__/request-terminal-safety-blocks.test.ts \
  lib/__tests__/consult-validators.test.ts \
  lib/__tests__/hair-loss-health-validation.test.ts \
  lib/__tests__/checkout-resume-payment-safety.test.ts \
  lib/__tests__/stripe-checkout-retry.test.ts
```

Witnessed result: 2 test files failed and 5 passed; 13 tests failed and 168 passed. The failures showed all three Hair service identifiers allowing the contraindication, missing/invalid Hair answers passing completeness, and shared clinical validation failing to hold or decline the new cases.

### GREEN

The same seven-file suite passed after the smallest safety/completeness implementation:

- 7 test files passed
- 181 tests passed

A broader directly affected suite then ran:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/checkout-safety-ordering.test.ts \
  lib/__tests__/missing-safety-payment-hold.test.ts \
  lib/__tests__/request-terminal-safety-blocks.test.ts \
  lib/__tests__/consult-validators.test.ts \
  lib/__tests__/hair-loss-health-validation.test.ts \
  lib/__tests__/checkout-resume-payment-safety.test.ts \
  lib/__tests__/stripe-checkout-retry.test.ts \
  lib/__tests__/safety-rules-engine.test.ts \
  lib/__tests__/unified-intake-regressions.test.ts \
  lib/__tests__/specialty-experience-invariants.test.ts
```

Result: 10 test files passed, 294 tests passed.

## Implementation

- Added exact Hair rule `hair_reproductive_contraindication` for `consultSubtype === "hair_loss"` and `hairReproductive === "yes"`.
- Scoped the rule to `consult`, `gp-consult`, `mens-health-hair`, and `hair-loss` safety configurations without globally canonicalising service aliases.
- Added exact-value completeness semantics for the existing Hair answer: only `yes`, `no`, and `na` are complete.
- Preserved precedence: completeness holds invalid or absent data before any safety rule is evaluated.
- Documented server parity and the recoverable missing-data behavior in the clinical canon.
- Added source and runtime contracts for the existing visible terminal block and correction action without modifying the component.

## Exact Implementation Files

- `docs/CLINICAL.md`
- `lib/safety/evaluate.ts`
- `lib/safety/rules.ts`
- `lib/__tests__/checkout-resume-payment-safety.test.ts`
- `lib/__tests__/checkout-safety-ordering.test.ts`
- `lib/__tests__/consult-validators.test.ts`
- `lib/__tests__/missing-safety-payment-hold.test.ts`
- `lib/__tests__/request-terminal-safety-blocks.test.ts`
- `lib/__tests__/stripe-checkout-retry.test.ts`

The required `lib/__tests__/hair-loss-health-validation.test.ts` remained unchanged and passed in both GREEN runs.

## Static Verification

- Scoped ESLint over every changed TypeScript test and implementation file: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm doc:audit`: passed — 10 doc-pinning files and 120 tests passed, including sync, count, and reference checks.
- `git diff --check`: passed.

## Safety and Payment Self-review

- The rule uses exact schema values, not truthiness.
- `yes` declines; `no` and `na` continue; invalid or absent values hold for correction.
- Hair completeness does not affect ED, women's health, or any other consult subtype.
- Recovered guest/draft and retry-payment tests prove the contraindication is resolved before Stripe interactions or replacement payment persistence.
- Missing data preserves the existing recoverable payment-hold outcome and never becomes an invented clinical decline.
- The public-facing terminal-block source contract pins the exact existing title, explanatory copy, blocked-state derivation, and correction action.
- New public copy contains no medicine names.
- No database, Stripe, Ads, deployment, browser, or other external system was accessed or mutated.
- User-owned untracked `output/` was left untouched.

## Residual Risks

No blocking concerns. Stripe non-contact is proven through the repository's mocked orchestration harnesses rather than a live Stripe request, intentionally matching the no-external-calls boundary. This change mirrors the existing documented contraindication; it does not broaden or independently validate the underlying clinical policy.
