# Organic + GEO free-revenue plan — $20k/month by 31 Jan 2027

> **Authority linkage (ROADMAP §7):** this plan elaborates ROADMAP rank 3 (external reputation and distribution) and rank 6 (compounding work), and inherits their checkpoints. It does not reorder the queue. Ads economics stay in rank 4 and are out of scope here.
>
> **Written:** 2026-07-24, from live Supabase + GSC pulls the same day. Re-derive live numbers before quoting; they move fast.

---

## 0. The verdict up front

**The goal needs ~+55% free-channel growth per month, sustained for six consecutive months including December.** That is at the top edge of the current curve, not outside it — but it only holds if new fuel lands every month. Content volume alone will not do it; six prior audits proved the binding constraint is third-party authority (reviews, listings, links), and that conclusion stands.

The math:

- $20,000/mo at the live blended AOV (~$29) = **~690 free orders/month (~23/day)**.
- July free run-rate: **~50 orders / ~$1,430** (projected full month from the 24th).
- Required multiple: **~14x in 6 months ≈ +55%/month compounding.**
- Recent actuals: free orders 10 (May) → 33 (Jun) → ~50 (Jul); GSC clicks +79% (Jun), ~+80% (Jul pace). The curve is currently in range, off a small base.

**Base case if we hold ≥+45%/mo: ~$12–14k/mo free by 31 Jan.** The $20k top end additionally requires: review mass ≥50, at least 3 live third-party listings, the data-asset link cycle landing in Dec–Jan, and the January back-to-work seasonal kicker. Both outcomes are good; the plan is built to keep the doubling alive as long as possible and to detect stall within one month.

**Fail line:** if free revenue is below **$4k/mo at the end of October**, the curve cannot reach $20k by January. The honest options then are extending the timeline one quarter or filling the gap with the (now contribution-positive) paid lane — not adding content volume.

---

## 1. Baseline — live 2026-07-24

| Metric | Value | Source |
|---|---|---|
| Paid orders, last 30d (all channels) | 81 / $2,340.80 net | Supabase, canonical filter |
| Free orders July (calendar, through 24th) | ~39 / ~$1,108 → ~50 projected | Supabase channel cut |
| — AI referral (measured) | 3 → 4 → 11 → 17 (Apr→Jul) | fastest free channel |
| — Organic search | 0 → 3 → 12 → 15 (Apr→Jul) | |
| — Direct/dark + other | ~5/mo (most old dark traffic now resolves to AI via landing-page UTMs) | |
| GSC clicks / impressions (monthly) | 21 → 52 → 58 → 104 → 131* (Mar→Jul, *through 21st) | GSC API |
| Top organic assets | parents-sick-child (47 clicks/28d, pos 6.7), antibiotics-OTC cluster (34 clicks, pos 6–9 on 5.9k impr), `/medical-certificate` pos 28.6 on 2.4k impr | GSC API |
| Advertised sitemap URLs | 151 | live curl |
| Indexed pages | ~40–45 (last verified late June — **re-baseline at kickoff**) | GSC |
| ProductReview reviews | 2 (131 asks sent, 1.5%) | listing |
| Third-party comparison/directory presence | **zero** (MediCompare 404, Finder absent, no Trustpilot profile); NHSD/PCA .gov.au listing live; LegitScript live | 07-24 sweep |
| Semrush AI visibility | 14/100, ChatGPT only engine citing (Jun 20) | Semrush UI (API cannot pull this) |
| All-time paid orders | **209** (first order 2026-01-30) | data-asset gate = 1,000 |
| Doctor capacity | Not binding; $10k rung triggers a review only; sole auto-trigger = 20+ Rx/hour sustained | REVENUE_MODEL §8 |

Definition used throughout: **free revenue** = net-retained revenue from AI referral + organic search + direct/dark + referral + owned email (lifecycle/recovery). Paid ads excluded. Ads keep running in their own rank-4 lane — ad-acquired orders feed the same review flywheel, so the lanes are synergistic, not competing.

---

