# Free-channel compounding + repeat-Rx conversion repair — execution plan, 2026-08-24

> **Status: execution plan.** Elaborates existing ROADMAP ranks; proposes **no reorder, no new rank, no canon change**.
>
> **Authority:** Reference only. `docs/ROADMAP.md` is the sole active priority queue. Item 1 and Item 2 execute under **rank 6** (compounding work; on-site only). External listings, partnerships, and distribution stay **rank 3** and are out of scope here. Item 3 is a scoped conversion repair under **rank 1's** funnel-truth lineage (2026-07-29 exact-flow conversion repair precedent). The locked v4 research programme (`docs/plans/2026-07-30-ai-organic-growth-plan.md`) is **not modified**; its experiment gates on content scaling remain in force. This plan interprets rank 6's checkpoint ("a specific query/page or measured hotspot justifies each session") as satisfied by order evidence — it does not rewrite rank 6's wording.
>
> **Adopted 2026-08-24** after a grilled review of a Codex free-channel audit. The audit's headline numbers were independently re-verified against production payment truth before adoption (§1). No code changed during audit or planning.

---

## 0. Verdict up front

Three bounded items, in order of certainty:

1. **Deepen the proven med-cert winner** (`/medical-certificate-online`) — highest-confidence, lowest-risk compounding.
2. **One bounded on-site prescription experiment** on `/prescriptions` — same mechanism, unproven at 10× smaller base; explicit stop rule.
3. **Repair the repeat-Rx medication screen on mobile** — the single worst measured screen in the funnel; UI-only, every clinical rule preserved; success gated on sample size, not calendar.

What this plan refuses: new page production (gated by the v4 programme), a generic SEO content factory, homepage changes, medicine-name acquisition content, external distribution (rank 3), paid-ads changes (rank 4), and any revenue forecast.

## 1. Verified baseline — trailing 30 days to 2026-08-24

Re-queried directly from production `intakes` payment truth (paid/partially_refunded/refunded; refunded orders count $0; partial refunds net). Classification: paid ads = any of gclid/gbraid/wbraid/campaignid/cpc medium; ChatGPT = chatgpt.com referrer or utm_source; organic = google/bing referrer or organic medium.

| Channel | Orders | Net AUD |
|---|---|---|
| Paid ads (context, rank 4 owns) | 133 | $4,272.50 |
| ChatGPT | 41 | $1,142.85 |
| Organic search (brand + non-brand) | 27 | $843.60 |
| Direct / unknown | 24 | $768.80 |
| Other referral | 9 | $244.55 |

- ChatGPT med-cert orders: **36 of 41**; **20 landed on `/medical-certificate-online`**.
- ChatGPT roughly **doubled month-over-month** (21 in July → 41 trailing-30d). Treat as momentum, not a trend guarantee.
- **Classification caveat:** "other referral" here includes recovery/lifecycle email orders; the app's canonical classifier (`lib/analytics/source-classification.ts`) separates them. Any measurement in this plan re-uses one classifier consistently within a comparison; never mix hand-rolled SQL and app-classifier numbers in the same table.
- Free-channel landing pages ≥3 orders: `/` 38 (brand landings — out of scope), `/medical-certificate-online` 21 (20 ChatGPT), `/medical-certificate` 5, `/prescriptions` 4 (all ChatGPT), `/locations/sydney` 3 (all ChatGPT), `/compare/online-medical-certificate-options` 3 (all ChatGPT).

## 2. Item 1 — deepen the proven med-cert pages (rank 6)

**Selection rule (canonical, see CONTEXT.md):** an **Order-proven Page** has ≥3 free-channel-attributed paid orders in a closed 30-day window. Two tiers:

| Tier | Threshold | Pages today | Work allowed |
|---|---|---|---|
| **Deepen** | ≥10 free orders/30d | `/medical-certificate-online` only | Full answer-content sessions on the existing page |
| **Maintain** | 3–9 free orders/30d | `/compare/online-medical-certificate-options`, `/locations/sydney`, `/medical-certificate` | Accuracy + freshness passes only; no expansion on 3-order evidence |

