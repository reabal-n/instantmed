# Conversion, Retention, and Friction Closure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Status:** Revised on 2026-09-05 after independent review of Fable's feedback. No runtime task below is authorised until the operator confirms this revised plan. Confirmation accepts the sequencing and evidence gates below, including Task 13's reconciliation of the existing two-hour operating target with the existing six-hour Stage A scale gate; it does not authorise patient email, Google Search Console, Google Ads, merge, or production-deployment actions.

**Goal:** Close the ten audited conversion and retention actions with real payment proof, optional account access, useful operator measurement, reliable certificate delivery, compliant organic discovery, and narrower specialty-form friction without weakening clinical safeguards.

**Architecture:** Deliver the work as independent, reversible release slices rather than one mega-branch. Diagnose and repair the certificate resend incident first, then establish a hermetic hosted-Stripe proof without breaking the existing development E2E lane. Add aggregate measurement, wait for the fixed 7-day/14-day cohorts, and only then decide whether account-handoff work is justified. SEO and specialty changes use their own evidence windows; production and customer-facing external mutations remain separate approval-gated actions.

**Tech Stack:** Next.js 15.5 App Router (Webpack), React 18.3, TypeScript 5.9, Supabase/PostgreSQL, Stripe Checkout v22 test mode, Stripe CLI, local Supabase Mailpit, PostHog personless analytics, Resend webhooks, Vitest, Playwright, Vercel, and the existing Google Ads Agent control plane.

**Spec:** [`docs/audits/2026-09-04-scaling-audit.md`](../../audits/2026-09-04-scaling-audit.md), corrected by the 2026-09-04 Fable review and reconciled with [`docs/ROADMAP.md`](../../ROADMAP.md) ranks 1, 4, 5, and 6.

## Global Constraints

- `docs/ROADMAP.md` remains the only active priority queue. This plan elaborates ranks 1, 4, 5, and 6 without silently reordering them.
- Use `corepack pnpm`. Do not change the pinned Next.js, React, Tailwind, Framer Motion, Node, pnpm, or Webpack choices.
- Guest checkout remains available. The internal patient `profiles` row required to own an intake is not optional; creating or linking a patient-facing Supabase Auth account remains optional after payment. Prescribing identity fields remain mandatory where `docs/CLINICAL.md` requires them.
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

## Reconciled Execution Order

Task numbers continue to map the audited actions, but they are not a single linear run order. Use these dependency waves:

1. **Known fulfilment incident:** Task 3, then Task 4. The hosted-payment harness must not delay certificate diagnosis or an approved repair.
2. **Payment proof:** Task 1, then Task 2, preserving the existing signed-event readiness lane before adding the hosted production-build lane.
3. **Immediate measurement and low-risk discovery:** Tasks 5, 6, 7, and 11 may proceed as separate slices; Task 12 ships only its redirect measurement in this wave.
4. **Policy reconciliation after confirmation:** Task 13 codifies the confirmed two-hour target/six-hour new-scale distinction, without altering an existing approved acquisition test.
5. **Evidence decisions:** run Task 8 at its dated checkpoints, decide the conditional W1 portion of Task 12 only after its sample gate, and close ED E1 only after its settlement gate. Decide Tasks 9 and 10 from the D+14 evidence; current account linking is already optional and passwordless, while their incremental value is unproven.

The 2026-09-05 review supplied useful dated production aggregates, but they remain review evidence rather than silently trusted implementation inputs. Where a decision depends on those values, the named aggregate reader must reproduce them without patient rows, emails, clinical answers, or identifiers. Unavailable live evidence is reported as unavailable; it is never replaced with zero.

## Reconciliation Snapshot

Read-only evidence was frozen at `2026-09-04T14:21:34Z` so this review does not mix drifting windows:

- Manual-review queue, trailing 7 days: all services 63 paid / 49 opened / 5.56h P95; prescription 36 / 36 / 5.50h; consult 6 / 6 / 4.86h; medical certificate 21 / 7 / 2.95h. The 30-day all-service result was 292 / 213 / 5.19h. This proves two hours is currently a missed target, not a workable hard stop for already-approved tests.
- Guest/account linkage, trailing 30 days: 215 guest-paid orders out of 292 paid; 179 were linked at the snapshot (83.3%), and 169 linked from payment through 24 hours (78.6%). One anomalous verified-before-paid timestamp is not counted as a post-payment link. Report counts and denominators rather than rounding this to a fixed "84%" claim.
- Women's-health exact-flow funnel, trailing 30 days: type 59 viewed / 39 completed; assessment 39 / 36; medical history 36 / 34; details 32 / 20. The current-pill redirect bypasses `step_completed`, so the first ratio is not interpretable until Task 12's redirect outcome ships.
- Checkout failures, trailing 60 days: `unknown` 54 events / 12 valid flows; `identity_or_session` 48 / 23; `persistence` 18 / 2; plus 39 legacy events with neither category nor valid flow ID. Show that legacy residue separately instead of silently dropping it.
- Refill reminders: five real outbox sends were sent/delivered and zero has an observed provider click; three test sends account for the one apparent PostHog click. Strict UTM-attributed paid renewals and broader same-patient paid reorders were both zero. The three old real sends are mature, while the post-consent 2026-09-03 wave is still immature; do not open a second-nudge gate from mixed test or pre-consent data.
- `/prescriptions` returned 200 with `index,follow` and a self-canonical, while the live sitemap still reported `2026-07-09`. The existing Search Console reader returned `NEUTRAL`, `Discovered - currently not indexed`, and no last crawl. The truthful material page date is 2026-08-28; an indexing request remains a separately approved action, not an indexed outcome.

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
| A. Certificate reliability | 8 | Diagnose both render entry points, repair only the proven seam, and add a production-bundle resend test | Historical patient resends remain separately authorised |
| B. Payment proof | 1 | Hermetic test-mode harness that preserves the existing readiness lane, plus a real hosted Checkout receipt | One prescribing skip path and one simpler account-link path |
| C. Measurement and retention | 2, 5, 6, 7 | Aggregate admin reads and repeatable receipt command | D+7/D+14 conversion and 21-day reminder cohorts |
| D. Optional account access | 3, 4 | Separate default-off or independently reversible auth PRs | Starts only after D+14 evidence is reviewed |
| E. Organic discovery | 9 | Truthful sitemap/internal-link release | Index request is our action; indexing is Google's outcome |
| F. Specialty conversion and growth holds | 10 | One service and one presentation variable per PR | Service-specific predeclared sample, settlement, and safety/fulfilment gates |

