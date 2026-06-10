# 2026-06-10 Comprehensive Platform + Business Audit

> Multi-agent audit (44 agents across 2 workflows: 9 platform lenses + 6 web-grounded business lenses, with adversarial verification on P0–P2 findings and load-bearing market claims).
> Operator mandate: stage 1 = $5–15k/mo profitable → stage 2 = $1M/yr run-rate · $500–1,500/mo growth budget · solo + automate · gated verticals decided by this audit.

---

## 1. Platform verdict

**Structurally healthy.** typecheck/lint green, 3,252 tests pass (0 fail), stack pins enforced, queue empty, crons running, Google Ads CAPI uploading cleanly, auto-approval deterministic-routing fix verified holding in prod (4 auto-approvals at 18s each, deterministic refusals short-circuit correctly, no retry-loop burn since Jun 7).

### P0 — live PHI leak (FIX BLOCKED, needs operator approval)

`v_stuck_intakes` is a SECURITY DEFINER view (runs as `postgres`, bypasses RLS) with **full grants to `anon` and `authenticated`**. Verified live: the public anon key returns real patient names + emails over PostgREST (HTTP 200). Origin: baseline migration + `20260502010500`. Only consumed server-side via service role (`lib/data/system-health.ts`, `lib/data/intake-ops.ts`), so the fix breaks nothing.

```sql
BEGIN;
REVOKE ALL ON public.v_stuck_intakes FROM anon, authenticated;
ALTER VIEW public.v_stuck_intakes SET (security_invoker = on);
REVOKE ALL ON public.compliance_audit_summary FROM anon; -- hygiene; already security_invoker
COMMIT;
```

Then: add a migration file mirroring this, and a contract test / advisor gate so no future public view grants anon SELECT. Also assess APP/NDB notification obligations (the view exposes name + email + service category; access logs unknown).

Related (P2): `profiles` INSERT RLS policy is `with_check=true` for role `public` — anon can insert junk rows (write-only; no read path). Scope it `TO service_role`.

### P1 — operational blindness (two independent holes)

1. **Sentry ingestion dead since 2026-06-06 06:03 UTC.** Zero events of any level for 4 days while prod kept working. Every alarm built this year (checkout-error fatal, Google Ads conversion fatal, stale-queue, SLA breach, DLQ) is currently inoperative. A real 26.2h med-cert SLA breach (Jun 7–8, IM-20260607-239EEF) went unalerted. Prime suspects: quota exhaustion (CSP noise: 2,889+ events on one issue) or DSN/init regression in the Jun 6 deploy. **Action:** check Sentry stats for drops, fire a manual `captureMessage` from prod, kill the CSP noise at source, and wire the SLA-breach alert to Telegram (already integrated) so clinical alerting survives the next Sentry outage.
2. **Resend delivery webhook has never fired — 0 of 692 emails have `delivery_status`.** Handler exists and is correct (`app/api/webhooks/resend/route.ts`); the endpoint was never registered in the Resend dashboard (or secret unset). Email is the ONLY patient channel; cert-delivery to bouncing addresses looks identical to delivered. CertHealthChip renders states that can never occur. **Config-only fix.**

### P2 — shipped-but-dark revenue/measurement work

