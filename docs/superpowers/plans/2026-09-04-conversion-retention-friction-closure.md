# Conversion, Retention, and Friction Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Status:** Proposed on 2026-09-04. No runtime task below is authorised until the operator confirms this plan. Confirmation also adopts the queue/capacity rule in Task 13; it does not authorise patient email, Google Search Console, Google Ads, merge, or production-deployment actions.

**Goal:** Close the ten audited conversion and retention actions with real payment proof, optional account access, useful operator measurement, reliable certificate delivery, compliant organic discovery, and narrower specialty-form friction without weakening clinical safeguards.

**Architecture:** Deliver the work as independent, reversible release slices rather than one mega-branch. First establish a hermetic hosted-Stripe proof and repair certificate resend. Then add aggregate measurement, wait for the fixed 7-day/14-day cohorts, and only then activate the account-handoff work that Fable correctly classified as new scope. SEO and specialty changes use their own evidence windows; production and customer-facing external mutations remain separate approval-gated actions.

**Tech Stack:** Next.js 15.5 App Router (Webpack), React 18.3, TypeScript 5.9, Supabase/PostgreSQL, Stripe Checkout v22 test mode, Stripe CLI, local Supabase Inbucket, PostHog personless analytics, Resend webhooks, Vitest, Playwright, Vercel, and the existing Google Ads Agent control plane.

**Spec:** [`docs/audits/2026-09-04-scaling-audit.md`](../../audits/2026-09-04-scaling-audit.md), corrected by the 2026-09-04 Fable review and reconciled with [`docs/ROADMAP.md`](../../ROADMAP.md) ranks 1, 4, 5, and 6.

## Global Constraints

- `docs/ROADMAP.md` remains the only active priority queue. This plan elaborates ranks 1, 4, 5, and 6 without silently reordering them.
- Use `corepack pnpm`. Do not change the pinned Next.js, React, Tailwind, Framer Motion, Node, pnpm, or Webpack choices.
- Guest checkout remains available. Creating an auth identity or profile remains optional after payment; prescribing identity fields remain mandatory where `docs/CLINICAL.md` requires them.
- Repeat-Rx strength, concrete amount plus frequency, indication, unchanged-regimen confirmation, side-effects answers, clinical hard blocks, and doctor review remain mandatory on client and server.
- Missing safety answers remain `REQUEST_MORE_INFO`; no payment or recovery path may bypass `validateSafetyFieldsPresent()` or `checkSafetyForServer()`.
- A stale Stripe Checkout Session must never mark an intake paid. Every paid transition remains bound to the current stored `intakes.payment_id`, a retryable state, and Stripe-confirmed amount.
- No production card, production patient data, production auth bypass, or live Stripe key may enter hosted-payment testing. Every created test row is synthetic, `exclude_from_reporting = true`, and torn down.
- PostHog receives only fixed-enum, personless, PHI-free events. Names, emails, phones, DOB, address, Medicare/IHI, medication data, clinical answers, free text, intake/profile IDs, Checkout Session IDs, and bearer tokens are prohibited.
- `/auth/complete-account`, `/track`, `/resume`, and authenticated patient paths stay excluded from browser conversion telemetry. Guest offer/skip/link measurement comes from aggregate database linkage, not new client events on sensitive paths.
- Guide bodies in `content/blog/*.mdx` stay education-only. They may link to other `/blog/*` reading, never directly to `/prescriptions`, `/request`, or another acquisition surface.
- No Ads mutation is autonomous. The code may emit `HOLD` or an approval-ready pause proposal, but changing a campaign, budget, bid, keyword, schedule, target, asset, or status requires a fresh exact approval.
- Search Console indexing requests, sitemap submission, patient email/resend, production data repair, feature-flag activation, PR merge, and production promotion each require fresh approval for the exact action.
- Follow RED -> GREEN -> REFACTOR. Each implementation task gets a focused commit and independently reviewable PR; do not combine certificate delivery, payment/auth, SEO, and specialty experiments in one release.

---

## Confirmed UX Brief

- **Users and state of mind:** mobile-first Australian patients who are unwell, routine-focused, or privacy-sensitive; and time-pressured staff resolving real payment or delivery failures.
- **Primary patient action:** complete a clinically adequate request and pay once, with no forced account; later gain secure access without retyping identity or exposing identifiers.
- **Direction:** restrained Morning Canvas, light by default, existing Source Sans 3 and solid-depth primitives, 16px minimum patient text, 48px mobile targets, no decorative portal motion. The interface should feel calm, authoritative, and crisp.
- **Layout:** preserve the existing single-column intake. Put one primary action per state; use short inline recovery copy instead of new modal flows or nested cards. Analytics remains a bounded staff surface with compact tables and explicit unavailable/degraded states.
- **States that must be designed:** guest/new email, guest/existing email, authenticated, payment processing, test-mode payment failure, webhook delay, magic-link sent/expired/replayed, tracker token invalid/closed, certificate resend queued/sent/failed, analytics unavailable/low coverage, and experiment hold/active/closed.
- **Anti-goals:** no forced registration, automatic profile enrichment, extra clinical questions, account enumeration, hidden safety relaxation, raw-error dashboards, service links inside guides, autonomous Ads changes, or promises that Google will index a page.
- **References during implementation:** `PRODUCT.md`, `DESIGN.md`, `components/request/README.md`, Impeccable product register, and the existing request/analytics/operator primitives. This is refinement of established surfaces, so visual-direction image probes are intentionally not used.

## Delivery Map

| Slice | Items closed | Release boundary | Outcome boundary |
|---|---:|---|---|
| A. Payment proof | 1 | Hermetic test-mode harness and a real hosted Checkout receipt | One successful skip path and one successful account-link path |
| B. Certificate reliability | 8 | Real render seam plus production-bundle resend test | Historical patient resends remain separately authorised |
| C. Measurement and retention | 2, 5, 6, 7 | Aggregate admin reads and repeatable receipt command | D+7/D+14 conversion and 21-day reminder cohorts |
| D. Optional account access | 3, 4 | Separate default-off or independently reversible auth PRs | Starts only after D+14 evidence is reviewed |
| E. Organic discovery | 9 | Truthful sitemap/internal-link release | Index request is our action; indexing is Google's outcome |
| F. Specialty conversion and growth holds | 10 | One service and one presentation variable per PR | At least 21 days plus settlement and safety/fulfilment review |