---

### Task 1: Make production-bundle test webhooks explicitly safe

**Files:**

- Create: `lib/stripe/test-webhook-policy.ts`
- Create: `lib/__tests__/stripe-test-webhook-policy.test.ts`
- Modify: `app/api/stripe/webhook/route.ts:92-98`
- Modify: `lib/config/env.ts`
- Modify: `.env.example`
- Modify: `scripts/check-medcert-readiness.sh`
- Verify without weakening: `e2e/payment-smoke.spec.ts`
- Verify without weakening: `e2e/stripe-webhook.spec.ts`
- Verify without weakening: `.github/workflows/ci.yml:439-460`

**Interfaces:**

- Produces: `mayProcessStripeTestEvent(input: StripeTestEventPolicyInput): boolean`
- Consumed by: the Stripe webhook route and the hosted E2E preflight in Task 2

- [ ] **Step 1: Write the failing policy tests**

```ts
type StripeTestEventPolicyInput = {
  allowTestWebhooks: boolean
  eventLivemode: boolean
  nodeEnv: "development" | "test" | "production"
  playwrightEnabled: boolean
  requestHost: string
  supabaseTarget: "local" | "non_production" | "production" | "unknown"
  supabaseUrlsMatch: boolean
  stripeKeyMode: "live" | "test" | "unknown"
  vercelEnv?: string
}

expect(mayProcessStripeTestEvent({
  allowTestWebhooks: true,
  eventLivemode: false,
  nodeEnv: "production",
  playwrightEnabled: true,
  requestHost: "localhost:3060",
  supabaseTarget: "local",
  supabaseUrlsMatch: true,
  stripeKeyMode: "test",
})).toBe(true)

expect(mayProcessStripeTestEvent({
  allowTestWebhooks: true,
  eventLivemode: false,
  nodeEnv: "production",
  playwrightEnabled: true,
  requestHost: "localhost:3060",
  supabaseTarget: "production",
  supabaseUrlsMatch: true,
  stripeKeyMode: "test",
  vercelEnv: "production",
})).toBe(false)
```

Cover two narrow, explicit allowances:

1. Preserve the existing signed-event readiness lane when `PLAYWRIGHT=1`, the request host is loopback, the app is running under `next dev`/test rather than a production Vercel target, and the fixed E2E fixtures remain excluded from reporting. This keeps `payment-smoke.spec.ts` and `stripe-webhook.spec.ts` meaningful.
2. Permit the production-build hosted lane only when the opt-in is exact, the request host is loopback, the Stripe key is test mode, `VERCEL_ENV` is absent, and the server/public Supabase URLs resolve to the same derived local or explicitly non-production target. Reject the production ref `witzcrovsoumktyndqgz`, production domains, mismatched URLs, unknown targets, and self-declared isolation without URL evidence.

A live event remains processable through the normal verified-signature path. Add negative cases for non-loopback hosts, live/unknown keys, missing opt-in in the production-build lane, mismatched Supabase URLs, the production Supabase ref, and every Vercel environment.

- [ ] **Step 2: Run the focused test and verify RED**

```bash
corepack pnpm exec vitest run lib/__tests__/stripe-test-webhook-policy.test.ts
```

Expected: FAIL because the policy module does not exist.

- [ ] **Step 3: Implement the two-lane fail-closed policy and route integration**

```ts
export function mayProcessStripeTestEvent(input: StripeTestEventPolicyInput): boolean {
  if (input.eventLivemode) return true
  if (input.vercelEnv || !isLoopbackHost(input.requestHost)) return false

  const existingReadinessLane =
    input.nodeEnv !== "production" && input.playwrightEnabled
  const hostedProductionBuildLane =
    input.nodeEnv === "production" &&
    input.allowTestWebhooks &&
    input.stripeKeyMode === "test" &&
    input.supabaseUrlsMatch &&
    input.supabaseTarget !== "production" &&
    input.supabaseTarget !== "unknown"

  return existingReadinessLane || hostedProductionBuildLane
}
```

The route continues returning an acknowledged discard for a rejected test event. `ALLOW_STRIPE_TEST_WEBHOOKS` is false unless exactly `true`; it is necessary only for the production-build hosted lane and is never sufficient by itself. Derive Supabase ownership from the actual configured URLs/project refs rather than trusting `E2E_ISOLATED_SUPABASE`. `NODE_ENV` alone grants nothing.

- [ ] **Step 4: Run focused payment safety tests**

```bash
corepack pnpm exec vitest run \
  lib/__tests__/stripe-test-webhook-policy.test.ts \
  lib/__tests__/stripe-webhook.test.ts \
  lib/__tests__/stripe-webhook-paid-state-guards.test.ts \
  lib/__tests__/stripe-payment-integrity.test.ts
corepack pnpm medcert:readiness:e2e
```

Expected: PASS, including the existing signed test-event transition from pending payment to paid. Add the policy unit test to `scripts/check-medcert-readiness.sh` so the blocking readiness gate owns this compatibility permanently; do not move or weaken the two existing specs merely to make the policy green.

- [ ] **Step 5: Commit the policy**

```bash
git add lib/stripe/test-webhook-policy.ts lib/__tests__/stripe-test-webhook-policy.test.ts app/api/stripe/webhook/route.ts lib/config/env.ts .env.example scripts/check-medcert-readiness.sh
git commit -m "test(payments): isolate hosted Stripe test webhooks"
```

### Task 2: Build and run the true hosted Stripe test-mode journey

**Files:**

