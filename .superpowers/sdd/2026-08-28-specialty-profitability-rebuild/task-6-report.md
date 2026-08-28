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

## Fix round 1

### Scope and commit

- Review base: `c0e9fabd1fbde4f669a0e32b30e916d2c5742982`
- Fix commit: `584e01b4d0207fd156edf6e878280db33da028ca` (`test(growth): strengthen Hair H1 proof`)
- Files: `lib/__tests__/specialty-experience-invariants.test.ts` and `e2e/money-pages-foundations.spec.ts`.
- No production, intake, clinical, product, metadata, price/payment, database, Ads, external-system, deployment, or user-owned `output/` change was made.

### Test-first evidence

The missing runtime assertions were added before any other revision change. This characterization command remained GREEN against the existing production validators:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-experience-invariants.test.ts \
  lib/__tests__/prescribing-identity-gate-contract.test.ts \
  lib/__tests__/patient-details-canskip-contract.test.ts
```

Result: 3 files and 46 tests passed. This was the expected outcome because the reviewer found missing proof, not a production validation defect. The strengthened invariant now executes:

- shared Details validation for first name, last name, DOB, email, and required phone;
- Review/Pay validation for terms and accuracy consents;
- ED conditional details for allergies, conditions, medicines, recent cardiac events, severe heart history, and previous treatment;
- Hair conditional details for allergies, conditions, and medicines.

The test explicitly delegates the wider Medicare-or-IHI, sex, phone, and structured-address bundle to its existing owners: `lib/__tests__/prescribing-identity-gate-contract.test.ts` and `lib/__tests__/patient-details-canskip-contract.test.ts`. No Task 8 identity wording or behavior was duplicated.

The first stricter browser run was RED: 1 Hair test failed and the unavailable-state test passed. The Hero contained the approved refund condition, but an exact standalone-text locator waited for `Full refund if the doctor declines.` even though production correctly renders it inside the combined one-off-assessment sentence. The minimal fix scoped content assertions to the four semantic `dl > div` fact groups under the existing accessible `Hair loss assessment facts` complementary region. No production attribute or copy change was made.

### GREEN evidence

Focused Task 1, identity-owner, and Task 6 suite:

```text
Test Files  8 passed (8)
Tests       107 passed (107)
```

Broader approved-claims, marketing-copy, voice, hours, speed, paid-claims, advertising, and Hair TGA suite:

```text
Test Files  8 passed (8)
Tests       92 passed (92)
```

Additional checks:

```bash
corepack pnpm exec eslint --max-warnings 0 \
  lib/__tests__/specialty-experience-invariants.test.ts \
  e2e/money-pages-foundations.spec.ts
corepack pnpm typecheck
git diff --check
git diff --cached --check
```

All passed.

### Browser evidence

The final isolated, no-global-setup Hair browser run passed 2/2 in installed system Chrome:

```bash
corepack pnpm exec playwright test \
  e2e/money-pages-foundations.spec.ts \
  --config=playwright.task6.config.ts \
  --grep "Hair H1"
```

The task-local configuration was removed before commit. It used port 3060 and did not seed or mutate the test database.

- Desktop light, 1440x900: the semantic Hero and all four practical-fact groups were visible in the initial captured viewport.
- Mobile dark, 375x800: the initial viewport shows the H1, one-off price/process copy, CTA, and start of the practical-facts card. The four fact groups do not all fit simultaneously by design; the test scrolls each group into view, asserts a visible in-viewport layout box, and preserves the order `Eligibility -> Review fee -> Assessment -> If approved`.
- In both states the Hero itself now asserts possible doctor contact, conditional eScript-to-phone delivery, Australian-pharmacy fill, separate medicine cost, non-guarantee, and refund-on-decline copy.
- The tagged CTA, pricing-before-education order, mobile sticky CTA, unavailable-state `/contact` route, and empty console/page-error collections remain covered.
- Reviewable local artifacts remain at `test-results/task-6-hair-h1-fix-1/money-pages-foundations-Ha-9c756-ff-outcome-before-education-chromium/hair-h1-desktop-light-viewport.png`, `hair-h1-mobile-375x800-dark-viewport.png`, and their full-page counterparts. They are ignored local test artifacts and were not committed.

This supersedes the original report's overly broad mobile wording: the required facts are accessible and visibly verified through normal Hero scroll, not claimed to fit simultaneously inside the initial 375x800 viewport.

### Self-review and concerns

- A realistic removal, reorder, or hiding of a Hero fact now fails the browser contract.
- A relaxed Details/consent requirement or omitted conditional detail now fails a runtime validator assertion.
- Tests exercise production validators and rendered browser behavior; they do not add mocks or test-only production attributes.
- No concerns remain. The artifacts and browser result are local proof only, not deployment or production evidence.
