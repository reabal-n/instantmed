# AI/LLM referral + organic growth — staged research programme, Aug 2026 to Jan 2027

> **Status: research programme, not an operating plan.** Phase 0 is approved work. Phases 1–3 are pre-registered experiments and conditional work that unlock only on stated evidence. Nothing here reorders canon.
>
> **Authority:** Reference only. `docs/ROADMAP.md` is the sole active priority queue and owns the **$5,000/month rolling net-retained revenue** rung. This document elaborates ROADMAP rank 3 (external reputation and distribution) and rank 6 (compounding work) and inherits their checkpoints. **It proposes no canon changes** — see §9.
>
> **Supersedes** `docs/plans/archive/2026-07-24-organic-free-revenue-20k-plan.md` (moved to archive per ROADMAP §7). Its `$20k/mo free` goal and `$4k` free-channel fail line are **not canon and are not used here**.
>
> **Written 2026-07-30. Locked at v4** after three adversarial review rounds, upheld on 10, 6, and 14 points respectively. §10 records all three adjudications. v4 was a narrow lock pass — code/tooling corrections, statistical repair, gate definitions, authority boundaries, and bookkeeping — with no strategic rewrite.
>
> **`pnpm doc:audit` passing proves bookkeeping only** — file count, plan-reference integrity, and the 9 doc-pinning contracts. It is not evidence of strategic correctness and must not be cited as validation.

---

## 0. The verdict up front

**Two facts, one hypothesis, and one thing we must stop asserting.**

**Fact 1 — the AI referral channel is one engine.** Every AI-referral order ever recorded is `chatgpt.com`: **3 → 4 → 11 → 21** (Apr → Jul 2026). Perplexity, Gemini, Copilot, Claude: **zero**.

**Fact 2 — Bing/Copilot cites us a lot and we cannot connect it to a single order.** BWT AI Performance: 5.5K citations/90d; monthly 1,339 (May) → 1,201 (Jun) → **2,920** (Jul, 28d); avg cited pages 13 → 8 → 17. Copilot-attributed orders: **zero**.

**The thing we must stop asserting: that these two facts are about the same channel.** BWT measures Microsoft surfaces. Our AI revenue is ChatGPT. **There is currently no evidence that BWT citation movement affects revenue at all.** Every earlier draft of this plan leaned on that unproven link — including to justify promoting BWT to content canon. That justification is withdrawn (§9). BWT is a rich, free, first-party diagnostic for one surface; it is not yet a revenue instrument, and the programme's job is to find out whether it can become one.

**Hypothesis under test — retrieval coverage may drive citation, which may drive revenue.** The three highest citation days (263 / 195 / 280, 21–23 July) fall on the date the Bing money-page gap was verified closed, and ChatGPT orders went 11 → 21 that month. **This is a coincidence on sampled data.** Microsoft states AI Performance data is sampled and aggregated and calls Citation Share directional and observational. Phase 1 tests the first link (coverage → citation) with a pre-registered experiment. Phase 2 tests the second (citation → revenue or prompt-panel improvement). Content scaling is gated behind both.

**What is well-evidenced and needs no experiment:** Google organic ranking is authority-bound. `/medical-certificate` sits at pos 33 (pos 37 on the 44k-volume head term) with excellent on-page, and six prior audits plus live GSC verification agree. That is ROADMAP rank 3 work, it is first in the queue, and it starts in week 1 regardless of any experiment outcome.

### No forecast

Earlier drafts carried a $7–11k scenario band. **It is withdrawn.** It depended on unquantified step-functions and on the unproven BWT→revenue link, and a plan whose first phase is measurement instrumentation is not in a position to forecast. Progress is judged against the canon rung ($5,000/month rolling net-retained, all channels, per ROADMAP §2) and against the per-phase evidence gates below.

---

## 1. Baseline — live 2026-07-30

### Orders and net revenue by channel (Supabase, net of refunds)

| Channel | Apr | May | Jun | **Jul** | Jul net AUD |
|---|---|---|---|---|---|
| Google Ads | — | 14 | 9 | **43** | $1,207.90 |
| **AI referral** (100% chatgpt.com) | 3 | 4 | 11 | **21** | $633.95 |
| **Organic search** | 0 | 3 | 12 | **20** | $583.95 |
| Direct / unknown | 36* | 3 | 7 | **9** | $259.60 |
| Other referral | — | 2 | 5 | **5** | $129.75 |
| **Free total** | — | 12 | 35 | **55** | **$1,607.25** |
| **AI + organic** | 3 | 7 | 23 | **41** | **$1,217.90** |

\* Mar–Apr `direct_unknown` is inflated by the pre-attribution-capture era — "unclassified", not demand.

### Bing AI Performance (BWT, 90d to 2026-07-28)

| Metric | Value |
|---|---|
| Total citations | 5,500 |
| Monthly | 1,339 (May) → 1,201 (Jun) → **2,920** (Jul, 28d) |
| Avg cited pages/day | 13 → 8 → **17** |
| Distinct grounding queries | **66**, Intents/Topics classification live |
| Scope | Microsoft Copilot, Bing AI summaries, select partner integrations |
| Sitemaps / URLs discovered | 7 / **218** (vs 151 advertised across 6 robots-declared sitemaps) |
| Recommendations errors | **27** (1 high, 3 moderate, 23 low) across 26 pages |

**Applied throughout:** the data is sampled and aggregated; Citation Share is directional and observational. Good for relative comparison within a window. Not a clean time series, and not a basis for attributing a change.

### Retrieval-surface state

- **151 advertised sitemap URLs**: `/sitemap.xml` 67, `/blog` 60, `/conditions` 15, `/locations` 7, `/compare` 1, `/symptoms` 1. `/intent/`, `/guides/`, `/for/` return 0 and are not robots-declared, yet Bing reports 218 URLs — it holds URLs we no longer advertise.
- **robots.txt already declares** (`app/robots.ts`): `*`, OAI-SearchBot, GPTBot, ChatGPT-User, PerplexityBot, Perplexity-User, Google-Extended, anthropic-ai, ClaudeBot, **Claude-SearchBot**. Genuinely absent: `Claude-User`, `DuckAssistBot`, `Amzn-SearchBot`, `MistralAI-User`.
- `llms.txt` / `llms-full.txt` live, conservative. **Frozen — §8.**
- Homepage schema rich and accurate. IndexNow implemented. `/compare` has one slug. **No BWT API key in `.env.local`.**

### Where free orders land (90d, non-ad)