- Create: `scripts/hosted-stripe-e2e-preflight.ts`
- Create: `scripts/run-hosted-stripe-e2e.ts`
- Create: `lib/__tests__/stripe-hosted-e2e-preflight.test.ts`
- Create: `e2e/helpers/hosted-stripe.ts`
- Create: `e2e/helpers/mailpit.ts`
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
- Produces: `readLatestMailpitLink(recipient: string): Promise<string>`

- [ ] **Step 1: Write preflight tests before the script**

The static preflight must reject `sk_live_*`, any defined `VERCEL_ENV`, `instantmed.com.au`, the production Supabase ref `witzcrovsoumktyndqgz`, mismatched server/public Supabase URLs, an unknown/non-local Supabase target, or non-test Stripe prices. It derives the local target from the actual URLs and CLI status rather than trusting a self-declared isolation flag. It must retrieve every configured test price and assert `price.livemode === false` without printing secrets. A separate post-listener validator must reject a missing or malformed Stripe CLI `whsec_` value.

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

`playwright.hosted-stripe.config.ts` uses the fixed base URL `http://localhost:3060`, matching `supabase/config.toml`, with one Chromium worker and no `webServer`; the runner owns the lifecycle. In order, `run-hosted-stripe-e2e.ts` starts local Supabase, confirms the derived local project URLs and Mailpit health, runs the static preflight, starts `stripe listen --forward-to http://localhost:3060/api/stripe/webhook`, captures its test `whsec_` value without printing it, validates that captured value, builds the app, starts `next start --port 3060` with the explicit test-webhook environment, waits for `/api/health`, invokes Playwright, and then removes run-scoped rows and stops every child plus local Supabase in `finally`. The Mailpit helper reads only a run-unique fabricated recipient, retries the documented `http://localhost:54324/view/latest.html?query=to%3A%22...%22` 404 until bounded timeout, and extracts the Supabase link without logging it. The workflow is `workflow_dispatch` only initially and invokes the same runner; adding the workflow file does not configure repository secrets or enable scheduled execution.

- [ ] **Step 3: Write two real browser cases**

```ts
test("guest may pay in hosted Checkout and skip account creation", async ({ page }) => {
  const evidence = await completeRealHostedGuestPayment(page, { service: "repeat-script" })
  expect(evidence.livemode).toBe(false)
  await expect(page).toHaveURL(/\/auth\/complete-account/)
  await page.getByRole("button", { name: "Continue without an account" }).click()
  await expect(page).toHaveURL(/\/request\/confirmed/)
})

test("guest may create access by real magic link after payment", async ({ page }) => {
  const evidence = await completeRealHostedGuestPayment(page, { service: "med-cert" })
  await page.getByRole("button", { name: "Email me a sign-in link" }).click()
  await page.goto(await readLatestMailpitLink(evidence.email))
  await expect(page).toHaveURL(/\/patient/)
  await expectOwnedIntakeVisible(evidence.intakeId)
})
```

Use only fabricated patient and medication fixtures. The skip case intentionally uses repeat-script because the requested proof includes the identity-gated prescribing lane and medication-step simplification; fill every repeat-Rx safety answer and add no clinical-validation bypass. The account-link case uses med cert to prove the generic optional-link branch without paying the setup cost of the same heavy intake twice. A faster med-cert smoke may support the run, but it cannot replace the repeat-script acceptance case.

- [ ] **Step 4: Assert durable cross-system evidence**

The helper must verify one intake per case, `payment_id === checkoutSession.id`, exact `amount_cents`, `payment_status === "paid"`, retryable-to-paid state transition, and zero surviving rows after teardown. After the account branch, the internal profile has a linked `auth_user_id` and verified timestamp. After the skip branch, the required internal patient profile still exists but `auth_user_id IS NULL`, and no Supabase Auth user/account was created. Store a PHI-free receipt containing only test run ID, commit SHA, timestamps, Stripe event type/mode, boolean assertions, and counts.

- [ ] **Step 5: Run the journey and archive the receipt**

```bash
corepack pnpm e2e:stripe-hosted
```

Expected: two real `checkout.stripe.com` test-mode payments, two genuine signed webhook deliveries, both return branches green, and teardown green. Seeded payment specs remain supporting tests, not substitutes.

- [ ] **Step 6: Commit the harness separately**

```bash
git add scripts/hosted-stripe-e2e-preflight.ts scripts/run-hosted-stripe-e2e.ts lib/__tests__/stripe-hosted-e2e-preflight.test.ts e2e/helpers/hosted-stripe.ts e2e/helpers/mailpit.ts e2e/hosted-stripe-guest-journey.spec.ts playwright.hosted-stripe.config.ts .github/workflows/hosted-stripe-e2e.yml package.json docs/TESTING.md docs/OPERATIONS.md
git commit -m "test(payments): prove hosted guest checkout end to end"
```

### Task 3: Reproduce and fix certificate resend rendering at the real seam

**Files:**

- Create first: `playwright.production.config.ts`
- Create first: `scripts/run-production-e2e.ts`
- Create first: `e2e/certificate-resend-render.spec.ts`
- Create first: `lib/__tests__/certificate-email-entrypoints.test.tsx`
- Inspect before choosing a repair: `app/actions/resend-certificate.ts`
- Inspect before choosing a repair: `lib/clinical/execute-cert-approval.ts`
- Inspect before choosing a repair: `lib/email/send/reconstruct.ts`
- Inspect before choosing a repair: `lib/email/send-email.ts`
- Modify only after the failing frame is known: the exact failing email/template/bundle module
- Modify: `lib/__tests__/certificate-delivery-actions.test.ts`
- Modify: `package.json`
- Modify: `docs/TESTING.md`

**Decision gate:** no builder, `React.createElement` wrapper, import rewrite, or template edit is preselected. Normal approval and staff resend currently share the same static template barrel and direct call form, while email-hub reconstruction uses a dynamic import. The observed `render_email_template` frame or a faithful production-build RED must identify the failing module and entry point first.

- [ ] **Step 1: Retrieve the existing incident frame if authorised**

