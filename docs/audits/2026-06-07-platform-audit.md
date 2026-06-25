# InstantMed Platform Audit — Final Report
*9-dimension audit · 3-brain adversarial verification · 90-day production data · 2026-06-07*

---

## 1. Executive summary

1. **Refunds silently break for referral-credit + Express-Review customers** — `issueRefundAction` (`app/doctor/queue/actions.ts:1176`) refunds against stale `intakes.amount_cents`, so coupon orders hard-fail ("Refund amount > charge") and Express orders under-refund by $9.95. This is a money + compliance + complaints problem on a 100%-refund-on-decline promise. **One root cause (PAY-3), one-line fix.**
2. **Your highest-volume service leaks ~37% at a step that is also before email capture** — med-cert symptoms step (`components/request/steps/symptoms-step.tsx`) forces free-text behind an opaque validator; abandoners have `email=null` so the existing recovery cron can never reach them. Largest single recoverable revenue loss (CONV-1 + PROFIT-1).
3. **Any non-admin doctor can enumerate the entire patient roster** — `/api/search` (`app/api/search/route.ts:71`) returns name + masked Medicare for ALL patients with no relationship scope, contradicting the documented Phase 7.1 boundary. PHI/APP-11 violation; latent today, default-on the moment it's wired to UI (SEC-1).
4. **S8/controlled-substance hard-block is skipped on the consult/new-prescription path** — `lib/stripe/checkout/clinical-validation.ts:67-74` runs only the DB blocklist (no S8 seed) for consult, not the `isControlledSubstance()` regex. Defense-in-depth is one layer for repeat scripts and zero for consult (CLIN-1).
5. **Client purchase pixel decay is a fixable regression, not adblockers** — PostHog init is gated behind first user interaction (`instrumentation-client.ts:114`, shipped `ffd4a714e` on the exact decay date), so `purchase_completed` no-ops on the success page. Revenue truth survives server-side; product analytics and a chunk of Smart Bidding signal do not (TRK-1).

**The pattern:** the biggest dollar wins are not new features — they're (a) one stale-amount field corrupting refunds + reporting, and (b) one free-text step bleeding the cheapest traffic before you can even email them back.

---

## 2. P0 / P1 — fix now

Ordered by severity then $ impact. All carry 3/3 confirmed votes unless noted.

