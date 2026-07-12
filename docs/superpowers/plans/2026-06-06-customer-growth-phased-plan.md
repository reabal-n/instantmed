# Customer Growth Implementation Plan

> **Status: Reference only.** This plan preserves historical implementation detail and volatile baseline data. It is not an execution queue. `docs/ROADMAP.md` is the sole authority for current priority, approval, and checkpoints; use a task below only when the ROADMAP explicitly activates it.

**Goal:** Increase customers in phases by first making abandoned-cart and partial-intake recovery measurable and reliable, then controlling Google Ads CAC, then compounding organic, LLM-referral, SEO, and backlink growth.

**Architecture:** Treat Supabase paid/reportable intakes as the source of truth. Recovery becomes a measured lifecycle with draft session linkage, email template parity, resume-to-checkout proof, and operator-visible scorecards before any paid ramp. Google Ads and SEO phases are gated by revenue, compliance, and operational proof rather than channel optimism.

**Tech Stack:** Next.js 15.5 App Router, React 18.3, TypeScript 5.9, Supabase, Stripe, PostHog, Resend React email templates, Google Ads report endpoint, Vitest, Playwright, Google Search Console tooling.

---

## Current Baseline To Preserve

Use this as the opening benchmark and refresh it at phase boundaries:

- 30-day reportable Supabase intakes: 43.
- 30-day paid reportable intakes: 33.
- 30-day gross revenue: $968.35.
- 30-day net revenue: $888.45.
- 30-day Google Ads spend: $1,591.23.
- 30-day Google Ads local orders: 22.
- 30-day Google Ads click-to-local-order conversion: 4.79%.
- 30-day Google Ads local CAC: $72.33.
- 30-day Google Ads local ROAS: 0.326.
- 30-day production visitors: 607.
- 30-day partial intakes: 122.
- 30-day partial-intake converted marker: 0.
- 30-day partial-intake email capture: 18.
- 30-day partial-intake recovery sends: 14.

**Interpretation:** do not call recovery "broken" until Phase 1 proves whether no one is converting or the system simply never writes `converted_to_intake_id`. The code currently saves server drafts, but checkout creation does not receive a server draft session id, and `deleteServerDraft()` deletes the server row instead of marking it converted.

---

## Phase Gates

Do not move to a later phase until the gate before it passes.

| Phase | Gate |
| --- | --- |
| Phase 0 | Live baseline refreshed and written to the plan/status artifact without PHI. |
| Phase 1 | Recovery lifecycle has unit tests, conversion marker, resume proof, and scorecard reconciliation. |
| Phase 2 | Recovery and abandoned checkout emails render through `BaseEmail`, have previews, pass copy/compliance checks, and match the InstantMed voice system. |
| Phase 3 | Operator can see recovery coverage, recovered paid count, recovered revenue, Ads CAC, and refund-adjusted ROAS from production truth. |
| Phase 4 | Google Ads is capped to profitable or testable campaigns only, with local-order CAC and net ROAS reviewed weekly. |
| Phase 5 | Organic/LLM growth work starts from indexed, compliant money pages and white-hat AU backlink work only. |

---

## File Map

### Baseline And System Review

- Create: `scripts/customer-growth-baseline.ts` - aggregate-only customer growth baseline with Supabase, PostHog, and Google Ads reads.
- Create: `docs/reviews/2026-06-06-customer-growth-baseline/summary.md` - non-PHI funnel, recovery, CAC, ROAS, and gate summary.
- Create: `docs/reviews/2026-06-06-customer-growth-baseline/recovery-lifecycle.md` - reviewed recovery lifecycle findings.

### Recovery And Abandoned Cart

