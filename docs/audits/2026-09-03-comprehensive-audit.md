# Comprehensive platform and business audit — 3 September 2026 (revenue-first)

> **Purpose.** A full-platform audit with a single question behind it: where does the next $5,000 a month come from, and what stands in the way. Written to be handed to a second reviewer (GPT) before implementation, so every claim carries its number, its source, and the rule that constrains it.
>
> **Status of this document.** Point-in-time evidence as at 2026-09-03 13:00 AEST. Numbers were pulled directly from production (Supabase read-only SQL, the Google Ads API read-only, PostHog SQL, Search Console, Lighthouse, Vercel and Supabase logs, GitHub) and are aggregate-only. No patient-identifying data is included. The repository has had **no commits since the 2 September audit**, so engineering findings from that audit carry forward unchanged and were re-verified only where a gate could have moved.
>
> **How to read the plan.** Section 10 is the ranked money plan with expected monthly impact. Section 11 is the exact Google Ads change list. Section 12 is the engineering ticket list. Section 13 is the list of things the reviewer must not recommend, because they conflict with locked operator decisions, Google healthcare policy, TGA/AHPRA advertising rules, or the ads engine's own guardrails.

---

## 1. Executive summary

**The business is at a plateau of roughly $9,000 net-retained per month after tripling in August, and the plateau is self-inflicted: the ads engine has been asking for a Scripts budget step every day since 24 August with no approval, the retention loop is switched off, and the single largest conversion leak is a form validation rule that buys no safety.**

| Headline | Value | Source |
|---|---|---|
| Net-retained revenue, last 30 days (to 3 Sep) | **$9,049** on 285 orders | Supabase `intakes` |
| Prior 30 days | $3,219 on 110 orders | same |
| August (calendar, Sydney) | $8,660 net on 273 orders | same |
| September pace (2.5 days) | $724 net on 23 orders ≈ $8,700/month | same |
| Last 7 days vs prior 7 | 59 orders / $1,882 vs 87 / $2,760 (**−32%**) | same |
| Google Ads, last 30 days | $3,129 spend, 156 recognised orders, $5,126 net, contribution ≈ $1,850 (36%) | Ads API + DB |
| First-order contribution, all channels, 30 days | ≈ $5,600 (net − ads − payment fees; before clinical labour) | derived |
| Refund rate | 3.7% of gross | DB |
| Buyers | 221 distinct, 15 returning (6.8%) | DB |

**Twelve-category scorecard (equal weights): 74 / 100**, unchanged from 2 September except where noted.

| Category | Score | One-line reason |
|---|---|---|
| Revenue & growth | 82 | Record month, but flat for two weeks and 55% of orders from one paid channel. |
| Unit economics & paid acquisition | 78 | 36% ads margin; Scripts at 44%; hair loss burning; two campaigns lose 79–88% of eligible impressions to rank. |
| Conversion funnel | 71 | 38.7% start→paid, 96% pay-init→paid; medication step loses 47% of the flows that reach it. |
| Acquisition & traffic | 44 | ~35 human sessions a day, 82% mobile; ChatGPT is the only strong free channel. |
| Clinical operations | 74 | Zero undecided; 78% of certificates protocol-issued in 16 minutes; manual P95 3–6 h; one person makes every decision. |
| Reliability & infrastructure | 76 | Zero 5xx; Supabase socket resets on 35 users; three dead subsystems generating noise. |
| Security & privacy | 80 | Zero unprotected routes; guest checkout skips the phone/DOB encrypted twin. |
| Codebase health | 78 | Gates green except the dependency audit; 2,296 tolerated dead-code findings. |
| Documentation & organisation | 72 | All drift gates pass; CLAUDE.md is 153 KB and growing 24 KB/month. |
| Delivery process & CI | 66 | PR-only main holds; zero independent review; 28% PR-CI failure rate from self-imposed ratchets. |
| Public surface & SEO | 80 | Clean hygiene; `/prescriptions` not indexed; price schema stale. |
| Performance & accessibility | 88 | Accessibility 100, CLS 0; mobile LCP 2.9–3.4 s. |

**Money plan headline (Section 10).** Approving the Scripts scale step, fixing the medication step, switching on refill reminders, graduating women's health, and pruning med-cert and hair-loss spend are together worth an estimated **+$3,500 to +$6,000 net-retained per month within 90 days**, about 80% of it at zero or near-zero acquisition cost. The binding constraint after that is clinical capacity: every one of the 285 decisions last month was made by one person.

---

## 2. Revenue and orders

### 2.1 Windows (paid orders; `payment_status ∈ {paid, partially_refunded, refunded}`, seeded E2E patient and `exclude_from_reporting` rows excluded; refunds from the `intakes.refund_amount_cents` mirror of the Stripe ledger)

| Window | Orders | Gross | Refunds | Net | Ads-attributed orders |
|---|---|---|---|---|---|
| Last 30 days | 285 | $9,393.40 | $344.15 | **$9,049.25** | 156 (55%) |
| Prior 30 days | 110 | $3,359.00 | $139.70 | $3,219.30 | 54 |
| Last 7 days | 59 | $1,926.55 | $44.85 | $1,881.70 | 32 |
| Prior 7 days | 87 | $2,949.75 | $189.55 | $2,760.20 | 43 |
| 14–21 days ago | 65 | $2,111.35 | $69.85 | $2,041.50 | 32 |
| September to date (Sydney) | 23 | $733.70 | $9.95 | $723.75 | 15 |

Monthly net (Sydney calendar): Mar $369 · Apr $938 · May $649 · Jun $1,288 · Jul $2,940 · **Aug $8,660** · Sep (2.5 d) $459.

The week-on-week dip is across channels (ads orders −26%, non-ads −38%) and coincides with no change in ad budgets since 24 August. Two weeks is not a trend, but the run-rate has stopped compounding; the plan below is what restarts it.

### 2.2 Service mix, last 30 days

| Service | Orders | Gross | Refunded orders | Declined | Priority add-on |
|---|---|---|---|---|---|
| Repeat prescription ($29.95) | 145 | $4,671 | 10 | 7 | 33 (23%) |
| Medical certificate: work | 98 | $2,870 | 2 | 2 | 6 (6%) |
| Medical certificate: study | 9 | $225 | 0 | 0 | 0 |
| Medical certificate: carer | 3 | $85 | 0 | 0 | 0 |
| ED consult ($49.95) | 18 | $959 | 0 | 0 | 6 (33%) |
| Women's health consult ($49.95) | 11 | $569 | 1 | 0 | 2 (18%) |
| Hair loss consult ($49.95) | 1 | $50 | 0 | 0 | 0 |
| Weight management ($89.95) | 0 | $0 | — | — | — |

