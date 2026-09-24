# Certificate Request Simplification Plan

> **Status: final revised proposal for Rey's review. Incorporates the independent review and source verification. Planning only; no implementation or deployment has started.**
> **Execution:** use the writing-plans handoff with `superpowers:executing-plans`, implementing and verifying one task at a time in the existing InstantMed stack. No parallel implementation is needed.

**Goal:** make the certificate request feel short, understandable and easy to finish on a phone, while preserving its questions, editable answers, explicit consent and payment safeguards.

**Architecture:** retain the existing four step IDs and Zustand draft model. Simplify presentation inside the certificate route, using existing request primitives. Shared component changes must be opt-in for certificates; prescribing and specialty forms retain their current behaviour.

**Stack:** Next.js 15.5.24, React 18.3.1, TypeScript, Tailwind 4.2.2, existing shadcn/Radix controls, Framer Motion 11.18.2. No dependency upgrades or migrations.

**Design/spec authority:** this document records the proposed experience from Rey's September 23 request. `DESIGN.md`, `PRODUCT.md`, `docs/BRAND.md`, `docs/VOICE.md`, `components/request/README.md` and the current clinical/payment contracts govern implementation. `docs/ROADMAP.md` remains the priority and outcome record.

## 1. Decision and evidence

Keep **Certificate → Symptoms → Your details → Review & pay**. Simplify how much work each screen appears to require before considering fewer steps. The displayed count must follow the actual registry: eligible signed-in patients can already skip Details.

The September 23 investigation recorded 50 starts → 31 checkout visits → 23 payment attempts → 22 server purchases, using September 15–22 starts with 24-hour follow-up through September 23 11:30 UTC. This is an anonymous-flow cohort, not a unique-patient count. `intake_started` fires on entry to the first step, before an answer or Continue tap. Some loss therefore represents browsing rather than failed attempts to complete the form.

The working hypothesis is **uncertainty about commitment plus unnecessary visual effort**. It is not established causally. For a fresh flow without a saved preference, the current first screen defaults to Work / 1 day / Today and its Continue action works. A valid saved certificate-type preference precedes the Work fallback; URL selections, restored drafts and subsequent user edits must retain their existing precedence. The live 390×844 screen has two headings, repeated directions, three question cards and another summary card. The details screen already asks certificate guests for only first name, last name, email and date of birth. Symptoms already supports chips and optional extra text. Do not claim those existing features as new improvements.