- Modify: `lib/request/server-draft.ts` - expose the active server draft session id and add a converted terminal call.
- Modify: `lib/request/draft-storage.ts` - stop treating successful checkout as pure deletion once conversion marking exists.
- Modify: `app/api/draft/route.ts` - add a conversion-marking endpoint or extend DELETE semantics with explicit conversion intent.
- Modify: `app/actions/unified-checkout.ts` - accept `serverDraftSessionId`.
- Modify: `components/request/steps/checkout-step.tsx` - pass active server draft session id into checkout.
- Modify: `components/request/steps/review-step.tsx` - pass active server draft session id for repeat-script payable review step.
- Modify: `lib/stripe/checkout/persistence.ts` - mark the partial draft converted once the intake row is created.
- Modify: `lib/stripe/guest-checkout.ts` - mirror the same conversion marker for guest checkout.
- Modify: `lib/email/partial-intake-recovery.ts` - make resume URL building testable and keep consult subtype handling.
- Modify: `lib/email/abandoned-checkout.ts` - align resume links and email subject/template usage.
- Test: `lib/__tests__/partial-intake-recovery.test.ts`.
- Test: `lib/__tests__/draft-conversion-link.test.ts`.
- Test: `lib/__tests__/email-sequence-ownership-contract.test.ts`.
- Test: `lib/__tests__/recovery-scorecard.test.ts`.

### Email Template Parity

- Modify: `lib/email/components/templates/index.ts` - export partial-intake recovery template and subject.
- Modify: `lib/email/components/templates/partial-intake-recovery.tsx` - remove emoji/cute tone, align with `BaseEmail` and voice.
- Modify: `lib/email/components/templates/abandoned-checkout.tsx` - align with the same recovery style.
- Modify: `lib/email/components/templates/abandoned-checkout-followup.tsx` - align final nudge with compliance-safe copy.
- Modify: `app/(dev)/email-preview/page.tsx` - add partial-intake recovery preview entry.
- Modify: `app/(dev)/email-preview/[template]/page.tsx` - render partial-intake recovery preview.
- Test: `lib/__tests__/email-templates.test.tsx`.
- Test: `lib/__tests__/advertising-compliance-guard.test.ts`.
- Test: `lib/__tests__/voice-guard.test.ts`.

### Operator Measurement

- Modify: `lib/data/recovery-scorecard.ts` - reconcile partial drafts, recovery emails, recovered paid orders, and recovered revenue.
- Modify: `app/admin/analytics/analytics-client.tsx` or the current analytics surface - show recovery and Ads profit gates where the operator already looks.
- Modify: `lib/analytics/google-ads-return-summary.ts` - keep campaign-level local CAC, local net, local ROAS, and revenue after ad spend. This is not contribution or profit.
- Test: `lib/__tests__/recovery-scorecard.test.ts`.
- Test: `lib/__tests__/google-ads-return-summary.test.ts`.

### Google Ads

- Modify: `docs/growth/google-ads-operating-runbook.md` - create the operating checklist for exact-match test campaigns, negative keyword review, Search Partners policy, and weekly kill criteria.
- Use: `app/api/internal/google-ads-report/route.ts` - production protected report for spend and local-order proof.
- Use: `lib/analytics/google-ads-report.ts` - report generation.
- Use: `lib/analytics/google-ads-post-payment.ts` - Stripe payment truth to Google Ads.
- Test: `lib/__tests__/google-ads-return-summary.test.ts`.
- Test: `lib/__tests__/google-ads-post-payment.test.ts`.
- Test: `lib/__tests__/integration-check-contract.test.ts`.

### Organic, LLM, SEO, Backlinks

- Modify: `docs/growth/organic-llm-seo-backlink-plan.md` - create execution runbook.
- Use: `docs/SEO_CONTENT_POLICY.md`.
- Use: `docs/ADVERTISING_COMPLIANCE.md`.
- Use: `docs/audits/2026-06-04-au-backlink-plan.md`.
- Use: `docs/audits/2026-06-03-gsc-seo-content-audit.md`.
- Use: `lib/seo/index-policy.ts`.
- Use: `app/sitemap.ts`.
- Test: `lib/__tests__/seo-indexing-contract.test.ts`.
- Test: `lib/__tests__/indexnow.test.ts`.

---

## Phase 0: Baseline And System Review

**Objective:** confirm the current funnel truth before fixing anything.

- [ ] **Step 1: Refresh production metrics**

Create `scripts/customer-growth-baseline.ts` instead of reusing `scripts/conversion-funnel-audit.ts`. The existing funnel-audit script currently parses `--out-dir`, but its data/model/capture writes are still bound to its hardcoded audit directory constants, so it is the wrong primitive for this customer-growth baseline until that script is refactored.