---

### Task 1: Make production-bundle test webhooks explicitly safe

**Files:**

- Create: `lib/stripe/test-webhook-policy.ts`
- Create: `lib/__tests__/stripe-test-webhook-policy.test.ts`
- Modify: `app/api/stripe/webhook/route.ts:92-98`
- Modify: `lib/config/env.ts`
- Modify: `.env.example`

**Interfaces:**

- Produces: `mayProcessStripeTestEvent(input: StripeTestEventPolicyInput): boolean`
- Consumed by: the Stripe webhook route and the hosted E2E preflight in Task 2

- [ ] **Step 1: Write the failing policy tests**

```ts
type StripeTestEventPolicyInput = {
  allowTestWebhooks: boolean
  eventLivemode: boolean
  isolatedSupabase: boolean
  stripeKeyMode: "live" | "test" | "unknown"
  vercelEnv?: string
}

expect(mayProcessStripeTestEvent({
  allowTestWebhooks: true,
  eventLivemode: false,
  isolatedSupabase: true,
  stripeKeyMode: "test",
})).toBe(true)

expect(mayProcessStripeTestEvent({
  allowTestWebhooks: true,
  eventLivemode: false,
  isolatedSupabase: true,
  stripeKeyMode: "test",
  vercelEnv: "production",
})).toBe(false)
```

Add separate negative cases for a live/unknown key, missing opt-in, shared Supabase, and a production Vercel target. A live event remains processable through the normal signature path.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
corepack pnpm exec vitest run lib/__tests__/stripe-test-webhook-policy.test.ts
```

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the fail-closed policy and route integration**

```ts
export function mayProcessStripeTestEvent(input: StripeTestEventPolicyInput): boolean {
  if (input.eventLivemode) return true
  return input.allowTestWebhooks
    && input.isolatedSupabase
    && input.stripeKeyMode === "test"
    && input.vercelEnv !== "production"
}
```

The route must continue returning an acknowledged discard for a rejected test event. `ALLOW_STRIPE_TEST_WEBHOOKS` is false unless exactly `true`; `E2E_ISOLATED_SUPABASE` is independently required. Never infer permission from `NODE_ENV` alone.

- [ ] **Step 4: Run focused payment safety tests**

```bash
corepack pnpm exec vitest run \
  lib/__tests__/stripe-test-webhook-policy.test.ts \
  lib/__tests__/stripe-webhook.test.ts \
  lib/__tests__/stripe-webhook-paid-state-guards.test.ts \
  lib/__tests__/stripe-payment-integrity.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the policy**

```bash
git add lib/stripe/test-webhook-policy.ts lib/__tests__/stripe-test-webhook-policy.test.ts app/api/stripe/webhook/route.ts lib/config/env.ts .env.example
git commit -m "test(payments): isolate hosted Stripe test webhooks"
```

### Task 2: Build and run the true hosted Stripe test-mode journey

**Files:**

- Create: `scripts/hosted-stripe-e2e-preflight.ts`
- Create: `scripts/run-hosted-stripe-e2e.ts`
- Create: `lib/__tests__/stripe-hosted-e2e-preflight.test.ts`
- Create: `e2e/helpers/hosted-stripe.ts`
- Create: `e2e/helpers/inbucket.ts`
- Create: `e2e/hosted-stripe-guest-journey.spec.ts`
- Create: `playwright.hosted-stripe.config.ts`
- Create: `.github/workflows/hosted-stripe-e2e.yml`
- Modify: `package.json`
- Modify: `docs/TESTING.md`
- Modify: `docs/OPERATIONS.md`

**Interfaces:**

- Produces: `assertHostedStripeE2EEnvironment(): Promise<HostedStripeE2EContext>`
- Produces: `assertStripeCliWebhookSecret(value: unknown): asserts value is string`
- Produces: `waitForActualStripePayment(intakeId: string): Promise<PaidIntakeEvidence>`
- Produces: `readLatestInbucketLink(recipient: string): Promise<string>`

- [ ] **Step 1: Write preflight tests before the script**

The static preflight must reject `sk_live_*`, `VERCEL_ENV=production`, `instantmed.com.au`, the production Supabase ref `witzcrovsoumktyndqgz`, non-test Stripe prices, or `E2E_ISOLATED_SUPABASE !== "1"`. It must retrieve every configured test price and assert `price.livemode === false` without printing secrets. A separate post-listener validator must reject a missing or malformed Stripe CLI `whsec_` value.

```bash
corepack pnpm exec vitest run lib/__tests__/stripe-hosted-e2e-preflight.test.ts
```

Expected: FAIL until the preflight module is implemented.

- [ ] **Step 2: Add the guarded command**

```json
{
  "scripts": {
    "e2e:stripe-hosted": "tsx scripts/run-hosted-stripe-e2e.ts"
  }
}
```

`playwright.hosted-stripe.config.ts` uses the fixed base URL `http://127.0.0.1:3060`, one Chromium worker, and no `webServer`; the runner owns the lifecycle. In order, `run-hosted-stripe-e2e.ts` starts isolated local Supabase, runs the static preflight, starts `stripe listen --forward-to http://127.0.0.1:3060/api/stripe/webhook`, captures its test `whsec_` value without printing it, validates that captured value, builds the app, starts `next start --port 3060` with the explicit test-webhook environment, waits for `/api/health`, invokes Playwright, and then removes run-scoped rows and stops every child plus isolated Supabase in `finally`. The workflow is `workflow_dispatch` only initially and invokes the same runner; adding the workflow file does not configure repository secrets or enable scheduled execution.

- [ ] **Step 3: Write two real browser cases**

```ts
test("guest may pay in hosted Checkout and skip account creation", async ({ page }) => {
  const evidence = await completeRealHostedGuestPayment(page, { service: "repeat-script" })
  expect(evidence.livemode).toBe(false)
  await expect(page).toHaveURL(/\/auth\/complete-account/)
  await page.getByRole("link", { name: /continue without an account/i }).click()
  await expect(page).toHaveURL(/\/request\/confirmed/)
})

test("guest may create access by real magic link after payment", async ({ page }) => {
  const evidence = await completeRealHostedGuestPayment(page, { service: "repeat-script" })
  await page.getByRole("button", { name: /secure link/i }).click()
  await page.goto(await readLatestInbucketLink(evidence.email))
  await expect(page).toHaveURL(/\/patient/)
  await expectOwnedIntakeVisible(evidence.intakeId)
})
```

