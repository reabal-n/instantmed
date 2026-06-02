# Final Comprehensive Audit — InstantMed (7 categories)

**Date:** 2026-06-02 · **Lens:** balanced, severity-ranked · **Scope:** conversion/unit-economics, clinical safety, advertising compliance, security/privacy, production readiness, UX/design, business strategy.

> **Status: findings only — no remediation performed.** This is an audit record. Every fix below is a recommendation, not an applied change.

---

## Context

Requested as a final comprehensive audit before pushing harder on growth. The prior two weeks of work were all conversion/attribution/recovery/Google-Ads, capped by a high-fidelity funnel audit (`docs/reviews/2026-06-02-conversion-funnel-audit/`). This audit goes **broad across the whole platform** — not just the funnel — to give a single severity-ranked picture of what is ready to scale and what will bleed money if scaled.

Method: 3 parallel codebase sweeps + 2 deep-dives (UX, Business) + firsthand read of the funnel `report.md`. **Every load-bearing claim was verified against source** — four sub-agent over-claims were caught and corrected (see Calibration). Findings reflect verified reality, not agent hearsay.

---

## TL;DR — The one-paragraph verdict

**The platform is not the problem. The go-to-market math is.** Engineering, security, clinical safety, and regulatory compliance are top-decile for a solo-operator telehealth build — A-grade, defensible in a data room or an AHPRA audit. The fire is entirely commercial: **paid acquisition loses ~$60 per order** ($92 CAC vs ~$32 gross), **attribution can't be trusted** (paid-conversion counts split 100 / 26 / 22 across PostHog / Supabase / Ads), **80% of intakes abandon** before checkout with **0 recovered**, and the **review queue is 7× over its SLA** (P95 165h vs 24h). **Do not scale paid. Fix measurement + recovery + capacity, lean into the organic/SEO asset already half-built, and the $1M model becomes reachable — on organic, not on current paid.**

---

## Category scorecard

| # | Category | Grade | One-line |
|---|----------|-------|----------|
| 1 | Conversion & Unit Economics | 🔴 **D** | Loss-making paid + untrustworthy measurement. The platform's weak point. |
| 2 | Clinical Safety & Compliance | 🟢 **A** | Defense-in-depth: DB triggers, hard caps, dual-gated high-stakes. Excellent. |
| 3 | Advertising / AHPRA / TGA | 🟢 **A−** | Strong claim control, stars-only badge, no drug names. Enforcement is test-time not runtime; one dead CTA. |
| 4 | Security & Privacy (PHI/RLS) | 🟢 **A** | AES-256-GCM field-level, hardened RLS (2026-04-08), signed webhooks. Top-tier. |
| 5 | Production Readiness & Ops | 🟡 **B** | Great CI/test/cron coverage, but queue SLA 7× over + integration-type checks unwatched. |
| 6 | UX / Design | 🟢 **B+** | Largely DESIGN.md-compliant; good tap targets, guest checkout, progress. Email-capture timing is the one real leak. |
| 7 | Business / Strategy | 🔴 **C−** | Clear $1M model, but channel mix is **inverted** vs the unit economics. Paid can't pencil at $27 AOV. |

**The split is the story: engineering A, commercial execution C/D.**

---

## Master severity ranking (all categories)

### 🔴 P0 — This week (stop the bleed)

| # | Cat | Finding | The number | Fix |
|---|-----|---------|-----------|-----|
| P0-1 | Biz/Conv | **Paid search is loss-making; a paid ramp is planned on top of it** | 30d: $1,657.68 spend / 18 orders / $419.15 net. CAC **$92.09** vs gross **~$32** | Cap/pause spend outside proven exact-match terms. Do **not** scale until CAC < gross margin. |
| P0-2 | Conv/Analytics | **Attribution is untrustworthy — can't optimize what you can't measure** | Paid conversions: PostHog **100** / Supabase **26–27** / Ads **22**. `purchase_completed` 6 vs `_server` 24 | Dedup server→Google conversions; map only to final Supabase paid rows by `order_id`/`gclid`; stop extra `google_ads_server_conversion` emissions until reconciled. (`lib/analytics/google-ads-post-payment.ts`) |
| P0-3 | Ops | **Review queue is 7× over SLA — scaling demand makes it worse** | P95 **165h** vs 24h target; max 14 days | Capacity decision: raise `capacity_limit_max`, enable capacity-based auto-decline on low-confidence med certs, or trigger the second-doctor hire. Also a refund + AHPRA-experience risk. |