Implementation requirements:

- read aggregate-only Supabase funnel totals using the same reportable-intake filters used by analytics.
- read aggregate-only PostHog funnel totals when the env is available.
- read Google Ads spend/local-order data from the protected report path or record a skip reason.
- write only redacted JSON and markdown.
- never write names, emails, phone numbers, answers, Stripe ids, UUIDs, or click ids.

Run:

```bash
pnpm exec tsx scripts/customer-growth-baseline.ts --out-dir docs/reviews/2026-06-06-customer-growth-baseline
```

Expected:

- `data/supabase-funnel-30d.json` exists.
- `data/posthog-30d.json` exists.
- `data/google-ads-30d.json` exists or records a protected-endpoint skip reason.
- `summary.md` contains current conversion, recovery, CAC, ROAS, and phase-gate status.
- No patient names, emails, phone numbers, Stripe ids, UUIDs, or click ids appear unredacted in the committed report.

- [ ] **Step 2: Audit recovery lifecycle code paths**

Read these files and write a short finding section to `docs/reviews/2026-06-06-customer-growth-baseline/recovery-lifecycle.md`:

- `lib/request/server-draft.ts`
- `lib/request/draft-storage.ts`
- `app/api/draft/route.ts`
- `app/actions/unified-checkout.ts`
- `components/request/steps/checkout-step.tsx`
- `components/request/steps/review-step.tsx`
- `lib/stripe/checkout/persistence.ts`
- `lib/stripe/guest-checkout.ts`
- `lib/email/partial-intake-recovery.ts`
- `lib/email/abandoned-checkout.ts`

The finding must answer:

- Is the server draft session id available to checkout?
- Is `converted_to_intake_id` ever written?
- Are successful checkouts deleting draft rows, leaving rows untouched, or marking conversion?
- Does recovery link resumption preserve the same draft id through checkout?
- Which email templates are active, previewable, and covered by tests?

- [ ] **Step 3: Commit baseline artifact**

```bash
git add docs/reviews/2026-06-06-customer-growth-baseline
git commit -m "docs: capture customer growth baseline"
```

Gate: baseline metrics and recovery lifecycle findings are present.

---

## Phase 1: Bulletproof Recovery And Abandoned Cart

**Objective:** make every recovery candidate measurable from partial draft to resumed request to paid intake.

### Task 1: Pass Draft Session Into Checkout

**Files:**

- Modify: `lib/request/server-draft.ts`
- Modify: `app/actions/unified-checkout.ts`
- Modify: `components/request/steps/checkout-step.tsx`
- Modify: `components/request/steps/review-step.tsx`
- Test: `lib/__tests__/draft-conversion-link.test.ts`

- [ ] **Step 1: Add a failing contract test**

Test expectation:

- `lib/request/server-draft.ts` exports `getActiveServerDraftSessionId(service)`.
- checkout and review steps pass `serverDraftSessionId` to `createCheckoutFromUnifiedFlow`.
- `UnifiedCheckoutInput` accepts `serverDraftSessionId?: string`.

Run:

```bash
pnpm test run lib/__tests__/draft-conversion-link.test.ts
```

Expected before implementation: fail because the export and checkout input do not exist.

- [ ] **Step 2: Implement the narrow client contract**

Implementation requirements:

- Add `getActiveServerDraftSessionId(service: CanonicalServiceType): string | null` in `lib/request/server-draft.ts`.
- Keep it client-only and read from the existing `SERVER_SESSION_KEY_PREFIX`.
- In `checkout-step.tsx`, import it lazily or statically from `@/lib/request/server-draft` and pass the active id for `serviceType`.
- In `review-step.tsx`, do the same for prescription/repeat-script review payment.
- In `app/actions/unified-checkout.ts`, add `serverDraftSessionId?: string` to `UnifiedCheckoutInput`.
- Do not expose this id in logs or analytics.

- [ ] **Step 3: Verify**

```bash
pnpm test run lib/__tests__/draft-conversion-link.test.ts
pnpm typecheck
```

Expected: pass.

### Task 2: Mark Drafts Converted Instead Of Losing The Link

**Files:**