Using a Sentry credential with `event:read`, retrieve only the PHI-safe exception type, message, release SHA, transaction, and top application frames for the 2026-09-03 event tagged `action=render_email_template`. Do not print or rotate credentials and do not copy request bodies, recipients, patient fields, or template props into a receipt. If access remains unavailable, record that limitation and continue to local reproduction; lack of access is not evidence for a guessed fix.

- [ ] **Step 2: Reproduce all three current entry points before changing production code**

Seed one synthetic paid/approved med-cert intake and current valid certificate in isolated Supabase. Use local staff auth bypass only with `PLAYWRIGHT=1`; suppress provider delivery through the existing E2E outbox seam. From `/admin/ops`, invoke **Resend link** and assert the existing action reaches email rendering. Map `e2e:production` to `tsx scripts/run-production-e2e.ts` in `package.json`. The runner starts isolated local Supabase, builds the app, invokes the requested spec, and guarantees run-scoped cleanup plus Supabase shutdown in `finally`; `playwright.production.config.ts` starts `next start --port 3060`, never `next dev`.

In `certificate-email-entrypoints.test.tsx`, render with real components and no template/React mocks through:

1. the normal approval entry point as the known control;
2. the staff/patient resend action path with its static template import; and
3. email-hub reconstruction through `reconstructEmailForRetry()` with its dynamic templates-barrel import.

```bash
corepack pnpm exec vitest run lib/__tests__/certificate-email-entrypoints.test.tsx
corepack pnpm e2e:production -- --spec=e2e/certificate-resend-render.spec.ts
```

Expected on current main: either a faithful RED with the exact lower render exception and failing entry point, or a green local result that proves the defect is release/environment-specific. Save only the PHI-free exception/frame and assertion. A module-not-found error from a not-yet-created helper is not accepted as reproduction.

- [ ] **Step 3: Stop if the failing frame is still unknown**

If all three entry points are green and the Sentry frame remains unavailable, mark the repair lane `BLOCKED_DIAGNOSIS`. Add source-specific, PHI-safe render-stage tags only if they materially narrow the next occurrence, then ship those diagnostics separately. Do not create the previously proposed builder merely to manufacture a green test.

- [ ] **Step 4: Write the smallest RED contract for the proven module**

Once the frame identifies the failing module or bundle boundary, add the narrowest unmocked regression around that exact seam. Cover guest and account-holder variants and assert the generated HTML contains the expected access copy/verification code but no raw Supabase storage URL. Do not mock `MedCertPatientEmail`, React, or `renderEmailToHtml`.

```bash
corepack pnpm exec vitest run lib/__tests__/certificate-email-entrypoints.test.tsx
```

Expected: FAIL for the observed reason at the observed seam.

- [ ] **Step 5: Apply only the proven repair**

Change only the module/import/render boundary proved by Step 4. Preserve resend caps, reservation/finalisation, storage-version binding, ownership, provider suppression in E2E, and audit behavior. Record the chosen file and why in the PR receipt; if the failure is the dynamic reconstruction seam, do not disturb the working normal-approval path.

- [ ] **Step 6: Run transactional, render, reconstruction, and production-server suites**

```bash
corepack pnpm exec vitest run \
  lib/__tests__/certificate-email-entrypoints.test.tsx \
  lib/__tests__/certificate-delivery-actions.test.ts \
  lib/__tests__/certificate-resend-transaction-contract.test.ts \
  lib/__tests__/certificate-resend-dispatcher-finalization.test.ts \
  lib/__tests__/email-reconstruct-contract.test.ts \
  lib/__tests__/email-dispatcher-reconstruct-parity-contract.test.ts
corepack pnpm typecheck
corepack pnpm build
corepack pnpm e2e:production -- --spec=e2e/certificate-resend-render.spec.ts
```

Expected: PASS through normal approval, direct resend, and email-hub reconstruction. The browser case asserts a durable outbox row, one resend reservation/finalisation, current storage-version metadata, no raw storage URL, no server render exception, and removal of all synthetic rows.

- [ ] **Step 7: Commit without resending a patient email**

```bash
git status --short
git diff --check
# Stage the four named harness/test files above plus only the exact repair files
# identified in the PHI-free diagnosis receipt.
git commit -m "fix(certificates): repair proven resend render seam"
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

**Production recovery gate:** after this release is live, re-query `/admin/ops` and present the current-valid unresolved certificate count without copying patient details into the plan or a tool log. A fresh operator instruction must authorise each exact resend in the authenticated UI. Send one at a time, verify provider acceptance and webhook delivery separately, and never fake historical delivery timestamps or bulk-resend.

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
  --release-at=2026-09-05T01:02:03.456Z \
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

- Create: `lib/stripe/checkout-failure.ts`
- Create: `lib/analytics/posthog-checkout-recovery.ts`
- Create: `lib/__tests__/posthog-checkout-recovery.test.ts`
- Create: `lib/__tests__/checkout-failure-code.test.ts`
- Modify: `app/actions/unified-checkout.ts`
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
  taxonomyVersion: "checkout_v2_20260905" | "legacy"
  failedFlows: number
  paidWithin24h: number
  paidWithin7d: number
  recovery24hPercent: number | null
  recovery7dPercent: number | null
}

export type CheckoutFailureCode =
  | "availability"
  | "auth_handoff"
  | "auth_or_session"
  | "clinical_or_input_validation"
  | "payment_provider"
  | "persistence"
  | "pricing_or_configuration"
  | "rate_limit"
  | "unexpected"
```