| Item | State | Action |
|---|---|---|
| `heard_about_us` survey (#116) | Live but **not collecting**: 1 shown / 0 answered vs ~7 paid orders since ship | Debug card render + token plumbing on both success + complete-account surfaces. The entire dark-traffic attribution strategy depends on this |
| Backfill email (#119) | Never executed (0 rows) | POST `/api/admin/heard-about-us-backfill` dry-run → send (~40 candidates) |
| Refill-reminder email (B1) | Built, migration applied, **env flag unset in all scopes** | Review copy → `REFILL_REMINDER_EMAILS_ENABLED=true` in Production |
| `llms.txt` + `llms-full.txt` | **Still advertise $19.95** (the #117 sweep only covered .tsx/.ts/.mdx) | Update to $24.95; generate from PRICING at build or add contract test |
| Webhook DLQ | 21 unresolved synthetic test rows; CI test events still written to prod DB after #114/#115 guards | Bulk-resolve; skip/auto-resolve `evt_test_`/`evt_smoke_` non-livemode events |
| Migration tracker | `pnpm db:check-migrations` FAILS — 3 MCP-applied versions vs 3 disk filenames | `supabase migration repair`; update stale CLAUDE.md notes (migrations ARE applied; pricing table says $19.95) |
| STRIPE_PRICE_MEDCERT | Missing from Preview scope only | `vercel env add` (test-mode id) |
| B4 server high-stakes block | Client soft-gate only; checkout still accepts payment for high-stakes certs | Wire `checkHighStakesUseCase` into `runClinicalValidation` med-cert branch (mirror S8 pattern) |
| B5 S8 net on consult free-text | `current_medications` absent from blocklist candidate keys | One-line fix in `lib/operational-controls/medication-blocklist.ts` |
| `/consult` title | Duplicated `| InstantMed` suffix | One-line metadata fix |

### Funnel (code-grounded, PostHog-verified)

- **All step-1 loss is pre-completion** (133 viewed → 79 completed → 79 reached symptoms; transition itself is 100%). Mobile-skewed (−42% on ~75% of traffic).
- Step 1's only required input (certificate type) shows its validation failure **off-screen at the top** with no scroll/focus — the mobile user taps the sticky CTA at the bottom and sees nothing happen.
- **16 med-cert intent landing pages pass NO certType** despite full URL plumbing existing (`initialCertType` already wired in `app/request/page.tsx:237`). A `/medical-certificate/work` visitor still has to answer "certificate type".
- Details step renders a phone field for med-certs (rule: phone NOT needed for med certs) on the form that loses 28% of guests.
- Checkout converts ~94–95% — do not touch it.

**Top 5 ranked fixes:** (1) pre-seed certType from intent pages [S]; (2) scroll-to-error on blocked Continue in certificate + symptoms steps [S]; (3) remove/collapse phone field for med-certs [S]; (4) compress step 1 to one mobile viewport + gate the duration nudge to post-interaction [S/M]; (5) "18+" eligibility line before DOB + step-1 drop monitoring at the new floor price [S].

### Product gaps

- **Retention is the structural hole**: repeat behavior is exclusively med-cert→med-cert (11/77 patients; zero cross-service second orders ever). 8 of 15 repeat gaps are ≤1.1 days = same-illness extension purchases. Cheap moves: "still unwell → extend" email on cert expiry evening (email_outbox `scheduled_for` exists); one-click rebuy card on dashboard; add repeat-Rx to the success-page demand probe (currently ED/hair-loss only — the wrong adjacency for an 86% med-cert base).
- **Women's health is ~1–2 weeks from launchable** (steps, validators, Stripe env, email template all exist; needs landing page + screener deepening + ungate).
- Weight loss: marketing page is a redirect stub (verifier refuted the CTA-loop claim); steps exist incl. a call-scheduling step.
- Referral letters/pathology: display-only, no pipeline (~1–2 weeks each; defer).
- Express attach 1.9% — B7 reframe (two-option choice card) unbuilt; honest value prop is thin at 36-min med-cert reviews. Test on Rx/consult flows or retire on med certs.
- SERVICE_METADATA.weight_loss prices at $49.95 not $89.95 (latent bug for whoever launches it).

---

## 2. Business verdict

### Competitive position (12 competitors, live pricing fetched)

| Provider (backer) | 1-day cert | Repeat script | Modality |
|---|---|---|---|
| **InstantMed** | **$24.95** | $29.95 | form-first async |
| InstantScripts (Wesfarmers, $135M exit) | $19 ($9 promo) | from $19 | form-first async |
| Hola Health (Woolworths-backed, $70M val) | $14.90–16.90 | from $18.90 | form-only async |
| Updoc (Bailador $20M) | $39.95 or $19.95/mo sub | sub | form + callback |
| hub.health (nib) | $24.95 | $35 | phone consult |
| Qoctor (GP-owned) | $14.99 | $24.99–31.99 | mandatory call |
| NextClinic | $19.90 | from $24.90 | form-first async |
| Budget cluster (Doccy/OnCare/MediLeave) | $12.90–15.95 | — | async |

- $24.95 1-day is the **most expensive form-first cert in AU**; competitive at 2-day ($29.95 ≈ NextClinic $29.90, beats Hola $39/InstantScripts $49) and 3-day ($39.95). Express $9.95 undercuts Qoctor's $20.99.
- Feature gaps: SMS delivery (everyone has it), "only charged if approved" framing (NextClinic/OnCare — same economics as our refund-on-decline, better conversion copy), AfterPay, native app (skip), delivery (skip), 24/7 (skip).
- **Live data so far supports holding the floor test**: no volume drop (2.5/day vs 1.14/day prior; n=5), AOV up. Keep the 14-day window + >15% volume kill rule. The real exposure is LLM price comparison — fix llms.txt and ship a price-comparison page we control.
- **The defensible wedge (three layers no funded player can easily copy):** (a) LLM/dark-traffic dominance (~50% of orders; Wesfarmers/Woolworths budgets buy Google, not citations); (b) minutes-fast auto-approval with real doctor oversight at near-zero marginal labour; (c) conservative-compliance positioning — the regulatory overhang threatens the $12.90 cert mills more than a visibly careful operator. Price slightly above the floor, justified loudly by "a real doctor reviews every request", and let regulation cull the bottom.

### Regulatory risk register (verified against primary sources)

- MBA telehealth guidelines (in force 1 Sep 2023, reaffirmed Oct 2025): prescribing/certifying "via questionnaire-based asynchronous web-based tools in the absence of a real-time patient-doctor consultation **is not good practice**" — s39 guidance enforced via practitioner discipline, not statute; explain-yourself valve exists. **Telephone counts as real-time; video not required.**
- Enforcement targets high-volume single-medicine verticals (cannabis crackdown: 57 practitioners actioned; GLP-1 discipline live; TGA fines $319k incl. $198k to Midnight Health). Exposure ranking for InstantMed: **ED/hair-loss first scripts (tribunal precedent exists) > repeats ("usual practitioner" exception does NOT apply to us) > med certs**.
- Med-cert-specific: *Fuller v Madison Branson* [2025] FWC 784 — a no-consultation online cert ruled "devoid of probative value". One adverse FWC mention of an InstantMed cert is the realistic brand-killing event for an 86%-med-cert business.
- **Avant withdrew indemnity cover for asynchronous consults (2023).** Whether the current doctor's indemnity covers form-first async work is an unverified, existential assumption. Verify in writing this week.
- Single-doctor concentration: registration conditions on one person = platform stops. A second reviewing doctor is risk infrastructure, not just capacity.
- **Highest-leverage mitigation:** a 3–5 min doctor-initiated phone call on every FIRST prescription (ED, hair-loss, new Rx) converts the exact condemned fact pattern into a compliant real-time telephone consultation. Med certs stay form-first with hardened named-doctor accountability on auto-approvals.

### Gated verticals — the calls

**Weight loss: DO NOT launch as built. Revisit in 6+ months as LAUNCH-DIFFERENTLY.** Async one-off GLP-1 initiation at $89.95 is squarely "not good practice", possibly uninsured, in the hottest enforcement zone (TGA fines, AHPRA GLP-1 discipline, eating-disorder media heat). The verticals (Juniper $349–499/mo, just absorbed into Hims & Hers at US$1.15B) own paid acquisition. The only model that fits: script-only **continuation/renewal** for patients already established on GLP-1s (vs $4–6k/yr memberships), mandatory call on initiation, $99–129, zero drug names, gated on written indemnity confirmation + doctor call capacity + demand-probe data. Meanwhile: replace the gate redirect with a waitlist email capture (demand probe).

**Women's health: LAUNCH-SUBSET, repriced, within 90 days.** Launch OCP **resupply** ($29.95–39.95, kill the $59.95 price — 1.5–2.4x market) + **period-delay** ($29.95, the cleanest niche: S4, no pharmacy substitution, competitors $24.90–29.99). SKIP UTI (pharmacist prescribing is permanent + free in VIC; antibiotics-in-hand beats async). DROP emergency contraception + thrush (S3 OTC). First-time prescribing gets a real-time doctor call; resupply for returning patients stays form-first. Deepen the generic assessment step into a structured MEC screener (ED 4-step is the template). Build ≈1–2 weeks. Size honestly: 5–20 orders/mo near-term — the payoff is the **first genuine annuity** (pill resupply 3–4x/yr) + a large SEO/LLM content surface.

### Channel economics at $500–1,500/mo (ranked)

1. **GEO/LLM compounding** ($0–200/mo, CAC ~$0–5): ChatGPT search runs on Bing's index (87% citation overlap) and cites Reddit/comparison listicles; llms.txt is ~0.1% of bot requests (fix the price anyway, stop counting it as coverage). Bing Webmaster Tools, statistics-rich comparison content with a real competitor price table, authentic Reddit answers. Signal: 4–8 weeks via the heard_about_us `ai` bucket.
2. **Comparison/review placements** ($200–600/mo, CAC $5–20): medicompare + newdoc listings, ProductReview sponsored listing (Updoc runs exactly this), finder.com.au conversation. **The LLM channel and the comparison-site channel are the same channel** — every dollar compounds twice.
3. **Capped Google exact-match probes** ($150–500/mo): `[hair loss treatment online]` at $2.70 Manual CPC cap first; $150 med-cert exact probe at $1.50 cap, kill if CPA>$25 after 25 clicks. Head terms are structurally unaffordable (market $3.60 avg vs $1.50 break-even; 6–10 funded bidders).
4. **OzBargain deal post + referral loop** (cost = discount): first-order-only code; precedent Updoc/Docly. Signal in days.
5. **Meta hair-loss condition-led test** ($300–500/mo) only after the Google probe validates demand. Rx DTC is banned on Meta in AU; hair-loss is the lightest-policed category; ED/weight-loss are heavy + TGA 2026 priority.

Parked: TikTok (policy-hostile), HR platforms (incumbent-locked), university wedge (conflicts with our own high-stakes block), pharmacy BD at scale (Chemist Warehouse/InstantScripts lock) — though a founder-sold 5–20 independent-pharmacy QR pilot remains a credible 60–90 day experiment (the InstantScripts $135M wedge, miniaturized).

### Growth playbooks (reverse-engineered from comps)

- **NextClinic = the proven solo-operator moat**: programmatic per-city/state med-cert pages (~3,500 words, price-led H1, QR/AHPRA trust block, 15+ FAQs). The only in-category channel a bootstrapper has defended.
- **Updoc proves repeat economics** (67% direct traffic, membership monetization) — copy the intent (refill reminders, saved-details reorder) without the dark-pattern auto-billing (their 1.6-star complaint pattern).
- **Employer verification loop**: market `/verify` to employers/HR — answers the #1 objection, pre-empts the RACGP "farcical" attack, and is a conversion trust signal.
- **Compliance-as-brand**: the MBA/RACGP/TGA heat lands on the cheapest "instant" players and drug-name advertisers first. Say the conservative posture loudly.
- What does NOT transfer down: Eucalyptus/Updoc-scale paid acquisition, bulk-billed after-hours (MBS 12-month rule), TV brand campaigns, membership auto-billing.

---

## 3. The scaling plan

### Stage 0 — protect the base (this week)

1. **P0 view fix** (SQL above — blocked on operator approval) + migration + contract test + NDB assessment.
2. **Restore Sentry** (quota/DSN), kill CSP noise, add **Telegram fallback for SLA-breach + fatal alarms**.
3. **Register Resend delivery webhook** (config-only).
4. **Fix the heard_about_us survey render** — the attribution flywheel is dead without it.
5. Run the **backfill email**; enable **refill reminders**; fix **llms.txt prices**; DLQ cleanup + test-event guard; migration repair; B5 one-liner; CLAUDE.md staleness sweep.
6. **Operator (non-code): written indemnity confirmation covering form-first async prescribing.** Existential, unverified.

### Stage 1 — to $5–15k/mo (90 days)

Target: ~170–500 orders/mo (6–17/day) at ~$29 AOV. Levers, in order:
1. **Funnel fixes** (top 5 above) — the −40% step-1 leak on 86% of volume is the single highest-ROI engineering work on the platform.
2. **Conversion framing parity**: "only charged if approved" reframe, SMS delivery (cheap provider), AfterPay toggle.
3. **Channels**: GEO + comparison placements + capped probes + OzBargain + programmatic geo SEO + employer-verify page. Budget fully allocated within $500–1.5k/mo.
4. **Retention engine**: refill reminders ON, cert-expiry "extend" email, repeat-Rx in the success probe, one-click rebuy.
5. **Women's health subset launch** (OCP resupply + period-delay, repriced, call-on-first-prescribe).
6. **Compliance hardening**: 3–5 min call on first ED/hair/new-Rx scripts; B4 server-side high-stakes block; named-doctor accountability narrative for auto-approvals.
7. Hold the $24.95 floor unless volume drops >15% in the 14-day window.

### Stage 2 — to $1M run-rate (6–18 months, gated)

- Resume Google Ads only per the existing gate (verified conversion firing, AOV lifted, free-CAC baseline, CPC < contribution). Scale what the probes proved.
- Second reviewing doctor (registration de-risk + capacity) + support hire per REVENUE_MODEL triggers.
- Meta/TikTok quiz funnels for ED/hair-loss once paid-probe demand is proven.
- Weight-loss continuation lane only behind indemnity + capacity + probe-demand gates.
- Optional: micro-pharmacy pilot (founder-sold, 5–20 independents, QR attribution).

### Honest ceiling

$1M/yr = ~91 orders/day vs ~1/day today. On this budget the realistic 12-month outcome is **$8–20k/mo** (conversion 1.5–2x × channel compounding 3–5x × retention 1.3x). The jump to $1M needs either paid acquisition working at scale post-AOV-lift or a second distribution wedge (pharmacy/employer). Stage-1 success is the prerequisite evidence for both.

---

*Workflow run IDs: wf_5fd839a0-5d8 (platform), wf_f349dc2d-991 (business). Full agent outputs in session task files.*