Certificate duration mix (work): 1-day $24.95 × 50, 2-day $29.95 × 30, 3-day $39.95 × 12, plus 6 priority. Multi-day certificates are 43% of work certificates; average certificate order $29.74.

### 2.3 Channels, last 30 days (orders / net)

| Channel | Last 30 | Prior 30 | Net | AOV |
|---|---|---|---|---|
| Google Ads (gclid/gbraid/wbraid) | 156 | 54 | $5,126 | $34.84 |
| ChatGPT referrals (`utm_source=chatgpt.com`) | 52 | 21 | $1,457 | $28.60 |
| Google organic | 38 | 16 | $1,013 | $31.92 |
| Direct / unknown | 21 | 10 | $684 | — |
| Other referrers + Bing | 13 | 7 | $359 | — |
| Recovery email (`partial_intake_recovery`) | 5 | 1 | $145 | — |
| Certificate reactivation email | 1 | 1 | $30 | — |

Ads AOV is higher because 23% of scripts buyers and a third of ED buyers add priority review.

### 2.4 Time of day and day of week (all orders, 60 days, Sydney)

Orders concentrate 08:00–12:00 (141 of 395, 36%) and 14:00–16:00. Off-hours are not dead: 06:00–08:00 = 16 orders, 20:00–24:00 = 36 orders (9%). Sunday is the weakest day (29 orders vs 58–72 on weekdays). The ads schedule runs 08:00–20:00 only (Section 3.7), so the 06–08 and 20–22 demand is currently served by organic only.

---

## 3. Google Ads: full account audit (read-only API, last 30 days to 2 Sep)

Account 920-501-0513, AUD, Australia/Sydney, auto-tagging on, LegitScript-certified, all ads `APPROVED_LIMITED` (the expected state for certified healthcare inventory per `docs/ADVERTISING_COMPLIANCE.md` §1). Conversion tracking is configured correctly: the server-side offline click import (`InstantMed Server Purchase Import 20260601093317`, type `UPLOAD_CLICKS`) is the **only** primary action; the GA4 purchase mirror and the three legacy micro-actions are secondary and excluded from the conversions column. 212 of 212 server uploads succeeded in the last 21 days.

### 3.1 Campaigns

| Campaign | Bidding | Budget/day | Impr | Clicks | CPC | Spend | Google conv | Google value | Google ROAS | DB orders | DB net | DB contribution (margin) | Impr. share | Lost to budget | Lost to rank |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| JDM · Scripts | Max conv. value, tROAS 1.5 | $79 | 3,940 | 373 | $4.79 | $1,786 | 97 | $3,144 | 1.76 | 107 | $3,344 | $1,459 (44%) | <10% | 32% | 61% |
| JDM · Med Certs | Max conversions, tCPA $22 | $20 | 1,363 | 115 | $5.11 | $588 | 25 | $744 | 1.26 | 25 | $744 | $135 (18%) | <10% | **79%** | 20% |
| IM · ED Pilot | Manual CPC ($3 cap) | $12 | 2,299 | 102 | $3.46 | $353 | 6 | $300 | 0.85 | 9 | $469 | $106 (23%) | 11% | 1% | **88%** |
| IM · Women's Health | Manual CPC ($3 cap) | $20 | 1,612 | 78 | $2.93 | $228 | 11 | $539 | 2.36 | 12 | $569 | $327 (56%) | 21% | 0% | **80%** |
| IM · Hair Loss Pilot | Manual CPC ($3 cap) | $10 | 1,200 | 58 | $3.00 | $174 | 1 | $30 | 0.17 | 0 | $0 | −$174 | <10% | 79% | 19% |
| JDM · Specialist / Display | paused | $5 / $1 | 0 | 0 | — | $0 | — | — | — | — | — | — | — | — | — |

DB columns are from the ads engine's delivered run for 2 Sep (rolling 30, `google_ads_agent_runs.snapshot`); Google columns are from the API. Google under-counts relative to the DB because attribution lags the click date; use the DB for money and Google for auction diagnostics.

**Reading the constraints.** Impression share below 10% on the two largest campaigns means the auctions are enormous relative to current spend: Scripts is showing on fewer than one in ten eligible searches. Scripts loses 61% to rank and 32% to budget; Med Certs is budget-starved (79% lost to budget at $20/day); ED and Women's Health are bid-capped at $3 and lose 80–88% to rank with no budget pressure at all.

### 3.2 The ads engine has been asking for a Scripts scale step for ten days

Every delivered run since 24 August emits `APPROVAL_NEEDED · scripts · SCRIPTS_SCALE_GATES_PASSED · campaign_budget`. The last approved Scripts step was $60 → $79 on 24 August (proposal verified, 25 orders/day tier). Under `lib/ads-agent/policy.ts` the campaign now qualifies for the **"strong" tier** (≥50 mature orders and ≥40% contribution margin: it has 107 and 44%), which authorises a step of up to **+50%** ($79 → up to $118.50/day), subject to the engine's economic ceiling at the 30% target margin and the standing gates (refund rate <10%: it is 6.5%; tracking GREEN: it is; 3-day observation and ≥10 orders after any change).

Expected effect of taking the step: budget-lost share falls from 32% toward zero, so impressions on capped days rise roughly a third; Max Conversion Value will also buy costlier auctions, so CPA drifts from $16.70 (DB) toward $20. Estimate: **+30 to +45 orders a month, +$900 to +$1,300 net, +$300 to +$600 contribution**, still inside the policy margin floor.

A second, later lever: the campaign runs at tROAS 1.5 while delivering 1.76 (Google) / 1.87 (DB net over spend). The policy floor is 1.35. Lowering the target to 1.40 after the budget step has been observed buys volume at the margin the operator already accepted.

### 3.3 Keywords (enabled campaigns, cost-ranked; QS = quality score; conv = Google-attributed)