Use only fabricated patient and medication fixtures. Fill every repeat-Rx safety answer; do not add a test-only bypass for clinical validation.

- [ ] **Step 4: Assert durable cross-system evidence**

The helper must verify one intake, `payment_id === checkoutSession.id`, exact `amount_cents`, `payment_status === "paid"`, retryable-to-paid state transition, one linked profile after the account branch, no profile link after the skip assertion, and zero surviving rows after teardown. Store a PHI-free receipt containing only test run ID, commit SHA, timestamps, Stripe event type/mode, boolean assertions, and counts.

- [ ] **Step 5: Run the journey and archive the receipt**

```bash
corepack pnpm e2e:stripe-hosted
```

Expected: two real `checkout.stripe.com` payments, two genuine signed webhook deliveries, both return branches green, and teardown green. Seeded payment specs remain supporting tests, not substitutes.

- [ ] **Step 6: Commit the harness separately**

```bash
git add scripts/hosted-stripe-e2e-preflight.ts scripts/run-hosted-stripe-e2e.ts lib/__tests__/stripe-hosted-e2e-preflight.test.ts e2e/helpers/hosted-stripe.ts e2e/helpers/inbucket.ts e2e/hosted-stripe-guest-journey.spec.ts playwright.hosted-stripe.config.ts .github/workflows/hosted-stripe-e2e.yml package.json docs/TESTING.md docs/OPERATIONS.md
git commit -m "test(payments): prove hosted guest checkout end to end"
```

### Task 3: Reproduce and fix certificate resend rendering at the real seam

**Files:**

- Create first: `playwright.production.config.ts`
- Create first: `scripts/run-production-e2e.ts`
- Create first: `e2e/certificate-resend-render.spec.ts`
- Create: `lib/email/certificate-resend-message.ts`
- Create: `lib/__tests__/certificate-resend-render.test.tsx`
- Modify: `app/actions/resend-certificate.ts`
- Modify: `lib/__tests__/certificate-delivery-actions.test.ts`
- Modify: `package.json`
- Modify: `docs/TESTING.md`

**Interfaces:**

- Produces: `buildCertificateResendMessage(input: CertificateResendMessageInput): ReactElement`
- Consumed by: patient and staff branches of `resendCertificate.ts`

- [ ] **Step 1: Reproduce the current failure through the built action before adding a builder**

Seed one synthetic paid/approved med-cert intake and current valid certificate in isolated Supabase. Use local staff auth bypass only with `PLAYWRIGHT=1`; suppress provider delivery through the existing E2E outbox seam. From `/admin/ops`, invoke **Resend link** and assert the existing action reaches email rendering. Map `e2e:production` to `tsx scripts/run-production-e2e.ts` in `package.json`. The runner starts isolated local Supabase, builds the app, invokes the requested spec, and guarantees run-scoped cleanup plus Supabase shutdown in `finally`; `playwright.production.config.ts` starts `next start --port 3060`, never `next dev`.

```bash
corepack pnpm e2e:production -- --spec=e2e/certificate-resend-render.spec.ts
```

Expected on current main: RED with the observed `React is not defined` server/action failure, or the exact lower render exception that explains it. Save the PHI-free server exception and failing assertion before changing production code. A module-not-found error from a not-yet-created helper is not accepted as this reproduction.

- [ ] **Step 2: Add the focused unmocked render contract**

```tsx
const element = buildCertificateResendMessage({
  appUrl: "https://instantmed.example",
  certificateType: "work",
  dashboardUrl: "https://instantmed.example/track/signed-token",
  isGuest: true,
  patientName: "Test Patient",
  verificationCode: "TEST-CODE",
})
const html = await renderEmailToHtml(element)
expect(html).toContain("Set up access &amp; view certificate")
expect(html).toContain("TEST-CODE")
expect(html).not.toMatch(/supabase|storage\/v1|signedUrl/i)
```

Do not mock `MedCertPatientEmail`, React, or `renderEmailToHtml`. Cover both guest and account-holder variants.

- [ ] **Step 3: Run the focused test and verify RED**

```bash
corepack pnpm exec vitest run lib/__tests__/certificate-resend-render.test.tsx
```

Expected: FAIL because the builder module is not implemented. This unit RED specifies the repair; Step 1 owns reproduction of the original fault.

- [ ] **Step 4: Centralise element creation**

```ts
export function buildCertificateResendMessage(
  input: CertificateResendMessageInput,
): ReactElement {
  return React.createElement(MedCertPatientEmail, {
    appUrl: input.appUrl,
    certType: input.certificateType,
    dashboardUrl: input.dashboardUrl,
    isGuest: input.isGuest,
    patientName: input.patientName,
    verificationCode: input.verificationCode,
  })
}
```

Both resend branches call this builder. Do not alter resend caps, reservation/finalisation, storage-version binding, ownership, or audit behavior.

- [ ] **Step 5: Run transactional, render, and production-server suites**

```bash
corepack pnpm exec vitest run \
  lib/__tests__/certificate-resend-render.test.tsx \
  lib/__tests__/certificate-delivery-actions.test.ts \
  lib/__tests__/certificate-resend-transaction-contract.test.ts \
  lib/__tests__/certificate-resend-dispatcher-finalization.test.ts
corepack pnpm typecheck
corepack pnpm build
corepack pnpm e2e:production -- --spec=e2e/certificate-resend-render.spec.ts
```

Expected: PASS. The browser case asserts a durable outbox row, one resend reservation/finalisation, current storage-version metadata, no raw storage URL, no server render exception, and removal of all synthetic rows.

- [ ] **Step 6: Commit without resending a patient email**

```bash
git add playwright.production.config.ts scripts/run-production-e2e.ts e2e/certificate-resend-render.spec.ts lib/email/certificate-resend-message.ts lib/__tests__/certificate-resend-render.test.tsx app/actions/resend-certificate.ts lib/__tests__/certificate-delivery-actions.test.ts package.json docs/TESTING.md
git commit -m "fix(certificates): render resend email through server-safe seam"
```