- Modify: `app/api/draft/route.ts`
- Modify: `lib/request/server-draft.ts`
- Modify: `lib/stripe/checkout/persistence.ts`
- Modify: `lib/stripe/guest-checkout.ts`
- Test: `lib/__tests__/draft-conversion-link.test.ts`
- Test: `lib/__tests__/recovery-scorecard.test.ts`

- [ ] **Step 1: Add a failing test for conversion marking**

Expected behavior:

- When checkout creates an intake with `serverDraftSessionId`, the matching `partial_intakes` row is updated with `converted_to_intake_id = intake.id`.
- `recovery_email_sent_at` remains intact.
- `email`, `first_name`, and encrypted fields are not modified.
- If the draft id is missing or invalid, checkout still succeeds and logs a non-PHI warning.

- [ ] **Step 2: Implement conversion marking**

Implementation requirements:

- Add `markServerDraftConverted(service, intakeId)` in `lib/request/server-draft.ts` for client cleanup after redirect preparation if needed.
- Add server-side helper in `app/api/draft/route.ts` or a new server-only helper `lib/request/server-draft-conversion.ts`:
  - validate UUID format for session id and intake id.
  - update only `converted_to_intake_id`.
  - require `converted_to_intake_id IS NULL`.
  - do not overwrite converted rows.
- In authenticated checkout persistence, after the `intakes` and `intake_answers` inserts succeed, mark the draft converted if `input.serverDraftSessionId` exists.
- Mirror the same in guest checkout after the intake row is durably created.
- Do not delete the row on conversion. Expiry cleanup can remove old rows later.

- [ ] **Step 3: Keep explicit user discard as deletion**

Implementation requirements:

- `clearDraft(service)` from the service hub remains a user discard.
- A user discard can still call DELETE.
- Checkout success must not be represented only as DELETE.

- [ ] **Step 4: Verify**

```bash
pnpm test run lib/__tests__/draft-conversion-link.test.ts lib/__tests__/recovery-scorecard.test.ts
pnpm typecheck
```

Expected: pass.

### Task 3: Prove Recovery Resume Links End To End

**Files:**

- Modify: `lib/email/partial-intake-recovery.ts`
- Modify: `components/marketing/intake-resume-chip.tsx`
- Modify: `components/request/steps/checkout-step.tsx`
- Modify: `components/request/steps/review-step.tsx`
- Test: `lib/__tests__/partial-intake-recovery.test.ts`
- Optional E2E: `e2e/recovery-resume.spec.ts`

- [ ] **Step 1: Add URL builder tests**

Cover:

- med cert draft resumes to `/request?service=med-cert&d=<id>`.
- prescription draft resumes to `/request?service=prescription&d=<id>` or the current canonical repeat-script route if changed during implementation.
- ED consult resumes to `/request?service=consult&subtype=ed&d=<id>`.
- hair-loss consult resumes to `/request?service=consult&subtype=hair_loss&d=<id>`.
- retired bare consult resumes to `/consult?d=<id>`.
- every recovery URL includes:
  - `utm_source=recovery_email`
  - `utm_medium=email`
  - `utm_campaign=partial_intake_recovery`
  - `utm_content=<service>`

- [ ] **Step 2: Make URL builder testable**

Implementation requirements:

- Export a pure `buildPartialIntakeRecoveryUrl({ appUrl, draft })` helper.
- Keep decryption of consult subtype in a small wrapper, not inside string construction.
- Keep PHI out of logs if decrypt fails.

- [ ] **Step 3: Add Playwright smoke after unit tests pass**

The E2E should use synthetic data only:

- create a draft with email and a known session id through test setup.
- open the generated recovery URL.
- verify the resume chip appears.
- click Continue.
- verify the user lands in the correct service flow.
- submit to Stripe test checkout only if the test environment is configured to avoid live payment.

Run:

```bash
PLAYWRIGHT=1 pnpm e2e e2e/recovery-resume.spec.ts
```

Expected: pass in local/test only. Never attempt a live card charge.

### Task 4: Fix Abandoned Checkout Retry Links

**Files:**