The six-visit mature consent cohort is too small to justify removing a consent requirement or changing its wording. Broader ecommerce research supports reducing perceived effort, but is supporting design evidence rather than InstantMed conversion proof: [Baymard research](https://baymard.com/research-articles/checkout-flow-average-form-fields).

The reviewer's 54-entry cohort also places the largest loss on the first screen, but its exact time boundaries and filters have not been reconciled with the 50-entry cohort. Do not combine their counts. Historical answer changes included automatic defaults before the September 22 repair; neither "only six people interacted" nor an estimate of one or two additional orders per week is an established finding. `certificate_continue_clicked` has no comparable pre-release history.

### Release dependency

PR #599's navigation/hero/footer redesign is live at `4fa3e63a0`. PR #600's enlarged-consent repair is separate and not released. At plan creation, its CI run `35857497197` failed one exact-source-string assertion in `lib/__tests__/review-step-mobile-readability-contract.test.ts`; the assertion expects the old class string without the new wrapping utility. It had 8,489 passing tests; E2E and Lighthouse did not run after that failure. Preserve the font-size assertion while making it tolerant of the additional wrapping class, rerun the relevant tests and required CI, and establish a green baseline before building this plan. Do not waive the test or claim the PR is deployed.

## 2. Proposed experience

### Shared certificate shell

- One meaningful, visible, programmatically focusable h1 inside `main` for certificate steps. Change the certificate header's duplicate h1 to a non-heading context label; keep the step count. Upgrade the step-owned heading to h1 through a certificate-only option on the existing intro primitive. The existing `contentRef` focus lookup must still find it, including after lazy step mounting, Next, Back and Edit. Assert actual focus, not merely heading presence. Other services retain their current heading semantics.
- Preserve the existing progress component, which already has current/completed states and labels. Its labels are currently hidden on mobile; make the short names readable for certificates, with wrapping rather than truncation at enlarged text. Show the actual step number. Preserve existing back/edit rules and skipped-step handling; no extra onboarding screen.
- One mobile action bar with the next action written out. Keep the arrow secondary. At narrow widths or enlarged text, let the label wrap and bar height grow instead of truncating the action to an arrow.
- In Release A, measure the action bar with the existing DOM/ResizeObserver pattern and reserve its actual height plus a small gap in the scroll area. Wrapping and measured clearance ship together. Clear the measurement when the bar unmounts or is hidden; include safe-area padding exactly once and preserve the existing keyboard-offset behaviour. The keyboard, safe area and validation messages must not conceal an input, consent checkbox or final legal link.
- The 16px floor includes option labels and prices, not just typed inputs. At 320–390px use two columns for start dates, and put duration and price on separate lines. Let type/duration groups wrap into fewer columns when text enlargement requires it; at wider widths use four date columns only if every label fits. Keep DOM/keyboard order stable.
- Use Source Sans 3, existing colours/radii and solid white surfaces. Reduce wrappers and duplicated wording before shrinking spacing; form text stays at least 16px and interactive targets at least 44px.
- No new hero, trust-badge strip, animations, testimonial panel or promotional interruption inside the form.

### Step 1: Your medical certificate

Proposed copy and hierarchy:

```text
Your medical certificate                         Step 1 of 4
Choose your dates. Payment comes at the final step.

Certificate type
[ Work ] [ Study ] [ Carer's leave ]

How many days?
[ 1 day ]       [ 2 days ]       [ 3 days ]
[ $24.95 ]      [ $29.95 ]       [ $39.95 ]

Starting from?
[ Yesterday ]  [ Today ]
[ Tomorrow  ]  [ Day after ]

Work certificate · 23 September · 1 day             $24.95
Full refund if the doctor declines.

Need more than 3 days off? Please visit your GP for an extended certificate.

[ Next: your symptoms → ]
```

- Group the three questions into one surface, with internal spacing/dividers rather than nested cards. All choices remain visible and editable; dates must not move behind a disclosure. That would repeat a previously rejected design.
- Keep the existing per-field hydration precedence: explicit valid URL choices and restored/user-selected values remain authoritative according to the current handlers; a valid saved type preference is used before the Work fallback. Only a genuinely fresh flow without those values receives Work / 1 day / Today. Never silently replace a restored three-day selection with one day.
- Never rewrite an unrecognised restored date to Today. Preserve the saved ISO date as the source of truth; if it is still allowed by the existing shared date policy, show its exact date even outside the shortcut chips. If invalid/expired, retain it visibly and require an explicit replacement before progression. Do not expand the four shortcuts or change backdating policy as part of this repair.
- Show actual calendar dates in the summary, including the end date for multi-day requests. Preserve the start-date selection and softer covered-day highlight distinction. Label a supported prefilled date outside the four shortcuts accurately.
- Read prices from `MED_CERT_DURATIONS`; the figures above are examples, not new constants. Price changes immediately when duration changes. Reuse the canonical full-refund claim.
- Keep the summary inline within the surface. On a phone, place it directly above the next-action area without creating a second fixed bar.
- Explicitly label the next destination. Continue performs the same validation and persistence; no automatic advancement when a date or type is selected.

### Step 2: Your symptoms

- One in-content h1: **Your symptoms**. Preserve the existing `MED_CERT_DOCUMENT_SCOPE` sentence beside the symptom question: the certificate excludes diagnosis and symptom details. This reassurance must remain visible while patients describe symptoms, not move solely to payment. For carer's leave, retain the existing subject-specific question about the person being cared for.
- Keep the existing symptom chips and instruction that selecting the relevant symptoms is enough to continue. Keep the labelled **Add detail (optional)** text area visible and editable.
- Place optional symptom duration in the same quiet content surface, clearly labelled optional. Remove a redundant card boundary, not the field.
- Retain existing symptom validation, emergency messages, acknowledgement behaviour and all server checks. Do not introduce preselected symptoms or auto-generated patient answers beyond the current explicit chip behaviour.
- Next label: **Next: your details**, or **Next: review & pay** when the active registry skips Details. Derive this from the actual next step, not authentication alone.

### Step 3: Your details

- Preserve the existing heading and explanation, **For your medical record and result delivery.**, while using the certificate shell's focusable in-content heading convention. These are existing features, not new work.
- Retain first name, last name, email and date of birth. These are already the certificate guest requirements; do not merge names into a new full-name field or add phone, Medicare, address or an account-creation detour.
- Stack name fields on narrow phones, with an appropriate wider-screen two-column layout. Preserve autofill attributes, email keyboard, numeric date input, Australian date display and existing typo suggestions.
- Keep saved-details reuse and valid signed-in skipping. Invalid or incomplete identity must still lead to the required corrections.
- Show errors beside the relevant field and announce the existing summary. A failed next action focuses a useful correction and preserves all entered text.
- Next label: **Next: review & pay**. Email guidance for certificates describes a secure link if approved; it must not imply an unprotected certificate attachment or guaranteed approval.

### Step 4: Review & pay

- Retain the existing single review summary surface. It already groups sections; do not propose rebuilding it into another stack of cards.
- Use compact, readable sections for certificate dates/type, symptoms and patient details, each with its existing Edit action. Keep complete entered answers available without truncating or hiding them by default.
- Replace the in-content **One last check** h2 with the single **Review & pay** h1, and demote the duplicate certificate header label. Do not remove the only focus target. Keep one short instruction to check details, and preserve approved outcome/delivery information.
- Present the exact total and any optional priority fee immediately before consent/payment. Preserve the existing priority availability, off-by-default choice, price and timing qualification; do not bundle an upsell experiment into this cleanup.
- Preserve the complete current consent text, unchecked state, consent-version validation, and reconfirmation after relevant edits. Integrate #600's readable wrapping and versioned visibility measurement.
- Keep the current two states: **Review & confirm** moves focus to the unchecked consent; explicit consent changes the action to **Pay $X**. No payment on the review action, automatic ticking or checkbox-and-pay shortcut.
- Keep one quiet payment-provider reassurance. Avoid repeating the same refund message in multiple places within this screen.
- Processing, session failure, expired requests, unknown payment outcomes and retry recovery retain their current guards and user input. Never make a payment button look successful before confirmation.

## 3. Delivery sequence

**Correctness first:** #600 is merged and deployed; see the September 24 release evidence in `docs/ROADMAP.md`. Reproduce the reported midnight draft-date overwrite with a controlled clock; if confirmed, fix it in a separate, tested correctness change before presentation work. These repairs do not require waiting for an Ads performance read, but still require their normal release authorisation and checks.

**Release A: first-screen simplification plus the shell mechanics it needs.** Change certificate grouping, the in-content heading, date/price summary and first action label. Ship readable mobile labels, measured bar clearance, focus tests, selector compatibility and required CI regressions in this same release. Keep later-screen content and their existing in-content h2 focus targets stable. Only the Certificate screen adopts the new h1/header demotion in Release A; apply the final single-heading convention to remaining screens in Release B. Leave stage-label presentation polish for Release B. Any observed effect belongs to this package, not a particular word.

**Timing:** after plan approval, build and verify Release A locally or in preview without waiting for a calendar date. The default production recommendation is after the October 6 Ads read, respecting the roadmap's September 23–October 6 observation window. That is a release recommendation, not a blanket code freeze. If Rey explicitly chooses earlier release, record the date and treat Ads/form results as confounded; do not claim independent attribution. No timing decision is needed to review this plan.

**Release B: narrow completion polish.** Keep symptom chips and privacy reassurance, remove redundant container boundaries, stack name fields on narrow screens, polish Review spacing/headings and reveal existing progress labels on mobile. Do not rebuild Details validation, autofill or error focus. It may be prepared before a statistically meaningful conversion result exists. Release it separately after Release A has passed functional and production checks, an initial mature-cohort review, and the operational guardrails below. No proof of conversion uplift is required at this traffic volume.

**Other services:** this plan establishes a certificate pattern, not permission to shorten clinical questionnaires across all services. Shared primitive changes need regression checks on prescriptions and the four specialty routes. A later rollout can reuse the presentation where it fits, under a separately scoped service audit.

## 4. Implementation tasks

### Task 0: establish the baseline

**Files:** existing #600 changes and `lib/__tests__/review-step-mobile-readability-contract.test.ts`; separately, `components/request/steps/certificate-step.tsx`, existing date/hydration unit tests and `e2e/medical-certificate.spec.ts` for the restored-date defect. Keep the fixes independently reviewable.

- [x] #600 merged and deployed September 24. The exact-class assertion retains `text-base`, `leading-relaxed` and overflow coverage; required CI passed and all 12 consent browser cases passed against production. Evidence and proof boundaries live in `docs/ROADMAP.md`.
- [ ] Reproduce the date issue in a required CI spec using a fixed Sydney clock: save Yesterday at 23:00, reopen at 00:30 with a still-valid draft, then enter Certificate directly and via Edit from Review. Assert the original ISO date, duration and price remain intact. Include a date beyond the current policy window, a future date outside the four shortcuts, and a client timezone different from Sydney.
- [ ] If reproduction confirms the overwrite, initialise from the saved date before sync can write defaults. Retain valid saved dates; require explicit correction for invalid dates. Reuse the canonical Sydney date validation and do not infer a new clinical allowance from the helper's default seven-day backdate cap. Red/green tests must cover the actual checkout validation path.
- [ ] After these repairs release, record their production SHA/time. Capture fresh/restored certificate screens using synthetic local fixtures, with light/dark, 390px mobile and desktop evidence.
- [ ] Preserve existing step IDs (`certificate`, `symptoms`, `details`, `checkout`), drafts and analytics names. Read the runtime requirements before editing shared files.

### Task 1: build and verify Release A

**Modify:** `components/request/steps/certificate-step.tsx`; minimal certificate-specific heading semantics and action-bar measurement in `components/request/request-flow.tsx` only where needed. Keep certificate copy, option composition and date helpers in the step module, not the shared shell. Check `scripts/check-bundle-size.sh`: `/request` has a 180kB first-load budget; measure the current build rather than assuming the review's 177kB snapshot remains current. Reuse `components/request/shared/intake-step-primitives.tsx`; add an opt-in variant only if existing composition cannot express the grouping.

**Interfaces:** consume existing `answers`, `setAnswer`, `handleNext`, `MED_CERT_DURATIONS` and hydrated selection helpers. Produce the same `{ certType, duration, startDate }` answers and `onNext()` behaviour. Set `data-intake-primary-label="Next: your symptoms"` on the existing primary action so its mobile mirror stays in sync.

- [ ] Put required Release A regressions in `e2e/medical-certificate.spec.ts`, which `scripts/check-medcert-readiness.sh` already selects for blocking CI: new action label, focus after progression, restored dates/duration/price, and short-screen bar clearance. Extend the isolated `e2e/checkout-consent.browser.ts` suite for supplementary Android/WebKit and analytics checks, not as the sole gate. Run the new-label assertion against the baseline to establish the expected failure.
- [ ] Update `e2e/unified-request-flow.spec.ts`, `e2e/checkout-priority-review.spec.ts`, `e2e/prod-request-flow-synthetic.spec.ts`, and relevant helpers before changing production copy. Use the existing `data-intake-primary-action` for the desktop action and the visible mobile mirror's `[data-intake-mobile-action-ready]` marker for mobile; do not try clicking the hidden desktop action on phones. Keep separate exact-label assertions for the new experience. Make the synthetic accept both old/new headings during deployment skew, while still asserting the correct step and successful transition; ship its compatibility update before the presentation release.

```ts
const bar = page.locator('[data-intake-mobile-action-bar="true"]')
await page.getByRole('radio', { name: '3 days $39.95', exact: true }).tap()
await expect(page.getByRole('radio', { name: '3 days $39.95', exact: true })).toBeChecked()
await bar.getByRole('button', { name: 'Next: your symptoms', exact: true }).tap()
// Release A retains the existing Symptoms content; Release B renames its heading.
const symptomsHeading = page.locator('main').getByRole('heading', {
  name: /What is stopping you today|What is happening/,
})
await expect(symptomsHeading).toBeVisible()
await expect(symptomsHeading).toBeFocused()
```

- [ ] Compose the one-surface layout and exact copy above. Use the corrected date/hydration baseline from Task 0; make no additional policy changes. Keep radio accessible names coherent after splitting price onto its own line and test names as well as selection.
- [ ] Exercise work/study/carer, 1/2/3 days, yesterday/today/future selections, URL prefill, back/edit and reload. Assert restored dates/duration and the eventual displayed price agree.
- [ ] Implement measured bar clearance together with wrapping. Verify readable option/action labels at 320px and 200% text, visible final price/GP note above the bar at maximum scroll, no horizontal overflow, keyboard radio navigation, and visible validation feedback. Do not enforce a one-screen fit by clipping content.
- [ ] Run `corepack pnpm exec vitest run lib/__tests__/certificate-step-hydration-contract.test.ts lib/__tests__/certificate-step-advance-persistence.test.ts lib/__tests__/cert-step-revenue-contract.test.ts lib/__tests__/intake-mobile-viewport-contract.test.ts`, plus `corepack pnpm exec playwright test --config=playwright.consent-tracking.config.ts`.
- [ ] Run the required med-cert CI gate (`corepack pnpm medcert:readiness:e2e`) in its configured test environment as well as the local isolated suite; run the bundle-size check on the production build. Inspect the diff and screenshots; commit the first-screen change separately.

### Task 2: simplify Symptoms and Details for Release B

**Modify:** `components/request/steps/symptoms-step.tsx`, `components/request/steps/patient-details-step.tsx`, and next-action labels in the certificate flow. **Tests:** add the user-visible invariants to the CI-selected `e2e/medical-certificate.spec.ts`, supplement with the isolated browser harness; retain `lib/__tests__/symptom-text-quality.test.ts` and `lib/__tests__/patient-details-canskip-contract.test.ts`.

**Interfaces:** consume the existing `serviceType`, answers and identity store. Preserve `needsPhone`, `needsPrescriptionDetails`, `needsAddress`, validators and skip decisions. Only a med-cert presentation branch receives the new layout/copy.

- [ ] Add browser cases for symptom chips plus typed additions, removing a chip without losing typed content, optional duration left blank, and the carer-specific subject. Pin both actual next destinations (Details and Review & pay).
- [ ] Simplify Symptoms containers and retain its focusable in-content heading, visible `MED_CERT_DOCUMENT_SCOPE` reassurance, optional controls and emergency feedback. For Details, limit new layout work to narrow-screen name stacking and the shared heading/action-label conventions; preserve its existing behaviour.
- [ ] Verify empty/invalid email, an offered typo correction, invalid DOB and under-18 rejection retain values and focus the correction. Verify guest and incomplete/complete signed-in identity states separately.

```ts
await page.getByRole('textbox', { name: 'Email', exact: true }).fill('invalid-email')
await page.getByRole('button', { name: 'Next: review & pay', exact: true }).tap()
await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('invalid-email')
await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your details')
```

- [ ] Test supported autofill, long names/emails, date editing, reload and back navigation. Run the focused tests, inspect the rendered certificate screens and commit independently.

### Task 3: simplify Review and the certificate shell for Release B

**Modify:** `components/request/steps/review-step.tsx`, `components/request/request-flow.tsx`, and `components/request/progress-bar.tsx` if stage labels need a certificate-only presentation option. **Tests:** CI-selected `e2e/checkout-priority-review.spec.ts` for consent/payment sequencing, `e2e/medical-certificate.spec.ts` for edit/focus behaviour, supplementary `e2e/checkout-consent.browser.ts`, `lib/__tests__/request-progress-bar.test.tsx`, `lib/__tests__/review-step-mobile-readability-contract.test.ts`, and existing store edit/navigation contracts.

**Interfaces:** retain `ReviewSummaryCard` section data and `onEditStep`, dynamic registry steps, mobile primary-action discovery, `safetyConfirmed`, `TELEHEALTH_CONSENT_VERSION` and `handlePayment`. Do not add another payment handler or a second store.

- [ ] Extend browser coverage for readable summary rows and action labels, long content, edit-and-return, unchecked Review & confirm focus, explicit confirmation, processing and intercepted recoverable failure. Keep #600's 320×568 / 200% text case.

```ts
const consent = page.getByRole('checkbox', { name: /Confirm request and payment terms/i })
await expect(consent).not.toBeChecked()
await page.locator('[data-intake-mobile-action-bar="true"]')
  .getByRole('button', { name: 'Review & confirm', exact: true }).tap()
await expect(consent).toBeFocused()
await expect(consent).not.toBeChecked()
await consent.tap()
await expect(page.locator('[data-intake-mobile-action-bar="true"]')
  .getByRole('button', { name: 'Pay $24.95', exact: true })).toBeEnabled()
```

- [ ] Keep the in-content Review & pay h1 focus target, remove only redundant header semantics/reassurance and simplify spacing without hiding review answers. Preserve total calculation and the optional priority row's behaviour.
- [ ] Preserve existing active-step navigation and reveal its existing labels on mobile with responsive wrapping. Reuse Release A's measured bar clearance and recheck longer Review & confirm / Pay labels; do not defer or duplicate its measurement implementation.
- [ ] Recheck the six service entry routes after any shared primitive/shell change. Prescribing identity, subtype routing and service gating must remain unchanged.
- [ ] Run focused consent, readability, progress and store-navigation tests plus the isolated browser suite; inspect the diff and commit.

### Task 4: release evidence and measurement

**Files:** `docs/ROADMAP.md`, this plan's execution checklist, and existing analysis queries under local evidence storage. No new analytics provider, recordings or patient payloads.

- [ ] Run `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm doc:audit`, the relevant full CI/release gates and the local browser matrix. Keep real emails, payments and clinical submissions out of browser QA.
- [ ] Record separate merge SHA, production-ready time and smoke result for Releases A and B. Prefer the existing explicitly marked/excluded synthetic monitor for production checks; confirm its exclusion before use. If a manual anonymous smoke creates flow events, record the known QA flow IDs privately and exclude them from the diagnostic cohort rather than counting them as patients.
- [ ] Preserve the meaning of `intake_started`; report it as form entry. Use explicit `certificate_continue_clicked` and first-step completion alongside entries. Do not treat defaults as engagement or require an answer change from someone accepting defaults.
- [ ] Use the existing anonymous flow ID to join completion/payment events. For each release, retain the deployment boundary and compare fresh flows first seen wholly within one presentation period; report resumed and cross-release flows separately. Do not repurpose the ED/hair-loss-only `growth_experience_version` registry for certificates.
- [ ] Keep one canonical checkout-consent tracker; distinguish current `visibility_target: "checkbox"` events from historical half-card visibility when analysing outcomes. No dates, symptoms, entered text, identity fields or full URLs are added to analytics. No new event taxonomy is required for Release A.
- [ ] Update the roadmap with observed counts, payment reconciliation scope and remaining uncertainty. Mark checklist items complete only with their corresponding evidence.

## 5. Review focus and acceptance

| Risk or input | Acceptance check | Owner |
|---|---|---|
| Restored drafts, midnight rollover, URL prefill, back/edit | Same type, exact covered dates and price; invalid dates retained until explicit correction; saved preference precedes Work fallback | Tasks 0–1 |
| Short screens, 200% text, keyboard, dark mode | Responsive 16px options and readable actions; measured bar clearance in Release A; correct in-content heading focus on Next/Back/Edit | Tasks 1–3 |
| Carer requests, symptom amendments, concerning answers | Correct subject and complete saved text; existing validation and safety branches still apply | Task 2 |
| Missing identity, long names, typo emails, DOB, profile skips | No lost input or extra certificate fields; only truly complete identities skip Details | Task 2 |
| Edit after consent, repeated taps, failed/unknown payment outcome | Required reconfirmation, one guarded attempt, preserved answers, accurate recovery state | Task 3 |

The browser matrix includes 320×568, 390×844, landscape 844×390, tablet 768px and desktop 1280px; light/dark, keyboard navigation and reduced motion. Android Chromium and iPhone WebKit are local emulation evidence, not physical-phone proof. A signed-in flow with Details skipped must show an accurate shorter count. The release changes no clinical criteria, date policy, three-day cap, pricing, refund policy or required consent.

## 6. How we judge the change

- **Primary business outcome:** server-confirmed paid requests within 24 hours per fresh form entry. Reconcile missing/failed payment events before treating them as lost orders.
- **Leading indicator:** first-screen completion per entry, with explicit Continue taps and validation blocks reported separately. More taps alone is not success.
- **Supporting measures:** checkout reached, consent progression by visibility measurement definition, payment attempts, recovery errors and completion by mobile/desktop and paid/unattributed source. Unattributed does not mean organic.
- **Baseline:** preserve exact UTC boundaries, event versions, E2E/known-QA exclusions, source/device filters, restored-flow handling and the 24-hour conversion window. Reconcile the 50-entry and reviewer 54-entry queries before comparing rates. Collect at least seven complete days of valid post-September-22 Continue-click telemetry if available before Release A; no invented historical zero-tap baseline. This is a baseline preference, not a reason to delay a confirmed defect repair.
- **Evaluation:** inspect the first 48 hours for functional problems. Review seven complete days with an additional 24-hour outcome window, then extend the descriptive read to 14 days where useful. Report raw counts and uncertainty. Release B needs functional confidence and an initial cohort review, not a statistically significant uplift. Do not estimate extra weekly orders from the six interacted-and-left flows.
- **Operational pause rule:** for the first 40 fresh Release A entries with complete follow-up, fewer than 22 first-screen completions (below 55%) pauses Release B while source/device mix, instrumentation and errors are checked. Reapply to each subsequent non-overlapping 40-entry group during the initial review period; log each check. This is a proposed conservative investigation trigger, not statistical evidence of harm or an automatic rollback. Approval of the plan adopts this operational rule. Functional failures still trigger immediate rollback regardless of traffic volume.
- **Confounders:** the newly deployed hero and existing Ads test already affect traffic. Hold further Ads, price and landing-page changes steady where possible. Before/after results are directional, not a randomised causal test. A 50/50 experiment is not proposed at the current volume.
- **Rollback:** immediately revert the relevant release for lost answers, wrong dates/prices, broken consent/payment guards, inaccessible controls or cross-service regression. Investigate an apparent conversion fall before attributing it to this change. Retain #600's independent accessibility repair when reverting presentation work.

## 7. Approval boundary

This is the final revised certificate-form proposal. Rey reviews it before implementation. Once approved, complete the correctness/test prerequisites, build Release A with all dependent accessibility and CI changes, and prepare the smaller Release B separately. Use the October 6 read as the default presentation-release boundary unless Rey chooses an earlier deployment with the attribution tradeoff recorded. No app code, live form, campaign or payment setting changes as part of finalising this plan.
