# Certificate Request Simplification Plan

> **Status: proposed for Rey's review. Planning only; no implementation or release is authorised by this document.**
> **Execution:** use the writing-plans handoff with `superpowers:executing-plans`, implementing and verifying one task at a time in the existing InstantMed stack. No parallel implementation is needed.

**Goal:** make the certificate request feel short, understandable and easy to finish on a phone, while preserving its questions, editable answers, explicit consent and payment safeguards.

**Architecture:** retain the existing four step IDs and Zustand draft model. Simplify presentation inside the certificate route, using existing request primitives. Shared component changes must be opt-in for certificates; prescribing and specialty forms retain their current behaviour.

**Stack:** Next.js 15.5.24, React 18.3.1, TypeScript, Tailwind 4.2.2, existing shadcn/Radix controls, Framer Motion 11.18.2. No dependency upgrades or migrations.

**Design/spec authority:** this document records the proposed experience from Rey's September 23 request. `DESIGN.md`, `PRODUCT.md`, `docs/BRAND.md`, `docs/VOICE.md`, `components/request/README.md` and the current clinical/payment contracts govern implementation. `docs/ROADMAP.md` remains the priority and outcome record.

## 1. Decision and evidence

Keep **Certificate → Symptoms → Your details → Review & pay**. Simplify how much work each screen appears to require before considering fewer steps. The displayed count must follow the actual registry: eligible signed-in patients can already skip Details.

The September 23 investigation recorded 50 starts → 31 checkout visits → 23 payment attempts → 22 server purchases, using September 15–22 starts with 24-hour follow-up through September 23 11:30 UTC. This is an anonymous-flow cohort, not a unique-patient count. `intake_started` fires on entry to the first step, before an answer or Continue tap. Some loss therefore represents browsing rather than failed attempts to complete the form.

The working hypothesis is **uncertainty about commitment plus unnecessary visual effort**. It is not established causally. The current first screen already defaults to Work / 1 day / Today and its Continue action works. The live 390×844 screen has two headings, repeated directions, three question cards and another summary card. The details screen already asks certificate guests for only first name, last name, email and date of birth. Symptoms already supports chips and optional extra text. Do not claim those existing features as new improvements.