- Modify: `lib/email/abandoned-checkout.ts`
- Modify: `lib/email/components/templates/abandoned-checkout.tsx`
- Modify: `lib/email/components/templates/abandoned-checkout-followup.tsx`
- Test: `lib/__tests__/email-sequence-ownership-contract.test.ts`
- Test: `lib/__tests__/email-templates.test.tsx`

- [ ] **Step 1: Add a failing contract for retry link shape**

Expected:

- abandoned checkout emails link to the owned intake retry path.
- the link includes UTM parameters:
  - `utm_source=recovery_email`
  - `utm_medium=email`
  - `utm_campaign=abandoned_checkout` or `abandoned_checkout_followup`
- the link does not use a dead or unauthenticated-only route for guest rows.

- [ ] **Step 2: Implement link helpers**

Implementation requirements:

- Add pure helper `buildAbandonedCheckoutResumeUrl({ appUrl, intakeId, campaign })`.
- Use it in both initial and follow-up send functions.
- Keep `patient_id` and intake id out of the visible email body except the link.

- [ ] **Step 3: Verify**

```bash
pnpm test run lib/__tests__/email-sequence-ownership-contract.test.ts lib/__tests__/email-templates.test.tsx
```

Expected: pass.

### Task 5: Recovery Scorecard Must Reconcile

**Files:**

- Modify: `lib/data/recovery-scorecard.ts`
- Test: `lib/__tests__/recovery-scorecard.test.ts`

- [ ] **Step 1: Add tests for the new truth model**

Scorecard must report:

- partials captured.
- email captured.
- partial recovery sent.
- abandoned checkout sent.
- converted partials from `converted_to_intake_id`.
- recovered paid count from paid intakes with recovery attribution.
- recovered gross revenue.
- recovered net revenue.
- email coverage rate.
- conversion rate from emailed partials to paid recovery orders.

- [ ] **Step 2: Implement scorecard changes**

Implementation requirements:

- Keep `partial_intakes` updated-at window for captured/emailed coverage.
- Keep paid-order recovery attribution from intakes using `classifyAttributionSource`.
- Add a metric that warns when recovery-attributed paid orders exist but `converted_to_intake_id` is zero. That catches measurement drift.

- [ ] **Step 3: Verify**

```bash
pnpm test run lib/__tests__/recovery-scorecard.test.ts
pnpm typecheck
```

Expected: pass.

### Phase 1 Exit Verification

Run:

```bash
pnpm test run lib/__tests__/draft-conversion-link.test.ts lib/__tests__/partial-intake-recovery.test.ts lib/__tests__/recovery-scorecard.test.ts lib/__tests__/email-sequence-ownership-contract.test.ts
pnpm typecheck
pnpm lint
```

Pass criteria:

- recovery links resume the correct flow.
- checkout writes `converted_to_intake_id`.
- user discard remains deletion.
- scorecard can distinguish "no recovered customers" from "conversion marker missing".
- no PHI is logged or printed.

---

## Phase 2: Email Template Parity And Copy Compliance

**Objective:** all recovery emails match the InstantMed email system, not one-off copy.

### Task 1: Register And Preview Partial-Intake Recovery Email

**Files:**

- Modify: `lib/email/components/templates/index.ts`
- Modify: `app/(dev)/email-preview/page.tsx`
- Modify: `app/(dev)/email-preview/[template]/page.tsx`
- Test: `lib/__tests__/email-templates.test.tsx`

- [ ] **Step 1: Add failing tests**

Expected:

- `PartialIntakeRecoveryEmail` and `partialIntakeRecoverySubject` are exported from template index.
- `/email-preview/partial-intake-recovery` exists in dev preview registry.
- rendered HTML contains logo, footer, privacy, terms, and manage preferences.

- [ ] **Step 2: Implement registry and preview**

Implementation requirements:

- Add preview list item under patient lifecycle.
- Use sample props:
  - firstName: "Sam"
  - serviceName: "Medical Certificate"
  - resumeUrl: "https://instantmed.com.au/request?service=med-cert&d=00000000-0000-4000-8000-000000000000&utm_source=recovery_email&utm_medium=email&utm_campaign=partial_intake_recovery"
  - appUrl: "https://instantmed.com.au"

- [ ] **Step 3: Verify**