### Task 4: Release-gate certificate repair before any historical resend

**Files:**

- Modify after an approved release: `docs/ROADMAP.md`

- [ ] Run the full release gate; Task 3's production-server E2E is a required part of the receipt.

```bash
corepack pnpm release:check
corepack pnpm e2e:production -- --spec=e2e/certificate-resend-render.spec.ts
```

Expected: PASS before requesting merge or deployment approval. After an approved deployment, verify the production alias serves the exact merge SHA and `/api/health` is healthy, then update only the matching roadmap evidence.

**Production recovery gate:** after this release is live, present the exact two current-valid certificate targets in `/admin/ops` without copying patient details into the plan or a tool log. A fresh operator instruction must authorise each resend. Send one at a time, verify provider acceptance and webhook delivery separately, and never fake historical delivery timestamps or bulk-resend.

### Task 5: Add one release-conversion read model without sensitive-path events

**Files:**

- Create: `lib/admin/guest-account-linkage.ts`
- Create: `lib/analytics/posthog-release-conversion.ts`
- Create: `lib/__tests__/guest-account-linkage.test.ts`
- Create: `lib/__tests__/posthog-release-conversion.test.ts`
- Create: `scripts/release-friction-readout.ts`
- Modify: `app/admin/analytics/page.tsx`
- Modify: `app/admin/analytics/analytics-helpers.ts`
- Modify: `app/admin/analytics/analytics-client.tsx`
- Modify: `lib/__tests__/secure-request-tracker-contract.test.ts`
- Reuse without modification: `lib/data/customer-growth-revenue-read.ts`

**Interfaces:**

```ts
export interface ReleaseConversionSnapshot {
  availability: "available" | "degraded" | "unavailable"
  from: string
  to: string
  flowIdCoveragePercent: number | null
  repeatRx: {
    medicationViewed: number
    medicationCompleted: number
    mobileCompletionPercent: number | null
    serviceSteerFlows: number
    clinicalHardBlockFlows: number
    validationBlockedFlows: number
  }
  checkout: { initiated: number; paid: number }
  cash: {
    availability: "available" | "degraded" | "unavailable"
    paidOrders: number | null
    refundedOrders: number | null
    refundedCents: number | null
    refundsPer100Paid: number | null
    asOf: string
  }
}

export interface GuestAccountLinkageSnapshot {
  eligiblePaidGuests: number
  linkedWithin24h: number
  linkedWithin7d: number
  linkedWithin14d: number
  unlinkedAtCutoff: number
}
```

- [ ] **Step 1: Write fixtures for fixed cohort boundaries**

Assert that guest eligibility comes from reportable paid intakes with the durable guest marker, linkage comes from the matched profile's `auth_user_id` plus `email_verified_at`, and `unlinkedAtCutoff` is derived rather than captured as a client event. Compose the cash section from `readCustomerGrowthRevenueEvidence()` and `buildCustomerGrowthRevenueForIntakeIds()` so refund/dispute ledger completeness owns availability; reduce rows to aggregates in memory and return no intake IDs. Exclude E2E rows and never select email or clinical columns into the returned object.

- [ ] **Step 2: Add the PostHog query builder**

Count unique valid `flow_instance_id` for `step_viewed`, `step_completed`, controlled validation categories, checkout initiation, and server purchase. Return explicit coverage and a degraded state below 90%; never synthesize a funnel key from `distinct_id`, session ID, request ID, or event UUID.

- [ ] **Step 3: Keep sensitive-path analytics exclusions pinned**

```ts
expect(sourceOf("app/auth/complete-account/complete-account-form.tsx"))
  .not.toContain("posthog.capture")
expect(sourceOf("app/track/request/page.tsx"))
  .not.toContain("posthog.capture")
```

- [ ] **Step 4: Render a compact cohort table in Business analytics**

Show baseline, D+7, and D+14; counts and denominators must be visible. `degraded` and `unavailable` are honest UI states, not zeros. No patient drill-down belongs on this page.

- [ ] **Step 5: Add a repeatable CLI receipt**

```bash
corepack pnpm tsx scripts/release-friction-readout.ts \
  --release-sha=99e25c8f9329bd66da009d68127199405b37cd07 \
  --window=7d
```

The optional `--support-contacts=<non-negative integer>` accepts only a manually verified aggregate count and does not persist message bodies or reasons. If absent, support rate is `unavailable`, never zero.

- [ ] **Step 6: Run and commit**

```bash
corepack pnpm exec vitest run \
  lib/__tests__/guest-account-linkage.test.ts \
  lib/__tests__/posthog-release-conversion.test.ts \
  lib/__tests__/secure-request-tracker-contract.test.ts \
  lib/__tests__/business-dashboard-contract.test.ts
corepack pnpm typecheck
```

```bash
git add lib/admin/guest-account-linkage.ts lib/analytics/posthog-release-conversion.ts lib/__tests__/guest-account-linkage.test.ts lib/__tests__/posthog-release-conversion.test.ts scripts/release-friction-readout.ts app/admin/analytics/page.tsx app/admin/analytics/analytics-helpers.ts app/admin/analytics/analytics-client.tsx lib/__tests__/secure-request-tracker-contract.test.ts
git commit -m "feat(analytics): measure release conversion and guest linkage"
```

### Task 6: Add checkout-failure category and recovery views

**Files:**

- Create: `lib/analytics/posthog-checkout-recovery.ts`
- Create: `lib/__tests__/posthog-checkout-recovery.test.ts`
- Modify: `lib/analytics/posthog-privacy.ts`
- Modify: `components/request/steps/review-step.tsx`
- Modify: `app/admin/analytics/page.tsx`
- Modify: `app/admin/analytics/analytics-helpers.ts`
- Modify: `app/admin/analytics/analytics-client.tsx`
- Modify: `lib/__tests__/posthog-personless-analytics.test.ts`

**Interfaces:**

```ts
import type { CheckoutFailureCategory } from "@/lib/analytics/posthog-privacy"

export interface CheckoutRecoveryRow {
  category: CheckoutFailureCategory
  failedFlows: number
  paidWithin24h: number
  paidWithin7d: number
  recovery24hPercent: number | null
  recovery7dPercent: number | null
}
```