- [ ] Inventory every `CheckoutResult` failure returned through `createCheckoutFromUnifiedFlow()`, including guest checkout, authenticated checkout, recovered drafts, missing URLs, and thrown exceptions. Give each deterministic branch a fixed server-owned `CheckoutFailureCode`; only an actually unclassified exception may use `unexpected`. Keep user-facing copy separate from the code.
- [ ] Map those codes onto the existing exported `CheckoutFailureCategory` values. Do **not** add `auth_handoff` or change the historical meanings of `availability_or_capacity`, `identity_or_session`, `payment_provider`, `persistence`, `pricing_or_configuration`, `rate_limit`, `validation`, and `unknown`. The future typed account handoff still maps to `identity_or_session`; the code exists for UI control flow, not account-enumeration analytics.
- [ ] Have `review-step.tsx` capture the server-returned allowlisted `failure_category`, `failure_code`, and fixed `failure_taxonomy_version=checkout_v2_20260905` rather than reclassifying raw public error strings in the browser. Never send the email, raw error, database/provider code, account-exists boolean, or free text to PostHog. Retain `classifyCheckoutFailure()` only as a compatibility path for legacy callers until all source branches are covered.
- [ ] Join each flow's first `checkout_failed` event to a strictly later `purchase_completed_server` using the same valid `flow_instance_id`. Label async/in-flight outcomes separately; do not count an earlier or same-time purchase as recovery.
- [ ] Add 7-day and 30-day views with category totals, 24-hour/7-day recovery, flow-ID coverage, taxonomy coverage, and the `unknown` share. `/admin/ops` remains the live case-recovery surface; Business stays aggregate. Historical `unknown` rows remain unchanged, and the 39 rows with neither category nor flow ID render separately as `legacy_unclassified` rather than disappearing. The implementation is accepted only when every deterministic source branch has a test and, after at least 20 post-release failed flows, new `unknown` is below 5%; until then the view stays visibly **degraded**, not falsely complete.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/checkout-failure-code.test.ts \
  lib/__tests__/posthog-checkout-recovery.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts \
  lib/__tests__/business-dashboard-contract.test.ts
```

Expected: PASS; every deterministic checkout branch owns a fixed code, category sum equals unique failed flows, and low flow-ID or classification coverage is visibly degraded.

- [ ] Commit:

```bash
git add lib/stripe/checkout-failure.ts lib/analytics/posthog-checkout-recovery.ts lib/__tests__/checkout-failure-code.test.ts lib/__tests__/posthog-checkout-recovery.test.ts app/actions/unified-checkout.ts lib/analytics/posthog-privacy.ts components/request/steps/review-step.tsx app/admin/analytics/page.tsx app/admin/analytics/analytics-helpers.ts app/admin/analytics/analytics-client.tsx lib/__tests__/posthog-personless-analytics.test.ts
git commit -m "feat(analytics): surface checkout failure recovery"
```

### Task 7: Make the refill-reminder funnel measurable

**Files:**

- Create: `supabase/migrations/20260905120000_refill_reminder_funnel.sql`
- Create: `lib/admin/refill-reminder-funnel.ts`
- Create: `lib/__tests__/refill-reminder-funnel.test.ts`
- Create: `lib/__tests__/refill-reminder-funnel-migration-contract.test.ts`
- Modify: `app/admin/analytics/page.tsx`
- Modify: `app/admin/analytics/analytics-helpers.ts`
- Modify: `app/admin/analytics/analytics-client.tsx`
- Modify: `app/api/webhooks/resend/route.ts`
- Modify: `lib/__tests__/resend-webhook-contract.test.ts`
- Modify: `lib/__tests__/refill-reminder.test.ts`
- Modify if the missing heartbeat reproduces: `app/api/cron/refill-reminders/route.ts`
- Modify if the missing heartbeat reproduces: `lib/__tests__/critical-cron-outcome-contract.test.ts`
- Modify: `docs/OPERATIONS.md`

**Interfaces:**

```ts
export interface RefillReminderFunnelSnapshot {
  availability: "available" | "degraded" | "unavailable"
  schedulerEvidence: "healthy" | "missing" | "unavailable"
  from: string
  to: string
  sent: number | null
  delivered: number | null
  observedProviderClicks: number | null
  utmAttributedPaidRenewalsWithin21d: number | null
  samePatientPaidReordersWithin21d: number | null
  eligibleSentCohort: number | null
  utmConversionWithin21dPercent: number | null
  samePatientReorderWithin21dPercent: number | null
}
```

- [ ] Add an aggregate-only, service-role RPC for refill reminder cohorts. Count real `email_outbox` sends and delivery outcomes by fixed `email_type`; exclude `test=true`, null-patient preflights, seeded/E2E patients, and E2E intakes. Return counts and week boundaries only—no patient, outbox, intake, prescription, recipient, or provider IDs.
- [ ] Do not use mutable `delivery_status = 'clicked'` as durable click truth because a later open can overwrite it. Count an observed Resend click from the row's deduplicated `metadata.processed_events` receipt containing `email.clicked`, entirely inside the aggregate RPC. Label this **observed provider click**, not a human click, because link scanners may traverse it. The existing personless PostHog `email_clicked` event remains a best-effort diagnostic, not the cohort source of record.
- [ ] Add the missing `email.clicked` webhook contract and attach only a fixed `email_is_test` boolean derived server-side from outbox metadata to future PostHog email lifecycle events. The current apparent one-click refill series mixes three test sends with five real sends; pre-change PostHog clicks remain untrusted for the real cohort.
- [ ] Report two distinct 21-day outcomes: strict attribution only when a reportable paid repeat-script intake carries `utm_source=refill_reminder` after a real send, and broader same-patient paid repeat-script reorder association after that send even when the UTM was lost across device/session. Never label the broader measure attributed revenue and never return the patient join. Show gross paid orders; show retained revenue only when exact refund/dispute cash evidence can be joined without inference, otherwise mark it unavailable.
- [ ] Render waves by send week with incomplete cohorts labelled **maturing**. Never divide by a cohort before its 21-day window closes.
- [ ] Treat outbox delivery and scheduled invocation as separate proof. The snapshot had no `cron_heartbeats` row for `refill-reminders` even though the route calls `recordCronHeartbeat()`. Re-check after a known scheduled window; if still absent, reproduce the recorder/configuration failure, repair only the proven cause, and add a route/heartbeat contract. Until then show scheduler evidence as **missing** rather than inferring daily cron health from five delivered emails.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/refill-reminder-funnel.test.ts \
  lib/__tests__/refill-reminder-funnel-migration-contract.test.ts \
  lib/__tests__/refill-reminder.test.ts \
  lib/__tests__/resend-webhook-contract.test.ts \
  lib/__tests__/critical-cron-outcome-contract.test.ts \
  lib/__tests__/attribution-source-classification.test.ts \
  lib/__tests__/business-dashboard-contract.test.ts
```