`/` **44** · `/locations/sydney` 7 · `/medical-certificate` 7 · `/medical-certificate-online` 7 · `/request` 6 · `/sign-in` 4 · `/prescriptions/` 3 · `/pricing` 3 · **every blog article 1 or 0.**

Guides earn impressions and citations, not orders. Their conversion path runs through the homepage and service pages. "Deepen a guide" is not a revenue action.

### Measurement floor

`heard_about_us`: **10 answered (6 `ai`, 4 `search`) vs 227 unanswered.** The #406 placement delta (vs 8% baseline) is unmeasured. **At n=10 this supports direction only, never shares.**

---

## 2. The grounding-query layer

**What grounding queries are:** the reformulated search phrases Copilot generates *internally* when retrieving content to answer a user. **Not user search demand.** Never treat them as keyword volume.

**Citation Share, per Microsoft:** our citations for a grounding query ÷ total citations shown across all sites for that query × 100. Directional and observational.

### Headroom — corrected arithmetic

Earlier drafts ranked by `citations × (1 − share)`. **That is wrong** — it is an arbitrary weighting, not an opportunity estimate. If share = ours ÷ all, then all = ours ÷ share, so:

> **competing citations = ours × (1 − share) ÷ share**

This changes the target ordering materially. Estimated competing citations, 90d:

| Grounding query | Ours | Share | **Competing (est.)** | Winnable? |
|---|---|---|---|---|
| `personal leave` | 238 | 7.02% | **~3,150** | Partly — much of it belongs to Fair Work and government sources |
| `how to renew a prescription australia repeats explained` | 348 | 24.75% | **~1,060** | **Yes — our lane, live service** |
| `medical certificate centrelink` | 271 | 22.58% | **~930** | Partly — Services Australia owns the authoritative answer |
| `cost of online medical certificate Australia` | 90 | 28.12% | ~230 | **Yes — commercial intent** |
| `renew prescription online Australia` | 37 | 14.80% | ~215 | **Yes** |
| `how to get a prescription online` | 66 | 24.00% | ~210 | **Yes** |
| `online prescriptions australia` | 52 | 21.22% | ~195 | **Yes** |
| `medical certificate for school` | 40 | 17.39% | ~190 | **Yes** |
| `is omeprazole the same as pantoprazole` | 46 | 20.18% | ~180 | Education only — no new page |
| `repeat prescription online Australia` | 21 | 10.61% | ~175 | **Yes** |

**Two caveats that matter more than the ranking.** First, dividing by a small sampled share **amplifies error** — the `personal leave` estimate is order-of-magnitude at best, and its low share is partly because it is a broad query answered by regulators. Second, **raw headroom is not winnable headroom**: on `personal leave` and `medical certificate centrelink`, a large share of competing citations belongs to Fair Work and Services Australia, and we neither can nor should displace them. **The commercially winnable cluster is prescription access and renewal** — the largest genuinely contestable headroom on the board, on a service that went 9 → 30 orders/month.

### Strengths to defend (do not touch the copy)

`telehealth services approved medical certificates Australia` **61.76%** · sibling phrasing 51.45% · `instant medical certificate minor illnesses Australia providers` 38.71% · `ahpra check register` 31.58% · `online doctor consultation process Australia` 30.87% · `quick sick leave certificate platforms Australia` 30.04%.

### Compliance boundary on the drug-information cluster — binding

- Existing educational medicine pages stay. **Freshness and structure only.**
- **No new prescription-medicine acquisition or brand pages** (TGA s42DL).
- **No drug names on money pages, no drug-specific CTAs, no drug names in request URL params.**
- **No CTAs, pricing, refund terms, availability or service claims in guide bodies** — education-only.
- **Never a paid ad destination.**
- `non prescription antibiotics for uti` gets the honest answer — antibiotics are prescription-only in Australia — on the existing guide. Never an access route.
- `/blog/pbs-pharmaceutical-benefits-scheme`: citation asset, not conversion asset. Keep fresh, do not deepen.

---

## 3. Phase 0 — approved scope (starts now)

**Authority boundary, binding:** what is approved here is **internal drafting, specification, and read-only audits**. **Every live external action requires its own separate approval immediately before it happens** — each comparison-surface send individually, any Wikidata creation or edit, any PCA/NHSD publication, and any Google Business Profile refresh. "Phase 0 is approved" is never authority to publish, submit, or mutate an external property.

### P0.1 · Third-party distribution — ROADMAP rank 3, first in canon

**Approved now: drafting only.** Each item below is drafted by an agent and then held for a **separate, explicit send approval**.

**Operator, ~1 h total, each send approved individually at the moment of sending:** MediCompare email (`info@medicompare.com.au`), Finder partner form, Trustpilot claim-and-hold. Kit is submission-ready at `docs/audits/2026-07-09-comparison-surface-submission-kit.md` — do not re-research the landscape.

**Agent drafts, operator approves each publication separately:** Wikidata organisation entity (verifiable facts only — ABN, address, service area, LegitScript; **no doctor count or names**; skip Wikipedia until notability is real) · **NHSD/PCA `.gov.au` listing freshness** (the 07-08 audit found it stale; health prompts route heavily to institutional sources) · Google Business Profile confirm/refresh, with the boundary that **GBP counts and ratings never render on-site** (AHPRA s133 posture; on-site badge stays stars-only). **None of these three is an agent-autonomous edit — each is a live external property.**

**Sep–Oct · `/verify` employer outreach**: HR-software help centres (Employment Hero, Deputy, Tanda-class), payroll and bookkeeping newsletters, employment-law client updates. Company-attributed only, **no named founder**. Agent drafts 25–30; operator sends and replies.

- **Targets:** ≥2 comparison listings live by Oct 1 · ≥4 surfaces and ≥8 new referring domains by Jan 31 · reply rate ≥15% with ≥2 soft commitments within 30 days of first send.
- **Kill rule:** no paid links, PBNs, guest-post networks, directory spam. Booking platforms (HealthEngine, HotDoc) are a model mismatch — skip. After three surfaces the AU pool is shallow; shift to HR help-centre placements.

### P0.2 · Prospective attribution specification — draft first, build after review

Historical evidence is unrecoverable. Verified code state, corrected 2026-07-30 — **v3 overstated the third point and is fixed here**:

- `cleanUrlOrPath` in `lib/analytics/attribution-storage.ts` strips query strings (same- and cross-origin; the catch branch does `.split("?")[0]`).
- `sanitizePostHogUrl` in `lib/analytics/posthog-privacy.ts` returns `${origin}${pathname}` and its own comment states it removes every query parameter and fragment. **The PostHog "bonus retrospective check" is disproven — do not attempt it.**
- `captureAttributionToCookie` in `lib/analytics/middleware-attribution.ts` **does read `Referer`** — via `req.headers.get("referer")` — **but only after `if (Object.keys(captured).length === 0) return response`.** So arrivals carrying a recognised campaign parameter get a referrer; **untagged arrivals return before the read**, which is exactly the Copilot and organic case. The gap is the early return, not the absence of referrer handling.

**The three divergent classifier surfaces are** `lib/analytics/ai-referral.ts`, `lib/analytics/source-classification.ts`, and `lib/admin/ai-attribution-breakdown.ts`. **There is no AI-attribution scorecard SQL** — v3 referenced one that does not exist. (`lib/data/business-scorecard.ts` and `lib/data/recovery-scorecard.ts` are unrelated surfaces.)

The specification must name the complete path before any code is written:

1. **One shared classifier**, consumed by all three surfaces — **exact-host and exact-UTM matching only**. Explicit negative fixtures for **ordinary `bing.com` search** and for **ambiguous `you.com`** traffic. **Never short-token substring matching** — `x.ai → "x"`, or `"ed"`-class fragments, must be impossible by construction.
2. Derive a **privacy-safe enum** server-side from `Referer` **before** sanitisation, on the untagged path too — values only (`chatgpt`, `copilot`, `perplexity`, `gemini`, `claude`, `other_ai`, `none`). **Raw referrer query strings are discarded immediately. No new identifiers, no PHI.** *(`bing_ai` was listed here in an earlier draft and is **removed**: no verified marker distinguishes Bing AI summaries from Copilot at the referrer level, and an undetectable enum value guarantees a permanently empty bucket that later reads as a finding. The instrument is therefore scoped to identifiable Copilot traffic only — see `docs/plans/2026-07-30-attribution-enum-spec.md` §4.2.)*
3. **The migration and the full persistence path are mandatory, not conditional.** A durable source enum requires the schema migration plus the complete **guest and authenticated checkout-to-payment-finalisation** persistence path, following the migration + production-receipt discipline in `CLAUDE.md`. If that path is not being built, the enum is not being built either — there is no half version.
4. Use canonical `paid_at` / `refunded_at` windows in every report.
5. **Contract-test** enum derivation, classifier parity across all three surfaces, and the negative fixtures.
6. Add a **capture-validation counter** whose denominator is **eligible landing requests** — not "visits" or "sessions", unless privacy-safe session deduplication is separately specified.
7. **Update the attribution pipeline section of `CLAUDE.md`** (and regenerate `AGENTS.md` via `scripts/sync-agent-doc.sh`) in the same commit — the Doc Maintenance Policy requires it for any attribution/analytics change.

**Deliverable is a count, not an adjective:** *"N detections among M eligible landing requests and K orders over the window."* Never "no signal found".

### P0.3 · Zero-risk retrieval hygiene

- **Vercel firewall audit for AI-fetcher challenges — read-only config inspection, 10 min.** `ChatGPT-User`, `Perplexity-User`, and `Meta-ExternalFetcher` ignore robots.txt by vendor documentation and are stopped only at the WAF; each is a live user waiting inside an answer, and a silent challenge is invisible in every other metric. *(No CLI upgrade or global package install is a prerequisite.)*
- **robots.txt: no change unless the audit proves a problem.** `Claude-SearchBot`, `ClaudeBot`, `anthropic-ai`, and `Perplexity-User` are **already declared** (`app/robots.ts:67–84`), and the `User-Agent: *` block already allows everything else, so adding `Claude-User`, `DuckAssistBot`, `Amzn-SearchBot`, or `MistralAI-User` would **duplicate the existing catch-all allow and change no behaviour.** Earlier drafts proposed it as belt-and-braces; that is churn on a file with real blast radius. **Only add a named block if the WAF/log audit shows a concrete retrieval problem for that specific agent.** Do not block `Google-Extended`, and do not confuse it with Googlebot, which governs AI Overviews and AI Mode.
- **Check whether the GSC Generative AI report is live on the InstantMed property.** Impressions only — no clicks, CTR, or query data — subset rollout that began in the UK.
- **Close the 27 BWT Recommendations errors.** **Blocked on input** — see §6.

### P0.4 · Reviews — defence, mechanics unchanged (ROADMAP rank 3)

Reviews did not cause the AI channel's growth. Their jobs are rank-within-listings and defending the "is InstantMed legit" prompt class, where 2 public reviews is genuinely dangerous.

Mid-August checkpoint against the 1.5% send→post baseline, using the hash-only click-funnel receipts (migration 2026-07-23) to separate click-through from post-through. If flat, the pre-approved 50/50 ProductReview-vs-Google destination split via `getRotatingReviewUrl` — **coupled experiment**, since the copy names ProductReview's sign-in step. Escalation 2 (Sep, if needed): post-delivery in-dashboard ask card, neutral ask only. Targets ≥10 (Sep 1) · ≥25 (Oct 15) · ≥45 (Dec 1) · ≥60 (Jan 31). **Never trade neutrality for volume — no gating, no incentives.**

---

## 4. Phase 1 — pre-registered coverage experiment

**Registered before treatment begins. No mid-flight changes to endpoints, cohorts, or thresholds.**