- [ ] Extend the existing exported `CheckoutFailureCategory` with only `auth_handoff`. Preserve the names and classification semantics of `availability_or_capacity`, `identity_or_session`, `payment_provider`, `persistence`, `pricing_or_configuration`, `rate_limit`, `validation`, and `unknown` so historical/category totals remain comparable. Never send the account email, raw error, or an account-exists boolean; all otherwise-unmatched strings still map to `unknown`.
- [ ] Join each flow's first `checkout_failed` event to a strictly later `purchase_completed_server` using the same valid `flow_instance_id`. Label async/in-flight outcomes separately; do not count an earlier or same-time purchase as recovery.
- [ ] Add 7-day and 30-day views with category totals, 24-hour/7-day recovery, and flow-ID coverage. `/admin/ops` remains the live case-recovery surface; Business stays aggregate.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/posthog-checkout-recovery.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts \
  lib/__tests__/business-dashboard-contract.test.ts
```

Expected: PASS; category sum equals unique failed flows and coverage below 90% is visibly degraded.

- [ ] Commit:

```bash
git add lib/analytics/posthog-checkout-recovery.ts lib/__tests__/posthog-checkout-recovery.test.ts lib/analytics/posthog-privacy.ts components/request/steps/review-step.tsx app/admin/analytics/page.tsx app/admin/analytics/analytics-helpers.ts app/admin/analytics/analytics-client.tsx lib/__tests__/posthog-personless-analytics.test.ts
git commit -m "feat(analytics): surface checkout failure recovery"
```

### Task 7: Make the refill-reminder funnel measurable

**Files:**

- Create: `lib/admin/refill-reminder-funnel.ts`
- Create: `lib/__tests__/refill-reminder-funnel.test.ts`
- Modify: `app/admin/analytics/page.tsx`
- Modify: `app/admin/analytics/analytics-helpers.ts`
- Modify: `app/admin/analytics/analytics-client.tsx`
- Modify: `lib/__tests__/refill-reminder.test.ts`
- Modify: `docs/OPERATIONS.md`

**Interfaces:**

```ts
export interface RefillReminderFunnelSnapshot {
  availability: "available" | "degraded" | "unavailable"
  from: string
  to: string
  sent: number | null
  delivered: number | null
  clicked: number | null
  attributedPaidRenewalsWithin21d: number | null
  eligibleSentCohort: number | null
  conversionWithin21dPercent: number | null
}
```

- [ ] Count real `email_outbox` refill sends, Resend lifecycle outcomes, and `email_clicked` personless events by fixed `email_type`. Exclude `test=true`, null-patient preflights, and E2E rows.
- [ ] Attribute a renewal only when a reportable paid repeat-script intake carries `utm_source=refill_reminder` within 21 days of a real send. Show gross paid orders; show retained revenue only when exact refund/dispute cash evidence can be joined without inference, otherwise mark it unavailable.
- [ ] Render waves by send week with incomplete cohorts labelled **maturing**. Never divide by a cohort before its 21-day window closes.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/refill-reminder-funnel.test.ts \
  lib/__tests__/refill-reminder.test.ts \
  lib/__tests__/attribution-source-classification.test.ts \
  lib/__tests__/business-dashboard-contract.test.ts
```

Expected: PASS.

- [ ] Commit:

```bash
git add lib/admin/refill-reminder-funnel.ts lib/__tests__/refill-reminder-funnel.test.ts app/admin/analytics/page.tsx app/admin/analytics/analytics-helpers.ts app/admin/analytics/analytics-client.tsx lib/__tests__/refill-reminder.test.ts docs/OPERATIONS.md
git commit -m "feat(retention): measure refill reminder cohorts"
```

**Second-nudge gate:** do not build or enable day 84 yet. After two to three fully matured cohorts each achieve at least 10% attributed paid renewal within 21 days, with no worsening complaints, unsubscribes, refunds, or support contacts, write a separate experiment using a new durable second-send marker. Do not reuse `refill_reminder_sent_at`, and keep the transaction one-off rather than a subscription.

### Task 8: Close the D+7 and D+14 observation gate

**Files:**

- Create after each window: `docs/superpowers/receipts/2026-09-11-friction-readout.json`
- Create after the final window: `docs/superpowers/receipts/2026-09-18-friction-readout.json`
- Modify after D+14: `docs/ROADMAP.md`

- [ ] Resolve the exact `99e25c8f9` Vercel-ready UTC time and bind both matched windows to it. Use complete 24-hour periods; exclude all E2E rows.
- [ ] At D+7, report direction only. At D+14, make the accept/iterate decision using the fixed pre-ship repeat-Rx baseline: 104/200 mobile medication-step completions (52.0%).
- [ ] Accept the medication change only at at least 60 post-ship mobile views, at least 55% completion, no reduction in genuine service-steer plus clinical-hard-block share, no worse unresolved validation failures, and no worse repeat-Rx decline/refund rate.
- [ ] Report checkout initiated/start, paid/start, guest linked within 24h/7d/14d, derived unlinked share, refunds per 100 paid orders, and manually verified aggregate support contacts per 100 paid orders. Refunds must come from Task 5's canonical cash-ledger composition and render unavailable when ledger completeness fails; never infer them from status alone. The existing 84% 30-day guest-link rate is context, not a fixed target.
- [ ] Run the receipt privacy assertion before committing. Receipt JSON may contain aggregate counts, percentages, timestamp boundaries, and SHA only.

```bash
corepack pnpm tsx scripts/release-friction-readout.ts --release-sha=99e25c8f9329bd66da009d68127199405b37cd07 --window=14d --output=docs/superpowers/receipts/2026-09-18-friction-readout.json
corepack pnpm doc:audit
```

Expected: a privacy-safe D+14 decision receipt. Item 2 and the outcome half of item 5 are not closed before this task.

### Task 9: Add the earlier account handoff only after D+14

**Activation gate:** start this task only if the D+14 receipt shows `auth_handoff` collisions causing at least two unrecovered checkout-intent flows, recovery below 70% within 24 hours, or a repeated support-contact class. If the gate is not met, retain the current guest flow and record **not justified** rather than manufacturing scope.

