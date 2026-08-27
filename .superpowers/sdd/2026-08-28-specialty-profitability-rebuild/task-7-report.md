# Task 7 report — ED E1 private-outcome clarity

Status: **DONE**

## Scope and commits

- Task base verified: `8ebff62b5f4565cce5c5e703801c8f5eee66ed7e`
- Implementation commit: `fa14f7a9b755126e9d0692e903c675e6f08f9a3e` (`feat(marketing): clarify private ED assessment`)
- Visual-polish commit: `e91c1e8d293bd70b0a73e76a27dc413f7a3532cb` (`fix(marketing): keep ED heading words intact`)
- No worktree, push, deployment, database write/seed, Ads mutation, external-system mutation, payment, PHI submission, intake-step change, clinical-rule change, price/payment behavior change, E2 optional-field removal, or user-owned `output/` change was made.

## Files

Production:

- `components/marketing/erectile-dysfunction-landing.tsx`
- `app/erectile-dysfunction/page.tsx`
- `lib/data/ed-faq.ts`

Contracts and browser coverage:

- `lib/__tests__/money-page-narrative-compression-contract.test.ts`
- `lib/__tests__/money-page-narrative-contract.test.ts`
- `lib/__tests__/money-page-art-direction-contract.test.ts`
- `e2e/money-pages-foundations.spec.ts`

No other plan-listed production owner required a change. `PRICING_DISPLAY.MENS_HEALTH`, `getService("ed").effort`, and the approved form-first, conditional-eScript, refund, 24/7-availability, and doctor-registration claims already owned the required truth. A shared Medicare-or-IHI/address claim was not added because that canonicalisation belongs to Task 8. Intake registry, validation, clinical logic, price/payment owners, and every ED field—including optional BMI presentation—were therefore left unchanged.

## RED evidence

The Task 7 contracts and E2E coverage were changed before production code. This exact focused command was then run:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/money-page-narrative-compression-contract.test.ts \
  lib/__tests__/money-page-narrative-contract.test.ts \
  lib/__tests__/money-page-art-direction-contract.test.ts \
  lib/__tests__/ed-intake-validation.test.ts \
  lib/__tests__/paid-claims-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts
```

Result: 6 files ran, 74 tests total, with 70 passed and 4 failed.

- Three intended ED E1 failures proved the missing H1/first-Hero practical truth, stale FAQ identity/timing copy, and review/cost/outcome section order.
- One unrelated existing Hair assertion still expected `ASSESSMENT_HREF`, although the accepted Task 5 implementation already routes through the versioned `requestCtaHref`. The assertion was repaired to match that existing runtime behavior; Hair production was not changed.
- ED intake validation, paid-claims, and advertising guards stayed green during RED.

The screenshot inspection later exposed a mid-word H1 wrap caused by the shared emergency overflow rule. A browser assertion was added first and failed with computed `hyphens: auto`; the local ED H1 override then made it green with `hyphens: none`.

## GREEN and regression evidence

The required focused command passed after the minimal implementation and remained green after visual polish:

```text
Test Files  6 passed (6)
Tests       74 passed (74)
```

Task 1 intake invariants plus prescribing identity/address, marketing, voice, hours, speed, TGA, paid, and Ads contracts passed:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-experience-invariants.test.ts \
  lib/__tests__/prescribing-identity-gate-contract.test.ts \
  lib/__tests__/prescribing-street-address-contract.test.ts \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/voice-guard.test.ts \
  lib/__tests__/hours-copy-contract.test.ts \
  lib/__tests__/speed-claims.test.ts \
  lib/__tests__/hair-loss-tga-compliance.test.ts \
  lib/__tests__/paid-claims-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts
```

Result: 10 files and 109 tests passed. The Task 1 invariant continued to prove the unchanged five-screen ED sequence and protected field/validation/price boundaries.

Additional verification passed:

```bash
corepack pnpm exec eslint \
  app/erectile-dysfunction/page.tsx \
  components/marketing/erectile-dysfunction-landing.tsx \
  e2e/money-pages-foundations.spec.ts \
  lib/__tests__/money-page-art-direction-contract.test.ts \
  lib/__tests__/money-page-narrative-compression-contract.test.ts \
  lib/__tests__/money-page-narrative-contract.test.ts \
  lib/data/ed-faq.ts

corepack pnpm typecheck
git diff --check
```

All passed with no ESLint errors or warnings. Scoped diff checks confirmed no changes under `components/request`, `lib/request`, `lib/clinical`, `lib/constants/index.ts`, `lib/stripe`, or `output/`.

## Browser evidence

The ED-specific Playwright run used a temporary no-global-setup configuration on `http://localhost:3060`, with installed system Chrome and screenshots outside the repository. The configuration was removed and the temporary captures were moved to Trash after inspection; nothing was committed. Repository global setup/teardown did not run, so no test data was seeded or removed.

```bash
corepack pnpm exec playwright test \
  e2e/money-pages-foundations.spec.ts \
  --config=playwright.task7.config.ts \
  --project=chromium \
  --grep "ED E1"
```

Result: 2 tests passed.

- Desktop light, 1440x900: the exact H1, first CTA, quiet transparent anchor, and all four semantic practical-fact groups rendered in the initial Hero; the existing solid-depth card and spacing system remained balanced.
- Mobile dark, 375x800: the H1, one-off price/process copy, CTA, reassurance, and start of the practical card rendered in the initial viewport. Each fact group was then scrolled normally into a visible viewport box in the order `Eligibility -> Review fee -> Assessment -> If approved`.
- The H1 renders without mid-word hyphenation in both target viewports.
- CTA destination was asserted exactly as `/request?service=consult&subtype=ed&growth_experience_version=spx_e1_20260828`, including the mobile sticky CTA.
- DOM order asserted `#how-it-works` directly after the Hero and before `#eligibility`.
- The browser verified A$49.95, Medicare or IHI plus Australian address, catalog-owned `~4 min`, possible doctor contact, conditional eScript-to-phone outcome, Australian-pharmacy fill, separate medicine cost, no prescription guarantee, and full refund on doctor decline.
- Disabled-service behavior was exercised with an in-browser `/api/availability` stub: the unavailable banner appeared and the first ED CTA resolved to `/contact`.
- Console-error and page-error collections were empty in both visual states. No form answers, PHI, or payment details were entered.

## Self-review

- The Hero now leads with `Private ED assessment, from home.` while metadata and supporting schema copy retain erectile-dysfunction/Australia search terms.
- Price, effort, form-first contact, refund, conditional eScript, and 24/7 timing copy are code-owned. No public A$49.95 or stale three-minute literal was introduced in production.
- The first CTA reads `Start private assessment` plus the code-owned price. `See how it works` is a quiet text anchor, not an equal-weight button.
- The existing review/cost/outcome section moved immediately after the Hero; no second generic facts section was created.
- Unsupported claims about collected chest symptoms, exercise tolerance, and a blood-pressure value/context were removed. Public clinical collection copy is limited to current heart/stroke history, very low blood pressure, medicines, allergies, and conditions.
- The single authoritative emergency boundary and detailed clinical/safety material remain below the practical offer. Emergency chest-pain wording was not mistaken for an intake-collection claim.
- FAQ timing now uses the approved 24/7 variable-timing claim, and prescribing identity says Medicare or IHI plus Australian address.
- Metadata and visible copy contain no medicine/ingredient name, no-call promise, guaranteed prescription/outcome, unsupported speed/SLA, before/after claim, fake proof, employer outreach, or hardcoded public price.
- Existing Hero/design tokens, solid depth, dark mode, unavailable behavior, sticky behavior, and the opaque E1 analytics token remain intact.

## Concerns

None. Medicare-or-IHI/address is intentionally truthful local E1 copy rather than new shared canon; Task 8 remains the owner of that later canonicalisation. Browser evidence is local and does not claim deployment or production receipt.