Expected: PASS.

- [ ] Commit:

```bash
git add supabase/migrations/20260905120000_refill_reminder_funnel.sql lib/admin/refill-reminder-funnel.ts lib/__tests__/refill-reminder-funnel.test.ts lib/__tests__/refill-reminder-funnel-migration-contract.test.ts app/admin/analytics/page.tsx app/admin/analytics/analytics-helpers.ts app/admin/analytics/analytics-client.tsx app/api/webhooks/resend/route.ts lib/__tests__/resend-webhook-contract.test.ts lib/__tests__/refill-reminder.test.ts lib/__tests__/critical-cron-outcome-contract.test.ts docs/OPERATIONS.md
git commit -m "feat(retention): measure refill reminder cohorts"
```

**Second-nudge gate:** do not build or enable day 84 yet. After exactly three fully matured weekly waves each achieve at least 10% strictly UTM-attributed paid renewal within 21 days, with no worsening complaints, unsubscribes, refunds, or support contacts, write a separate experiment using a new durable second-send marker. Do not use the broader same-patient association to open this gate, do not reuse `refill_reminder_sent_at`, and keep the transaction one-off rather than a subscription.

### Task 8: Close the D+7 and D+14 observation gate

**Files:**

- Create after each window: `docs/superpowers/receipts/2026-09-11-friction-readout.json`
- Create after the final window: `docs/superpowers/receipts/2026-09-18-friction-readout.json`
- Modify after D+14: `docs/ROADMAP.md`

- [ ] Resolve the exact `99e25c8f9` Vercel-ready UTC time and bind both matched windows to it. Use complete 24-hour periods; exclude all E2E rows.
- [ ] At D+7, report direction only. At D+14, make the bounded operating accept/iterate decision using the fixed pre-ship repeat-Rx baseline: 104/200 mobile medication-step completions (52.0%).
- [ ] Accept the medication change operationally only at at least 60 post-ship mobile views, at least 55% completion, no reduction in genuine service-steer plus clinical-hard-block share, no worse unresolved validation failures, and no worse repeat-Rx decline/refund rate. Label this a **directional operating threshold**, not proof of causal uplift or statistical significance; show the numerator, denominator, and uncertainty alongside the baseline.
- [ ] Report checkout initiated/start, paid/start, guest linked within 24h/7d/14d, derived unlinked share, refunds per 100 paid orders, and manually verified aggregate support contacts per 100 paid orders. Refunds must come from Task 5's canonical cash-ledger composition and render unavailable when ledger completeness fails; never infer them from status alone. The dated context is 179/215 currently linked (83.3%) and 169/215 within 24 hours (78.6%), not a fixed target.
- [ ] Run the receipt privacy assertion before committing. Receipt JSON may contain aggregate counts, percentages, timestamp boundaries, and SHA only.

```bash
corepack pnpm tsx scripts/release-friction-readout.ts --release-sha=99e25c8f9329bd66da009d68127199405b37cd07 --release-at="$INSTANTMED_RELEASE_MEASUREMENT_AT" --window=14d --output=docs/superpowers/receipts/2026-09-18-friction-readout.json
corepack pnpm doc:audit
```

Expected: a privacy-safe D+14 decision receipt. Item 2 and the outcome half of item 5 are not closed before this task.

### Task 9: Add the earlier account handoff only after D+14

**Activation gate:** start this task only if the D+14 receipt shows the existing `identity_or_session` category causing at least two manually verified account-handoff checkout-intent failures with recovery below 70% within 24 hours, or the same problem appears as a repeated manually classified support-contact class. Aggregate analytics alone must not infer that an account exists. If the gate is not met, retain the current optional passwordless account flow and record **not justified** rather than manufacturing scope.

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
import type { CheckoutFailureCategory } from "@/lib/analytics/posthog-privacy"

export type GuestCheckoutResult =
  | { success: true; checkoutUrl: string }
  | { success: false; code: "AUTH_HANDOFF" | "CHECKOUT_FAILED"; failureCategory: CheckoutFailureCategory; error: string }