**Files:**

- Create: `components/request/guest-account-handoff.tsx`
- Create: `lib/auth/checkout-account-handoff.ts`
- Create: `lib/__tests__/checkout-account-handoff.test.ts`
- Modify: `components/request/steps/review-step.tsx`
- Modify: `app/actions/unified-checkout.ts`
- Modify: `lib/stripe/guest-checkout.ts`
- Modify: `lib/navigation/auth-handoff.ts`
- Modify: `lib/__tests__/auth-handoff.test.ts`
- Modify: `e2e/guest-checkout.spec.ts`

**Interfaces:**

```ts
export type GuestCheckoutResult =
  | { success: true; checkoutUrl: string }
  | { success: false; code: "AUTH_HANDOFF" | "CHECKOUT_FAILED"; error: string }

export interface GuestAccountHandoffProps {
  email: string
  returnTo: string
}
```

- [ ] Replace string matching for `"account already exists"` with the typed `AUTH_HANDOFF` result. Public copy must be generic: **Continue securely with this email, or edit it to continue as a guest.** Never state whether an account exists.
- [ ] Show the same optional **Already used InstantMed? Sign in and keep this request** link to every signed-out patient on Review before Pay. It uses the existing `shouldCreateUser: false` sign-in route, stores the email only in same-browser `sessionStorage`, and preserves `/request` plus the current allowed query string.
- [ ] Do not add an automatic account lookup on blur/mount, force email verification for new guests, create a Stripe Session, or mutate payment state during handoff.
- [ ] Test existing/non-existing emails for identical public copy, an unmodified Continue-as-guest path for new patients, exact same-browser draft restoration, blocked storage, expired relay, and no raw email/event in PostHog.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/checkout-account-handoff.test.ts \
  lib/__tests__/auth-handoff.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts
corepack pnpm e2e -- e2e/guest-checkout.spec.ts
```

Expected: PASS with no added required tap for a new guest.

- [ ] Commit and keep rollout independently reversible:

```bash
git add components/request/guest-account-handoff.tsx lib/auth/checkout-account-handoff.ts lib/__tests__/checkout-account-handoff.test.ts components/request/steps/review-step.tsx app/actions/unified-checkout.ts lib/stripe/guest-checkout.ts lib/navigation/auth-handoff.ts lib/__tests__/auth-handoff.test.ts e2e/guest-checkout.spec.ts
git commit -m "feat(checkout): offer non-enumerating account handoff"
```

### Task 10: Add one-tap tracker access after the observation gate

**Activation gate:** start after D+14 and after Task 2 proves real magic-link/profile linking. This task is optional UI for a patient who already holds a valid tracker capability; it must not expand that capability into document access.

**Files:**

- Create: `lib/auth/request-access-magic-link.ts`
- Create: `app/api/auth/request-access-link/route.ts`
- Create: `components/track/request-access-sign-in.tsx`
- Create: `lib/__tests__/request-access-magic-link.test.ts`
- Create: `e2e/guest-request-access.spec.ts`
- Modify: `app/track/request/page.tsx`
- Modify: `lib/__tests__/patient-request-access-route.test.ts`
- Modify: `lib/__tests__/secure-request-tracker-contract.test.ts`

**Interfaces:**

```ts
export type RequestAccessLinkResult = { accepted: true }

export async function requestAccessMagicLink(input: {
  capabilityCookie: string | undefined
  ipKey: string
}): Promise<RequestAccessLinkResult>
```

- [ ] The browser sends an empty POST body with the standard CSRF header. Server code verifies the HttpOnly tracker cookie, resolves the matching email server-side, applies capability-hash plus IP rate limits, and sends a Supabase magic link to the fixed `/auth/post-signin?redirect=%2Ftrack%2Frequest` destination.
- [ ] The button copy is **Email me a secure access link**. Clicking it is the explicit choice to create or connect lightweight account access; no additional profile questions are added.
- [ ] Valid, invalid, expired, closed, merged, replayed, and rate-limited cases all return the same `{ accepted: true }` body. The tracker capability, email, intake/profile IDs, and existence state never enter a URL, response, analytics, referrer, or log context. Supabase's single-use verification token/code may appear only in its provider-generated verification URL; the callback must exchange it immediately and redirect to the fixed clean destination without persisting or logging it.
- [ ] Authentication and ownership remain required for documents and replies. The tracker token alone continues to expose only the bounded status projection.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/request-access-magic-link.test.ts \
  lib/__tests__/patient-request-access-route.test.ts \
  lib/__tests__/secure-request-tracker-contract.test.ts
corepack pnpm e2e -- e2e/guest-request-access.spec.ts
```

Expected: valid one-button link flow succeeds; tampered/wrong-owner cases expose nothing and gain no document/reply access.

- [ ] Commit:

```bash
git add lib/auth/request-access-magic-link.ts app/api/auth/request-access-link/route.ts components/track/request-access-sign-in.tsx lib/__tests__/request-access-magic-link.test.ts e2e/guest-request-access.spec.ts app/track/request/page.tsx lib/__tests__/patient-request-access-route.test.ts lib/__tests__/secure-request-tracker-contract.test.ts
git commit -m "feat(auth): add token-scoped request access link"
```

### Task 11: Make `/prescriptions` crawl truth current and request indexing once

**Files:**

- Modify: `lib/seo/sitemap-lastmod.ts`
- Modify: `docs/SEO_CONTENT_POLICY.md`
- Modify: `lib/__tests__/seo-indexing-contract.test.ts`
- Create: `lib/__tests__/guide-acquisition-link-contract.test.ts`
- Verify without a planned edit: `components/marketing/online-prescriptions-landing.tsx`
- Verify without a planned edit: `app/conditions/[slug]/page.tsx`
- Verify without a planned edit: `app/symptoms/[slug]/page.tsx`

