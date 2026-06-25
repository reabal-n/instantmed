# InstantMed Conversion-Gap Fix List

**Bottom line:** 8 confirmed missed-purchase gaps. The single highest-$ is the dead PAY button at the consent gate (CHK-1/GAP-4/CTA-1) plus its guest-retry twin (CKO-1). Both sit on the most expensive click in the funnel, on the 73%-volume service. Fix the disabled-CTA anti-pattern once and roll it across 17 steps. The panel refuted 0 candidates — every gap below is verified real and purchase-costing.

---

## 1. Biggest missed-purchase gaps (ranked)

| # | Gap | Surface | file:line | Why it costs purchases | Fix | Est impact /90d | Effort |
|---|-----|---------|-----------|------------------------|-----|-----------------|--------|
| 1 | **Guest checkout_failed dead-end on retry** (CKO-1) | Guest med-cert checkout (73% vol) | `lib/stripe/guest-checkout.ts:638-692`, `lib/stripe/payment-integrity.ts:115-118` | A ready-to-pay guest who hits any transient Stripe blip gets "wait a few seconds" forever — the 10-min idempotency bucket collides, payment_id is null, no new session is ever minted. Authed path recovers; guest path can't. | Mirror `retryPaymentForIntakeAction` for guests: when a 23505 collision hits a retryable `checkout_failed` guest intake with no live session, rebuild a fresh Stripe session and return its URL. | **30-70 recovered purchases** (~$600-1,400) — the largest concrete recovery | M |
| 2 | **PAY button silently disabled until consent ticked, no reason** (CHK-1 / GAP-4 / CTA-1) | checkout-step, all services (med-cert 165 + consult 50 initiated) | `components/request/steps/checkout-step.tsx:99,399` | Last click before money. `canCheckout = consentGiven`; hard `disabled` with no aria-live hint, no scroll-to-consent. On mobile the shared safety-net bar is suppressed (`request-flow.tsx:851`) so this dead button is the ONLY pay control. Drives the checkout_viewed 76→62 (~18%) drop. | Port the review-step pattern: keep button clickable (`disabled={isProcessing}` only), `aria-disabled={!canCheckout}`, `handleDisabledClick` scrolls+focuses consent, inline `aria-live` "Tick the box above to pay". | **6-11 orders** (3-5% lift on ~215 initiations) | S |
| 3 | **Mobile: disabled PAY is the only action + shared scroll-to-consent net skipped** (CHK-3) | checkout-step mobile sticky bar | `components/request/steps/checkout-step.tsx:386-404`; `request-flow.tsx:851` | Sticky dead button pinned to viewport while the consent box that unlocks it is scrolled off-screen. No `data-intake-primary-action` hook, no disabled-tap handler. Mobile dominates med-cert traffic. | Fold into #2: always-clickable + disabled-tap scrolls to consent so the sticky bar "does something"; add inline "Tick the box above to pay". | Captures the mobile share of #2 | S |
| 4 | **All intake recovery emails link to an auth-gated route guests can't open** (RCV-1) | abandoned-checkout cron + payment-failed webhook | `lib/email/recovery-links.ts:45`; `app/patient/layout.tsx:18`; `payment-intent-payment-failed.ts:131` | Guests (bulk of 73% med-cert volume, highest-intent recovery segment) get a correctly-addressed email whose only CTA bounces to `/sign-in` for an account that doesn't exist. Every guest recovery send is wasted. | Add unauthenticated signed-token resume route `/resume/[token]` (HMAC of intakeId+expiry) that calls the existing retry-payment action without a session; point the URL builder, payment-failed retryUrl, and session-expired resumeUrl at it for guests. | **Several med-cert orders/month** at ~$0 acq cost | M |
| 5 | **checkout_failed intakes never get recurring recovery** (RCV-2 / GAP-1) | abandoned-checkouts cron status filter | `lib/email/abandoned-checkout.ts:59-63,169-174` | Card-declined-after-form-complete is the most purchase-ready abandoner class. Both crons filter `status='pending_payment'` only, so checkout_failed is doubly excluded (status AND payment_status). One webhook email at failure time — which itself uses the dead guest link (#4). | Broaden both finders to `status IN ('pending_payment','checkout_failed')` + `payment_status IN ('pending','failed',null)`, keep the `*_email_sent_at` dedup guards. Pair with #4 so the link works. | Card declines run ~5-15% of attempts — direct incremental revenue | S |
| 6 | **medication-history-step: worst transition (-46%) silently disables Continue on free-text + a progressively-revealed required field** (CTA-3) | Prescription/repeat flow | `components/request/steps/medication-history-step.tsx:88,260` | Single worst step transition in the product (medication 54→medication-history 29). Required free-text `currentDose`, plus a side-effects detail box that only appears AFTER dose is typed then re-disables the button. No aria-live; mobile CTA just dims. | Adopt patient-details pattern: drop `disabled`, `validate()` on click, aria-live Alert naming missing items, auto-scroll the revealed side-effects field. | Recovers a chunk of -46% on ~54 entries → several Rx sessions | S |
| 7 | **Med-cert checkout hides refund guarantee + GuaranteeBadge + trust badges + payment logos** (CHK-2 / CTA-2 / GAP-5) | checkout-step med-cert path (73% vol) | `components/request/steps/checkout-step.tsx:199,390,407,415` | The highest-volume, most price-sensitive ($19.95-$39.95) cohort sees the weakest risk-reversal at the pay moment. Refund-on-decline is true+applicable for med-cert (`REFUND_ON_DECLINE_CATEGORIES`) but the prominent badge above Pay is suppressed. | Un-gate GuaranteeBadge + "Full refund if the doctor declines" line + PaymentLogos for med-cert (remove the `!isMedCertCheckout` guards on 390/407/415). Keep only the AHPRA/LegitScript prescribing row consult-specific if density is a concern. | **2-5 orders** (1-3% trust lift on 165 checkouts) — highest-leverage copy fix | S |
| 8 | **Resend-confirmation button is dead (no CSRF token → always 403)** (POST-1) | `/patient/intakes/success` (webhook-delay branch) | `app/patient/intakes/success/success-client.tsx:81-86` | The only self-serve recovery for a paid patient missing their cert email. Raw `fetch` with no `x-csrf-token` against a CSRF-required endpoint; 403 swallowed silently, button looks functional, sends nothing. Drives support tickets, refund requests, chargebacks on med-cert. | One-line swap to `fetchWithCsrf` from `@/lib/security/csrf-client`; surface a visible error toast in the catch block. | Prevents an unknown-but-real ticket/refund/chargeback volume | S |
| 9 | **certificate-step (med-cert step 1, -36%) silently disables Continue when certType unselected** (CTA-6) | Med-cert step 1 (highest-volume service first screen) | `components/request/steps/certificate-step.tsx:304-308,510` | First impression of the 73% service. `selectedDays`/`startOffset` default but `certType` has no default for first-timers → dead Continue with no inline reason, before any sunk cost. Part of certificate 124→symptoms 79 (-36%). | Drop `disabled`, `validate()` on click, aria-live "Choose a certificate type to continue". Optionally pre-select Work to remove the block entirely. | Several extra med-cert form-completers feeding the 165 pool | S |
| 10 | **medical-history-step hides 2 required safety questions behind a second view; Continue stays silently disabled** (CTA-4) | Prescription/repeat flow | `components/request/steps/medical-history-step.tsx:167,188,244,280` | View-swaps the 3-question clinical card for 2 NEW required safety questions; patient perceives "same step I just finished" while the button is dead. Sits right before review (28→9, -68%). | Same family: always-clickable + `validate()` + aria-live naming pregnancy/adverse-reaction questions; consider showing safety card alongside (not replacing) clinical card. | Feeds the thin 9-row Rx checkout pipeline | S |
| 11 | **Bad STRIPE_PRICE_* env var → "No such price" kills 100% of a tier's checkouts with no alarm** (CKO-2) | All paid services / env config | `lib/stripe/checkout/stripe-session.ts:198`; `lib/config/env.ts:43-52,194-199` | Price IDs are `.optional()`, prod preflight only warns. A stale/wrong med-cert price silently fails every checkout (~165/90d ≈ $3,000+) until a human notices. Health check exists but is passive. CLAUDE.md Q3 flags this exact risk. | (1) Sentry captureException with `{checkout_error:'no_such_price', priceRole, priceId(last6)}` in the branch; (2) promote `getStripePriceConfigIssues` to a loud Telegram/startup alert when count>0; (3) optionally throw in prod preflight for the 10 price keys. | Tail risk, catastrophic when it lands | S |
| 12 | **medication-step silently disables Continue on required free-text strength + form per medication** (CTA-7) | Prescription/repeat entry | `components/request/steps/medication-step.tsx:236-238,388` | Entry to the Rx funnel; compounds before the -46% drop. Two tiny required free-text fields inside the medication card strand users when PBS search returns blank strength/form or on manual entry. | Always-clickable + `validate()` + aria-live "Add the strength and form for <med>", scroll first empty field. | Protects top of Rx funnel (22+16 initiations) | S |
| 13 | **ed-health-step disables Continue across collapsed sections with no pointer to the blocker** (CTA-5) | ED consult (50 initiated, 2nd-highest) | `components/request/steps/ed-health-step.tsx:188-209,558` | One panel split refuted the multi-accordion framing (it's 3-phase progressive disclosure), but both panel members agreed the silent-disable + the un-explained `gpClearanceRequired` checkbox block are real on ED's most complex step. | Always-clickable; on click show clinical messaging for nitrate/GP-clearance blocks, else aria-live summary naming the incomplete section and scroll to it. | Protects a chunk of 50 ED checkouts | M |
| 14 | **Partial-intake recovery cron structurally blind to the two biggest leaks** (RCV-3) | recover-partial-intakes cron | `lib/email/partial-intake-recovery.ts:96-99` | Cron requires a captured email, but email is only written at the `details` step (3rd of 4) — downstream of the -46% and -36% leaks. For guests, mid-funnel droppers are 0% email-reachable. (One panelist flagged authenticated users ARE reachable via session pre-fill, so scope is the guest subset.) | Do NOT re-add pre-symptoms capture. Treat this cron as late-funnel only; for authenticated drafters recover via in-app/session identity; the real fix for the upstream leaks is #6/#9/#10. | No direct lift; unblocks correct prioritization | — |

---

## 2. Systemic patterns

### The disabled-CTA anti-pattern (the big one)

**Scope:** 17 of 19 intake step files plus the checkout PAY button gate their primary action with `disabled={!isComplete / !canContinue}` and show NO inline reason. Only **patient-details-step** (`validationSummary` Alert + aria-live) and **review-step** (always-clickable + `handleDisabledClick` + inline "Please confirm above to continue") use the good pattern.

**Why it's a silent mobile dead-end everywhere:** `request-flow.tsx:687-688` mirrors the desktop button's `.disabled` into the mobile sticky CTA (`mobileActionReady = available && !disabled`). The desktop button is `max-sm:hidden`, so on mobile the sticky bar is the *only* control — tapping a disabled one is a no-op with zero explanation.

**The active-service steps that actually cost money (rank by harm = active-service × funnel-position × non-obviousness):**
1. `medication-history-step.tsx:260` — worst transition (-46%), free-text + progressively-revealed field (#6)
2. `certificate-step.tsx:510` — med-cert step 1 (-36%), no certType default (#9)
3. `medical-history-step.tsx:280` — Rx safety questions behind a view-swap (#10)
4. `medication-step.tsx:388` — free-text strength/form per med (#12)
5. `ed-health-step.tsx:558` — ED's most complex step (#13)
6. `checkout-step.tsx:399` — the PAY button (#2, the P0)

**The one-shot rollout:** Extract a shared `useStepValidationSummary` helper that does exactly what patient-details-step/review-step already do — keep the button clickable, run `validate()` on click, render a top-of-step aria-live Alert listing missing fields, and have the mobile sticky CTA call the same validate-and-surface path instead of being inert. Drop it into all 17 steps. One helper closes the entire class, including the two biggest funnel leaks.

**Note:** symptoms-step is listed in the brief as "already fixed (PR #103)" but that PR is NOT in `main` — `symptoms-step.tsx:215` still has `disabled={!canContinue}` with no summary on the mobile sticky path. Treat symptoms as still in-scope for the rollout.

### The guest-recovery dead-link pattern

Three separate recovery touchpoints (abandoned-checkout 1h nudge, 24h follow-up, payment-failed webhook) all build `/patient/intakes/[id]?retry=true`, which is auth-gated. Guests — the dominant med-cert cohort — can never open any of them. One fix (`/resume/[token]`, #4) repairs all three, and unblocks #5.

---

## 3. Quick wins (ship this week, S-effort, high-confidence)

Ordered by leverage:

1. **#2 — un-disable the PAY button** (`checkout-step.tsx:99,399`). Port review-step's always-clickable + scroll-to-consent + aria-live. Highest-$ S-fix, ~1hr. Bundle #3 (mobile) into the same change.
2. **#7 — un-gate med-cert trust signals** (`checkout-step.tsx:390,407,415`). Remove three `!isMedCertCheckout` guards. ~15 min, 73% of volume.
3. **#8 — fix the dead resend button** (`success-client.tsx:81-86`). One-line `fetch` → `fetchWithCsrf`. Stops support tickets/chargebacks.
4. **#5 — broaden the recovery cron filters** (`abandoned-checkout.ts:59,169`) to include `checkout_failed`. (Pairs with #4 to be fully effective.)
5. **#6 — medication-history validate-on-click + aria-live** (`medication-history-step.tsx:88,260`). Targets the -46% transition directly.
6. **#9 — certificate-step validate-on-click + optional Work default** (`certificate-step.tsx:510`). Targets the -36% step-1 leak.
7. **#11 — Sentry alarm on "No such price"** (`stripe-session.ts:198`, `guest-checkout.ts:839`). Cheap insurance against a catastrophic config tail-risk.

Items 5, 6, and 9 collapse into the shared-helper rollout (Section 2) once it lands.

---

## 4. Lower-confidence / needs-data

**Uncertain (panel split):**
- **RCV-3 (#14)** — one panelist confirmed the cron is structurally blind to the two biggest leaks; the other flagged that authenticated users ARE reachable via `request-flow.tsx:348` session pre-fill, narrowing the real miss to the **guest** mid-funnel subset and adjusting severity to P2. Action: confirm the guest-vs-authed abandoner split before sizing.
- **CTA-5 (#13)** — one panelist refuted the "6 collapsed accordions" mechanism (it's 3-phase progressive disclosure, P2), the other confirmed P1. The agreed-real residual is the silent-disable + the un-explained `gpClearanceRequired` checkbox. Build the smaller fix; don't assume the accordion framing.

**Blocked on instrumentation (no live Supabase MCP to size these):**
- **RCV-4** — the `intake_abandonment` table (reached_payment, stripe_checkout_started, payment_error, last_step) was restored 2026-06-02 but `trackEnhancedAbandon()` and `getAbandonmentAnalytics()` have **zero callers**. The data needed to size RCV-1/RCV-2/RCV-3 in production does not exist. Either wire the writer (beforeunload/visibilitychange + payment-failed webhook populating reached_payment/payment_error) or delete the dead module. **Wire it** — without this you're guessing at every recovery-gap impact estimate above.
- **POST-3 / POST-5** — client PostHog `purchase_completed` can fail to fire on slow-webhook sessions (success page) and for guests (complete-account) because the conversion effect gates on `amount_cents` that lags the status flip. Google Ads CAPI covers attribution, but PostHog undercounts paid orders — which **distorts the very funnel numbers this whole audit relies on** (~204 paid vs PostHog-derived counts). Fix before trusting any post-fix lift measurement.

**Lower-priority passthrough (confirmed but P2/P3, fix opportunistically):**
- CKO-3 (no retry/support affordance on checkout error, P1) — bundle with #1.
- POST-2 (pollingError branch strands paid patient, P2), POST-4 (`/confirmed` asserts "payment successful" without checking payment_status, P2).
- REV-1 (consult double-fires `checkout_viewed`, P1 data-integrity — corrupts consult's reached-checkout denominator; one-line guard `if (isPrescriptionCheckout)` at `review-step.tsx:152-157`). Ship this with POST-3/POST-5 as a measurement-hygiene batch.
- BLOCK-1/BLOCK-2 (global single-bucket capacity cap throttles med-cert; hard dead-end with no waitlist) — latent, cap defaults off; fix before arming the cap.
- CKO-4 ($9.95 Priority Review dropped on retry), CKO-5 (dormant new-Rx mispricing), GAP-2/GAP-6/GAP-7 (guest resume link, pre-pay identity wall, mistyped-Medicare recovery), RCV-5 (session-expired resume dumps to service hub).

---

## 5. What we verified is NOT a gap

The adversarial panel **refuted 0 candidates** — so this list is already filtered; nothing here is noise. The panel additionally confirmed several things are correctly built and NOT gaps:

- **review-step** is one of the better surfaces: aria-disabled good-pattern correctly wired, scroll-to-consent live, refund promise + sign-in bounce present. The silent-disabled and hidden-refund anti-patterns do NOT apply there.
- **Price display** is safe (validated fallbacks in `getDisplayPrice`, no NaN/zero risk); **double-submit** is guarded (`isProcessing` + z-50 overlay).
- **checkout_failed intake preservation** is correct on both guest and authed paths (deletion only on `intake_answers` insert failure — a correct integrity rollback). The leak is downstream recovery, not deletion.
- **Operational invariants hold:** business-hours blocking correctly removed from checkout, capacity fails closed only when explicitly enabled, `isServiceDisabled` fails open on DB error, gated services (womens_health/weight_loss) correctly redirect to `/consult` before any checkout. No live P0 hard-blocker on the operational surface today.
- **verify-payment** uses current-session + retryable-status guards consistent with the Stripe payment-state invariant — no double-charge risk.