| Campaign · keyword (match) | QS · ad relevance · LP · exp. CTR | Impr | Clicks | CPC | Cost | Conv | CPA |
|---|---|---|---|---|---|---|---|
| Scripts · telehealth prescription (phrase) | 7 · avg · avg · above | 1,048 | 107 | $4.19 | $448 | 40 | $11.20 |
| Scripts · script online (exact) | 7 · avg · avg · above | 471 | 47 | $6.40 | $301 | 12 | $25.08 |
| Scripts · online prescription Australia (phrase) | 6 · **below** · avg · above | 420 | 42 | $5.03 | $211 | 6 | $35.23 |
| ED · telehealth mens health (phrase) | — | 945 | 53 | $3.77 | $200 | 5 | $39.96 |
| Scripts · get escript online (phrase) | 4 · avg · avg · **below** | 443 | 35 | $4.34 | $152 | 9 | $16.89 |
| Scripts · prescription repeat (phrase) | 7 | 295 | 25 | $5.31 | $133 | 5 | $26.56 |
| Women's health · uti treatment online (phrase) | 4 · avg · **below** · avg | 1,026 | 38 | $2.89 | $110 | 5.5 | $20.00 |
| Scripts · online script (exact) | 7 | 258 | 26 | $4.09 | $106 | 7 | $15.20 |
| Scripts · repeat scripts online (phrase) | 8 · above · avg · above | 91 | 19 | $4.74 | $90 | 5 | $18.00 |
| ED · impotence treatment (phrase, paused 1 Sep) | — | 892 | 26 | $3.28 | $85 | 1 | $85.38 |
| Women's health · online doctor for uti (phrase) | — | 413 | 28 | $2.96 | $83 | 4.5 | $18.40 |
| Med Certs · no appointment medical certificate (phrase) | — | 60 | 13 | $5.12 | $67 | 5 | **$13.31** |
| Med Certs · medical certificate today (phrase) | — | 111 | 11 | $5.81 | $64 | 3 | $21.32 |
| Scripts · repeat scripts (phrase) | 7 | 168 | 15 | $3.71 | $56 | 3.5 | $15.92 |
| ED · private mens health consultation (phrase) | — | 383 | 19 | $2.93 | $56 | 0 | — |
| Hair · online hair loss treatment (phrase) | 6 · avg · **below** · above | 214 | 18 | $3.09 | $56 | 0 | — |
| Med Certs · medical certificate online (exact, paused) | 6 · **below** | 211 | 10 | $5.49 | $55 | 0 | — |
| Hair · hair loss medication online (phrase) | — | 291 | 18 | $2.95 | $53 | 1 | $53.16 |
| Med Certs · doctor certificate online (phrase) | 6 · **below** | 74 | 8 | $6.31 | $50 | 4 | **$12.62** |
| Med Certs · medical certificate online (phrase) | 6 · **below** | 115 | 10 | $3.96 | $40 | 1 | $39.59 |
| Med Certs · telehealth medical certificate (phrase) | 6 · **below** | 123 | 8 | $4.79 | $38 | 3 | **$12.77** |
| Med Certs · medical certificate same day (phrase) | — | 49 | 7 | $4.32 | $30 | 3 | **$10.09** |
| Med Certs · carers certificate online (exact, paused) / carers leave certificate (phrase) | 7 | 67 | 9 | — | $50 | 0 | — |
| Med Certs · doctor certificate online (exact) | 6 · **below** | 86 | 5 | $5.55 | $28 | 0 | — |

From the database side (orders joined on the stored `keyword` column), the revenue concentration is even sharper: **"telehealth prescription" produced 51 of 156 ads orders and $1,527 net**; "script online" 14 / $459; "get escript online" 9 / $299; "telehealth mens health" 8 / $410 (all ED); "uti treatment online" 6 / $280; "online doctor for uti" 5 / $260. Two Scripts keywords ("script online", "online script") are also the entry point for 4 of the 18 ED orders, which is the cross-service attribution the engine flags on women's health too.

**Quality score pattern.** Every Med Certs keyword sits at QS 6 with ad relevance *below average*; landing-page experience is average everywhere. That is an ad-copy problem, not a page problem: the enabled Med Certs RSAs are "Excellent"/"Good" strength but not keyword-themed per ad group. On Scripts the weak spot is "get escript online" (QS 4, expected CTR below average) and "online prescription Australia" (ad relevance below average) which carries the highest CPA of the converting Scripts keywords.

### 3.4 Search terms: where the money leaks

2,196 search terms cost $1,734 (search-term view under-reports campaign totals by design). Zero-conversion terms cost $1,152 (66%), which is normal for long-tail search; the actionable subset is the terms that are informational, brand, product, or a service InstantMed does not sell:

| Term (campaign) | Cost | Clicks | Conv | Status | Action |
|---|---|---|---|---|---|
| medical certificate online (Med Certs, exact) | $45.34 | 8 | 0 | added | Keep the exact keyword paused; it never converted at $5–6 CPC. |
| ural sachets (Women's health) | $28.99 | 10 | 0 | excluded 1 Sep | Done. |
| order prescriptions online (Scripts) | $25.30 | 4 | 0 | excluded | Done. |
| online scripts / scripts online (Scripts) | $54.40 combined | 9 | 2 | mixed | Leave; converts intermittently. |
| request a script online / how to get a script online (Scripts) | $32.49 | 2 | 0 | none | Add phrase negatives `how to`, `how do i`, `can i`, `where can i` on Scripts and Med Certs. |
| online carers certificate / carers certificate online (Med Certs) | $28.56 | 4 | 0 | added | Pause `carers certificate online` exact (already paused) and `carers leave certificate` phrase ($21, 0 conv). Carer demand converts through `doctor certificate online` and `carer certificate` exact instead. |
| ed treatment / erectile dysfunction treatment (ED) | $18.36 | 3 | 0 | none | Expected: generic condition terms; keep but watch. |
| regaine for women / the hairy pill reviews / zova hair growth / where can i buy the hairy pill (Hair) | $29.33 | 12 | 0 | none | Product and competitor shopping, not a doctor-assessment intent. Add negatives `regaine`, `hairy pill`, `zova`, `reviews`, `where can i buy`. |
| vardenafil levitra online / stendra / spedra / cilatil (ED) | $21.58 | 4 | 0 | none | Drug-name queries. Add `levitra`, `vardenafil`, `stendra`, `spedra`, `avanafil`, `bimix` to the shared `IM | Never Serve` list (viagra/cialis/sildenafil/tadalafil are already there). |
| ondansetron / herpes / bv antibiotics (Scripts) | $17.50 | 3 | 0 | none | Acute or not-offered: add `herpes`, `bv`, `antibiotics online` as phrase negatives on Scripts. Do not negative generic medicine names wholesale: `doxycycline script online` converted and repeat requests for named medicines are legitimate. |
| chemist warehouse uti consult (Women's health) | $5.85 | 2 | 0 | none | Add `chemist warehouse` negative to Women's health (already on Med Certs and Scripts). |
| do i have a uti quiz / how to get birth control online (Women's health) | $11.76 | 4 | 0 | none | Add `quiz`, `how to` negatives. |
| medical certificate online medicare / bulk bill variants (Med Certs) | $5.45 | 1 | 0 | none | `medicare` phrase negative on Med Certs only (Medicare is optional for certificates; the query intent is a bulk-billed GP visit). |

Pattern-flagged informational/brand/drug/not-offered terms total **$267 a month for 4 conversions**. Removing them is worth about **$200 a month of contribution** and, more importantly, cleaner Smart Bidding signal on Scripts.

**Winners to protect and expand** (converting search terms with CPA under $15): "telehealth prescriptions", "scripts online", "prescription online", "get a script online", "instant script online", "quick script online", "telehealth script online", "uti script online", "uti treatment online", "uti script without consult", "get ed prescription online", "online medical certificate nsw", "sick certificate online", "medical certificate online without call". The last four are phrases that emphasise *no call*: they convert for certificates but must never be used in prescribing ad copy (Section 13).

### 3.5 Hour of day and day of week (all enabled campaigns, Google-attributed)

| Hour (Sydney) | Clicks | Cost | Conv | CPA |
|---|---|---|---|---|
| 08 | 75 | $417 | 25 | $16.7 |
| 09 | 69 | $350 | 16 | $21.9 |
| 10 | 56 | $273 | 13 | $21.0 |
| 11 | 52 | $237 | 10 | $23.7 |
| 12 | 54 | $241 | 10 | $24.1 |
| **13** | 47 | $205 | **3** | **$68.2** |
| 14 | 61 | $273 | 12 | $22.8 |
| **15** | 61 | $240 | **24** | **$10.0** |
| 16 | 48 | $186 | 7 | $26.6 |
| 17 | 43 | $183 | 5 | $36.5 |
| 18 | 31 | $110 | 4 | $27.6 |
| 19 | 33 | $130 | 3 | $43.3 |
| 20–23 (residual serving) | 55 | $161 | 3 | $53.8 |
| 00–07 (residual) | 41 | $123 | 5 | $24.6 |

Weekday CPA: Mon $17.8 · Tue $22.3 · Wed $29.3 · Thu $16.4 · Fri $24.8 · Sat $25.4 · Sun $26.6.

The schedule (08:00–20:00 on Scripts and Med Certs, no schedule on the three pilots) leaves the 06–08 and 20–22 demand (Section 2.4) to organic. The 13:00 hour and 17:00–19:00 are the expensive hours.

### 3.6 Device

Mobile is 82–87% of clicks and conversions on every campaign. Desktop CPA is worse on Scripts ($28.30 vs $17.17 mobile) and ED ($67 vs $57), better on Med Certs ($21.61 vs $23.78). No device bid adjustments exist.

### 3.7 Targeting and negatives

All five campaigns target Australia (geo 2036), all devices, English. Scripts and Med Certs carry a 08:00–20:00 daily schedule with no bid modifiers. Campaign-level negatives: Med Certs 87, Scripts 141 (including every ED, hair, weight, controlled and competitor term). Shared set `IM | Never Serve` has 134 members attached to all six search campaigns; the account-level negative list is empty. The Med Certs campaign still holds **19 paused single-keyword ad groups and an "Ad group 1" with broad-match keywords such as "online health courses with certificates"**, all paused at a $0.01 bid; they are harmless while paused and should be removed so they cannot be re-enabled by accident.

### 3.8 Ads and assets

The enabled Scripts RSA (ad 817285618712) delivered 30 conversions for $764 (CPA $25.5). The RSA it replaced on 18 August (809646001672, now paused) delivered 41 conversions for $340 (CPA $8.3) on 88 clicks. Part of that gap is attribution lag flattering the paused ad, but the difference is large enough to test: re-enable the old RSA alongside the new one and let rotation optimise. Change history shows `ASSET/CREATE/INTERNAL_TOOL` events on 16, 20, 23 and 26 August: Google is auto-creating assets. **Verify that "automatically created assets" is off for this account**; auto-generated headlines are a compliance exposure in a healthcare account that must not name medicines.

### 3.9 Engine and change control

36 delivered runs, tracking GREEN, 42 proposals (24 verified, 4 validated pending, 4 aborted, 5 failed). Every mutation in the last 30 days went through the Google Ads API from the proposal path (campaign creation and keyword build for women's health on 17–18 Aug, budget step 24 Aug, keyword pauses and negatives 1 Sep). This is the control surface the plan below must use: proposals, not console edits.

**Google Ads execution score: 74 / 100.** Structure, tracking and change control are strong; the money is being left on the table by unapproved scale steps, bid caps on the two highest-margin pilots, thin ad relevance on Med Certs, and a hair-loss pilot that attracts product shoppers.

---

## 4. Conversion funnel and product (PostHog, exact `flow_instance_id` joins, 3 Aug–2 Sep)

| Cohort | Starts | Checkout | Pay init | Paid | Start→paid |
|---|---|---|---|---|---|
| All | 586 | 282 | 236 | 227 | 38.7% |
| Medical certificate | 200 | 110 | 93 | 93 | 46.5% |
| Repeat prescription | 272 | 128 | 113 | 108 | 39.7% |
| ED | 48 | 18 | 15 | 14 | 29.2% |
| Women's health | 52 | 20 | 14 | 11 | 21.2% |
| Weight management | 8 | 4 | 0 | 0 | 0% |
| Hair loss | 6 | 2 | 1 | 1 | 16.7% |

- **Medication step** (`components/request/steps/medication-step.tsx`): 280 flows viewed, 147 completed (−47%). `currentDose` blocked 342 times on 66 flows (5.2 per flow), `doseChanged` 104, `strength-0` 66. The typed medicine is doctor context only (the doctor selects the medicine in Parchment), so the validation buys no safety. Downstream, 73% of flows that clear the step go on to pay. **Recovering 20–40% of the lost flows is +20 to +40 paid orders a month, +$600 to +$1,200 net, almost all contribution because the traffic is already paid for.**
- Certificate step on med certs loses 36% (209 → 134); the women's-health type step loses 35%; weight-loss assessment lost 13 of 17.
- Checkout failures: 27 flows (11.4% of payment initiations) failed at least once, 20 recovered, **7 orders lost**; 42 of 83 failure events carry `failure_category=unknown`, and the live emitter's property names differ from the documented ones.
- Web vitals after the 14 August LCP change: mobile LCP p75 1,415 → 1,319 ms, CLS 0.113 → 0.087, INP flat; `/request` mobile CLS 0.141 remains.
- Traffic: 467 paid-search sessions, 252 organic Google, 194 direct, 150 AI-assistant, 36 other engines, 16 email; 131 blog pageviews; 3 weight-loss pageviews.

---

## 5. Retention and lifecycle (the switched-off money)

| Instrument | State | Evidence |
|---|---|---|
| **Refill reminders** (`/api/cron/refill-reminders`, window 70–77 days after issue per `lib/clinical/repeats-policy.ts`) | **Off.** The route ships disabled behind `REFILL_REMINDER_EMAILS_ENABLED`; 5 reminders were sent in May and none since. | `prescriptions.refill_reminder_sent_at`: Apr 1, May 5, Jun–Sep 0. **164 prescriptions enter the reminder window in the next 60 days**; 5 are in the window today, unreminded. |
| Reorder behaviour without reminders | First-script cohorts 60–90 and 90+ days old: 14 patients, 1 reordered. | DB |
| Recovery email (`partial_intake_recovery`) | Working: 223 sent in 60 days, 5 orders / $145 in 30 days (≈4.5% of sends). | DB |
| Certificate reactivation | 65 sent in 60 days, 1 order. Near-zero lever; keep only because it is free. | DB |
| Abandoned checkout | 47 emails in 60 days; no attribution tag, so conversion is unmeasured. | DB |
| Review requests | 342 sent in 60 days; 2 on-site review clicks in 30 days; ProductReview at 13 reviews / 5.0. | DB, PostHog, live page |
| Attribution survey | 2 answers in 134 shows (1.5%). | PostHog |

Refill reminders are the cheapest revenue in this document: a working reminder at a 10–20% reorder rate on the August cohort is **16 to 33 orders across October–November (+$500 to +$1,000 a month at zero acquisition cost)**, and it compounds monthly as each scripts cohort ages into the window.

**Priority review add-on.** 47 buyers in 30 days ($468). Median decision 73 minutes versus 80 for non-priority; 8 of 46 missed the 3-hour target and 7 were auto-refunded ($70). Attach is 23% on scripts and 33% on ED. It is worth keeping only if the promise is honoured; see Section 10, item 9.

---

## 6. Clinical operations and fulfilment (30 days)

| Cohort | n | Decision p50 | Decision p95 | Max | Over 24 h |
|---|---|---|---|---|---|
| Certificate, protocol-issued | 83 | 16 min | 18 min | 18 min | 0 |
| Certificate, doctor-reviewed | 24 | 64 min | 3.1 h | 5.6 h | 0 |
| Repeat prescription | 142 | 80 min | 6.2 h | 32 h | 1 |
| Consults | 29 | 101 min | 5.8 h | 17 h | 0 |

- 78% of certificates issue under the Medical Director protocol; zero revocations; 10 routed to a doctor, 2 declined.
- 135 of 142 scripts sent; paid-to-script p50 76 min, p95 5.9 h; 7 declines fully refunded.
- **All 278 decisions in the window were made by the admin-doctor.** The second doctor profile is unverified and idle. The roadmap (2026-08-18) defers staffing by operator decision; the plan in Section 10 will push monthly decisions toward 400–450 and the 24-hour breach count is the trigger to revisit.
- Two certificates remain undelivered after 194 and 99 days (delivery email failed, zero retries or resends) — carried over from the previous audit.
- Fraud flags: 15 open, 15 unreviewed, 3 raised in 30 days; nobody owns the queue.
- Email delivery: 1,176 sends; 3 refund-processed emails failed on a template precondition and were never resent; 1 script-sent email blocked by a previously bounced address with no later success.
- Refund ledger health counters all zero; Stripe DLQ empty since 10 June.

---

## 7. Reliability, security, code, docs and CI (carry-forward from 2 Sep; repository unchanged)

- **CI required gate is red on every branch**: `pnpm security:audit` fails on browserslist 4.28.2 (two high advisories, no production path) inside the required build job. Fix is a `browserslist: ^4.28.7` override in `pnpm-workspace.yaml` plus a lockfile refresh. Nothing merges until it lands. Latest three CI runs on main (31 Aug) were green because they pre-date the advisory.
- **Guest checkout writes phone and date of birth without the encrypted twin** (`lib/stripe/guest-checkout.ts` insert and `buildGuestProfileIdentityUpdate`); new-profile encrypted coverage is 12% phone / 8% DOB versus 94% Medicare; SECURITY.md claims dual-write on every write. Plaintext is retained by design, so today's exposure delta is nil; the control statement is false and a future cutover would strand 90% of rows.
- Production verification refuted three repo-only concerns: the open-insert policies on `notifications` and `security_events` do not exist in production; every SECURITY DEFINER function has a pinned search path; `security_definer_acl_violations()` returns zero; RLS is enabled on every public table.
- Noise that hides real faults: ~1,500 guaranteed-404 RPC probes a day from `instrumentation.ts` → `lib/validation/schema-validation.ts` (empty-argument calls to three RPCs on every cold start); 84 failed `delivery_tracking` inserts a day from `lib/monitoring/delivery-tracking.ts` writing columns that do not exist; the `google-ads-conversions` heartbeat reporting "partial failure" for 17 days on retry-in-grace adjustment claims.
- Vercel: intermittent `fetch failed` / `UND_ERR_SOCKET` resets to Supabase on the feature-flag cache revalidation, 41 events across 35 users in 7 days since 24 July; pages fall back but it is the highest-frequency user-facing fault and has no owner.
- Production synthetic (`prod-request-flow-synthetic`, `*/5`) has run 2–7 times a day since 27 August (GitHub schedule throttling); post-deploy smoke 150/150; Parchment smoke green.
- Codebase: 6,549 unit tests green in 29 s; coverage 87/78/93/89 vs 80/70/80/80 floors; 0 type errors, 0 lint warnings; 2,296 tolerated dead-code findings including ~3,300 orphaned lines in `lib/ads-agent/{deep-audit,experiments,proposal-operator}.ts`; 106 files over 600 lines; 225 of 700 test files grep source text.
- Delivery: 87 PRs merged in 30 days, median 1 h open-to-merge, 0 human approvals in the last 100 merges, 23% of PRs over 1,000 lines, PR CI fails 28% (20 dead-code ratchet, 20 advisory floors, 10 E2E, 8 unit, 8 doc/lockfile); Renovate config present but the app was never installed; Dependabot off; PR-only ruleset has held with zero bypasses since 16 August.
- Docs: all 11 drift gates pass; 52/52 sampled CLAUDE.md claims verified; CLAUDE.md 470 lines / 19,108 words / 152,739 bytes with one 18,895-character migration-receipt line; 12 finished plans outside `docs/plans/archive/`; no root README; untracked `output/` (3 MB, two business PDFs) not ignored; 51 MB of review screenshots tracked.

---

## 8. Public surface and SEO (2 Sep sweep)

- Every money page 200, self-canonical, indexable; legacy paths redirect with parameters preserved; 151 sitemap URLs, zero errors; no rating schema; zero banned copy; content audit 0 issues across 107 guides; dev routes return 410 in production.
- Lighthouse mobile: home 91/100/100/100 (LCP 3.4 s); `/medical-certificate` 95 (LCP 2.9 s); `/request` 98 (LCP 2.2 s). CLS 0 everywhere.
- Search Console (15 inspections): `/weight-loss` and `/womens-health` indexed; **`/prescriptions` "Discovered, currently not indexed"** and `/online-prescriptions` unknown to Google while repeat scripts are 51% of orders; `/medical-certificate` position 47 on 12,400 impressions; three blog guides outrank every money page.
- Defects: `/weight-loss` ships no page-level schema; site-wide `priceRange` still $24.95–$49.95 with an $89.95 service live; OG images missing on every landing page except medical certificate; seven H1s concatenate their words in DOM text; homepage title 81 characters.

---

## 9. Since the 2 September audit

Changed: revenue window +$235 net (one day), weekly orders −32% week on week, September pacing flat with August, ads engine still awaiting Scripts approval (now ten consecutive days), refill-reminder lever identified as off, one more certificate breach-refund. Unchanged: everything in Section 7 (no commits), stuck certificates, fraud-flag backlog, weight management at zero.

---

## 10. The money plan (ranked by expected contribution per unit of effort)

Estimates are monthly, net-retained revenue unless stated; contribution = net − incremental ads spend − payment fees. Confidence reflects how directly the evidence supports the number.

| # | Lever | Exact action | Expected net / month | Expected contribution / month | Confidence | Effort | Owner |
|---|---|---|---|---|---|---|---|
| 1 | **Approve the Scripts scale step the engine has proposed daily since 24 Aug** | Approve the next `campaign_budget` proposal for campaign 23870042807 (policy tier "strong" allows up to +50%: $79 → ≤$118.50/day). Then observe 3 days and ≥10 orders per the policy before any further step. | +$900 to +$1,300 | +$300 to +$600 | High | Minutes (Telegram approval) | Operator |
| 2 | **Fix the medication step** | Make `currentDose` and strength advisory (or optional) on the repeat-Rx medication step; keep the controlled-substance hard block and the dedicated-service steer untouched; re-measure step completion after 14 days. | +$600 to +$1,200 | +$550 to +$1,100 | High | 1 PR | Engineering |
| 3 | **Switch on refill reminders** | Set `REFILL_REMINDER_EMAILS_ENABLED=true` in Vercel production; verify the cron route, template, consent gate and heartbeat; add `refill-reminders` to `CRITICAL_CRONS`; tag the link with `utm_source=refill_reminder`. | +$500 to +$1,000 from October, compounding | ≈ same (zero CAC) | Medium-high | Hours | Engineering + operator |
| 4 | **Graduate women's health and lift its bid cap** | The campaign is 12 of the 20 recognised orders required; on graduation raise the CPC ceiling $3.00 → $4.50 (policy `initialCpcCeilingCents` is a pilot constant; graduation moves it out of pilot rules) and budget $20 → $30/day. Investigate the `CROSS_SERVICE_ATTRIBUTION` flag first (2 of 12 orders were scripts). | +$400 to +$600 | +$200 to +$300 | Medium | Proposal + policy edit | Operator + engineering |
| 5 | **Med Certs efficiency, then budget** | Pause `carers leave certificate` (phrase) and `medical certificate online` (phrase); keep the exact variants paused; add the negatives in Section 11; rewrite the `ag_telehealth` and `ag_same_day` RSAs so headlines carry the ad-group keyword (QS 6 with ad relevance below average on every keyword). When blended CPA ≤ $20 for 7 days, raise budget $20 → $30/day (79% of impressions are lost to budget). | +$300 to +$500 | +$150 to +$250 | Medium | Proposal + copy work | Operator + marketing |
| 6 | **Stop the hair-loss burn** | Accept the engine's `SPECIALTY_LOSS_CAP` pause proposal on 11 September unless H1 has produced a retained order; if the operator prefers to keep a presence, restrict to exact-match service terms at $5/day after adding the product/competitor negatives. | −$30 (one organic-equivalent order) | **+$170** | High | Minutes | Operator |
| 7 | **Ad schedule and device modifiers** | Extend Scripts and Med Certs to 06:00–22:00 with −20% modifiers on 06–08 and 20–22; −25% at 13:00; −15% on Sunday; −20% desktop on Scripts. Review after 14 days. | +$150 to +$300 | +$100 to +$250 | Medium | Proposal (new `ad_schedule` mutation family may need engine support) | Engineering + operator |
| 8 | **Search-term hygiene** | Apply the negative list in Section 11 (≈ $267/month on four conversions). | ≈ 0 | +$150 to +$200 | High | Proposal | Operator |
| 9 | **Make priority review honest** | Either staff to the promise (a second reviewer covering the breach hours) or re-word the add-on as "front of queue" with no time claim and keep the price. Do not raise the price while 17% of buyers miss the target. | 0 (protects $468/month and reduces refunds/complaints) | +$70 | High | Copy PR or staffing decision | Operator |
| 10 | **Recover lost checkouts** | Name the `unknown` failure category (51% of failure events), align `checkout_failed` properties with the documented taxonomy, and surface a retry path for `identity_or_session` failures. 7 orders a month are currently lost. | +$150 to +$250 | ≈ same | Medium | 1 PR | Engineering |
| 11 | **Organic: index the scripts lane** | Request indexing for `/prescriptions` and `/online-prescriptions`, add internal links from the three ranking guides, fix `priceRange`, add schema to `/weight-loss`, add OG images. | +$200 to +$600 over 60–90 days | ≈ same | Low-medium | 1–2 PRs + GSC actions | Marketing + engineering |
| 12 | **Lower Scripts tROAS after the budget step** | After lever 1 has been observed (3 days, ≥10 orders), propose tROAS 1.5 → 1.4 (policy floor 1.35). | +$300 to +$600 | +$100 to +$250 | Medium | Proposal | Operator |
| 13 | **Re-test the paused Scripts RSA** | Re-enable ad 809646001672 alongside 817285618712; let rotation optimise for 14 days. | unknown, possibly meaningful | — | Low-medium | Proposal | Operator |
| 14 | **Weight management decision (9 Sep checkpoint)** | Zero intakes, zero drafts, 3 pageviews in a month. Either fund a bounded organic push (page schema, internal links, one guide) or shelve and stop carrying it on public surfaces. Paid advertising stays gated. | 0 either way this quarter | 0 | High | Decision | Operator |

**Sum of the high-confidence, low-effort items (1, 2, 3, 6, 8, 9): roughly +$2,000 to +$3,500 net a month within 30 days.** All fourteen: **+$3,500 to +$6,000 net a month within 90 days**, taking the run-rate from about $9,000 to $12,500–15,000 with no new services and no increase in the loss-making pilots.

**Capacity gate.** The plan implies 380–450 paid orders a month. One reviewer handled 285 with p50 80 minutes and one 24-hour breach. Recommendation: activate the second doctor profile (AHPRA verification and capability flags per `docs/DOCTOR_ONBOARDING.md`) when the rolling 7-day order count exceeds 90, before the priority promise and the 24-hour maximum start failing at scale.

### 30 / 60 / 90 sequence

- **Days 0–7:** browserslist fix (unblocks every PR); approve Scripts step; apply negatives; pause hair loss on the 11th if still zero; medication-step PR; refill-reminder flag and verification; resend the two stuck certificates; priority copy decision.
- **Days 8–30:** observe Scripts (3 days / 10 orders), then tROAS 1.4; Med Certs RSA rewrite and keyword pruning; women's health graduation and bid cap; checkout-failure instrumentation; schedule/device modifiers.
- **Days 31–90:** Med Certs budget step on evidence; refill-reminder wave measurement (first cohort mid-October); `/prescriptions` indexing and internal links; second-doctor activation trigger review; weight-management decision executed.

---

## 11. Exact Google Ads change list (for approval through the proposal path; never console edits without read-back)

Pre-checks for every mutation: tracking state GREEN on the latest delivered run; no `PROHIBITED` or disapproved ad; `validateOnly` for every keyword or negative add (Google's `HEALTH_IN_PERSONALIZED_ADS` and `PRESCRIPTION_DRUG_SALE` classifiers fire on condition-explicit phrasing); read back after apply.

1. **Budget:** campaign 23870042807 (Scripts) `campaignBudgets/15589755119` from 79,000,000 micros to the engine-authorised amount (≤ 118,500,000). Expected micros must match 79,000,000 at apply time.
2. **Negatives (shared list `IM | Never Serve`, phrase unless stated):** `levitra`, `vardenafil`, `stendra`, `spedra`, `avanafil`, `bimix`, `blue pill`, `regaine`, `hairy pill`, `zova`, `reviews`, `where can i buy`.
3. **Negatives (Scripts 23870042807 and Med Certs 23651537255, phrase):** `how to`, `how do i`, `can i`, `where can i`, `herpes`, `bv`, `antibiotics online`.
4. **Negatives (Women's Health 24144825264, phrase):** `chemist warehouse`, `quiz`, `how to`.
5. **Negative (Med Certs only, phrase):** `medicare`.
6. **Keyword status (Med Certs):** pause `carers leave certificate` (phrase) and `medical certificate online` (phrase). Leave `doctor certificate online` (phrase), `no appointment medical certificate`, `medical certificate today/now/same day`, `telehealth medical certificate` enabled.
7. **Keyword status (ED 24040886787):** pause `private mens health consultation` (phrase, $56, 0 conversions). Keep `telehealth mens health`.
8. **Ad status (Scripts):** enable ad 809646001672 in ad group `telehealth prescription` alongside 817285618712.
9. **Ad schedule (Scripts, Med Certs):** replace 08–20 with 06–22; bid modifiers −20% (06–08, 20–22), −25% (13:00), −15% (Sunday all day). Device: −20% desktop on Scripts. (If the engine has no `ad_schedule`/`device_bid_modifier` mutation family, add one with the same validate/apply/verify receipts before applying.)
10. **Women's Health on graduation (≥20 recognised orders, ≥20% margin, <10% refunds):** ad-group CPC bids $3.00 → $4.50 on both ad groups; budget 20,000,000 → 30,000,000 micros.
11. **Hair Loss Pilot (24040886790):** accept the pause proposal on 11 Sep unless a retained order exists.
12. **Scripts tROAS:** 1.5 → 1.4 after item 1 has been observed; never below 1.35.
13. **Housekeeping:** remove the 19 paused single-keyword ad groups and "Ad group 1" (broad match) from Med Certs; confirm "automatically created assets" is off at account level.
14. **Do not touch:** the `IM | Never Serve` list except to add; Med Certs tCPA $22; the campaign-level ED/hair/weight/controlled negatives on Scripts; women's health medicine-name exclusion; anything on Hair or ED beyond items 7 and 11 until the H1/E1 window decision (operator decision 2026-08-28).

---

## 12. Engineering tickets (ordered; each is one PR unless stated)

1. **Unblock CI.** `pnpm-workspace.yaml` overrides: add `browserslist: ^4.28.7`; refresh lockfile; confirm `pnpm security:audit` exits 0. Also install the Renovate app so advisories arrive as PRs instead of red builds.
2. **Medication step validation.** In the repeat-prescription medication step and its Zod schema, make dose and strength advisory (accept free text, no re-blocking); keep `isControlledSubstance`, `detectDedicatedServiceForMedication`, and the `dedicated_service_medication` flag unchanged; keep `intake_validation_blocked` emission for the remaining blockers; update `lib/__tests__/repeat-script-schema.test.ts` and the E2E in `e2e/prescription-flow.spec.ts`. Acceptance: `currentDose` blocks per flow < 1.0 in PostHog after 14 days; step completion ≥ 70%.
3. **Refill reminders.** Verify `app/api/cron/refill-reminders/route.ts` eligibility (70–77 days, repeats > 0, marketing consent, one send per prescription), the email template and unsubscribe headers, then set the production env flag; add `refill-reminders` to `CRITICAL_CRONS` in `lib/monitoring/cron-heartbeat.ts`; add `utm_source=refill_reminder` to the CTA so orders attribute; report sends and orders on `/admin/analytics`.
4. **Guest checkout PHI dual-write.** Route the profile insert and `buildGuestProfileIdentityUpdate` in `lib/stripe/guest-checkout.ts` through `encryptProfilePhi`; backfill `phone_encrypted` and `date_of_birth_encrypted` for existing rows; add a contract test asserting every profile writer encrypts; correct `docs/SECURITY.md` §Phase 1.
5. **Stuck certificate deliveries.** Resend the two undelivered certificates via the secure-link path in `/admin/ops`; add an ops action-inbox row for `delivery_failed` certificates older than 24 hours.
6. **Fraud flags.** Surface unreviewed `fraud_flags` in the ops action inbox with age and a one-click "reviewed" action, or retire the detector.
7. **Checkout failure taxonomy.** Align `components/request/steps/review-step.tsx` `checkout_failed` properties with the live `failure_category`/`stage` taxonomy; name the `unknown` bucket; add a retry affordance for `identity_or_session`.
8. **Signal hygiene.** Delete the empty-argument RPC probe in `lib/validation/schema-validation.ts` (or replace with an `information_schema` check); fix or delete `lib/monitoring/delivery-tracking.ts` (its insert names five columns that do not exist); treat retry-in-grace adjustment claims as a non-failure heartbeat state in the ads-conversions cron.
9. **Priority add-on.** Depending on the operator's decision: copy change on the checkout toggle and confirmation email ("front of queue", no time promise) or an SLA alert to the reviewer at 90 minutes for priority intakes.
10. **Public surface.** Update `PRICING_DISPLAY.RANGE`; add page-level schema to `/weight-loss`; add OG images to the service landing pages; fix the seven word-split H1s so DOM text keeps spaces.
11. **Synthetic monitor.** Move the 5-minute production request-flow probe from the GitHub schedule to a Vercel cron or the existing Checkly account.
12. **Docs.** Move the migration receipts out of CLAUDE.md into `docs/OPERATIONS.md`; archive the 12 finished plans; add a root README; gitignore `output/`.
13. **Ads engine.** Add `ad_schedule` and `device_bid_modifier` mutation families (validate → apply → verify receipts) so Section 11 items 9 can go through the proposal path; move `womensHealth.pilot.initialCpcCeilingCents` behind a graduation state so the cap can change without a policy edit.

---

## 13. Constraints the reviewer must respect

- **No prescription-medicine names, brands, classes or substitutes** in ad copy, keywords, landing pages, schema or URL parameters (`docs/ADVERTISING_COMPLIANCE.md` §3, §7; TGA health-service advertising guidance). Medicine-name keywords are OFF by operator policy even where Google would allow them. Search terms that happen to contain a medicine name are not a violation; adding a medicine name as a positive keyword is.
- **No "no call needed" promise for prescribing or specialty services**; certificate copy may say the form is reviewed without a call. Never advertise doctor count, doctor names, FRACGP, peer review, or team training. No review counts, star ratings, testimonials or aggregate-rating schema on regulated-health surfaces.
- **Paid destinations stay on service pages** (`/prescriptions`, `/medical-certificate`, `/erectile-dysfunction`, `/womens-health`, `/hair-loss`); educational pages that name medicines must never become paid destinations. Weight management has no paid advertising by operator decision.
- **All Ads mutations go through the proposal path** with validate, apply and verify receipts, and operator approval; the shared `IM | Never Serve` list is only ever added to.
- **Engine policy pins** (`lib/ads-agent/policy.ts`): Scripts tROAS never below 1.35; refund rate ceiling 10%; step observation 3 days and ≥10 orders; Med Certs tCPA $22; pilots capped at $150 loss; women's health pause proposal at 30 clicks without an order.
- **Clinical and product pins**: certificate language and the 3-day cap are locked; the protocol issuance boundary can be narrowed by the database flag but never widened in code without a reviewed policy decision; no subscriptions, no pharmacy, no general consult, no conversational AI intake; the 24-hour internal review maximum stands.
- **Pricing**: do not raise the $24.95 entry certificate (already the highest AU entry price); do not discount prescription-only services; do not add drug prices anywhere public.
- **Repository rules**: PR-only main; one major upgrade per PR; never bump Next/React/Tailwind/Framer Motion; never rename `middleware.ts`; update `docs/bookkeeping/expected-md-count` and `file-map.md` together when adding a doc.

---

## Appendix A. Data sources and reproduction

- **Supabase (project `witzcrovsoumktyndqgz`)**: `intakes` (revenue, channels, keyword revenue via the persisted `campaignid`/`keyword` columns, latency, priority), `prescriptions`, `email_outbox`, `google_ads_agent_runs` (delivered snapshots: `snapshot->'daily'` per campaign per day; `snapshot->'totals'->'rolling30'->'enabled'`; `snapshot->'rolling30'`), `google_ads_change_proposals`, `issued_certificates`, `fraud_flags`, `v_stuck_intakes`, `cron_heartbeats`. Exclusions: seeded E2E patient `e2e00000-0000-0000-0000-000000000002`, `exclude_from_reporting = true`.
- **Google Ads API** (read-only `searchGoogleAds` in `lib/google-ads/client.ts`, run with `NODE_OPTIONS='--conditions=react-server'`): `campaign`, `keyword_view`, `search_term_view`, `ad_group_ad`, `campaign_criterion`, `shared_set`, `conversion_action`, `change_event`, segments `date`, `hour`, `day_of_week`, `device`; window `LAST_30_DAYS` (account time zone). Impression-share values of 0.0999 are Google's "< 10%" floor.
- **PostHog** (project 277439): canonical funnel on `flow_instance_id`, `is_e2e` excluded; window 3 Aug–2 Sep.
- **Search Console**: URL Inspection on 15 URLs and the 90-day query export, 2 Sep.
- **Lighthouse 12.8** mobile emulation, 2 Sep. **Vercel** runtime error clusters, 7 days. **GitHub** via `gh`.
- Not available this session: Sentry and Stripe connectors (not authorised), the support mailbox (not connected), Vercel Web Analytics (not enabled).

## Appendix B. Open questions for the operator

1. Approve the Scripts budget step now, and authorise the tROAS 1.4 follow-up after observation?
2. Is the H1/E1 product window closed on 11 September, so the hair-loss pause proposal can be accepted?
3. Priority review: staff the promise or re-word it?
4. Weight management on 9 September: bounded organic push, or shelve?
5. Second-doctor activation trigger: agree the rolling-7-day threshold of 90 orders?
6. May the refill-reminder flag be switched on in production once ticket 3 is verified?