```bash
pnpm test run lib/__tests__/email-templates.test.tsx
pnpm test:templates
```

Expected: pass.

### Task 2: Align Recovery Copy To Voice And Compliance

**Files:**

- Modify: `lib/email/components/templates/partial-intake-recovery.tsx`
- Modify: `lib/email/components/templates/abandoned-checkout.tsx`
- Modify: `lib/email/components/templates/abandoned-checkout-followup.tsx`
- Test: `lib/__tests__/email-templates.test.tsx`
- Test: `lib/__tests__/advertising-compliance-guard.test.ts`
- Test: `lib/__tests__/voice-guard.test.ts`

- [ ] **Step 1: Add copy-contract tests**

Email HTML and subjects must not contain:

- emoji.
- "Hey".
- guilt language.
- countdown or false urgency.
- "industry-standard".
- "no call needed" outside med cert context.
- guaranteed prescription or treatment language.
- drug names.
- "accepted by all employers".
- em dash.

Email HTML must contain:

- name-first greeting.
- clear resume CTA.
- "A doctor reviews your request".
- "Full refund if the doctor declines" where relevant.
- "ignore this email" opt-out reassurance.

- [ ] **Step 2: Rewrite the copy**

Use this tone:

- calm.
- short.
- direct.
- no cute language.
- no hard sell.
- no unsupported speed claim.

Suggested subject patterns:

- partial intake: `Your request is still saved`
- abandoned checkout: `Complete your request`
- followup: `Still need this request?`

Suggested CTA labels:

- partial intake: `Continue your request`
- abandoned checkout: `Return to payment`
- followup: `Finish payment`

- [ ] **Step 3: Verify**

```bash
pnpm test run lib/__tests__/email-templates.test.tsx lib/__tests__/advertising-compliance-guard.test.ts lib/__tests__/voice-guard.test.ts
pnpm typecheck
```

Expected: pass.

### Phase 2 Exit Verification

Run:

```bash
pnpm test run lib/__tests__/email-templates.test.tsx lib/__tests__/advertising-compliance-guard.test.ts lib/__tests__/voice-guard.test.ts
pnpm test:templates
```

Pass criteria:

- all recovery templates use `BaseEmail`.
- all active recovery emails appear in dev preview.
- recovery templates pass voice and compliance contracts.
- the email senders call the subject functions, not hardcoded divergent subjects.

---

## Phase 3: Operator Measurement And Growth Readiness

**Objective:** make revenue leakage, recovery performance, and Ads economics visible enough to govern spend.

### Task 1: Add Growth Readiness Snapshot

**Files:**

- Create: `lib/data/growth-readiness.ts`
- Create: `lib/__tests__/growth-readiness.test.ts`
- Modify: `app/admin/analytics/analytics-client.tsx` or the current admin analytics surface.

- [ ] **Step 1: Write failing unit tests**

The snapshot should expose:

- 30-day paid orders.
- 30-day gross revenue.
- 30-day net revenue.
- AOV.
- partial-intake capture count.
- recovery email coverage.
- recovered paid count.
- recovered net revenue.
- Google Ads spend.
- Google Ads local orders.
- Google Ads local CAC.
- Google Ads local ROAS.
- status: `blocked`, `watch`, or `ready`.

Blocked if:

- local Ads CAC is above target.
- local Ads ROAS is below 1.
- recovery marker drift is detected.
- recovery conversion is unmeasurable.

- [ ] **Step 2: Implement aggregator**

Implementation requirements:

- Compose existing `getRecoveryScorecard()` and Google Ads profit report helpers where possible.
- Do not duplicate report math.
- Use reportable-intake filters.
- Do not select patient names, emails, phone numbers, answers, or PHI.

- [ ] **Step 3: Surface in admin**

Show:

- "Revenue below ad spend" when net-retained attributed revenue is below spend; do not call this profit until payment fees and incremental labour are included.
- "Recovery unmeasured" if marker drift exists.
- "Scale blocked" until recovery and CAC gates pass.
- last refreshed timestamp.

- [ ] **Step 4: Verify**

```bash
pnpm test run lib/__tests__/growth-readiness.test.ts lib/__tests__/recovery-scorecard.test.ts lib/__tests__/google-ads-return-summary.test.ts
pnpm typecheck
```