| # | Issue | File:line | Why it matters | Fix |
|---|-------|-----------|----------------|-----|
| **PAY-2** | Manual refund **FAILS** for referral-credit customers (refund > charge) | `app/doctor/queue/actions.ts:1225` | Declined patient is NOT refunded; case stuck `paid`. Compliance + complaints breach of 100%-refund promise. *(1 brain said P2 — narrow blast radius; 2 said P1)* | Drop the explicit `amount` in `issueRefundAction` (mirror `decline-refund.ts:99`) OR set `amount_cents = session.amount_total` on paid transition |
| **PAY-1** | Manual refund **under-refunds** Express customers by $9.95 | `app/doctor/queue/actions.ts:1176` | $9.95 silently retained; intake flips to `partially_refunded` looking like operator error → chargeback risk | Same fix as PAY-2/PAY-3 (single root cause) |
| **PAY-3** | `intakes.amount_cents` never reconciled to real Stripe `amount_total` | `app/api/stripe/webhook/handlers/checkout-session-completed.ts:287` | Root cause of PAY-1 + PAY-2 + revenue-dashboard drift + Q4 over-refund invariant reads a wrong number | On paid transition (both `checkout.session.completed` + `async_payment_succeeded`) set `amount_cents = session.amount_total`. **This single change neutralizes PAY-1/2 and reporting drift.** |
| **SEC-1** | `/api/search` leaks full patient roster to any non-admin doctor | `app/api/search/route.ts:71-113` | PHI/APP-11 boundary violation; contradicts documented Phase 7.1 scope rule; no contract test guards it | After `hasDoctorAccess`, if `!hasAdminAccess` constrain to `getDoctorAccessiblePatientIds(...)` via `.in(...)`; add assertion to `future-doctor-scope-contract.test.ts`. *(Note: must add `id` to the callerProfile select at line 43.)* |
| **CLIN-1** | S8 regex hard-block skipped on consult / new-prescription checkout | `lib/stripe/checkout/clinical-validation.ts:67-74` (+ `guest-checkout.ts`) | S8 med via consult passes checkout unless every term is manually blocklisted; owner has `can_prescribe_s8=true` so Parchment gate doesn't fire either. TGA/medico-legal. *(2 brains P2: active subtypes ed/hair-loss have no free-text med entry; reachable via API or future subtype reactivation)* | Run `isControlledSubstance(getMedicationBlocklistCandidate(...))` in the `category==="consult"` branch of BOTH files; extend `extractRequestedPrescriptionMedicationTexts` to read `consult_details` |
| **TRK-1** | PostHog init gated behind first interaction → `purchase_completed` no-ops on success pages | `instrumentation-client.ts:112-164` | Client purchase under-reports ~90% (6 client vs 204 server/90d); funnel uninterpretable; Smart Bidding value signal thin for non-gclid. *(1 brain P2: server revenue truth intact)* | Add `isPostConversionPath()` bypass to PostHog init (mirror `google-tags.tsx:59` + `global-deferred-clients.tsx:146`) |
| **CONV-1 / PROFIT-1** | Med-cert symptoms step loses ~36% behind opaque free-text gate, and it's **before email capture** | `components/request/steps/symptoms-step.tsx:112-224`; `step-registry.ts:53-83`; `partial-intake-recovery.ts:97` | Highest-volume service (73% of checkout_initiated), biggest leak, p90 191s on step, AND abandoners are unrecoverable (`email=null`) | Add tap-to-select symptom chips above textarea (mirror ED), AND capture email one step earlier so the existing recovery cron reaches abandoners |
| **CONV-2** | Continue/Pay button disabled with **no inline reason** on symptoms/cert/ED steps | `components/request/steps/symptoms-step.tsx:215-224` | Patient can't tell why they're stuck → sits on greyed button (drives the 191s p90) → abandons. `patient-details-step.tsx:112` already solved this and wasn't copied | Make primary action always-clickable + run `validate()` on click, OR add the patient-details-style top-of-step validation summary |
| **PROFIT-2** | Express Review is an invisible 8px toggle, no value prop → 13% attach | `express-review-toggle.tsx:22-47`; `checkout-step.tsx:276` | $9.95 = +50% AOV/attach, pure margin; cheapest AOV lever in the catalogue | Reframe as a two-option choice card with compliant benefit line ("reviewed first, most within the hour"). Keep default OFF. `/clarify` copy |
| **PROFIT-3** | 1/2/3-day med-cert tiers never anchored/upsold; AOV stuck at $19.95 floor | `certificate-step.tsx:147`; `checkout-step.tsx:222`; `lib/constants/index.ts:119` | Med-cert = 73% of volume; `REVENUE_MODEL.md:123` names this the top profit lever; zero clinical complexity (3-day cap already enforced) | Anchor tiers ("covers the weekend / most chosen"), add one-tap "+1 day for $10" upsell at checkout for 1-day selections. `/clarify` copy |
| **PROFIT-4** | No reactivation/repeat-purchase email exists — LTV structurally zero | `lib/email/review-request.ts`; no winback template | Only post-approval email asks for a Google review. Returning customers = ~zero CAC vs Google Ads (the majority of paid volume) | Build one reactivation cron + template gated by `canSendMarketingEmail`. Start with repeat-script refill reminders timed to supply window |

---

## 3. Bugs / regressions from recent changes (#94-98 era)

The incident fixes are genuinely correct — DETERMINISTIC_FAILURE_PREFIXES is complete and bidirectionally pinned, claim lifecycle sets/clears `claimed_at` everywhere, #95 backfill is sound, deleted SEO routes leave no dangling imports. The residue:

- **RECENT-1 (P2, 3/3 confirmed) — the deterministic-routing contract test is sample-based, not source-derived.** `lib/__tests__/auto-approval-deterministic-routing-contract.test.ts:33-99` asserts against a hardcoded local array, never parsing `auto-approval.ts`. The list is correct *today*, but a future `flags.push('seizure_history:...')` without updating the prefix list will pass the test and recur the exact 2026-06-07 incident (med certs stuck 9-46h). **Fix:** parse `auto-approval.ts` with `readFileSync` + `flags.push(` regex and assert every emitted prefix is classified — same pattern as `stripe-webhook-handler-parity-contract.test.ts`.
- **RECENT-2 (P3, passthrough) — set-password card mislabels OAuth-only operators.** `settings-client.tsx:198-217`: the `providers.size===0 && email` fallback shows "Change Password" before `user` resolves; after a successful set-password, the card never re-syncs (stale "Set a password" until reload). Both your operator accounts are Google-only. Gate on user-resolved + `router.refresh()` on success.
- **RECENT-3 (P3, passthrough) — redundant `router.refresh()` after sibling-route push.** `use-intake-actions.tsx:262-279`: `router.push(nextIntake); router.refresh()` can double-fetch on the hottest operator action. Verify `[id]` segment staleness; if Next already refetches on push, drop the refresh.

---

## 4. Security / PHI / clinical-safety

Posture is **strong and consistent** — every mutating action checks auth before side effects, ownership/IDOR maps to session, support role correctly bounded, PHI AES-256-GCM with fail-closed decrypt, logger scrubs PHI, sensitive rate-limits fail closed, dev routes 410 in prod. The gaps:

- **SEC-1 (P1)** — `/api/search` roster leak. See §2.
- **CLIN-1 (P1→P2)** — S8 block skipped on consult path. See §2.
- **CLIN-2 (P2, 3/3) — intake-time high-stakes + emergency block is dead code.** `validateIntake()`, `checkHighStakesUseCase()`, `quickEmergencyCheck()`, `HIGH_STAKES_PATTERNS` have **zero callers** in `app/`/`components/`. High-stakes (exam/court/driving) is only caught AFTER payment by the auto-approval keyword scan → patient pays → doctor declines → 100% refund. Defense-in-depth degraded + a pay-then-decline refund leak. **Fix:** wire `checkHighStakesUseCase()` into the symptoms step + add a server-side high-stakes DECLINE rule to `medCertSafetyConfig` (where emergency free-text is already re-scanned). If auto-approval-only is the intent, delete the dead code and correct the comments + CLAUDE.md.
- **SEC-2 (P3, passthrough) — dead `createOrGetProfile`** accepts an arbitrary `userId` with no caller-identity check (`app/actions/create-profile.ts:12`). Zero callers today; latent unauthenticated profile-creation primitive. **Delete it** — `ensureProfile` is the hardened equivalent.
- **SEC-3 (P3, passthrough) — `withServerAction` UserRole union omits `support`** (`lib/actions/with-server-action.ts:36`), forcing `issueRefundAction` to hand-roll its gate. Type footgun, no live vuln. Add `support` to the union.
- **CLIN-3 (P3, passthrough) — `MAX_MED_CERT_DURATION_DAYS=3` is test-only**, never passed to `validateCertificateDateRange` (called with `maxDurationDays: 30`). Live risk low (schema caps new intakes at 1/2/3), but the legacy `multi_day` branch has no upper cap. Pass the constant so it's load-bearing.

---

## 5. Conversion & revenue *(the part that matters most)*

### The funnel, in numbers (May–Jun, E2E excluded, unique users)
- **Med-cert:** certificate 124 → symptoms 79 (**−36%, the single biggest leak**) → details 59 → checkout 43. Symptoms p90 = **190.5s** vs 36.8s on certificate.
- **ED:** ed-goals 27 → assessment 26 → health 25 → preferences 24 (**~89% retention**). Pure tap-to-select, zero free text, zero quality gate.
- **Prescription:** medication 54 → medication-history 29 (**−46% at the FIRST transition**) → details 28 → review 9. Weakest paid path.
- **Volume skew:** med-cert 165 checkout_initiated vs 88 for everything else. ~2.2 orders/day.

### Why symptoms leaks (CONV-1/CONV-2)
Med-cert is the *only* flow that forces a free-text box gated by `validateSymptomTextQuality` (~180 hardcoded English stems). Write "tummy bug" (only "tummy" is a stem) or "crook" and **Continue silently greys out with no reason** — the opposite of what `patient-details-step.tsx` already learned. ED never makes the patient type and keeps 89%. The 191s p90 is people sitting on a disabled button trying different words.