**Deepening scope for `/medical-certificate-online`:** clear, indexable answers on the existing page — eligibility (18+, Australia, what conditions suit telehealth), price (from `PRICING` constants), process (form → doctor review → delivery), legitimacy/verification (the `/verify` loop), and clinical limits (1–3 day cap, what we won't certify: high-stakes use cases). Answer-shaped and honest; no outcome promises ("accepted by all employers" stays banned), no review counts/ratings, no daily-stat fabrication.

**Constraints (all pre-existing, restated as gates):** med-cert language locks (CLAUDE.md Gotchas), `docs/SEO_CONTENT_POLICY.md` §8, `docs/ADVERTISING_COMPLIANCE.md` for anything a paid campaign lands on, `/clarify` pass on copy-heavy diffs, `instantmed-marketing-compliance-review` before sign-off.

**Explicitly out:** the homepage (38 free orders, but they are brand landings — homepage levers are brand/design canon, not rank-6 content work), and any new URL.

**Measurement:** per-page free-channel paid orders per closed 30-day window, re-pulled with the §1 query lineage. Success for a deepening session = the page holds or grows orders across the next two closed windows with zero compliance regressions. There is no traffic/ranking success criterion.

## 3. Item 2 — bounded prescription experiment (rank 6, on-site only)

**Hypothesis:** the mechanism that makes `/medical-certificate-online` the ChatGPT winner (direct, indexable, service-level answers) can lift `/prescriptions` from its 4-order base. Unproven; treat as an experiment with a stop rule, not a committed program.

**One session, three moves:**
1. **Answer the recurring service-level questions on `/prescriptions` itself** — what qualifies as a repeat, what's excluded (controlled substances; new medicines route to consult), price, how eScripts arrive, timing expectations within the 24/7 language rules, refund-on-decline.
2. **Question sources are aggregate-only:** GSC queries for `/prescriptions*`, BWT grounding queries (66 distinct, per the v4 programme), and PHI-free support themes. **Never** mine patient-typed medication free text into public content (PHI; standing incident lesson).
3. **Internal connections:** service surfaces and compare pages may link `/prescriptions` and `/request?service=prescription` (the allowed acquisition links). Guide bodies stay education-only — no acquisition links added to `/blog/*`.

**Hard boundaries (from `docs/SEO_CONTENT_POLICY.md`):** `/prescriptions` is a Money page — **no drug names**, no prescription-only medicine prices, no "get/buy/start [medicine] online", no medicine-specific request URLs, no prescribing guarantees. Medicine education stays in `/blog/*` under the medication-guide contract. No new drug-acquisition pages — that is the NextClinic arbitrage this business refuses (`docs/BUSINESS_PLAN.md`).

**Success / stop rule:** baseline 4 free orders/30d. Review after **two closed 30-day windows** post-ship: continue (a second session is justified) at **≥8**; hold at 6–7; **stop and record** at **≤5** — rank 6's "stop or rework a near-zero lever" applies. No second session before the first review.

## 4. Item 3 — repeat-Rx medication step, mobile conversion repair (rank 1 lineage)

**Measured problem (audit-reported PostHog, to be re-pulled as the pre-ship baseline):** 76 step views → 34 completions; mobile 65 → 28 (**43.1%**). Of the exits, ~15 were legitimate steers/safety blocks, only 3 unresolved validation failures; ~25 unblocked patients left, 13 without entering anything. Checkout itself is healthy (163 starts → 70 checkout → 61 payment-initiated → 57 paid). Some of the 13 zero-entry exits are window-shoppers no UI can recover — the target below does not assume recovering all 25.

**Current state (code-verified):** [medication-step.tsx](components/request/steps/medication-step.tsx) is a 1,240-line single screen. Completion requires medicine + concrete strength, last-prescribed answer, structured directions (Amount/Unit/frequency), indication, unchanged-dose attestation, and a side-effect answer. `blockedReasons` currently surfaces only steer/decline-risk reasons; there is **no "what's left" summary** for an incomplete form, and the Amount/Unit selects sit side-by-side on mobile.

**The repair — three changes, one page, zero clinical-rule changes:**
1. **Three labelled regions** on the same always-mounted screen: **Medicine** (name/strength/last prescribed), **Directions** (amount/unit/frequency/indication), **Confirmation** (unchanged-dose attestation, side effects). Visual grouping only — the #209 rule stands: no progressive reveal, no phase unmounting, answered sections stay editable.
2. **Stack Amount and Unit vertically on mobile** (single column below `sm`), relieving the cramped row near line 1000.
3. **"What remains" beside Continue:** extend the existing tap-a-blocked-Continue pattern (the steer already does this) so tapping Continue while incomplete lists the unmet requirements — derived from the same `isComplete` predicate, phrased calmly — and focuses the first one. No new validation, no relaxation of any rule; the controlled-substance block, decline-risk advisory, and service steers behave exactly as today.

**Process gates (mandatory):** `instantmed-clinical-safety-review` before edits; `instantmed-ui-browser-verification` (mobile viewport proof) + an Emil/Impeccable motion-and-polish pass before sign-off; run `e2e/prescription-flow.spec.ts` locally; full unit suite before push (intake-push rule).

**Measurement gate — sample-gated, not calendar-gated.** Two mature 7-day cohorts at current volume is ~15 mobile views each; a 43%→55% claim on n=15 is noise. Instead:
- **Pre:** re-pull the closed 30-day baseline at ship time (same event definitions, exact `flow_instance_id` lineage, `is_e2e=false`).
- **Post:** accumulate **≥60 mobile step views** (~4 weeks at current volume, faster if ChatGPT growth holds), then compare.
- **Success:** mobile completion **≥55%**, AND steer/safety-block exit share **not reduced** (those exits are correct outcomes — the fix must not suppress them), AND repeat-Rx decline and refund rates no worse than baseline, AND unresolved validation failures ≤ baseline.
- **Iterate/stop:** 50–55% with healthy guardrails → one iteration, then re-measure once. Below 50% or any guardrail breach → revert to investigate; do not stack speculative UI changes.

## 5. AI Attribution Expansion Gate — recorded cleared

The gate (CONTEXT.md: ≥10 reportable AI-attributed paid orders in a closed 30-day window) is **cleared 4× over**: 41 AI-attributed paid orders in the trailing 30 days to 2026-08-24, verified against payment truth.

**What clearance reopens:** dedicated AI-channel attribution work — separating named assistant traffic from Direct, and controlled experiments under the v4 programme's framework. **What it does not do:** prove citation→revenue causality, authorize broad content production, or amend the v4 programme. Any experiment design goes through that programme's pre-registration rules.

## 6. Out of scope

Homepage changes · any new public URL · medicine-name acquisition content · external listings/directories/outreach (rank 3) · paid-ads mutations (rank 4; Approval Packet flow) · subscriptions/follow-up models · revenue forecasts · modifications to the locked v4 research programme.

## 7. Sequencing

1. **Item 3 first** — it protects revenue the other items generate (every new prescription visitor currently hits a 43% mobile screen). One PR, then its measurement window runs passively.
2. **Item 1** deepening session on `/medical-certificate-online`.
3. **Item 2** prescription session after Item 1 ships (shared compliance review context).
4. Maintain-tier freshness passes fold into normal doc/content hygiene, not dedicated sessions.

ROADMAP status cells get one-line links as each item starts and lands, per its refresh rule. This plan is complete when all three items have shipped and each measurement gate has been read out once (success, iterate, or stop — recorded here as an addendum).