Expected: pass.

### Phase 3 Exit Verification

Run:

```bash
CHECK_INTEGRATIONS_STRICT=1 pnpm check:integrations
pnpm test run lib/__tests__/growth-readiness.test.ts lib/__tests__/recovery-scorecard.test.ts lib/__tests__/google-ads-return-summary.test.ts
pnpm typecheck
pnpm lint
```

Pass criteria:

- operator can answer "should I spend more tomorrow?" from one screen.
- answer is based on spend, local orders, net revenue, CAC, ROAS, recovery coverage, and recovered revenue.

---

## Phase 4: Google Ads Optimisation

**Objective:** turn Google Ads from spend leakage into small, controlled, local-purchase experiments.

### Task 1: Create Google Ads Operating Runbook

**Files:**

- Create: `docs/growth/google-ads-operating-runbook.md`
- Test: none, documentation with live verification steps.

- [ ] **Step 1: Document hard rules**

Include:

- no Ads scale until Phase 1-3 gates pass.
- paid traffic only to service-level pages:
  - `/medical-certificate`
  - `/prescriptions`
  - `/erectile-dysfunction`
  - `/hair-loss`
- no educational medicine pages as paid destinations.
- no drug names in ads, paid destinations, URLs, metadata, schema, or sitelinks.
- no Customer Match, remarketing, lookalike/similar audiences, or health-condition custom segments.
- no Search Partners unless local-order CAC proves profitable.
- no broad match until conversion truth is stable.

- [ ] **Step 2: Document campaign structure**

Start with:

- Campaign 1: Medical certificate exact/phrase only.
- Campaign 2: Scripts paused unless exact terms prove CAC below margin.
- Campaign 3: ED/hair tiny exact test only after launch gates.
- Campaign 4: Hair loss tiny exact test only after launch gates.

Kill criteria:

- any campaign with local CAC above first-order margin after enough clicks.
- any ad group with spend above one service AOV and zero local paid orders.
- any search term with off-scope, drug-name, template, fake, free, or informational intent.
- any campaign with Search Partners spend but no local paid orders.

- [ ] **Step 3: Weekly operating checklist**

Checklist:

- pull `/api/internal/google-ads-report?days=7` and `?days=30`.
- compare Ads conversions with Supabase local paid orders.
- review search terms.
- add negatives.
- check network and device.
- check refund-adjusted local ROAS.
- cap or pause losing campaigns.
- record decisions in `docs/growth/google-ads-weekly-log.md`.

### Task 2: Add Weekly Log Template

**Files:**

- Create: `docs/growth/google-ads-weekly-log.md`

- [ ] **Step 1: Add template sections**

Sections:

- Date.
- Spend.
- Clicks.
- Local paid orders.
- Local CAC.
- Local net revenue.
- Local ROAS.
- Campaigns paused.
- Campaigns capped.
- Negative keywords added.
- Search Partners decision.
- Conversion tracking anomalies.
- Next 7-day action.

### Phase 4 Exit Verification

Run:

```bash
CHECK_INTEGRATIONS_STRICT=1 pnpm check:integrations
pnpm test run lib/__tests__/google-ads-return-summary.test.ts lib/__tests__/google-ads-post-payment.test.ts lib/__tests__/integration-check-contract.test.ts
```

Manual verification:

- Google Ads report endpoint returns spend and local orders.
- active campaigns are either profitable or explicitly marked as capped tests.
- Scripts campaign is paused or capped unless its local CAC is under the chosen ceiling.

---

## Phase 5: Organic, LLM Traffic, SEO, And Backlinks

**Objective:** grow lower-CAC customer flow without violating health advertising rules.

### Task 1: Create Organic/LLM/SEO Runbook

**Files:**

- Create: `docs/growth/organic-llm-seo-backlink-plan.md`
- Use: `docs/SEO_CONTENT_POLICY.md`
- Use: `docs/ADVERTISING_COMPLIANCE.md`
- Use: `docs/audits/2026-06-04-au-backlink-plan.md`
- Use: `docs/audits/2026-06-03-gsc-seo-content-audit.md`

- [ ] **Step 1: Define target surfaces**