### checkout_failed clarified
The "~147/90d" in the brief is the **server-side** `intakes.status='checkout_failed'` DB count (Stripe-price / identity-validation rejections). **Client-side** `checkout_failed` is only **22/90d / 7 users**, all `session_creation` (repeat-script 11 > consult 7 > med-cert 4). The funnel problem is upstream of Stripe, not at it.

### Client pixel decay (TRK-1) — real, fixable
Apr 20 → May 5 → Jun 2 client `purchase_completed`, exactly tracking `ffd4a714e`. Server CAPI + `webhook_payment_confirmed` carry revenue truth and Google dedups on `orderId`, so **ad spend is not blind** — but product analytics is broken and non-gclid value signal is thin.

### Prioritized growth plays — $ / effort / sequence

| Play | Finding | Est. uplift | Effort | Why now |
|------|---------|-------------|--------|---------|
| 1. Symptom chips + early email capture | CONV-1, PROFIT-1 | Recover even 5pts of the 37% leak ≈ **~10% more paid med-cert volume**; abandoners become email-recoverable at zero infra cost | **S** | Biggest single recoverable loss, highest-volume service |
| 2. Always-clickable CTA + inline reason | CONV-2 | Removes the dead-end driving the 191s p90; compounds play #1 | **S** | Pattern already exists in patient-details |
| 3. Reframe Express as a choice card | PROFIT-2 | 13%→25% attach ≈ +12pts × $9.95 pure margin; scales linearly with volume | **S** | Cheapest AOV lever; later shipped as Priority review in `79b8ab286` |
| 4. Anchor + upsell 2/3-day tiers | PROFIT-3 | Blended med-cert AOV $20 → toward model's $27 = the gap between ~$40k and ~$54k/mo at target | **S–M** | Top lever named in REVENUE_MODEL; zero clinical complexity |
| 5. Fix PostHog init gate | TRK-1 | Restores client funnel + Enhanced-Conversions coverage; unblocks every product decision | **S** | One-line bypass; un-blinds analytics |
| 6. Reactivation / refill-reminder email | PROFIT-4 | +10–20% monthly orders at ~zero CAC | **M** | Best ROI at scale; LTV currently zero by design |
| 7. Merge prescription history screens + defer identity | CONV-4 | Attacks the −46% medication→history drop on a higher-margin path | **M** | ED's single-accordion health step retains 96% |
| 8. Restore med-cert checkout trust signals | CONV-3 | Lift the ~26% who view-but-don't-initiate; refund guarantee is the strongest objection-killer, currently hidden | **S** *(2-brain, medium confidence)* | Already built, only suppressed by `!isMedCertCheckout` boolean |
| 9. Add `service_type` to `intake_started` | TRK-3, PROFIT-7 | Unblocks per-service start→pay math — the number needed to allocate spend | **S** | Cheap unblock for every decision above |
| 10. Tilt spend toward ED/hair-loss | PROFIT-5 | 2.5× AOV, 2.4× better form retention; budget play within REVENUE_MODEL guardrails | **S** alloc | Only after gclid attribution + queue-P95 green |

**Sequence logic:** plays 1–3 + 5 + 9 are all **S** and ship in week 1. Plays 4, 6, 7 are the structural week-2 work.

### Analytics data-quality bugs blocking the above
- **TRK-3 (P2, 3/3)** — `intake_started` uses `service_type`, purchase uses `service`; neither key is on both ends → per-service funnels silently drop one end. Emit BOTH names on `intake_started`.
- **TRACK-1 (P2, 3/3)** — two incompatible `step_completed` schemas fire per advance (`step` from components, `step_id` from the hook) → step funnels double-count and mislabel. Delete the per-step captures, keep the hook's (it has `time_on_step_ms`); pin with a contract test.

---

## 6. Dead code / stale / jank

Cleanup only — none break current behaviour, but they rot and mislead the next dev/AI into thinking SMS/retry/AHPRA machinery is live. All 3/3 confirmed.