export interface GuestAccountHandoffProps {
  email: string
  returnTo: string
}
```

- [ ] Replace string matching for `"account already exists"` with the typed `AUTH_HANDOFF` result. It remains inside the existing `identity_or_session` analytics category. Public copy must be generic: **Continue securely with this email, or edit it to continue as a guest.** Never state whether an account exists.
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

**Activation gate:** start after D+14 and after Task 2 proves real magic-link/Auth-account linking. This task is optional UI for a patient who already holds a valid tracker capability; it must not expand that capability into document access.

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
- [ ] The button copy is **Email me a secure access link**. Clicking it is the explicit choice to create or connect lightweight Auth-account access; no additional patient-facing profile questions are added and the internal intake-owning profile already exists.
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
- [ ] Update the stale `2026-07-09` `/prescriptions` lastmod to **`2026-08-28`**, the author/deployment date of `ad2c450c1` / PR #504. That commit materially changed `/prescriptions` eligibility and identity copy in `components/marketing/prescriptions-landing.tsx` and `lib/data/prescription-faq.ts`; the prior FAQ expansion was `a5671ab4a` on 2026-08-25. The 2026-09-04 commit changed only another sitemap entry, not this page. Do not bump dates merely to manufacture freshness.
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

- Immediate instrumentation: `components/request/steps/womens-health-type-step.tsx`
- Immediate instrumentation: `components/request/hooks/use-flow-analytics.ts`
- Immediate instrumentation: `lib/__tests__/intake-analytics-events.test.ts`
- Immediate browser proof: `e2e/consult-subtypes.spec.ts`
- Conditional W1 registry: `lib/growth/specialty-experiences.ts`
- Conditional W1 attribution: `lib/growth/specialty-experience-attribution.ts`
- Conditional W1 store/draft/payment propagation: `components/request/store.ts`, `lib/request/draft-storage.ts`, `app/api/draft/route.ts`, `app/actions/unified-checkout.ts`, `lib/stripe/guest-checkout.ts`, `lib/stripe/checkout.ts`, and existing finalisation/retry helpers
- Conditional W1 tests: `lib/__tests__/specialty-experience-registry.test.ts`, `lib/__tests__/specialty-experience-invariants.test.ts`, `lib/__tests__/specialty-experience-attribution-contract.test.ts`, `lib/__tests__/specialty-experience-payment-propagation.test.ts`, `lib/__tests__/server-draft-conversion.test.ts`, and `lib/__tests__/womens-health-unified-validation.test.ts`

- [ ] **First ship only the missing handoff measurement.** When **Continue my current pill** redirects, emit the existing PHI-free service-steer outcome with fixed tokens (`block_type=service_steer`, `blockers=[current_pill_repeat_handoff]`, `resolution=redirected`), mark the navigation intentional, preserve the current allowlisted attribution, and add one fixed allowlisted destination marker (`from=womens-health-repeat-handoff`) so the new repeat flow can acknowledge its origin. Do not emit the medicine, email, answers, or identifiers. The adjusted progression numerator is `step_completed` plus this explicit redirected outcome, so a correct repeat-lane handoff is no longer mislabelled as abandonment.
- [ ] Verify the immediate change in `e2e/consult-subtypes.spec.ts`, which owns the women’s-health type step. Test the fixed event, repeat-script destination, attribution preservation, back behavior, and no passive-abandonment double count. `e2e/prescription-flow.spec.ts` is not the owner of this route.
- [ ] Observe at least 14 complete days, at least 60 post-instrumentation type-step views, and at least 90% valid exact-flow-ID coverage. Build W1 only if the adjusted view-to-progress rate still leaves at least 10 unaccounted abandonments and this step remains the largest avoidable women’s-health loss. Otherwise close W1 as **not justified**. The review's 30-day 59 -> 39 raw count is dated context, not a cohort to activate against because current-pill redirects were counted as losses.
- [ ] If that gate opens, add the inactive `spx_w1_20260904` `intake_presentation` definition and the real assignment path that does not exist today: extend `SpecialtyExperienceService` and subtype resolution to `womens_health`; add surface-aware incoming, persisted, and opaque normalisation; claim the code-owned intake-presentation version once when a fresh women’s-health type step begins; and propagate it through local draft, server draft, checkout, retry, and payment finalisation. Keep the version in `growth_experience_version`, never clinical answers, and preserve immutable first-owner semantics across back/reload/recovery.
- [ ] In the gated W1 branch only, keep two primary choice cards: **UTI symptoms** and **Start or switch pill**. Move **Continue my current pill** out of the equal-weight group into one visually secondary direct handoff to `/request?service=repeat-script`, preserving allowlisted attribution and the same PHI-free redirect outcome. Use canonical pricing if price is shown. Add no question, medication name, diagnosis/call promise, or shortcut around downstream UTI/contraception safety screens.
- [ ] Test baseline/default inactivity, assignment exactly once, back/reload/server-draft/payment propagation, attribution preservation, direct repeat handoff, keyboard/focus order, 375px layout, and every current client/server red-flag path.

```bash
corepack pnpm exec vitest run \
  lib/__tests__/intake-analytics-events.test.ts \
  lib/__tests__/specialty-experience-registry.test.ts \
  lib/__tests__/specialty-experience-invariants.test.ts \
  lib/__tests__/specialty-experience-attribution-contract.test.ts \
  lib/__tests__/specialty-experience-payment-propagation.test.ts \
  lib/__tests__/server-draft-conversion.test.ts \
  lib/__tests__/womens-health-unified-validation.test.ts \
  lib/__tests__/womens-health-safety.test.ts \
  lib/__tests__/womens-health-uti-checkout.test.ts \
  lib/__tests__/request-terminal-safety-blocks.test.ts
corepack pnpm e2e -- e2e/consult-subtypes.spec.ts
```

Expected: the instrumentation-only slice passes first. If and only if the evidence gate later opens, the candidate passes with the current default unchanged, a W1 fixture showing the simplified presentation, durable non-clinical assignment, and identical clinical questions and checkout blocks after either presentation.

- [ ] Commit the instrumentation independently:

```bash
git add components/request/steps/womens-health-type-step.tsx components/request/hooks/use-flow-analytics.ts lib/__tests__/intake-analytics-events.test.ts e2e/consult-subtypes.spec.ts
git commit -m "fix(analytics): distinguish womens health repeat handoff"
```

- [ ] If the observation gate opens, commit the inactive W1 candidate separately:

```bash
git add components/request/steps/womens-health-type-step.tsx lib/growth/specialty-experiences.ts lib/growth/specialty-experience-attribution.ts components/request/store.ts lib/request/draft-storage.ts app/api/draft/route.ts app/actions/unified-checkout.ts lib/stripe/guest-checkout.ts lib/stripe/checkout.ts lib/__tests__/specialty-experience-registry.test.ts lib/__tests__/specialty-experience-invariants.test.ts lib/__tests__/specialty-experience-attribution-contract.test.ts lib/__tests__/specialty-experience-payment-propagation.test.ts lib/__tests__/server-draft-conversion.test.ts lib/__tests__/womens-health-unified-validation.test.ts e2e/consult-subtypes.spec.ts
git commit -m "feat(intake): simplify womens health service choice"
```

**Activation boundary:** W1 activation is not part of this plan or either commit. After a justified inactive candidate has production-browser proof, write a short follow-up activation plan that names the exact `lib/growth/specialty-experiences.ts` lifecycle edit, production-ready cohort boundary, the focused suites above, `corepack pnpm release:check`, the approval required to activate, and the one-commit rollback to baseline. Do not activate W1 implicitly while deploying unrelated work.

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

1. Two hours remains the service-level operating target. A trailing-7-day manual-review P95 above two but below six hours is advisory **watch**: it remains visible but does not suppress an otherwise valid operator-approval scale proposal or cancel an already-approved bounded acquisition test, matching the 2026-08-18 owner decision.
2. A new campaign, budget/bid scale step, or next product experiment requires a valid queue read with manual-review P95 below six hours, zero 24-hour breaches, and trustworthy measurement/economics. This makes the Stage A six-hour gate explicit; confirming this revised plan is the operator approval to make that threshold canonical.
3. Any affected-service clinical incident, broken fulfilment, manual-review P95 at or above six hours, oldest unresolved manual request at or above 20 hours, 24-hour breach, fresh support rate above 5 per 100 paid orders, fresh completed-QA state of `behind`, or existing explicit service hold produces `HOLD` and an approval-ready pause proposal.
4. Missing or stale optional support/QA evidence remains absent or non-actionable and does not block an otherwise evidence-backed scale proposal. Missing optional service controls work the same way; explicit harmful facts still produce `HOLD`. A queue read that is missing, malformed, or unavailable produces **unavailable** and blocks the next variable. `watch` is advisory, and no state authorises an Ads mutation: every proposal still requires exact operator approval.

**Interfaces:**

```ts
export interface AdsOperationalHold {
  affectedService: string
  reasons: Array<
    | "clinical_incident"
    | "clinical_qa_lag"
    | "clinical_qa_evidence_unavailable"
    | "explicit_service_hold"
    | "fulfilment_unhealthy"
    | "queue_p95_over_2h_watch"
    | "queue_p95_at_or_over_6h"
    | "queue_oldest_at_or_over_20h"
    | "queue_24h_breach"
    | "support_evidence_unavailable"
    | "support_over_5_per_100"
  >
  state: "clear" | "hold" | "unavailable" | "watch"
}

