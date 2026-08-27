# Task 6 report — Hair H1 practical-outcome clarity

Status: **DONE**

## Scope and commits

- Task base verified: `f7e833ea928d5cdff92f471142d9dd910c0cae46`
- Implementation commit: `dbbb652b7b0086cb5e87a2ae47a7d51ebe3b2c5e` (`feat(marketing): clarify hair loss assessment outcome`)
- No worktree, push, deployment, database write, Ads mutation, external-system mutation, payment, PHI submission, or user-owned `output/` change was made.

## Files

Production:

- `components/marketing/hair-loss-landing.tsx`
- `app/hair-loss/page.tsx`

Contracts and browser coverage:

- `lib/__tests__/specialty-experience-invariants.test.ts`
- `lib/__tests__/hair-loss-tga-compliance.test.ts`
- `lib/__tests__/money-page-narrative-compression-contract.test.ts`
- `lib/__tests__/money-page-art-direction-contract.test.ts`
- `e2e/money-pages-foundations.spec.ts`

`lib/marketing/approved-claims.ts` did not require a production edit: the binding `prescription_if_approved`, `form_first_wedge`, and `refund_guarantee` claims already existed with clinical/refund receipts. Adding another identity claim would have duplicated canon and crossed into Task 8. `lib/request/step-registry.ts`, `lib/request/validation.ts`, the Hair/ED step components, and `lib/constants/index.ts` were recorded by the new invariant test but not changed because Task 6 must preserve those owners exactly.

## RED evidence

The Task 1 invariant test and Task 6 contract changes were created before production edits. This focused command was then run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-experience-invariants.test.ts \
  lib/__tests__/hair-loss-tga-compliance.test.ts \
  lib/__tests__/money-page-narrative-compression-contract.test.ts \
  lib/__tests__/money-page-art-direction-contract.test.ts \
  lib/__tests__/paid-claims-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts
```

Result: 6 files ran, 67 tests total, with 65 passed and 2 intended failures. The failures were:

- the practical pricing/outcome section still followed the long assessment model;
- the Hair H1 and direct approved-claim calls were absent.

The new intake sequence, required-validation, terminal-safety, constant-backed pricing, and forbidden-claim invariants all passed in RED, showing that the failures were limited to the intended landing-page gap.

## GREEN evidence

The same focused command passed after implementation:

```text
Test Files  6 passed (6)
Tests       67 passed (67)
```

Paid/advertising/marketing-copy contracts:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/approved-claims-contract.test.ts \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/voice-guard.test.ts \
  lib/__tests__/hours-copy-contract.test.ts \
  lib/__tests__/speed-claims.test.ts \
  lib/__tests__/paid-claims-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts \
  lib/__tests__/hair-loss-tga-compliance.test.ts
```

Result: 8 files and 92 tests passed.

Additional verification:

```bash
corepack pnpm exec eslint \
  app/hair-loss/page.tsx \
  components/marketing/hair-loss-landing.tsx \
  e2e/money-pages-foundations.spec.ts \
  lib/__tests__/specialty-experience-invariants.test.ts \
  lib/__tests__/hair-loss-tga-compliance.test.ts \
  lib/__tests__/money-page-art-direction-contract.test.ts \
  lib/__tests__/money-page-narrative-compression-contract.test.ts

corepack pnpm typecheck
git diff --check
git diff --cached --check
```

All passed with no ESLint errors or warnings.

## Browser evidence

The two Hair-specific Playwright checks ran through a task-local configuration on port 3060. The configuration disabled the repository global setup/teardown, used the installed system Chrome, and was removed after verification; therefore the run did not seed or mutate the test database.

```bash
corepack pnpm exec playwright test \
  e2e/money-pages-foundations.spec.ts \
  --config=playwright.task6.config.ts \
  --grep "Hair H1"
```

Result: 2 tests passed.

- Desktop light, 1440x900: H1, first-fold practical facts, constant-backed A$49.95 display, qualified eScript/pharmacy outcome, refund, and no-guarantee copy rendered in the existing Hero/card system.
- Mobile dark, 375x800: the same hierarchy rendered without clipping or theme drift; the existing sticky CTA appeared after the Hero and retained the exact tagged request destination.
- CTA destination asserted exactly as `/request?service=consult&subtype=hair_loss&growth_experience_version=spx_h1_20260828`.
- DOM order asserted `#pricing` before `#assessment-model`.
- Console-error and page-error collections were empty for both visual states.
- Disabled-service behavior was exercised with an in-browser `/api/availability` response stub: the unavailable banner appeared and the Hair CTA resolved to `/contact`. No database or external state was changed.
- Local screenshots were visually inspected at `test-results/task-6-hair-h1/.../hair-h1-desktop-light-viewport.png`, `hair-h1-mobile-375x800-dark-viewport.png`, and their full-page counterparts. These ignored test artifacts were not committed.

## Self-review

- The approved Fable direction is implemented as `Private hair loss assessment, from home.` with a short, calm one-off-assessment explanation rather than a new visual system.
- The Hero now makes the process and practical outcome explicit: secure form, possible brief doctor call, conditional eScript to the phone, Australian-pharmacy fill, separate medicine cost, no prescription guarantee, and full refund on doctor decline.
- All drift-prone statements use `getApprovedClaim` for `form_first_wedge`, `prescription_if_approved`, and `refund_guarantee`; the fee uses `PRICING_DISPLAY.HAIR_LOSS` and no public A$49.95 literal was added to production.
- The existing `HairLossPricingSection` was reordered directly below the Hero. No duplicate generic panel was created.
- The sudden/patchy/painful/infected scalp and broader-diagnosis boundary remains unchanged below the practical offer.
- The existing Hero, type/spacing tokens, solid-depth cards, light/dark treatment, unavailable behavior, sticky CTA, base route, and Task 5 opaque H1 token remain intact.
- Metadata is medicine-name-free, private/one-off, and explicitly says that a prescription is not guaranteed.
- No medicine names, no-call promise, guaranteed prescription/outcome, unsupported timing/SLA, before/after content, fake proof, employer outreach, hardcoded public price, or new prescribing-identity claim was introduced.
- All six Hair intake screens and every question, required answer, validation rule, terminal safety block, price/payment rule, and clinical policy remain unchanged. H2 fit-first compression was not implemented.

## Concerns

None. Browser evidence is local and does not claim deployment or production receipt.