| Finding | What | Action |
|---------|------|--------|
| **DEAD-1** (P2) | Entire Twilio SMS subsystem — `lib/sms/service.ts` + `templates.ts`, zero callers, 3 orphan `TWILIO_*` env vars | Delete `lib/sms/`; drop `TWILIO_*` from deploy config |
| **DEAD-2** (P2→P3) | `lib/data/document-retry-queue.ts` queries `document_generation_retries` — **a table that doesn't exist in any migration** | Delete; live path is the `retry-drafts` cron |
| **DEAD-3** (P2) | 7 orphan modules: `monitoring/{doctor-activity,request-latency,document-generation,intake-abandonment}`, `clinical/{decision-support,approval-invariants}`, `ahpra/registry-client` — `approval-invariants` self-documents as a mandatory gate but enforces nothing; AHPRA cron bypasses `registry-client` entirely | Delete, or wire the clinically-meaningful ones into the approval path. Update `cron-surface-contract.test.ts:74` if doctor-activity goes |
| **DEAD-4** (P3) | Orphan service-funnel template (`service-funnel-configs.ts`, `service-funnel-page.tsx`) + duplicate `FinalCtaSection` post general-consult retirement | Delete config + shell if no route renders it; remove the `sections/` FinalCtaSection dup |
| **DEAD-5** (P3) | 6 dead data modules incl. `lib/data/cache.ts` (a full caching toolkit nobody uses), `consult-faq`, `consultation-types`, `session-timeout` | Delete orphans; adopt `cache.ts` in one fetch or remove it |
| **DEAD-6** (P3) | `lib/env.ts` re-export shim — zero importers; its comment claims callers that don't exist | Delete |

---

## 7. Performance

Genuinely good shape — queue batches renewal detection, decrypts PHI concurrently, polling is visibility-gated, staff-nav-counts cache eliminated the per-render PHI decrypt. No P0/P1. Real items:

- **PERF-1 (P2, 3/3) — patient-directory `script_tasks` scans the global top-1000 with no patient filter.** `lib/data/patient-directory.ts:308-312` fetches 1000 unrelated rows + joins every page load; the prescriptions branch directly above correctly uses `.in("patient_id", ...)`. **Correctness trap:** as `script_tasks` grows past 1000, "last script" silently disappears for patients on the page → directory sort goes wrong. *(1 brain said P1 for the silent data loss.)* Resolve page intake_ids first, use `.in("intake_id", intakeIds)` (index `idx_script_tasks_intake` exists), drop the limit to per-page.
- **PERF-2 (P2, 3/3) — doctor queue runs count then data serially.** `lib/data/intakes/queries.ts:260` fully awaits the COUNT before line 333 runs the page query, on the single hottest staff path. Wrap both in `Promise.all` (independent filters, both have fallbacks).
- **PERF-3 (P3, passthrough) — `getSystemHealth` uncached**, 4 count queries per staff member every 45s + on focus, unlike the deliberately-cached sibling `getStaffNavCounts`. Wrap in `unstable_cache({ revalidate: ~25 })`.
- **PERF-4 / PERF-5 (P3, passthrough)** — renewal-detection prescriptions query and 30-day business-scorecard scan both lack `.limit()`. Bounded today; add defensive caps (and push scorecard aggregation into Postgres long-term).

---

## 8. Health-check status