export interface ManualGrowthHealthEvidence {
  support: {
    contactsPer100Paid: number
    asOf: string
    source: "verified_gmail_aggregate"
  } | null
  clinicalQa: {
    state: "current" | "behind"
    asOf: string
    source: "medical_director_completed_review"
  } | null
}
```

`clinical_qa_evidence_unavailable` and `support_evidence_unavailable` remain only as read-compatible labels for historical persisted snapshots. Current snapshots keep missing optional manual rows visible as `null` and do not emit those reasons as a growth gate.

- [ ] Write precedence tests proving `hold > unavailable > watch > clear`; `hold` generates only an approval-ready pause proposal; unavailable queue evidence blocks a new scale packet; advisory `watch` remains visible without suppressing an otherwise valid operator-approval proposal; missing optional manual/control evidence does not freeze scale; and no state invokes an Ads mutation.
- [ ] Define the queue input exactly as reportable paid manual-review requests joined to the first later `clinician_opened_request`, aggregated by affected service. Exclude E2E rows. Provide trailing-7-day P95, oldest unresolved age, and 24-hour breach count only—no patient/staff IDs, timestamps, clinical reasons, or queue rows leave the reader.
- [ ] Accept support only as a non-negative, manually verified Gmail aggregate with an `asOf` timestamp and no message bodies/reasons. Accept QA only as a Medical Director attestation that completed review evidence is current/behind with an `asOf` timestamp; the `qa_sampled` selection stamp is **not** completed-QA evidence. Manual inputs can create a hold only while fresh for seven days; missing, stale, malformed, or future-dated optional evidence does not block scale.
- [ ] Feed only aggregate service-level metrics and those typed manual facts into the Ads snapshot. Do not include patient/staff IDs, clinical reasons, queue rows, support text, or free-form QA notes.
- [ ] Update the three canonical docs in the same commit so the two-hour target, six-hour new-scale gate, 24-hour hard ceiling, manual-evidence freshness rule, and 2026-08-18 owner decision no longer contradict one another.
- [ ] Close the active ED E1 cohort under its existing minimum 21 days plus 24-hour settlement and retained-order/clinical guardrails. The earliest settled close is `2026-09-19T05:13:53.870Z`; do not change ED intake before that receipt.
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
| Immediate engineering | Tasks 3-4 first; then Tasks 1-7 and 11 as separate PRs. Task 12 ships handoff measurement only. Task 13's policy/docs slice waits for explicit confirmation of the six-hour new-scale threshold. |
| D+7 from `99e25c8f9` readiness | Directional release-friction receipt; no account-flow expansion decision |
| D+14 | Final medication/checkout/guest-link read; decide Tasks 9-10 from evidence |
| 21 days after each reminder wave | Mature reminder conversion; require exactly three good post-consent weekly cohorts before a day-84 experiment |
| D+7/D+14/D+28 after SEO release | GSC inspection and indexing outcome, without repeated requests |
| 2026-09-19T05:13:53.870Z or later | Earliest settled close for ED E1; decide any E2 plan only after its retained-order, clinical, and fulfilment receipt |
| At least 14 complete days, 60 valid flows, and 90% coverage after Task 12 instrumentation | Decide whether a W1 candidate is justified; if not, close it without building or activation |

## Self-Review Receipt

- **Spec coverage:** all ten requested actions map to Tasks 2, 5-13; certificate recovery, experiment activation, and external indexing/Ads actions retain explicit approval gates.
- **Fable reconciliation retained:** certificate diagnosis precedes repair and payment work; the hosted webhook policy preserves required signed-event CI; `localhost`/Mailpit and exact button roles match the current harness; optional Auth-account linkage is distinguished from the required internal profile; checkout work owns the unknown/legacy residue; women’s-health handoffs are measured before W1; the queue uses two-hour watch plus an explicitly approved six-hour new-scale gate; direct service links remain out of guide bodies.
- **Review corrections not accepted wholesale:** `email_clicked` does exist as a personless PostHog event, but current events cannot exclude test sends and therefore are not the refill cohort authority. Aggregate outbox event receipts prove zero real clicks at the snapshot. The plan uses that durable test-separated evidence and labels provider clicks directional.
- **Clinical boundary:** no repeat-Rx, ED, UTI, contraception, identity, red-flag, doctor-review, or checkout safety field is removed.
- **Placeholder scan:** runtime evidence values are collected by named commands and fixed interfaces; no open implementation placeholder changes product behavior.
- **Type consistency:** the snapshot and policy types above are the interfaces consumed by the admin and Ads surfaces.