### 🟠 P0/P1 boundary — Cheap, high-leverage

| # | Cat | Finding | The number | Fix |
|---|-----|---------|-----------|-----|
| P1-4 | Conv/**Compliance** | **Prescriptions landing CTA dead-ends into the retired bare-consult flow** — double-hit: wastes paid clicks AND revives a gated-service back-channel | `components/marketing/prescriptions-landing.tsx` → `/request?service=consult` (now redirects to hub) | Replace with an active payable pathway or remove. Pause repeat-Rx paid until fixed. |
| P1-5 | Conv/UX | **80% intake abandonment with 0 recovery** — every paid click has an 80% pre-payment fail rate | 383 started → 75 checkout. 113 partials, **0 converted, 5 sent, only 19 have email**. Cert step alone = 70 partials | Capture email **at `/request` entry**, not mid-form (verified: capture currently fires after cert details / med selection). Build a working recovery sequence. Send to the **15 review+checkout abandoners with email already on file**. |

### 🟡 P1 — This month

| # | Cat | Finding | Fix |
|---|-----|---------|-----|
| P1-6 | Ops | **No integration-type validation at boot.** Google Ads conversion action is the *wrong type* (documented, unwatched); Stripe price IDs not checked as `one_time`; Anthropic model + Resend domain unchecked | Add `pnpm check:integrations`, wire into `pnpm release:check`. (OPERATIONS.md Q3) |
| P1-7 | Analytics | **`intake_abandonment` table missing from schema cache** — blocks recovery analytics | Verify migration `20260602070000` reloaded in prod (committed; status TBD). |

### 🟢 P2 — Opportunistic / hygiene

| # | Cat | Finding | Note |
|---|-----|---------|------|
| P2-8 | UX/Design | **Microcopy size drift** — sub-14px arbitrary fonts (`text-[10px]`/`text-[11px]`) in intake steps vs DESIGN.md 16px-body rule (`DESIGN.md:142`) | **Calibrated down** from a sub-agent's "228 P0 violations" (over-count). Run `/audit` + `/typeset` on the request flow. Not a conversion-killer. |
| P2-9 | Clinical/Compliance | **Capability gate falls open for unmapped service types** (`lib/auth/staff-capabilities.ts:188`) | **Design-intentional & moot while solo-admin** (admin bypasses all flags). Fail-closed *before* hiring scoped doctors or launching a new service line. |
| P2-10 | Ops | Migration tracker hygiene — duplicate row + R2–R6 from the 2026-04-21 drift audit | Cosmetic; `supabase migration repair` when convenient. |

### ⚪ P3 — Nits

- Violet `status-dot` for `awaiting_script` (operator-only, off-palette) — design drift.
- ~25% of unit tests still use "should" prefix; broad Playwright suite is stale (non-blocking debt).

---

## Strategic decisions (not bugs — calls only the operator can make)

1. **Channel inversion.** Roadmap leads with a paid ramp; the economics say **organic/SEO should lead**. A 93-guide rewrite backlog ($0 CAC, compounding, no engineering bottleneck) sits deprioritized below a 4.7:1 money-losing channel. At current organic (~$688/30d) the gap to $1M is ~121× — but paid as-is *widens* it. **Flip the priority: SEO compounding first; paid only on high-intent ED/hair-loss branded search where AOV ≥ $50.**
2. **Recurring revenue.** Weight loss ($89.95) is gated/manual-only. It's the high-LTV recurring engine Mosh/Pilot/Eucalyptus/Juniper win on (a 6-month program at $100/mo = $600 LTV vs a one-off $90). The one-off-only model **structurally caps the business** at the solo-doctor ceiling. The single biggest strategic trade-off — worth a deliberate decision, not a default.
3. **Pricing anchor.** A $19.95–$39.95 med cert (65% of mix, ~$27 AOV) **cannot** support paid CAC. Med certs are an *organic* product. Paid only works if the mix shifts to ED/hair-loss/women's-health — and there's **zero evidence** that's happening on paid (30d: ED 3, hair-loss 0, women's 0).

---

## Calibration note (why the severity ranking is honest)

Sub-agents over-claimed four times; each was verified against source and corrected:

| Sub-agent claim | Reality (verified) |
|-----------------|--------------------|
| "Two HIGH-severity fail-open gates (capability + prescribing-identity)" | `lib/request/prescribing-identity.ts:49` actually fails **closed** for every real service (only falls open with zero context). Capability gate falls open **by design**, moot while solo-admin. → downgraded to P2. |
| "Express toggle priority fee +$29" | Code references `PRICING_DISPLAY.PRIORITY_FEE` = **$9.95**. Hallucinated number. |
| "228 text-sm/xs P0 violations" | DESIGN.md 16px rule targets **body** copy; helper/caption at 14px is fine. Real finding = sub-14px microcopy drift → **P2**, not P0. |
| "Auto-check the consent checkbox to unblock Pay" | **Rejected — compliance-dangerous.** Informed consent is the medico-legal spine. The gate is correct and already collapsed to a single consent. |

---

## Recommended remediation roadmap (sequenced — not yet executed)

**This week (P0):**
1. Cap/pause Google Ads outside proven exact-match terms (operator action in Ads UI; no code).
2. Fix the prescriptions-landing dead-end CTA — small, high-leverage edit. Pair with `/clarify` (copy-touch rule).
3. Decide the queue-capacity lever (auto-decline threshold vs second doctor).

**This month (P1):**
4. Attribution reconciliation: dedup server conversions to Supabase paid rows; verify the wrong-type Google Ads conversion action; confirm `intake_abandonment` schema reload.
5. Move email capture to `/request` entry + build/measure the recovery sequence to the 15 warm abandoners.
6. Ship `pnpm check:integrations` into `release:check`.

**Later (P2/P3):**
7. `/audit` + `/typeset` pass on intake microcopy; fail-closed the capability gate before multi-doctor; migration-tracker hygiene; status-dot palette fix.

**Strategic (decide first):** channel re-prioritization (SEO-first); recurring-revenue / weight-loss decision.

---

## Verification (how to validate findings + any future fixes)

- **Economics/attribution:** re-run `scripts/conversion-funnel-audit.ts`; confirm PostHog `google_ads_server_conversion` converges toward Supabase paid rows after dedup. Always filter `is_e2e=false`.
- **Queue SLA:** `/admin/ops` "Integrity (weekly invariants)" strip (Q1) — `getOperationalInvariants()` in `lib/admin/ops-invariants.ts`.
- **Recovery:** E2E the entry-point email capture → abandon → recovery email → paid resume; assert a non-zero recovered count (currently 0/5).
- **Dead-end CTA:** load `/prescriptions`, click the new-prescription CTA, assert it lands on a payable intake, not the hub redirect.
- **Integration types:** `pnpm check:integrations` must assert each `STRIPE_PRICE_*` is `one_time` and the Google Ads action is `UPLOAD_CLICKS`.
- **No regressions:** `pnpm ci` + the blocking E2E smoke (`e2e/admin.ops-index.spec.ts`, `medcert:readiness:e2e`, `unified-request-flow.spec.ts`).

---

## Explicitly NOT recommended

- ❌ Auto-checking consent (compliance).
- ❌ Reintroducing subscriptions / `invoice.*` handlers without a `docs/BUSINESS_PLAN.md` decision.
- ❌ Treating microcopy size as a P0 emergency.
- ❌ Scaling paid to "grow out of" the CAC problem — that accelerates the loss.
- ❌ Touching the stack pins, clinical language locks, or the med-cert duration cap.