## 2. Settled findings this plan builds on (do not re-litigate)

1. **Authority/crawl demand is the binding constraint, not content volume.** Money pages sat uncrawled for months with excellent on-page. Three separate 3-LLM reviews + live GSC verification reached the same verdict. (`seo-content-campaign`, `2026-06-03/04` audits)
2. **On-site GEO layer is DONE**: FAQ-in-HTML, llms.txt, sameAs entity anchors, semantic compare tables, schema fixes, AI-crawler allows. Maintenance only. (#152–#175)
3. **The LLM channel is the asymmetric lane**: ~28% of orders vs NextClinic's ~1% of traffic. LLM answers are driven by third-party corroboration (reviews, listings, comparison pages) — which cannot be bought or written on-site.
4. **One third of NextClinic's playbook is refused arbitrage**: drug-acquisition pages (TGA s42DL), on-site review counts (AHPRA s133 posture), CTAs inside educational articles. Medicine *education* is in-policy; drug *acquisition* pages are not.
5. **Reviews are the upstream input for every listing outcome** — MediCompare rank order tracks ProductReview scores; Trustpilot/PR categories rank on volume.
6. **Pricing holds at $24.95** — the price lane is conceded (Doccy $12.90). The winnable community axis is "will my employer accept it" → `/verify`.
7. Indexing-gate mechanics live in `docs/ARTICLE_TEMPLATE.md` §8; content compliance law in `docs/SEO_CONTENT_POLICY.md`. City pages stay behind the authority gate. Canonical/301 changes require operator sign-off (the #141/#142 loop).

---

## 3. Six workstreams

### W1 — Review flywheel (the #1 bottleneck; feeds Google E-E-A-T *and* LLM citations)

Everything downstream (listings, LLM answers, `/medical-certificate` page-3 → page-1) ranks on review mass. 2 reviews is the single biggest gap vs every competitor.

- **Mid-August checkpoint (already scheduled):** judge #396 expectation-setting copy against the 1.5% send→post baseline. Working ≈ ~5 reviews/mo at current volume. The new hash-only click-funnel receipts (migration 2026-07-23) now separate click-through from post-through — use them to locate the wall.
- **If flat at mid-August:** run the **destination split** — 50/50 ProductReview vs Google reviews via the existing `getRotatingReviewUrl` rotation (a GBP exists; Bing Places synced 2026-06-09). This is a *coupled* experiment: the email copy names ProductReview's sign-in step, so destination and copy change together. Measure 4 weeks on click→post rate per destination.
- **Escalation 2 (Sep, if needed):** post-delivery in-dashboard ask card (owned surface, no email dependency). Neutral ask only — the "good or bad" anchor and the no-inducement/no-gating rules are pinned by test and non-negotiable.
- Keep ProductReview-first until ~15 reviews, then re-add Trustpilot to the rotation (already-documented sequencing).
- **Targets:** ≥10 by Sep 1 · ≥25 by Oct 15 · ≥45 by Dec 1 · ≥60 by Jan 31. (Order volume growth does most of the lifting if the ask converts ≥3%.)
- **Kill rule:** never trade neutrality for volume; a single gated/incentivised-review complaint costs more than 50 reviews buy.

### W2 — Third-party distribution (listings, citations, and the /verify B2B link lane)

InstantMed is on zero comparison surfaces while ~34 providers, including tiny ones, have MediCompare profiles. The submission kit (`docs/audits/2026-07-09-comparison-surface-submission-kit.md`) is submission-ready — this is blocked on two operator sends, not research.

- **Week 1 (operator, ~45 min total):** send the MediCompare email (`info@medicompare.com.au`), submit the Finder partner form, claim the free Trustpilot profile (claim-and-hold; ProductReview stays the active review destination).
- **Monthly cadence from Sep:** one new genuinely relevant AU surface per month from the kit's research (agent drafts, operator sends). The pitch angle everywhere: 24/7 operation, **full refund on decline** (no surface has that column — offer it to MediCompare as a data point), and instant employer verification.
- **Sep–Oct: /verify employer outreach.** Agent drafts a company-attributed packet (no named founder — binding privacy rule) for 20–30 HR, payroll, and employment-law publishers: "how to verify a telehealth medical certificate" as the hook, `/verify` + `/employers` as the linked asset. This is the uncontested link lane — it creates the crawl demand that moves `/medical-certificate` off page 3, and it targets the one community axis we can win (employer acceptance).
- **Targets:** ≥2 comparison listings live by Oct 1 · ≥4 surfaces + ≥8 new referring domains by Jan 31.
- **Kill rule:** no paid link schemes, no guest-post networks, no directory spam (booking-platform directories like HealthEngine/HotDoc remain a model mismatch — skip).

### W3 — Metered indexing + demand-led content (the "more pages indexed" workstream)

Reframe of the June "stop deepening" verdict, which was correct *then*: money pages weren't crawled and indexed count was static. Conditions have changed — GSC clicks are compounding, organic orders went 3→12→15/mo, and specific clusters demonstrably rank. Content work restarts, but **demand-led and wave-gated**, never volume-led.

**Wave mechanics** (formalises ARTICLE_TEMPLATE §8):

1. Kickoff: fresh `pnpm seo:gsc-index-audit` to re-baseline indexed count and per-URL states. Refresh the queue from GSC before every batch — never plan from stale numbers.
2. A wave = 8–12 URLs (mix of: deepen/CTR on GSC-proven pages → re-index best remaining iceboxed → net-new in evidence lanes).
3. **Gate: wave N+1 starts only when wave N shows ≥60% indexed or earning impressions within 3 weeks.** If a wave fails the gate, the next wave shrinks and shifts toward deepen/CTR only.
4. Cap: ≤4 pages touched per week, ≤1 wave in flight. Sitemap never outruns indexation (151 → ≤210 by Jan).
5. Every new/rewritten guide meets the full ARTICLE_TEMPLATE standard (answer-first, 6+ H2, 1,200+ words, 2–3 registry visuals, linked AU sources, red flags) + `pnpm content:audit` + the §8 indexing-ready checklist + GSC request-index.

**Evidence lanes for net-new pages** (in priority order):

| Lane | Evidence | Notes |
|---|---|---|
| Prescription/eScript **access & process** education | Antibiotics-OTC cluster ranks pos 6–9 on real volume; repeat-Rx orders 9→30/mo | Process/eligibility/AU-rules content only — never drug-acquisition pages |
| Med-cert situational cluster | parents-sick-child is the #1 click asset (pos 6.7); "medical certificate no call" sits pos 1 | Carer/casual/notice-period/evidence-rules sub-intents; conservative claims only (§8 of policy) |
| Women's health education (UTI + pill) | Service live since 06-15 with near-zero supporting content; UTIs peak in AU summer (Dec–Feb) | Build Sep–Nov so it's indexed before the seasonal peak |
| Employer/HR verification cluster | Feeds W2 outreach; the winnable "will my employer accept it" axis | Doubles as the linked asset for the B2B packet |
| Conditions re-index (38 held) | Only with per-page GSC evidence | Already deep; re-index is cheap when justified |

- **Monthly CTR pass** (proven method): title/meta rewrites only on pages ranking pos ≤10 with ≥300 impressions and weak CTR. Never on pos >10 pages — that's an authority problem.
- **Targets (indexed pages, the real KPI):** ≥60 by Sep 1 · ≥85 by Oct 15 · ≥110 by Dec 1 · **≥140 by Jan 31** (from ~40–45).
- **Kill rule:** two consecutive failed wave gates = stop publishing, return to authority work only, re-audit with the operator.

### W4 — GEO maintenance + LLM answer measurement

On-site is done; this is upkeep + finally measuring the channel properly (Semrush AI-visibility is UI-only — no API, no automation on it).

- **Monthly 10-prompt LLM panel** (~30 min, agent-drafted scoresheet, operator or agent-browser runs it): fixed canonical prompts ("best online medical certificate australia", "is instantmed legit", "online doctor for UTI australia", etc.) across ChatGPT, Perplexity, Gemini, Copilot. Track: mention rate, citation source (which third-party surface got us cited), and factual accuracy of what's said about us.
- **Quarterly freshness:** llms.txt/llms-full.txt review, `/compare` price re-verification (last done 2026-07-24 → next late Oct), real last-reviewed stamps only (#409 made these real — keep them real).
- **Monthly Bing spot-check** of money pages (ChatGPT grounding surface; gap was closed 07-22 — keep it closed).
- **Targets:** ≥5/10 prompts mention InstantMed by Nov 1 · ≥7/10 by Jan 31 (from ~1–2/10 today).
- **Kill rule:** don't chase individual LLM answers with on-site tweaks; the panel measures W1/W2 output, it is not its own workstream to optimise.

### W5 — The data asset: "Australian Sick Day Report" (Nov–Jan)

The one earned-media link play that works with company-only attribution (binding: no named founder). Privacy is already cleared (aggregate/de-identified clause in the privacy policy §3; <30 cell suppression; state-level only; no PHI/free-text). Deferred in June at 101 orders for viability — **now 209 and compounding; the ~1,000-order viability gate lands ~Oct–Nov on the current curve.**

- **Nov:** re-run the aggregate viability counts; build the report (schema notes + build steps already in `docs/audits/2026-06-04-data-asset-spec.md` — note `intakes.category` not `service_type`, exclude the seeded patient).
- **Dec:** produce the page + 2–3 chart visuals; pre-pitch list of AU HR/workplace/news outlets (agent drafts, company-attributed).
- **Jan:** pitch into the back-to-work window ("what Australia's sick days look like, from real telehealth data"). This is timed to hit exactly when the $20k month needs its authority step-change.
- **Target:** 8–15 referring domains from the cycle. This is the single play most likely to move `/medical-certificate` (pos ~29, 44k-vol head query) onto page 1.
- **Gate:** re-confirm with operator before build (privacy posture unchanged, numbers credible).

### W6 — Owned reorder loop (free-revenue thickener; existing checkpoints only)

Not SEO, but it compounds free revenue per acquired patient and it's already built.

- Refill-reminder waves: June Rx cohort (~9) hits ~mid-Aug, July cohort (~27–30) ~mid-Sep. ROADMAP rank 5 owns the three-wave verdict — no new build unless it passes.
- Cert reactivation stays bounded and consent-gated as-is.
- Review-request and recovery email stay within the pinned lifecycle rules (one owner, suppression respected).

---

## 4. Month-by-month calendar

| Month | Focus | Key actions |
|---|---|---|
| **Aug** | Unblock distribution; measure the review fix | Operator sends MediCompare + Finder + Trustpilot claim (week 1). Kickoff GSC re-baseline. Wave 1 (deepen/CTR + best iceboxed). Mid-Aug: #396 review verdict → destination split if flat; survey-placement delta check (vs 8%). First LLM panel. Refill wave 1 fires. |
| **Sep** | Content engine at cadence; B2B packet out | Waves 2–3 (Rx-access + med-cert lanes; women's health build starts). /verify employer packet drafted + first 10 sends. Review escalation 2 if needed. Refill wave 2. |
| **Oct** | Authority compounding; women's health indexed pre-season | Waves 4–5. Second comparison surface live. Employer outreach follow-ups. Quarterly llms.txt + /compare freshness. **Oct 31 fail-line check: free ≥$4k/mo or re-scope.** |
| **Nov** | Data asset build; hold cadence | 1,000-order gate check → build Sick Day Report. Waves 6–7. Third surface. Rank-5 reorder verdict (3 waves done). |
| **Dec** | Ship the report; seasonal prep; expect below-trend demand | Report page + visuals live; pitch list finalised. Jan-seasonal content ready (back-to-work certs, summer UTI). Light wave. Don't panic on a flat December — it's seasonal. |
| **Jan** | The push | Pitch cycle into back-to-work window. CTR pass on everything new that ranks. Waves resume. **Jan 31: goal measurement + next-6-months decision.** |

Operator load: ~1–2 h/week (submissions, outreach sends, review replies, monthly panel if not delegated). Everything else is agent-executable in normal sessions.

---

## 5. Monthly scorecard + milestones

Agent produces this on the first business day of each month (Supabase canonical classifier + GSC API + listing pages + panel sheet). One table, one on/off-track verdict, one forced decision.

**KPIs:** free orders + net $ by channel (AI / organic / direct / email) · GSC clicks + impressions · indexed pages (audit script) · sitemap size · reviews (count + ask→post rate) · live listings · LLM panel mention rate · wave-gate pass/fail.

**Free-revenue milestones (net $/month, free channels only):**

| Month-end | Floor (≥+45%/mo) | Stretch (~+55%/mo) | Free orders (stretch) |
|---|---|---|---|
| Jul (baseline) | ~$1.4k | ~$1.4k | ~50 |
| Aug | $2.0k | $2.2k | ~78 |
| Sep | $2.9k | $3.4k | ~120 |
| Oct | $4.2k | $5.3k | ~185 |
| Nov | $6.1k | $8.2k | ~285 |
| Dec | $8.0k (seasonal drag) | $10.5k | ~365 |
| **Jan** | **$12–14k** | **$18–20k** | **~630–690** |

Checkpoint gates: mid-Aug (review fix + survey delta) · Sep 1 (wave-1 verdict) · Oct 1 (≥2 listings, ≥25 reviews trajectory) · **Oct 31 (fail line: free ≥$4k)** · Nov 1 (data-asset go) · Jan 31 (goal + reset).

---

## 6. Operator decisions needed

1. **Now:** send MediCompare email + Finder partner form (kit ready, ~30 min) + claim Trustpilot (~15 min). Everything in W2 queues behind this.
2. **Approve this plan's wave-gated content cadence** as the standing instruction for content sessions — it supersedes the blanket "stop deepening" with "demand-led, wave-gated, capped".
3. **Mid-Aug (pre-decide the branch):** if ProductReview conversion is still ~1.5%, approve the 50/50 Google-vs-ProductReview destination split (coupled copy change, existing rotation env, click receipts measure it).
4. **~Nov:** data-asset go/no-go at the 1,000-order gate (privacy already cleared; re-confirm).

## 7. Out of scope / refused lanes (unchanged)

Google Ads changes (rank 4 owns them) · subscriptions/memberships · new services or weight-loss launch · city pages (authority gate) · drug-acquisition pages (TGA) · on-site review counts/ratings/testimonial schema (AHPRA posture) · CTAs in guide bodies · Reddit posting/astroturf (monitor only) · paid links/PBNs/guest-post networks · named-founder PR or bylines · canonical/301 changes without operator sign-off · re-researching the comparison landscape (kit is fresh as of 07-24).

## 8. Risks

| Risk | Mitigant |
|---|---|
| Compounding decays as the base grows (the default outcome) | New fuel scheduled monthly (listings → outreach → report); fail line at Oct 31 forces the re-scope conversation early |
| Review wall is deeper than copy | Destination split pre-approved mid-Aug; owned-surface ask as escalation 2 |
| December seasonal dip breaks morale/decisions | Dec is planned as below-trend; January carries the kicker |
| Google YMYL volatility on a young domain | Real E-E-A-T only: genuine reviews, .gov.au listing, LegitScript, real last-reviewed stamps, no arbitrage lanes |
| LLM answer surfaces shift (e.g., ChatGPT changes grounding) | Diversify corroboration across 4+ surfaces; monthly panel detects shifts within ~30 days |
| Capacity at scale | $10k rung = review only; sole auto-trigger 20+ Rx/hr (REVENUE_MODEL §8); med certs auto-approve |
| Wave gates fail repeatedly (indexation stalls) | Kill rule returns effort to authority-only; the plan degrades gracefully to W1/W2/W5 |