| Check | Status | Note |
|-------|--------|------|
| `pnpm typecheck` | ⚠️ warn | 2 errors are **stale `.next` cache artifacts** (refs to SEO routes deleted in #98), not source. Clean CI passes. `rm -rf .next` locally. |
| `pnpm lint` | ✅ pass | `--max-warnings 0`, clean |
| `pnpm test` | ✅ pass | 340 files, 3141 passed / 1 skipped, 9.3s |
| `check-stack-pins.sh` | ✅ pass | next/react/tailwind/framer/node 24/pnpm 10.23.0/webpack all pinned |
| `check-orphaned-files.sh` | ✅ pass | (only checks intake steps/flow routes — misses DEAD-1..6) |
| `check-route-conflicts.sh` | ✅ pass | |
| `sync-agent-doc.sh --check` | ✅ pass | AGENTS.md in sync |
| vercel.json cron ↔ route parity | ✅ pass | 23 crons all matched |
| Dev-route lockdown | ✅ pass | 410s in prod/preview, triple-guarded test login |
| Webhook sig verification (Parchment + cron) | ✅ pass | timing-safe, replay window, fails closed |

Two warns worth noting beyond the green: **SAFETY-1** — the `rx_controlled_substance` safety RULE (`lib/safety/rules.ts:266-286`) is **dead** (its `duration_days` derivation needs two string fields, gets one → returns null → never fires); its own comment falsely claims it's the S8 server-side safety net. The primary block holds for repeat scripts via `clinical-validation.ts:59`, but this corroborates CLIN-1. **COMPLIANCE-1** — partial-intake recovery emails have no explicit marketing-consent gate (`partial-intake-recovery.ts:94-103`); defensible as inferred consent under the Spam Act with working unsubscribe, but flagged for awareness.

---

## 9. What we verified as NOT a problem

The 3-brain panel **refuted 1 candidate finding**, so this report is filtered, not raw: **TRK-2** (claim that non-gclid orders are a single-point-of-failure because the client gtag chain is interaction-gated on conversion pages) split 1 confirm / 1 refute / 1 uncertain → **uncertain, excluded from the action list.** The refuting brain verified that `global-deferred-clients.tsx:146` and `google-tags.tsx:59` already bypass the first-interaction gate on post-conversion paths, and `trackConversion` queues to `window.dataLayer` so events survive the script load. The *underlying* concern (no server-side GA4 backstop for direct/SEO orders) is real but lower-severity than claimed. Also worth stating: the #94-98 incident fixes themselves verified clean (DOC-1 pass) — the auto-approval routing, claim lifecycle, and refund-decline guards are correct.

---

## 10. Recommended 2-week action sequence

**Week 1 — quick wins + the money bug (all S except where noted)**

1. **[PAY-3] Reconcile `amount_cents = session.amount_total`** on both paid-transition handlers (`checkout-session-completed.ts:287` + async). One change kills PAY-1, PAY-2, and reporting drift. *Add an E2E for refund-after-coupon + refund-after-express.* **← do this first; it's live money + compliance.**
2. **[SEC-1] Scope `/api/search`** to `getDoctorAccessiblePatientIds` for non-admins; add the missing contract-test assertion. (PHI; cheap; ship same PR as a test.)
3. **[CONV-1 + CONV-2] Med-cert symptoms: add tap-to-select chips + always-clickable CTA with inline reason.** Biggest funnel win.
4. **[PROFIT-1] Move email capture before symptoms** so abandoners hit the existing recovery cron.
5. **[TRK-1] Add `isPostConversionPath()` bypass to PostHog init.** Un-blinds analytics for everything below.
6. **[PROFIT-2] Reframe Express Review as a choice card** with compliant benefit copy (`/clarify`).
7. **[TRK-3 + TRACK-1] Standardize analytics props** — emit `service`+`service_type` on `intake_started`; delete duplicate `step_completed` captures; pin both with contract tests.

Terminology/status note added 2026-06-25: this historical audit used "Express Review". The current UI label is "Priority review", and the full-width choice row later shipped in `79b8ab286`.

**Week 2 — structural + clinical hardening**

8. **[PROFIT-3] Anchor + upsell med-cert 2/3-day tiers** at the selector and checkout. Top AOV lever.
9. **[CLIN-1 + SAFETY-1] Run `isControlledSubstance()` in the consult branch** of both checkout files; fix or delete the dead `rx_controlled_substance` rule and its misleading comment; extend Parchment med extraction to `consult_details`.
10. **[CLIN-2] Wire high-stakes check pre-payment** (symptoms step + server DECLINE rule) OR delete the dead functions and correct the docs.
11. **[RECENT-1] Make the deterministic-routing contract test source-derived** (parse `flags.push(`). Closes the incident-recurrence gap.
12. **[PROFIT-4] Build the reactivation / refill-reminder cron + template.** Highest ROI at scale.
13. **[PERF-1 + PERF-2] Fix `script_tasks` patient filter + parallelize the queue count/data queries.** Correctness + latency on the hottest staff path.
14. **[DEAD-1..3] Delete the Twilio SMS subsystem, `document-retry-queue.ts`, and the 7 orphan monitoring/clinical/AHPRA modules.** Decide whether `approval-invariants` should be wired as a real gate before deleting it.

**Deferred (do when convenient):** RECENT-2/3, SEC-2/3, CLIN-3, CONV-3/4, PROFIT-5/6/7, PERF-3/4/5, DEAD-4/5/6.