The six-visit mature consent cohort is too small to justify removing a consent requirement or changing its wording. Broader ecommerce research supports reducing perceived effort, but is supporting design evidence rather than InstantMed conversion proof: [Baymard research](https://baymard.com/research-articles/checkout-flow-average-form-fields).

### Release dependency

PR #599's navigation/hero/footer redesign is live at `4fa3e63a0`. PR #600's enlarged-consent repair is separate and not released. At plan creation, its CI run `35857497197` failed one exact-source-string assertion in `lib/__tests__/review-step-mobile-readability-contract.test.ts`; the assertion expects the old class string without the new wrapping utility. It had 8,489 passing tests; E2E and Lighthouse did not run after that failure. Preserve the font-size assertion while making it tolerant of the additional wrapping class, rerun the relevant tests and required CI, and establish a green baseline before building this plan. Do not waive the test or claim the PR is deployed.

## 2. Proposed experience

### Shared certificate shell

- One useful screen heading. Remove the repeated in-content heading where the flow header already names the same task. Keep a concise sentence only when it explains an action or consequence.
- Show the actual step number and readable stage names, with current/completed states. Preserve existing back/edit rules and skipped-step handling; no extra onboarding screen.
- One mobile action bar with the next action written out. Keep the arrow secondary. At narrow widths or enlarged text, let the label wrap and bar height grow instead of truncating the action to an arrow.
- Reserve the measured bar height in the scroll area. The keyboard, safe area and validation messages must not conceal an input, consent checkbox or final legal link.
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
[ 1 day · $24.95 ] [ 2 days · $29.95 ] [ 3 days · $39.95 ]

Starting from?
[ Yesterday ] [ Today ] [ Tomorrow ] [ Day after ]

Work certificate · 23 September · 1 day             $24.95
Full refund if the doctor declines.

Need more than 3 days off? Please visit your GP for an extended certificate.

[ Next: your symptoms → ]
```

- Group the three questions into one surface, with internal spacing/dividers rather than nested cards. All choices remain visible and editable; dates must not move behind a disclosure. That would repeat a previously rejected design.
- Keep Work / 1 day / Today defaults for a fresh eligible flow. Saved drafts, explicit URL choices and user edits retain their existing precedence. Never silently replace a restored three-day selection with one day.
- Show actual calendar dates in the summary, including the end date for multi-day requests. Preserve the start-date selection and softer covered-day highlight distinction. Label a supported prefilled date outside the four shortcuts accurately.
- Read prices from `MED_CERT_DURATIONS`; the figures above are examples, not new constants. Price changes immediately when duration changes. Reuse the canonical full-refund claim.
- Keep the summary inline within the surface. On a phone, place it directly above the next-action area without creating a second fixed bar.
- Explicitly label the next destination. Continue performs the same validation and persistence; no automatic advancement when a date or type is selected.

### Step 2: Your symptoms

- One heading: **Your symptoms**. For carer's leave, retain the existing subject-specific question about the person being cared for.
- Keep the existing symptom chips and instruction that selecting the relevant symptoms is enough to continue. Keep the labelled **Add detail (optional)** text area visible and editable.
- Place optional symptom duration in the same quiet content surface, clearly labelled optional. Remove a redundant card boundary, not the field.
- Retain existing symptom validation, emergency messages, acknowledgement behaviour and all server checks. Do not introduce preselected symptoms or auto-generated patient answers beyond the current explicit chip behaviour.
- Next label: **Next: your details**, or **Next: review & pay** when the active registry skips Details. Derive this from the actual next step, not authentication alone.

### Step 3: Your details

- One heading and one explanation: **For your medical record and result delivery.**
- Retain first name, last name, email and date of birth. These are already the certificate guest requirements; do not merge names into a new full-name field or add phone, Medicare, address or an account-creation detour.
- Stack name fields on narrow phones, with an appropriate wider-screen two-column layout. Preserve autofill attributes, email keyboard, numeric date input, Australian date display and existing typo suggestions.
- Keep saved-details reuse and valid signed-in skipping. Invalid or incomplete identity must still lead to the required corrections.
- Show errors beside the relevant field and announce the existing summary. A failed next action focuses a useful correction and preserves all entered text.
- Next label: **Next: review & pay**. Email guidance for certificates describes a secure link if approved; it must not imply an unprotected certificate attachment or guaranteed approval.

### Step 4: Review & pay

- Retain the existing single review summary surface. It already groups sections; do not propose rebuilding it into another stack of cards.
- Use compact, readable sections for certificate dates/type, symptoms and patient details, each with its existing Edit action. Keep complete entered answers available without truncating or hiding them by default.
- Remove the extra **One last check** heading when **Review & pay** already identifies the screen. Keep one short instruction to check details, and preserve approved outcome/delivery information.
- Present the exact total and any optional priority fee immediately before consent/payment. Preserve the existing priority availability, off-by-default choice, price and timing qualification; do not bundle an upsell experiment into this cleanup.
- Preserve the complete current consent text, unchecked state, consent-version validation, and reconfirmation after relevant edits. Integrate #600's readable wrapping and versioned visibility measurement.
- Keep the current two states: **Review & confirm** moves focus to the unchecked consent; explicit consent changes the action to **Pay $X**. No payment on the review action, automatic ticking or checkbox-and-pay shortcut.
- Keep one quiet payment-provider reassurance. Avoid repeating the same refund message in multiple places within this screen.
- Processing, session failure, expired requests, unknown payment outcomes and retry recovery retain their current guards and user input. Never make a payment button look successful before confirmation.

## 3. Delivery sequence

**Release A: first-screen simplification only.** Change certificate grouping, heading, inline date/price summary and the first action label. Fix action-label wrapping where required for this screen, scoped to certificates. Keep later screens and navigation semantics stable. This is one presentation package, so any observed lift belongs to the package rather than a particular word or spacing value.

**Release B: the remaining certificate journey.** After the first release has a recorded measurement boundary and a reviewed result, apply the symptom, details, review and remaining shell changes above. Implement as small reviewable commits, with one coherent browser review before release. A clear functional regression triggers immediate repair rather than waiting for conversion data.

**Other services:** this plan establishes a certificate pattern, not permission to shorten clinical questionnaires across all services. Shared primitive changes need regression checks on prescriptions and the four specialty routes. A later rollout can reuse the presentation where it fits, under a separately scoped service audit.

## 4. Implementation tasks

### Task 0: establish the baseline

**Files:** existing #600 changes and `lib/__tests__/review-step-mobile-readability-contract.test.ts`; no new runtime behaviour in this task.

- [ ] Recheck #600 and main. If still failing, repair the exact-class assertion while retaining `text-base`, `leading-relaxed` and overflow coverage; run the focused contract plus the isolated consent suite. Keep this repair in #600.
- [ ] After its release, record the production SHA/time. Capture fresh/restored certificate screens using synthetic local fixtures, with light/dark, 390px mobile and desktop evidence.
- [ ] Preserve existing step IDs (`certificate`, `symptoms`, `details`, `checkout`), drafts and analytics names. Read the runtime requirements before editing shared files.

### Task 1: build and verify Release A

**Modify:** `components/request/steps/certificate-step.tsx`; certificate-specific title/action presentation in `components/request/request-flow.tsx` only where needed. Reuse `components/request/shared/intake-step-primitives.tsx`; add an opt-in variant only if existing composition cannot express the grouping.

**Interfaces:** consume existing `answers`, `setAnswer`, `handleNext`, `MED_CERT_DURATIONS` and hydrated selection helpers. Produce the same `{ certType, duration, startDate }` answers and `onNext()` behaviour. Set `data-intake-primary-label="Next: your symptoms"` on the existing primary action so its mobile mirror stays in sync.

- [ ] Extend `e2e/checkout-consent.browser.ts` in its isolated local harness with assertions for the new label, price updates and unchanged progression. Run the new-label assertion against the baseline to establish the expected failure.

```ts
const bar = page.locator('[data-intake-mobile-action-bar="true"]')
await page.getByRole('radio', { name: '3 days $39.95', exact: true }).tap()
await expect(page.getByRole('radio', { name: '3 days $39.95', exact: true })).toBeChecked()
await bar.getByRole('button', { name: 'Next: your symptoms', exact: true }).tap()
await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your symptoms')
```

- [ ] Compose the one-surface layout and exact copy above. Reuse current selection callbacks and date helpers; do not alter hydration or validation to suit the layout.
- [ ] Exercise work/study/carer, 1/2/3 days, yesterday/today/future selections, URL prefill, back/edit and reload. Assert restored dates/duration and the eventual displayed price agree.
- [ ] Verify readable action labels at 320px and 200% text, no horizontal overflow, keyboard radio navigation, and visible validation feedback. Do not enforce a one-screen fit by clipping content.
- [ ] Run `corepack pnpm exec vitest run lib/__tests__/certificate-step-hydration-contract.test.ts lib/__tests__/certificate-step-advance-persistence.test.ts lib/__tests__/cert-step-revenue-contract.test.ts lib/__tests__/intake-mobile-viewport-contract.test.ts`, plus `corepack pnpm exec playwright test --config=playwright.consent-tracking.config.ts`.
- [ ] Inspect the diff and screenshots; commit the first-screen change separately.

### Task 2: simplify Symptoms and Details for Release B

**Modify:** `components/request/steps/symptoms-step.tsx`, `components/request/steps/patient-details-step.tsx`, and next-action labels in the certificate flow. **Tests:** extend the existing isolated browser harness; retain `lib/__tests__/symptom-text-quality.test.ts` and `lib/__tests__/patient-details-canskip-contract.test.ts`.

**Interfaces:** consume the existing `serviceType`, answers and identity store. Preserve `needsPhone`, `needsPrescriptionDetails`, `needsAddress`, validators and skip decisions. Only a med-cert presentation branch receives the new layout/copy.

- [ ] Add browser cases for symptom chips plus typed additions, removing a chip without losing typed content, optional duration left blank, and the carer-specific subject. Pin both actual next destinations (Details and Review & pay).
- [ ] Simplify the containers and duplicate headings. Preserve visible optional controls and existing emergency feedback.
- [ ] Verify empty/invalid email, an offered typo correction, invalid DOB and under-18 rejection retain values and focus the correction. Verify guest and incomplete/complete signed-in identity states separately.

```ts
await page.getByRole('textbox', { name: 'Email', exact: true }).fill('invalid-email')
await page.getByRole('button', { name: 'Next: review & pay', exact: true }).tap()
await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('invalid-email')
await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your details')
```

- [ ] Test supported autofill, long names/emails, date editing, reload and back navigation. Run the focused tests, inspect the rendered certificate screens and commit independently.

### Task 3: simplify Review and the certificate shell for Release B

**Modify:** `components/request/steps/review-step.tsx`, `components/request/request-flow.tsx`, and `components/request/progress-bar.tsx` if stage labels need a certificate-only presentation option. **Tests:** `e2e/checkout-consent.browser.ts`, `lib/__tests__/request-progress-bar.test.tsx`, `lib/__tests__/review-step-mobile-readability-contract.test.ts`, and existing store edit/navigation contracts.

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

- [ ] Remove redundant heading/reassurance and simplify spacing without hiding the review answers. Preserve total calculation and the optional priority row's behaviour.
- [ ] Make certificate progress and action labels follow active steps. Make the fixed bar reserve its measured height and accommodate enlarged labels/keyboard changes; test rather than adding a larger hardcoded bottom allowance.
- [ ] Recheck the six service entry routes after any shared primitive/shell change. Prescribing identity, subtype routing and service gating must remain unchanged.
- [ ] Run focused consent, readability, progress and store-navigation tests plus the isolated browser suite; inspect the diff and commit.

### Task 4: release evidence and measurement

**Files:** `docs/ROADMAP.md`, this plan's execution checklist, and existing analysis queries under local evidence storage. No new analytics provider, recordings or patient payloads.

- [ ] Run `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm doc:audit`, the relevant full CI/release gates and the local browser matrix. Keep real emails, payments and clinical submissions out of browser QA.
- [ ] Record separate merge SHA, production-ready time and smoke result for Releases A and B. Recheck the anonymous production entry screen after each release.
- [ ] Preserve the meaning of `intake_started`; report it as form entry. Use explicit `certificate_continue_clicked` and first-step completion alongside entries. Do not treat defaults as engagement or require an answer change from someone accepting defaults.
- [ ] Use the existing anonymous flow ID to join completion/payment events. For each release, retain the deployment boundary and compare fresh flows first seen wholly within one presentation period; report resumed and cross-release flows separately. Do not repurpose the ED/hair-loss-only `growth_experience_version` registry for certificates.
- [ ] Keep `checkout-consent-v1` and `v2` visibility separate. No dates, symptoms, entered text, identity fields or full URLs are added to analytics. No new event taxonomy is required for Release A.
- [ ] Update the roadmap with observed counts, payment reconciliation scope and remaining uncertainty. Mark checklist items complete only with their corresponding evidence.

## 5. Review focus and acceptance

| Risk or input | Acceptance check | Owner |
|---|---|---|
| Restored drafts, explicit URL prefill, back/edit | Same type, exact covered dates and price before and after navigation/reload; no default overwrite | Task 1 |
| Short screens, 200% text, keyboard, dark mode | No clipping or horizontal page scroll; primary label readable; focused fields, consent and last links clear the bar | Tasks 1–3 |
| Carer requests, symptom amendments, concerning answers | Correct subject and complete saved text; existing validation and safety branches still apply | Task 2 |
| Missing identity, long names, typo emails, DOB, profile skips | No lost input or extra certificate fields; only truly complete identities skip Details | Task 2 |
| Edit after consent, repeated taps, failed/unknown payment outcome | Required reconfirmation, one guarded attempt, preserved answers, accurate recovery state | Task 3 |

The browser matrix includes 320×568, 390×844, landscape 844×390, tablet 768px and desktop 1280px; light/dark, keyboard navigation and reduced motion. Android Chromium and iPhone WebKit are local emulation evidence, not physical-phone proof. A signed-in flow with Details skipped must show an accurate shorter count. The release changes no clinical criteria, date policy, three-day cap, pricing, refund policy or required consent.

## 6. How we judge the change

- **Primary business outcome:** server-confirmed paid requests within 24 hours per fresh form entry. Reconcile missing/failed payment events before treating them as lost orders.
- **Leading indicator:** first-screen completion per entry, with explicit Continue taps and validation blocks reported separately. More taps alone is not success.
- **Supporting measures:** checkout reached, consent progression by telemetry version, payment attempts, recovery errors and completion by mobile/desktop and paid/unattributed source. Unattributed does not mean organic.
- **Evaluation:** inspect the first 48 hours for functional problems; read seven completed days after allowing the final 24-hour conversion window, then extend to 14 days if counts are small. Report raw denominators and uncertainty; do not call a handful of extra orders a proven uplift or promise an uplift percentage in advance.
- **Confounders:** the newly deployed hero and existing Ads test already affect traffic. Hold further Ads, price and landing-page changes steady where possible. Before/after results are directional, not a randomised causal test. A 50/50 experiment is not proposed at the current volume.
- **Rollback:** immediately revert the relevant release for lost answers, wrong dates/prices, broken consent/payment guards, inaccessible controls or cross-service regression. Investigate an apparent conversion fall before attributing it to this change. Retain #600's independent accessibility repair when reverting presentation work.

## 7. Approval boundary

This is the complete proposed certificate-form direction. Rey reviews this plan before implementation. Release A is the first build; Release B is the next measured stage. No app code, live form, campaign or payment setting changes as part of writing this plan.