Priority pages:

- `/medical-certificate`
- `/prescriptions`
- `/pricing`
- `/how-it-works`
- `/erectile-dysfunction`
- `/hair-loss`
- strongest already-indexed support pages from GSC.

Rules:

- no drug-name promotional CTAs.
- no testimonials.
- no unsupported employer/university acceptance claims.
- no "no call needed" on prescribing/specialty pages.
- guide articles remain education-only.

- [ ] **Step 2: LLM traffic plan**

Actions:

- strengthen answer-style sections on money pages.
- add concise FAQs that answer real user questions without sales drift.
- make pricing, refund, eligibility, and doctor-review boundaries explicit.
- track `ai_referral` and `utm_source=chatgpt.com` style sources in Supabase/PostHog.
- do not create fake review snippets or invented social proof.

- [ ] **Step 3: SEO execution sequence**

Sequence:

1. Run `pnpm seo:gsc-index-audit`.
2. Identify pages with impressions but weak CTR.
3. Update titles/meta only where allowed by policy.
4. Add internal links from indexed pages to money pages.
5. Submit changed URLs with `pnpm seo:submit-indexing`.
6. Run `pnpm content:audit` for guide changes.

- [ ] **Step 4: Backlink sequence**

Use the AU backlink plan:

- standardise NAP.
- attempt Google Business Profile carefully.
- add Bing Places.
- add 10-15 AU citations.
- start SourceBottle/Qwoted/HARO/Featured company-attributed responses.
- outreach to HR/payroll/student/workplace evidence sites.
- no PBNs, paid guest-post networks, fake reviews, directory blasts, or medicine-promotion shortcuts.

### Phase 5 Exit Verification

Run:

```bash
pnpm seo:gsc-index-audit
pnpm test run lib/__tests__/seo-indexing-contract.test.ts lib/__tests__/indexnow.test.ts lib/__tests__/advertising-compliance-guard.test.ts
pnpm content:audit
```

Manual verification:

- money page indexation status is known.
- new backlinks are listed by referring domain, target URL, anchor text, relevance, and follow/nofollow.
- LLM/referral sources are visible in source breakdown.

---

## Phase 6: Scale Decision

**Objective:** decide whether to spend, hire, or keep compounding organically.

Run this only after phases 1-5 have at least 30 days of data.

Scale paid only if:

- recovery is measurable.
- recovery converts at least 5% of emailed partials or produces a documented reason why not.
- blended AOV is moving toward $35-$40.
- med-cert CAC is below the chosen ceiling.
- refund rate is below 8-10%.
- chargebacks are below 0.5%.
- support tickets stay below 5 per 100 orders.
- doctor queue P95 is below 2 hours during operating hours.
- Google Ads local ROAS is trending toward or above 1 before labour.

If these fail:

- keep Ads capped.
- keep SEO/backlink/LLM compounding.
- prioritise AOV lift and recovery.

If these pass:

- increase daily Ads budget by 10-20% max per week.
- keep exact/phrase query discipline.
- add one new campaign at a time.
- review local CAC and refund-adjusted ROAS every 7 days.

---

## Final Verification Bundle

Before marking the whole plan complete:

```bash
pnpm test run lib/__tests__/draft-conversion-link.test.ts lib/__tests__/partial-intake-recovery.test.ts lib/__tests__/recovery-scorecard.test.ts lib/__tests__/email-sequence-ownership-contract.test.ts lib/__tests__/email-templates.test.tsx lib/__tests__/advertising-compliance-guard.test.ts lib/__tests__/voice-guard.test.ts lib/__tests__/google-ads-return-summary.test.ts lib/__tests__/google-ads-post-payment.test.ts lib/__tests__/seo-indexing-contract.test.ts lib/__tests__/indexnow.test.ts
CHECK_INTEGRATIONS_STRICT=1 pnpm check:integrations
pnpm typecheck
pnpm lint
pnpm content:audit
```

Optional final gate after focused tests:

```bash
pnpm build
```

Production proof required:

- recovery scorecard shows fresh data.
- Google Ads report shows fresh spend/local-order data.
- email previews render recovery templates.
- no live card charge attempted during test.
- no PHI included in docs or logs.