- [ ] Add a failing contract that requires `/prescriptions` sitemap `lastmod` to match its latest material deployed change and forbids `/prescriptions` or `/request` destinations inside `content/blog/*.mdx` and `components/blog/article-template.tsx`.
- [ ] Update the stale `2026-07-09` lastmod to the actual material-change date already evidenced by PRs #493/#496 and the 2026-09-04 deployment. Do not bump dates merely to manufacture freshness.
- [ ] Pin the already-present, neutral crawlable `/prescriptions` links from `/online-prescriptions`, condition pages, and symptom pages in the contract test. Do not add duplicate links merely to increase link count. If a later read-only GSC inspection identifies a different non-guide surface as material, propose that exact one-file change separately.
- [ ] Clarify the policy wording: medicine/condition/symptom and non-guide educational surfaces may link neutrally to an active generic service; `/blog/*` guide bodies remain related-reading-only.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/seo-indexing-contract.test.ts \
  lib/__tests__/guide-acquisition-link-contract.test.ts \
  lib/__tests__/commercial-seo-contract.test.ts \
  lib/__tests__/advertising-compliance-guard.test.ts \
  lib/__tests__/marketing-copy-contract.test.ts
corepack pnpm content:audit:strict
corepack pnpm doc:audit
```

Expected: PASS; live candidate is 200, `index,follow`, self-canonical, present once in the sitemap with truthful `lastmod`, and policy-compliant.

- [ ] Commit the candidate:

```bash
git add lib/seo/sitemap-lastmod.ts docs/SEO_CONTENT_POLICY.md lib/__tests__/seo-indexing-contract.test.ts lib/__tests__/guide-acquisition-link-contract.test.ts
git commit -m "fix(seo): strengthen prescriptions crawl signals"
```

**External action gate:** after production verification, present the exact GSC actions for `/prescriptions`, `/online-prescriptions`, and the existing sitemap. With fresh approval, run live URL inspection, submit at most one indexing request per URL, and optionally resubmit the existing sitemap once. Record request submission and inspect at D+7/D+14/D+28. Google indexing is an observed outcome, not a promised release gate.

### Task 12: Simplify the women’s-health choice step without changing clinical scope

**Files:**

- Modify: `components/request/steps/womens-health-type-step.tsx`
- Modify: `lib/growth/specialty-experiences.ts`
- Modify: `lib/__tests__/specialty-experience-registry.test.ts`
- Modify: `lib/__tests__/specialty-experience-invariants.test.ts`
- Modify: `lib/__tests__/womens-health-unified-validation.test.ts`
- Modify: `e2e/prescription-flow.spec.ts`

- [ ] Add the inactive `spx_w1_20260904` `intake_presentation` definition for `womens_health`, then extend registry normalisation and persistence without placing the version in clinical answers. The component reads the active intake-presentation version; with W1 inactive, the current three-card layout remains the default.
- [ ] In the W1 branch only, keep two primary choice cards: **UTI symptoms** and **Start or switch pill**. Move **Continue my current pill** out of the equal-weight group into one visually secondary direct handoff to `/request?service=repeat-script`, preserving allowlisted attribution and recording the existing PHI-free service-steer outcome.
- [ ] Use canonical pricing for the repeat lane if price is shown. Do not add a new question, medication name, diagnosis promise, call promise, or shortcut around downstream UTI/contraception safety screens.
- [ ] Test back/reload, attribution preservation, direct repeat handoff, keyboard/focus order, 375px layout, and all current client/server red-flag paths.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-experience-registry.test.ts \
  lib/__tests__/specialty-experience-invariants.test.ts \
  lib/__tests__/womens-health-unified-validation.test.ts \
  lib/__tests__/womens-health-safety.test.ts \
  lib/__tests__/womens-health-uti-checkout.test.ts \
  lib/__tests__/request-terminal-safety-blocks.test.ts \
  lib/__tests__/intake-analytics-events.test.ts
corepack pnpm e2e -- e2e/prescription-flow.spec.ts
```

Expected: PASS with the current default unchanged, the W1 fixture showing the simplified choice presentation, and identical clinical questions and checkout blocks after either presentation.

- [ ] Commit the inactive candidate only:

```bash
git add components/request/steps/womens-health-type-step.tsx lib/growth/specialty-experiences.ts lib/__tests__/specialty-experience-registry.test.ts lib/__tests__/specialty-experience-invariants.test.ts lib/__tests__/womens-health-unified-validation.test.ts e2e/prescription-flow.spec.ts
git commit -m "feat(intake): simplify womens health service choice"
```

**Activation boundary:** W1 activation is not part of this plan or commit. After the inactive candidate has production-browser proof, write a short follow-up activation plan that names the exact `lib/growth/specialty-experiences.ts` lifecycle edit, production-ready cohort boundary, the focused suites above, `corepack pnpm release:check`, the approval required to activate, and the one-commit rollback to baseline. Do not activate W1 implicitly while deploying unrelated work.

### Task 13: Close ED E1 before activating ED E2, and codify growth holds

**Files:**

- Modify: `lib/ads-agent/types.ts`
- Modify: `lib/ads-agent/snapshot.ts`
- Modify: `lib/ads-agent/policy.ts`
- Modify: `lib/ads-agent/brief.ts`
- Modify: `docs/REVENUE_MODEL.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/OPERATIONS.md`
- Modify: `lib/__tests__/google-ads-agent-policy.test.ts`
- Modify: `lib/__tests__/google-ads-agent-policy-contract.test.ts`
- Modify: `lib/__tests__/google-ads-agent-snapshot.test.ts`
- Modify: `lib/__tests__/google-ads-agent-brief.test.ts`
- Modify: `lib/__tests__/specialty-experience-registry.test.ts`
- Modify: `lib/__tests__/specialty-experience-invariants.test.ts`
- Modify: `lib/__tests__/ed-intake-validation.test.ts`
- Modify: `lib/__tests__/request-terminal-safety-blocks.test.ts`
- Defer without editing: `components/request/steps/patient-details-step.tsx`
- Defer without editing: `lib/growth/specialty-experiences.ts`

**Operator rule adopted by confirming this plan:**

1. No new campaign, budget/bid scale step, or next product experiment may start while the affected service's trailing-7-day queue P95 exceeds two hours, clinical QA is behind, fulfilment is unhealthy, or support contacts exceed 5 per 100 paid orders.
2. An already-approved bounded learning test may continue in **watch** while there is no clinical incident, no fulfilment failure, and no work approaching the 24-hour maximum.
3. Any clinical incident, fulfilment failure, or case approaching/breaching 24 hours produces a `HOLD` and an approval-ready pause proposal. The system never applies the pause autonomously.

