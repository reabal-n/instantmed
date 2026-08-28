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

## Independent Review Follow-up: Duplicate Guest Recovery

Follow-up implementation commit: `e6d0f7d741592cc7048bb49ec6c85fd0a10f564d`

The independent review found one additional duplicate-guest idempotency-recovery branch in `lib/stripe/guest-checkout.ts`. That branch loaded authoritative stored answers but only applied the repeat-prescription dose contract before inspecting or rebuilding Stripe state. It did not run the shared safety completeness validator or safety rules engine against a recovered Hair intake.

### Follow-up Repair

- The duplicate lookup now loads the stored service relation through the explicit `service_id` relationship.
- Safety evaluation uses authoritative stored answers, the stored service slug, and the stored intake subtype. For consult rows, the stored subtype is injected as `consultSubtype`, so a legacy answer blob cannot evade the Hair rule merely because routing context is absent from the blob.
- `validateSafetyFieldsPresent()` runs before `checkSafetyForServer()`.
- General safety completeness and the existing repeat-dose completeness result are combined into one deduplicated missing-field list and passed to the existing `holdCheckoutForMissingSafetyInformation()` owner.
- Missing, blank, and invalid Hair values enter the established `guest_duplicate` recoverable hold branch. They do not become a clinical decline.
- A contraindicating stored Hair answer records the safety result and returns before the payment lock, session classifier, or rebuild path.
- Exact stored `no` and `na` answers continue through the existing safe recovery branch.

No intake UI, question, step, copy, clinical policy, price, payment-state owner, or Stripe session helper was changed.

### Follow-up Strict TDD Evidence

The direct duplicate-guest harness was expanded before the recovery implementation. The clean RED run was:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/stripe/checkout-operating-hours.test.ts
```

Witnessed result: 1 test file failed; 6 tests failed and 28 passed. The failures proved that:

- authoritative `yes` answers reached the terminal payment fallback instead of the Hair decline;
- missing, blank, and invalid answers did not enter the missing-safety hold;
- `no` and `na` recoveries had no second-call evidence for persisted safety evaluation; and
- the recovered call did not use the stored `mens-health-hair` service slug.

The stored-subtype contract was then strengthened with legacy-style Hair answer blobs that omit `consultSubtype`. Before subtype injection, the same six cases failed because the shared evaluators received no stored `hair_loss` routing context.

After implementation, the isolated harness passed: 1 file, 34 tests.

### Follow-up Payment and Safety GREEN

The combined verification command covered the original Task 9 focused and broader suites plus duplicate guest recovery, signed resume, retry payment, missing-safety hold, payment integrity, abandoned checkout, cancellation links, price-config recovery, and operational source contracts.

Result: 16 test files passed, 374 tests passed.

Additional checks:

- Scoped ESLint over all three follow-up TypeScript files: passed.
- `corepack pnpm typecheck`: passed.
- `corepack pnpm doc:audit`: passed — 10 doc-pinning files and 120 tests passed.
- `git diff --check`: passed.

### Exact Follow-up Files

- `lib/stripe/guest-checkout.ts`
- `lib/__tests__/stripe/checkout-operating-hours.test.ts`
- `lib/__tests__/guest-checkout-operational-contract.test.ts`

### Follow-up Residual Risk

No blocking concern. The direct duplicate-guest tests prove that the branch itself does not retrieve, expire, create, or persist a replacement Stripe Session for contraindicating or incomplete Hair answers. The missing-information hold remains the existing shared financial owner and may invalidate an already-attached exact-current Session when required; that behavior is covered separately by its payment-hold suite. No live Stripe or database call was made. User-owned untracked `output/` remained untouched.