| Element | Specification |
|---|---|
| **Question** | Does fixing Bing indexation coverage on a URL cause it to become indexed and cited, versus a matched untreated URL? |
| **Population** | Advertised URLs found **not indexed in Bing** by the P1 coverage audit (all 151, not a money-page spot-check). |
| **Design status** | **Pilot, not a powered trial** — see the power note. It reports an effect size with exact confidence intervals; it does not deliver a significance verdict. |
| **Cohort size** | Split the gap list 50/50. Power the arms from the observed control rate once the audit reports the gap-list size: at an assumed ~15% control indexation rate, detecting a 30-point difference at 80% power / α=0.05 needs roughly **35–40 per arm**. If the gap list cannot supply that, it runs as a pilot and is labelled one. |
| **Matching** | Stratify by sitemap section (`/blog`, `/conditions`, service pages) and by pre-period GSC impression band, then randomise within stratum. **Inference must respect the stratification** — stratified exact test or Cochran–Mantel–Haenszel, not a pooled 2×2 that ignores it. |
| **Exclusions** | **Commercially important money pages are excluded from the untreated arm.** Withholding a coverage fix from `/medical-certificate`, `/prescriptions`, `/pricing` or a live service page for four weeks is not an acceptable experimental cost. They are treated immediately and analysed separately as uncontrolled observations. |
| **Pre-period** | 4 weeks of BWT + GSC data captured before treatment. |
| **Treatment** | **Standardised and written down before randomisation** — the identical fix set applied to every treatment URL (sitemap presence, IndexNow submission, crawlability check). No per-URL improvisation, or the treatment is undefined. |
| **Contamination rule** | For the duration, control URLs receive **no IndexNow submission, no sitemap change, no internal-link change, no content edit, no metadata edit.** Breaches are **recorded and kept in the primary analysis as intention-to-treat** — never dropped, never silently re-assigned. A per-protocol analysis may be reported alongside as secondary. |
| **Primary endpoint** | **Bing indexation status (binary)** — unsampled and unambiguous. |
| **Missing-status handling** | Pre-registered: a URL whose status cannot be determined at readout is counted as **not indexed** (conservative against the treatment). Stated now so it cannot be chosen later. |
| **Secondary endpoints** | Citation count and Citation Share (sampled — supporting evidence only, never deciding). |
| **Reported statistic** | Difference in indexation rate between arms with **exact 95% confidence intervals**, stratification-respecting. A 30-point difference is the pre-registered effect size of interest, not a significance threshold. |
| **Honest power note** | At 15 per arm this is badly underpowered: **10/15 vs 5/15 is a 33-point difference and still gives two-sided Fisher p ≈ 0.14.** Earlier drafts paired n=15 with "α=0.05", which was incoherent. **A null result at pilot scale is weak evidence, not proof that coverage does not matter** — and a positive result at pilot scale is suggestive, not established. |
| **Duration** | **4 weeks minimum** after treatment — Bing data is sampled and needs the longer window. |
| **Timing** | Audit + registration in Aug; treatment ~Aug 18; **readout ~Sep 15.** |

**What a pass unlocks — and the bridge earlier drafts were missing.** Indexation is necessary but not sufficient. **An indexation gain with no accompanying minimum citation signal does NOT enter Phase 2.** That result means *"indexed but not cited"* — the retrieval hypothesis is only half-supported, and the correct response is **stop or maintain**, not escalate. Only indexation gain **plus** a measurable citation signal on the treated URLs opens Phase 2. Neither outcome unlocks content-wave scaling.

---

## 5. Phase 2 — does citation touch revenue?

Gated on Phase 1 passing **both** its indexation and citation conditions. This is the link every earlier draft assumed and none tested. "Measurable sessions/orders or prompt-panel improvement" was not a pass rule — it is now three named, non-interchangeable outcomes.

**Outcome A · Commercial signal.** Pre-specified treatment-versus-control comparison on **qualified sessions** and **intake starts** as the primary measures, with **orders and revenue as exploratory only** (at ~15–20 orders/channel/month, order counts cannot carry a causal claim). Measured through the P0.2 enum on canonical `paid_at` windows. **This is the only outcome that supports a Bing→revenue causal claim, and the only one that can unlock content scaling** — jointly with P3.1.

**Outcome B · Cross-surface visibility.** A **separately repeated ChatGPT panel** on the same intents, with **frozen account, model, search mode, locale, prompt wording, repeat count, and scoring rubric** — recorded before the run. Any of those drifting invalidates comparison to baseline. **A pass here unlocks a bounded answerability test (P3.1) and nothing more.** It explicitly **cannot** establish Bing-to-revenue causality and **cannot** unlock content scaling: an improved ChatGPT answer following Bing work is consistent with several mechanisms we are not measuring.

**Outcome C · No signal.** BWT is confirmed as a diagnostic only. Coverage work drops to cheap maintenance and the budget moves permanently to P0.1 distribution, which is well-evidenced. **This is an acceptable, informative result — not a failure to be re-run with different endpoints.**

- **Duration:** 4 weeks minimum after the Phase 1 readout, so **late October at the earliest**.
- **All Phase 3 dates rebase from the actual unlock date, not from the calendar in §5.** If Phase 1 slips, everything downstream slips with it; no date in this document is a commitment independent of its gate.

---

## 6. Phase 3 — conditional work

**Gating is per-item, not blanket.** P3.1 and P3.2 sit behind Phase 2. **P3.3 (verification) and P3.4 (data asset) have independent rank and gate logic and do NOT wait behind Phase 2** — P3.3 is ROADMAP rank 3 distribution work whose gate is its own E1 evidence, and P3.4's gate is the 1,000-request viability threshold. Earlier drafts parked both behind an unrelated experiment.

### P3.1 · Answerability retrofit — its own pre-registered experiment

Unlocked by Phase 2 Outcome A **or** Outcome B (B unlocks a *bounded* version only). **Answerability restructuring and ordinary CTR metadata repair are separate interventions and must not share a cohort** — one rewrites page structure, the other rewrites title and meta description, and combining them makes the result uninterpretable.

| Element | Specification |
|---|---|
| **Question** | Does passage-level restructuring raise Citation Share versus a matched untreated page? |
| **Population** | Pages already indexed in Bing with a known Citation Share and ≥50 citations in the pre-period (so the endpoint has signal). |
| **Cohort / arms** | Stratified by section and pre-period citation band, randomised within stratum; powered from observed variance or labelled a pilot, on the same rule as Phase 1. |
| **Treatment** | The standardised retrofit below — written down before randomisation. **Structure only. No title or meta changes** (those belong to the separate CTR pass). |
| **Holdout** | Matched untreated pages. **Money pages excluded from the untreated arm**, same reasoning as Phase 1. |
| **Primary endpoint** | Change in Citation Share, treatment vs control. **Sampled and directional** — report with exact CIs, never as a point verdict. |
| **Secondary** | Citation count; prompt-panel movement on matched intents. |
| **Duration** | 4 weeks minimum after treatment. |
| **Contamination** | No structural edit, sitemap change, or IndexNow submission on control pages. Breaches stay in the primary analysis (intention-to-treat). |
| **Exclusions** | AI-Overview-capped pages; pages under active content-wave work. |

The retrofit itself:

- **Money and service pages:** one quantified, dated, self-contained fact per passage, sourced from the **named owners** — `PRICING` (`lib/constants/index.ts`), `getApprovedClaim()` / `APPROVED_CLAIMS` (`lib/marketing/approved-claims.ts`), `MAX_MED_CERT_DURATION_DAYS` (`lib/clinical/intake-validation.ts`), and the eligibility policy in `docs/CLINICAL.md`. **Never hand-typed values, and "approved constants" is not a sufficient instruction** — cite the owner.
- **Guide bodies (`content/blog/*.mdx`): structure only** — answer-first opening, one claim per passage, real visible `last-reviewed` dates, semantic Markdown tables, linked AU sources. **No pricing, refund terms, availability claims, service claims, or CTAs.**
- **Consistency sweep, scoped to what we control.** Bing abstains on source conflict, so contradictory values can silently cost citations. **Contract-test internal consistency** across on-site copy, schema.org, and `/compare`, all sourced from the named owners above. **`llms.txt` is in scope for drift correction only** — if a fact in it contradicts a constant, fix the fact; that is maintenance, not the further GEO investment §8 forbids. **Externally-hosted surfaces (NHSD/PCA, ProductReview, listings) get a scheduled reconciliation check, not a contract test** — we do not control their rendering. Target: **no contradictory values.**

### P3.1b · CTR metadata repair — separate intervention, not part of the experiment

Title and meta only, no structural change, **`pos ≤10` applied strictly**: `/blog/work-from-home-sick-certificate` (2,308 impr, pos 6.7, 0.9%) · `/why-instant` (pos 9.2, **0%**) · `/medical-certificate/migraine` (pos 8.4) · `/medical-certificate/back-pain` (pos 4.0). **`/verify` (13.7) and `/employers` (10.1) are both excluded — they breach the rule** and are authority targets (P0.1), not CTR targets.

**Never run on a page inside the P3.1 cohort during its window** — that is the contamination this split exists to prevent.

**Kill rule:** never rewrite AI-Overview-capped pages to chase CTR. `/blog/can-you-get-antibiotics-online-australia` (8,850 impr, pos 9.2) is structurally capped — judge on position and citations.

### P3.2 · Content waves — canon mechanics, canon lane order

Wave mechanics unchanged: 8–12 URLs per wave; **wave N+1 only when wave N shows ≥60% indexed or earning impressions within 3 weeks**; ≤4 pages/week; ≤1 wave in flight; advertised URLs ≤210; every page meets `docs/ARTICLE_TEMPLATE.md` in full plus `pnpm content:audit` and the §8 indexing gate.

**Lane selection follows canon: `docs/ARTICLE_TEMPLATE.md` §8, GSC-first, one guide per PR.** BWT data may reorder priorities *within* that ordering; it does not replace it. See §9.

**Scaling condition — both required:** Phase 2 **Outcome A** (commercial signal — Outcome B is not sufficient), **and** the P3.1 answerability cohort beat its holdout. **Bing Citation Share alone cannot unlock content scaling, and neither can a prompt-panel improvement.**

Priority lanes under canon order: (1) indexed pages with impressions, weakest CTR, most commercially adjacent; (2) **prescription access and renewal — the largest winnable BWT headroom**; (3) med-cert situational cluster (`parents-sick-child-certificate`, pos 7.2, best converter); (4) employer/verification; (5) women's health, Sep–Nov for the Dec–Feb UTI season.

**Group C — do not invest:** `ahpra-registered-doctor-meaning` (navigational; already 31.58% share) · `pbs-pharmaceutical-benefits-scheme` (citation not conversion) · the 39 discovered-not-indexed URLs, whose internal-linking lever is **exhausted** — they need coverage or authority, not on-page edits.

- **Targets if it runs:** advertised URLs earning impressions 64 → ≥100 (Oct 15) → ≥120 (Dec 1) → ≥140 (Jan 31).
- **Kill rule:** two consecutive failed wave gates → stop publishing, authority work only, re-audit with the operator.

### P3.3 · Verification differentiation — evidence before page *(independent gate: E1, not Phase 2)*