**Interfaces:**

```ts
export interface AdsOperationalHold {
  affectedService: string
  reasons: Array<
    | "clinical_incident"
    | "clinical_qa_lag"
    | "fulfilment_unhealthy"
    | "queue_p95_over_2h"
    | "queue_approaching_24h"
    | "support_over_5_per_100"
  >
  state: "clear" | "hold" | "unavailable" | "watch"
}
```

- [ ] Write policy tests proving `hold` blocks scale packets, `watch` does not authorise another variable, unavailable inputs fail closed for scale, and no state invokes an Ads mutation.
- [ ] Feed only aggregate service-level metrics into the Ads snapshot. Do not include patient/staff IDs, clinical reasons, queue rows, or support text.
- [ ] Update the three canonical docs in the same commit so the two-hour target and the 2026-08-18 owner decision no longer appear contradictory.
- [ ] Close the active ED E1 cohort under its existing minimum 21 days plus 24-hour settlement and retained-order/clinical guardrails. Do not change ED intake before that receipt.
- [ ] Close E1 with a PHI-free receipt. If it has no stop condition, write a separate ED E2 activation plan and PR; do not edit patient details or the registry under this operational-hold slice. That follow-up may hide only the optional height/weight/BMI presentation for `consultSubtype === "ed"` and must name the exact lifecycle timestamp, focused tests, `corepack pnpm release:check`, production-browser proof, approval, and one-commit rollback. It must preserve DOB, sex, phone, structured Australian address, Medicare/IHI, every ED symptom/medicine/cardiovascular answer, and all server enforcement.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/google-ads-agent-policy.test.ts \
  lib/__tests__/google-ads-agent-policy-contract.test.ts \
  lib/__tests__/google-ads-agent-snapshot.test.ts \
  lib/__tests__/google-ads-agent-brief.test.ts \
  lib/__tests__/specialty-experience-registry.test.ts \
  lib/__tests__/specialty-experience-invariants.test.ts \
  lib/__tests__/ed-intake-validation.test.ts \
  lib/__tests__/request-terminal-safety-blocks.test.ts
corepack pnpm doc:audit
```

Expected: PASS. This slice emits operational hold evidence, makes no ED presentation change, and performs no Ads mutation.

- [ ] Commit the operational hold before the later ED candidate:

```bash
git add lib/ads-agent/types.ts lib/ads-agent/snapshot.ts lib/ads-agent/policy.ts lib/ads-agent/brief.ts docs/REVENUE_MODEL.md docs/ROADMAP.md docs/OPERATIONS.md lib/__tests__/google-ads-agent-policy.test.ts lib/__tests__/google-ads-agent-policy-contract.test.ts lib/__tests__/google-ads-agent-snapshot.test.ts lib/__tests__/google-ads-agent-brief.test.ts
git commit -m "feat(growth): block scale on operational holds"
```

### Task 14: Verify, release, observe, and close the program

**Files:**

- Modify as each slice ships: `docs/ROADMAP.md`
- Create per release: PHI-free JSON under `docs/superpowers/receipts/`
- Archive after all applicable outcome gates close: move this plan under the repo's archived-plan convention and update bookkeeping

- [ ] For every PR, run its focused suites, `corepack pnpm lint`, `corepack pnpm typecheck`, `git diff --check`, and the relevant Playwright path.
- [ ] Before each production candidate, run the full gate:

```bash
corepack pnpm release:check
```

Expected: stack pins, route conflicts, cron checks, integrations, audit, dead-code gate, lint, typecheck, unit suite, production build, and bundle gate all PASS.

- [ ] Browser-verify patient surfaces at 375px and desktop in light and dark modes: guest skip, optional link, existing-account recovery, tracker request access, women’s-health repeat steer, ED safe path, and representative red-flag blocks. Verify keyboard/focus and zero console errors. No decorative motion is added, so reduced-motion behavior should remain unchanged and must be smoke-checked once.
- [ ] Browser-verify staff surfaces: checkout-recovery analytics, refill cohorts, degraded/unavailable data, certificate resend queued/success/failure, and bounded page scrolling.
- [ ] Keep proof scopes separate in every receipt: repository tests, production build, hosted Stripe test mode, Vercel deployment, production browser, PostHog aggregate, Supabase aggregate, Resend delivery, GSC, and Ads account.
- [ ] Merge and deploy only the exact approved PR. Verify the production alias serves the exact merge SHA and `/api/health` is healthy before opening its observation window.
- [ ] Close code work and outcome work independently. A merged dashboard is not a recovered order; an indexing request is not an indexed page; a sent email is not delivery; a test-mode payment is not a live payment; a D+7 direction is not the D+14 decision.

## Calendar and Decision Checkpoints

| When | Required result |
|---|---|
| Immediate engineering | Tasks 1-7, 11, the inactive W1 candidate in Task 12, and the operational-hold slice in Task 13 can be built as separate PRs; Tasks 3-4 precede any historical certificate resend |
| D+7 from `99e25c8f9` readiness | Directional release-friction receipt; no account-flow expansion decision |
| D+14 | Final medication/checkout/guest-link read; decide Tasks 9-10 from evidence |
| 21 days after each reminder wave | Mature reminder conversion; require two to three good cohorts before a day-84 experiment |
| D+7/D+14/D+28 after SEO release | GSC inspection and indexing outcome, without repeated requests |
| At least 21 days plus settlement per specialty arm | Close W1 and ED E1/E2 independently before another same-service variable |

## Self-Review Receipt

- **Spec coverage:** all ten requested actions map to Tasks 2, 5-13; certificate recovery, experiment activation, and external indexing/Ads actions retain explicit approval gates.
- **Fable corrections retained:** items 3 and 4 wait for two measured weeks; guest linkage is database-derived; direct service links remain out of guide bodies; hosted Stripe proof is real rather than seeded; certificate render is tested without template mocks.
- **Clinical boundary:** no repeat-Rx, ED, UTI, contraception, identity, red-flag, doctor-review, or checkout safety field is removed.
- **Placeholder scan:** runtime evidence values are collected by named commands and fixed interfaces; no open implementation placeholder changes product behavior.
- **Type consistency:** the snapshot and policy types above are the interfaces consumed by the admin and Ads surfaces.