**We are not the only provider with certificate verification.** Verified live 2026-07-30: [Qoctor](https://www.qoctor.com.au/check-validity-of-certificate/) "Check Validity of Certificate", [Updoc](https://updoc.com.au/employer-verify) "Employer Medical Certificate Verification", [Doccy](https://doccy.com.au/medical-certificate). Any "only/uncontested verification primitive" framing is factually wrong **and** is the unverifiable-superiority class `docs/ADVERTISING_COMPLIANCE.md` forbids. Struck, and listed in §7.

- **E1 · Build the evidence first.** A dated, sourced matrix of what each AU provider's verification actually does — public vs login-gated, machine- vs human-readable, fields returned, whether revocation is reflected, refund-on-decline, 24/7, doctor-review model, LegitScript. An audit doc with capture dates and URLs. **If no material advantage emerges, E2 is not built.**
- **E2 · Only if E1 justifies it:** a neutral `/compare/[slug]` publishing only independently verifiable, dated, sourced facts. Differentiation stated at **specific-feature** level ("returns X without login, as at date Y"), never category level. *(Gotcha: `providerPriceTable` replaces the `comparisonTable` render for the existing slug in `app/compare/[slug]/page.tsx` — a new slug avoids it; verify which renderer applies.)*
- **E3 · Pre-drafted media comment, held ready — timing governed by the runbook.** `docs/runbooks/comparative-tagline-complaint.md` §6 states plainly: **do not respond same-day, regardless of deadline pressure**, and provides the acknowledge-receipt template. Earlier drafts said "respond same-day", in direct conflict. Corrected: keep a current 200-word company-attributed comment and one data point **prepared** so the considered response is fast to finalise — the runbook's acknowledge-then-respond flow owns the timing. No named founder, no doctor-count claims, no superiority framing.

### P3.4 · Data asset — gate stands, unchanged *(independent gate: the 1,000-request threshold, not Phase 2)*

`docs/audits/2026-06-04-data-asset-spec.md` records **VIABILITY GATE: NOT YET VIABLE — DEFERRED**, with three documented disqualifiers at 101 paid requests: no outlet cites N≈100 and publishing broadcasts pre-traction scale; the approved `<30` suppression floor would blank almost the whole report; and the "Monday sickie" headline is **false on the data** (Wednesday peaks). **National aggregation does not fix this** — states are 85 of 101 unknown because medical certificates do not collect address, so the thinness is in the data itself.

- **Nov:** re-run the read-only safe aggregate counts first (the spec's own correct order). `intakes.category`, not `service_type`; exclude the seeded patient.
- **The ~1,000-paid-request publishing gate stands.** Nothing publishes before it clears and the operator re-confirms.
- **Held is an acceptable outcome.**

### P3.5 · Owned reorder loop — not dropped, just not here

The refill-reminder and certificate-reactivation loop **remains live under ROADMAP rank 5** with its existing three-wave checkpoint. It is out of scope for this programme because it is neither an AI nor an organic lever — **not because it was dropped.** Earlier drafts said "nothing dropped" while omitting it; this note closes that gap.

---

## 7. Fortnightly scorecard

Agent produces it on the 1st and 15th. One table, one verdict, one forced decision.

**Collection status is stated honestly per row. Nothing is labelled automated unless a collector exists today.**

| # | Metric | Source | Collection status **now** | Type |
|---|---|---|---|---|
| 1a | GSC impressions · clicks · queries · pages | GSC API Search Analytics | **Automated** | Leading / Lagging |
| 1b | GSC indexation | `pnpm seo:gsc-index-audit` | **Partial — bounded priority sample only** (`--inspect-limit`, default cap; it inspects a prioritised subset, not all 151 URLs). Full-inventory coverage needs a paginated collector that does not exist | Leading |
| 1c | Referring domains | — | **UNAVAILABLE via GSC API.** The API exposes Search Analytics, Sites, Sitemaps, and URL Inspection — **there is no Links/backlinks endpoint.** Referring domains must be read manually from the Search Console UI Links report or a third-party tool. v3 wrongly labelled this automated | Lagging |
| 2 | **BWT AI citations · cited pages · grounding queries · Citation Share** | BWT AI Performance CSV | **Manual — no API.** Operator exports; a parser must still be built | **Leading, diagnostic only** |
| 3 | GSC Generative AI report — impressions in AI Overviews / AI Mode / Discover AI | Search Console | **Availability-gated** — Google describes it as a subset rollout. Confirm on the property before relying on it. Impressions only | Leading, if available |
| 4 | **15 fixed AU prompts × ChatGPT / Copilot / Perplexity / Gemini** | Committed prompt set + agent-browser runner | **Not built** — runner and scoresheet must be written before the first run | Leading |
| 5 | **Cited domains per answer — not just whether we were named** | Same panel run | **Not built** | Leading |
| 6a | Purchases · net revenue by channel | Supabase, canonical `paid_at`/`refunded_at` | **Automated** | Lagging |
| 6b | Referral sessions · **intake starts** | PostHog | **Unreliable today** — no validated channel-joined intake-start measure exists. Must be specified alongside P0.2 before it can gate anything | Lagging |
| 7 | `heard_about_us` answer rate + `ai` share | Supabase | **Numerator automated; denominator not persisted** — the shown-vs-answered denominator lives in PostHog events, not the DB, so the rate is not directly queryable. n=10 regardless | Calibration |
| 8 | **AI + direct/dark as a summed pair** | Supabase | **Automated** | **Integrity** |
| 9 | **Attribution capture-validation counter** (eligible landing requests, detections) | Supabase | **Not built — ships with P0.2** | **Integrity** |
| 10 | Outreach funnel: sends → replies → commitments · listings live · review click→post | Manual log + review receipts | **Manual** | Leading |

**Prompt panel:** agent-run via agent-browser, committed, ~zero operator time and cost. **No paid AI-visibility platform is warranted** — BWT supplies the Copilot half free, and order volume is too small for a US$100–500/month tool to beat a scripted panel. Manual fallback documented. Fixed set (15, frozen — changing a prompt resets its series): best online medical certificate australia · is instantmed legit · online doctor for UTI australia · how do i renew a prescription in australia · cheapest online medical certificate australia · can my employer verify an online medical certificate · medical certificate for centrelink · same day medical certificate australia · online doctor australia 24 hours · repeat prescription online australia · how to get a sick note without seeing a doctor australia · online ED treatment australia · hair loss treatment online australia · are online medical certificates legally valid in australia · how to choose a telehealth provider australia. Record per prompt × engine: mentioned (y/n) · **the full set of cited domains** · which of our URLs was cited · factual accuracy.

### Statistical honesty — binding on verdicts

- **Metrics 1–5, 9, 10 (leading) judged fortnightly.** Counts of things we did or citations we earned.
- **Metrics 6 and 8 (lagging) judged on two closed, non-overlapping 30-day windows** — not overlapping rolling windows, which correlate successive readings and manufacture the appearance of a trend. A revenue verdict requires the same direction across both closed windows. At ~15–20 orders/channel/month a fortnightly revenue cut swings ±50% on noise: a flat fortnight means nothing, two good fortnights confirm nothing.
- **Metric 8 guards against celebrating relabelling.** Dark traffic is being reclassified into AI via landing-page UTMs. If AI rises while AI + direct/dark is flat, measurement improved and demand did not.
- **Channel net revenue is diagnostic only.** The canonical `$5,000/month` rung is **dashboard net-retained revenue including disputes** (`docs/ROADMAP.md` §2, `docs/REVENUE_MODEL.md`). Per-channel figures in this document are a management cut and must never be quoted as rung attainment.
- **Dropped as vanity:** Semrush AI-visibility score · sitewide average position · total sitemap or content counts · any "AI sessions" figure beyond order attribution.

### Structural blind spot

**AI Overviews and AI Mode *clicks* remain indistinguishable from ordinary `google.com` organic.** Google's Search Generative AI performance reports (3 June 2026, expanded 23 June) give a separate view of **impressions** in AI Overviews, AI Mode, and Discover AI — **impressions only, no clicks, CTR, or query data, and a subset rollout.** Confirm availability on the property before relying on it.

**Describe our LLM number as "detected share, with unknown bias" — not as a floor.** A floor claim assumes all misattribution runs one way. Referrer stripping and in-app browsers plausibly push AI traffic into Direct, but UTM-based landing-page reclassification can also pull non-AI traffic *into* the AI bucket, and we have no calibrated estimate of either. The honest statement is that the true share is unknown and metric 8 exists to detect the second error mode.

---

## 8. Explicitly frozen (do not re-litigate)

- **`llms.txt` / `llms-full.txt`** — live and correct; **no further GEO investment.** Server-log analyses across >500M AI-bot events found effectively no targeted fetches by GPTBot, ClaudeBot, PerplexityBot, or OAI-SearchBot, and no major assistant confirms reading it at inference. **One narrow exception, which is not investment: drift correction.** It is a published factual surface, so if a claim in it contradicts `PRICING`, `getApprovedClaim()`, `MAX_MED_CERT_DURATION_DAYS`, or current service availability, fix the claim. That is maintenance under P3.1's consistency sweep. Do not add sections, expand it, or optimise it.
- **New schema markup for GEO reasons — none.** Google states there is no special structured data needed for AI features. Keep existing markup accurate.
- **Semrush AI-visibility score** — UI-only, no API, opaque. Not a target, not tracked.
- **IndexNow** — correctly scoped; does nothing for Google. Note the Phase 1 contamination rule constrains *where* it fires during the experiment.

---

## 9. Canon: no changes proposed

**This programme proposes zero canon changes.** Stated explicitly because earlier drafts did propose one and justified it incorrectly.

**Withdrawn: promoting BWT grounding queries to a co-equal content-selection lane.** The v2 justification was that BWT "measures a channel producing ~38% of free orders." **It does not.** That 38% is ChatGPT; BWT measures Microsoft surfaces, which have produced zero detected orders. Elevating BWT to canon on that reasoning conflated two channels. **Content lane selection stays `docs/ARTICLE_TEMPLATE.md` §8 — GSC-first, one guide per PR.** BWT may reorder priorities within that ordering; it may not replace it.

The proposal may be **re-made only after** Phase 2 shows either that BWT movement produces downstream sessions/orders, or that it independently improves the ChatGPT prompt panel. If it is ever approved, `ARTICLE_TEMPLATE.md` §8 must be amended in the same commit — a reference-only plan cannot override canon.

**ROADMAP rank order is unchanged and this document does not touch it.** Rank 3 (external reputation and distribution) sits above rank 6 (compounding work), which is why Phase 0 distribution starts in week 1 and all content work sits behind Phase 2 gates.

---

## 10. Review adjudications

### Round 1 (v1 → v2) — upheld on 10 points

Causal claim demoted to a hypothesis (Microsoft states its AI data is sampled and not attributable to single changes) · A1 rewritten as prospective after confirming `attribution-storage.ts` strips query strings · canon-reordering surfaced explicitly instead of assumed · service/pricing claims removed from guide bodies · "byte-identical" scoped to owned surfaces · **"only verification primitive" struck** after confirming Qoctor, Updoc, and Doccy all publish live verification surfaces · **data-asset 1,000-request gate restored** after reading the spec's three documented disqualifiers · forecast relabelled · calendar rebuilt as sequenced cohorts · factual slips fixed (Apr AI = **3**, not 2 — the 2 came from a 95-day window clipping April).

### Round 2 (v2 → v3) — upheld on 6 points

| # | Finding | Verification | Resolution |
|---|---|---|---|
| 1 | `citations × (1 − share)` is not headroom | Algebra: competing = ours × (1−share) ÷ share | §2 recomputed; target ordering changed materially; winnability qualifier added |
| 2 | Conflates Bing visibility with ChatGPT revenue | BWT measures Microsoft surfaces; the 38% is ChatGPT; Copilot orders = 0 | **§9.1 withdrawn.** Phase 2 now tests the link before any canon proposal |
| 3 | A1 under-specified; PostHog route disproven | `posthog-privacy.ts` `sanitizePostHogUrl` strips all query params and fragments; `middleware-attribution.ts` reads only `searchParams`, never `Referer` | P0.2 specifies the full path; deliverable is a count, not an adjective |
| 4 | Experiments not decision-grade; calendar impossible | A mid-August start cannot yield a 3-week verdict by Sep 1 | §4 fully pre-registered; verdict moved to ~Sep 15; IndexNow restricted to treatment URLs; scaling needs Phase 2 **and** the answerability cohort |
| 5a | $4k fail line orphaned from a discarded goal | `docs/ROADMAP.md` §2 owns a **$5,000/month** rolling net-retained rung | $4k gate removed; canon rung is the reference |
| 5b | §9 promised two changes, 9.2 said nothing changes | — | §9 now states zero canon changes |
| 5c | Superseded plan outside `archive/` | `docs/ROADMAP.md` §7 requires the move | Moved via `git mv`; archive README index updated |
| 5d | Rank-5 reorder workstream vanished despite "nothing dropped" | — | P3.5 states where it lives and why it is out of scope |
| 5e | `/employers` at 10.1 still under a strict ≤10 rule | — | Both `/verify` and `/employers` excluded from CTR repair |
| 5f | E3 same-day media response conflicts with the runbook | `docs/runbooks/comparative-tagline-complaint.md` §6: "Do not respond same-day, regardless of deadline pressure" | E3 is now pre-drafted-and-held; the runbook owns timing |

### Round 3 (v3 → v4) — lock pass, upheld on all points

| # | Finding | Verification | Resolution |
|---|---|---|---|
| 1 | v3 wrongly said `captureAttributionToCookie` never reads `Referer` | It **does** — `req.headers.get("referer")` — but only after `if (Object.keys(captured).length === 0) return response`, so untagged arrivals exit first | P0.2 restated: the gap is the early return, not missing referrer handling |
| 2 | Wrong classifier surfaces; no scorecard SQL exists | Real surfaces are `lib/analytics/ai-referral.ts`, `lib/analytics/source-classification.ts`, `lib/admin/ai-attribution-breakdown.ts`; the "scorecard SQL" was a phantom | P0.2 names all three; one shared exact-host/exact-UTM classifier with negative fixtures for ordinary Bing and ambiguous You.com; short-token matching banned |
| 3 | Migration and persistence path were "if required" | — | Both mandatory, covering guest **and** authenticated checkout-to-payment-finalisation; denominator is **eligible landing requests**, not visits; `CLAUDE.md`/`AGENTS.md` attribution update required |
| 4 | n=15/arm is not powered for a 30-point MDE at α=0.05 | **10/15 vs 5/15 = 33 points, two-sided Fisher p ≈ 0.143** (verified independently) | §4 relabelled a **pilot** reporting effect size with exact CIs; power rule added (~35–40/arm at an assumed 15% control rate); ITT, missing-status handling, standardised treatment, stratification-respecting inference all pre-registered; money pages excluded from the untreated arm |
| 5 | Missing bridge: indexation pass with no citation signal | — | Explicit: **"indexed but not cited" = stop or maintain**, does not enter Phase 2 |
| 6 | Phase 2 pass rule not a rule | — | Split into **Outcome A** (commercial signal — the only path to a revenue claim or content scaling), **Outcome B** (cross-surface visibility with frozen account/model/mode/locale/prompts/repeats/scoring — unlocks a bounded answerability test only), **Outcome C** (no signal → maintenance) |
| 7 | P3.1 had no experiment table; answerability conflated with CTR repair | — | P3.1 has its own full table; CTR repair split out as **P3.1b** and barred from P3.1 cohorts; all Phase 3 dates rebase from the actual unlock date |
| 8 | P3.3 and P3.4 wrongly parked behind Phase 2 | Both have independent rank/gate logic | Marked independent — E1 evidence and the 1,000-request threshold respectively |
| 9 | Phase 0 read as authority for live external actions | — | §3 header: internal drafting/spec and read-only audits approved; **every live external action separately approved**, each send, Wikidata edit, NHSD publication, and GBP refresh named |
| 10 | robots edit was pure duplication of the catch-all allow | `User-Agent: *` already allows all; four proposed agents add no behaviour | Downgraded to **no change unless the audit proves a concrete retrieval problem** |
| 11 | Scorecard overstated collection | GSC API has **no Links endpoint** (Search Analytics, Sites, Sitemaps, URL Inspection only); `gsc-index-audit.mjs` inspects a bounded `--inspect-limit` priority sample | §7 rebuilt with per-row collection status; referring domains marked **unavailable via API**; BWT parsing, prompt panel, intake starts, and the `heard_about_us` denominator marked not-built/unreliable |
| 12 | Overlapping rolling windows; "floor" claim | — | Two **closed, non-overlapping** 30-day windows; AI share restated as **"detected share with unknown bias"** since UTM reclassification can also inflate the AI bucket |
| 13 | "Approved constants" too vague; `llms.txt` contradiction; rung definition | `PRICING` (`lib/constants/index.ts:94`), `APPROVED_CLAIMS`/`getApprovedClaim()` (`lib/marketing/approved-claims.ts:87,402`), `MAX_MED_CERT_DURATION_DAYS` (`lib/clinical/intake-validation.ts:74`) | Owners named; `llms.txt` scoped to drift correction only; channel net revenue marked diagnostic, canon rung is dashboard net-retained **including disputes** |
| 14 | Bookkeeping: file-map header, archive header | Header still read "109"; the archive link resolved inside `archive/` and was broken | Header now 111 as at 2026-07-30; archived plan given a neutral historical-snapshot header with a working `../` link, and its false "all six workstreams carried forward" and "Bing work moved citations" claims removed |

**Reviewer corrections accepted across rounds:** the round-1 BWT help URL soft-200s to a generic landing page and documents nothing — Citation Share is nonetheless genuinely defined by Microsoft's June 2026 AI Visibility Insights post. The Google Generative AI report is real but impressions-only on a subset rollout.

**Declined:** upgrading the global Vercel CLI as part of this work. P0.3's firewall task is read-only configuration inspection; a global package install is a separate operator decision, surfaced rather than executed.

**Note on `pnpm doc:audit`:** it passes, which proves bookkeeping mechanics only — file count, plan-reference integrity, and the 9 doc-pinning contracts. It is not evidence of strategic correctness.

---

## 11. Operator decisions needed

1. **Now — unblock BWT.** Either generate a **BWT API key** (BWT → Settings → API access) into `.env.local` — unlocking URL submission, crawl stats, keyword endpoints; **AI Performance itself has no API and its CSV stays manual either way** — or export the AI Performance CSV plus the **4 Recommendations error rows**.
2. **Now — approve the three sends individually** (MediCompare, Finder, Trustpilot). ROADMAP rank 3; P0.1 queues behind them and has since 07-09.
3. **Approve P0.2 as a specification exercise** — spec and review before any code or migration.
4. **Approve the Phase 1 pre-registration** once the coverage audit reports the gap-list size, so cohort feasibility is known before commitment.
5. **Mid-Aug (pre-decide):** if ProductReview conversion is still ~1.5%, approve the 50/50 destination split.
6. **Check whether the GSC Generative AI report is live on the InstantMed property.**

**Not seeking approval for:** BWT as content canon · content-wave scaling · any revenue-gate figure other than the canon rung.

---

## 12. Out of scope / refused lanes

Google Ads changes (ROADMAP rank 4) · subscriptions and memberships · new services or the weight-loss launch · city pages (authority gate) · **prescription-medicine acquisition or brand pages (TGA s42DL)** · **on-site review counts, star ratings, testimonials, or aggregate-rating schema (AHPRA s133)** · **any category-level superiority claim, including "only verifiable provider"** · CTAs, pricing, or service claims in guide bodies · drug names on money pages or in request URL params · educational medicine pages as paid ad destinations · **same-day substantive media responses** · Reddit posting or astroturf (monitor only) · paid links, PBNs, guest-post networks · named-founder PR or bylines · canonical/301 changes without operator sign-off · re-researching the comparison landscape (kit current to 07-24) · new schema markup for GEO reasons · further `llms.txt` investment · paid AI-visibility SaaS · Meta AI, Amazon, You.com, Mistral surface chasing · publishing the data asset before its 1,000-request gate clears.

---

## 13. Risks

| Risk | Mitigant |
|---|---|
| **Single-engine concentration — functionally ChatGPT-only** | Phase 2 is the test of whether other surfaces can be made to matter. If it fails, concentration is a fact to manage, not a gap to close: convert AI-acquired patients into owned email |
| An OpenAI health-recommendation policy change zeroes the channel with no notice | Diversify corroboration across surfaces via P0.1; the fortnightly panel detects a shift within ~2 weeks |
| **Attribution goes dark, not dead** | Pre-committed: a sudden measured drop triggers a `heard_about_us` and BWT-citation cross-check **before** any strategy change |
| **Both hypotheses fail after two months of measurement** | That is a valid outcome and the phases are designed to reach it cheaply. Budget moves permanently to P0.1, which is well-evidenced |
| **Experiments are underpowered and we over-read a null** | Cohort minimums, a stated MDE, and an explicit instruction to report null results as weak evidence |
| AI Overview click cannibalisation | Already live on our best-impression page. Judge informational pages on citations and position. Do not rewrite AIO-capped pages |
| YMYL institutional routing to healthdirect/gov sources | Unbeatable on clinical questions; the `.gov.au` listing keeps us inside institutional answers for service questions. Reflected in §2's winnability column |
| Google YMYL volatility on a young domain | Real E-E-A-T only: genuine reviews, `.gov.au` listing, LegitScript, real last-reviewed stamps, zero arbitrage lanes |
| Regulatory optics of the query space | Every "certificate without seeing a doctor"-class page stays education-framed. AHPRA's "encouraging unnecessary use" lens applies even when the assistant does the recommending |
| **Competitive-claim exposure on comparison pages** | E1 before E2; specific dated verifiable facts only; no category superiority; compliance skill gate before publish |
| Capacity at scale | Canon rung is $5,000/month; capacity thresholds live in `docs/REVENUE_MODEL.md` §8 (sole auto-trigger 20+ Rx/hour sustained) |
