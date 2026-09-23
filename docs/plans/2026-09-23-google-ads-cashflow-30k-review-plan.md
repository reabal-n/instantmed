# Google Ads hardening and cashflow plan: A$30,000/month solo

**Authority:** Reference only. `docs/ROADMAP.md` owns the active queue; `docs/REVENUE_MODEL.md` owns economics and `docs/OPERATIONS.md` owns live change procedures.

**Status: draft for Opus 5.5 review. No implementation authorised by this document.**
**Prepared:** 23 September 2026. **Owner:** Rey. **Currency:** AUD.

The owner requested at least A$30k monthly revenue while operating solo, ten further account/system recommendations, and one comprehensive plan of the work discussed in this task. Opus reviews before implementation starts. This document proposes a programme; it does not replace the canonical operating policies or approve Ads mutations, new campaigns, spending, deployments, clinical changes or customer messages. No review has yet occurred.

## 1. Objective and decision definitions

Use **at least A$30,000 rolling 30-day net-retained revenue** as the proposed success measure: captured purchases less exact refund/dispute cash movements. This follows the existing revenue definition; it is not A$30k owner take-home. The new target supersedes A$20k as the owner's requested destination; update the canonical milestone and roadmap only after this plan's review. Maintain A$15k, A$20k and A$25k as progress checkpoints, not automatic budget-release gates or deadlines.

Campaign contribution = attributed retained cash from first and repeat orders − actual payment fees − Ads spend. Actual incremental paid fulfilment costs must also be deducted if incurred. Owner time within existing capacity is not assigned an invented wage. Business profit additionally subtracts fixed costs and applicable taxes. Available bank cash additionally depends on payout and billing timing. These four measures must not be labelled interchangeably.

Campaign contribution remains the existing commercial scaling qualification. First-order contribution and measured repeat cohorts remain diagnostic. Do not reintroduce arbitrary minimum order counts or 20/30/40% margin tiers as hard policy. Historical repeat value cannot be counted again as current revenue or used to invent profitable LTV. A positive historic contribution does not prove the next dollar of spend will be profitable.

## 2. Evidence baseline and limitations

Primary audit: **24 August–22 September**, 30 completed Sydney days. Nine Google deep-audit sections succeeded; current account settings, campaign conversion goals, Ads source/configuration and aggregate refund-adjustment health were inspected separately. Backend cash used the canonical ledger and actual durable fees. These are dated snapshots requiring refresh before execution.

| Campaign | Orders | Ad spend | Retained cash | Fees | Contribution | Current daily budget |
|---|---:|---:|---:|---:|---:|---:|
| Scripts | 139 | 3,103.30 | 4,357.55 | 127.22 | 1,127.03 | 120 |
| Women's health | 22 | 578.45 | 1,068.85 | 24.78 | 465.62 | 50 |
| Certificates | 27 | 717.29 | 763.65 | 21.17 | 25.19 | 30 |
| ED | 4 | 288.83 | 219.70 | 5.10 | −74.23 | 12 |
| Hair loss, paused | 1 | 247.94 | 49.95 | 1.14 | −199.13 | Paused |
| Total above | 193 | 4,935.81 | 6,459.70 | 179.41 | 1,344.48 | 212 active |

Orders are backend campaign-attributed purchases, including repeat orders and potentially other service types; they are not necessarily orders for the campaign's named service. They differ from Google's attribution/date basis and fractional conversion counts. Search terms cannot be individually joined to patient cash. Recent attribution and refunds can mature. Keyword cash was joined by stored keyword and match type, with no duplicate spending campaign/keyword/match keys in the audit. Retain unknown attribution explicitly instead of assigning it to a winner.

A$11k/month is the owner's historic business description, not a freshly reconciled whole-business baseline. The A$6,459.70 table covers these paid campaigns, not the whole business. Refresh all-channel retained revenue, fee completeness and repeat cohorts before calculating the exact gap to A$30k. First-order contribution was not recomputed in this audit. The roadmap records missing fees on some recent whole-business orders; campaign fee completeness does not resolve that gap.

### Already healthy or completed: preserve, do not rebuild

- Four active Search campaigns use Australia presence targeting; Search Partners and Display expansion are off. No campaign audience criteria appeared in the inspected user-list/interest/custom-audience query. This is not a complete manager/account audience audit.
- Purchase is the only biddable standard goal; one enabled server import is primary. GA4 purchase and funnel events are secondary. Check custom-goal overrides before calling the entire setup certified.
- Auto-tagging and campaign/ad-group/keyword/match parameters are configured.
- All 11 active RSAs were APPROVED_LIMITED, not disapproved. Healthcare policy restrictions are not automatically defects. All seven live ad destinations returned HTTP 200; that is not checkout proof.
- One account user has a passkey; one manager link exists. Manager access, recovery and billing continuity need a separate completeness check.
- PRs #597/#598 are merged/deployed; release verification and branch cleanup are complete. Do not reopen them. Certificate telemetry now distinguishes deliberate Continue attempts from automatic defaults; historical answer-change events are not trustworthy engagement evidence.
- Certificate budget A$30 and target CPA A$22 are live. September 22 keyword changes and nine approved UTI exact negatives are live. An older phrase negative already covered `ural sachets`; do not count that redundant addition as new savings.
- Existing proposal/validation/approval/apply/read-back, cash ledger, refund retry and reporting mechanisms must be reused. Audit their coverage before proposing more infrastructure.

## 3. Ten further recommendations for a hardened account/system

These are actionable extensions or verification tasks, not ten claims that existing safeguards are missing. No system is literally bulletproof. Prioritise preventing loss, detecting failures and recovering safely.

| # | Recommendation | Current evidence / gap | Deliverable and acceptance | Priority / gate |
|---|---|---|---|---|
| 1 | Inventory every account controller and secure recovery | One passkey user and one manager verified; manager-side users, OAuth apps, scripts and recovery not fully audited | Named owner for each manager, credential and automation; least necessary access; enforced MFA/passkeys where supported; tested owner-controlled recovery. Review allowed domains without locking out legitimate access. Never export recovery secrets. | P0 account/credential review; owner present for sensitive recovery changes |
| 2 | Eliminate unreviewed automated changes | Auto-apply subscriptions, Google automated rules and manager tools not fully inspected | Inventory enabled recommendation types/rules/scripts. Disable only approved routes that change keywords, targeting, bidding or measurement without review. Alert on unexpected drift and distinguish actor/time. Auto-apply does not itself increase budgets, but can alter delivery within them. | P0 read-only inventory; exact approval for settings changes |
| 3 | Add a cash exposure envelope around daily budgets | Campaign ceilings exist; bank headroom and billing continuity not audited | One forecast of current daily settings, monthly exposure, actual spend, Ads bills, Stripe payouts and refund reserve. Approve a maximum test loss and spend ceiling before each pilot. Alert on unexplained spend and payment failures. Reuse existing reporting. | P0 owner supplies private cash/headroom; no automatic pause rule until approved |
| 4 | Make API/configuration and credential expiry observable | Local v24 works; production version override masked | Safe readiness output shows effective API version, release and success timestamp only. Inventory callers and supported versions; standardise production to a tested supported version if necessary; expiry/sunset checks and owner rotation procedure. | P0 configuration/deployment/provider evidence |
| 5 | Reconcile conversion correctness end to end | Single primary import and adjustment infrastructure exist; one refund still matching | Aggregate expected eligible purchases, submitted, accepted, retrying, terminal and unmatched counts; reconcile refunds/partial refunds/disputes to final provider state. Test duplicate suppression, ambiguous outcomes, consent/identifier eligibility and retry races. Separate ledger truth from Google's attributed counts. | P0 evidence first; code only for demonstrated gaps |
| 6 | Use independent health checks and recoverable changes | Cron heartbeat exists; heartbeat alone cannot prove success | Read-only reporting canary plus freshness/claim-health/provider-outcome checks. Each approved mutation carries baseline, exact diff, validation, idempotency and rollback scope; inject synthetic failure cases locally if coverage is missing. Detect unexpected external edits before apply. | P0/P1 reuse existing paths, no synthetic live purchases |
| 7 | Keep acquisition data clinically private and destinations controlled | Campaign audience query was clean; complete tag/account audit pending | Verify no patient lists, health retargeting, clinical answers, medications or identifying URLs reach Ads. Check tags/consent handling, custom goals, automated assets and destination expansion. Service-level first-party measurement stays governed and aggregate in reports. | P0 privacy/marketing review; no audience upload or enhanced-data expansion |
| 8 | Maintain one negative-keyword and intent register | Shared negatives and new exact exclusions exist; one overlap already found | Compare shared/campaign/ad-group exclusions before proposals; detect conflicts with profitable terms; record reason and evidence. Separate paused spend from active waste. Avoid blanket medicine/pharmacy exclusions and automatic deletion of every zero-conversion term. | P1 report/proposal improvement; provider validation before change |
| 9 | Version each experiment and judge mature cash cohorts | Several recent changes overlap; latest funnel evidence has caveats | Record one primary hypothesis, eligible population, exact change time, control/comparison, loss cap, read dates, lag and rollback. Prefer provider experiments when volume permits; otherwise label matched-week before/after evidence observational. No false confidence from a calendar alone. | P1 review owner selects test/loss limit |
| 10 | Automate exceptions and verify purchasing/delivery paths | Existing dashboards and telemetry; some subtype and maturity limitations | Compact daily exception view and weekly decision sheet; synthetic local/preview checks for entry, restore, validation, checkout/retry and delivery. Minimal anonymous production navigation. Alert only on actionable divergence, not every run. Reuse existing monitors; no new dashboard platform. | P1 confirmed implementation gaps + deployment verification |

For unchanged active daily budgets of A$212, 30.4× implies roughly **A$6,444.80** monthly budget exposure for the usual campaign rules; daily overdelivery can reach about **A$424** across those budgets. These are planning illustrations, not an account-wide guaranteed cap: budget changes, campaign rules and billing adjustments matter. A$50/day is an average daily budget, not a hard A$50 spend stop.

## 4. Campaign-by-campaign plan

### Women's health / UTI: first incremental growth candidate

**Evidence:** latest week spend A$26.85/day versus A$50 budget. Thirty-day budget-lost impression share approximately 0.09%; rank-lost 73.69%. Rank reflects auction bid/quality/context, not organic SEO or a percentage of guaranteed lost sales. The code's A$75 ceiling is not a required live budget; repair the audit warning that calls A$50 a mandatory-budget mismatch if confirmed in source.

- Preserve profitable `uti treatment online` PHRASE (A$272.54 contribution, 12 orders) and `online doctor for uti` PHRASE (A$177.09, seven orders).
- Confirm current keyword-level rank/quality and recent A$4 bid performance before selecting the next lever. Do not infer poor landing quality solely from campaign rank loss.
- First candidate: one clinically compliant UTI ad-relevance test using the existing dedicated destination. Exact copy and incumbent replacement/control must be reviewable before approval. Keep the existing price and clinician-outcome boundaries; no guaranteed prescribing, drug promotion or “no call” promise.
- Alternative if bids demonstrably constrain otherwise relevant traffic: a small **proposed 10% bid step, A$4→A$4.40 on the scoped UTI target only**, after inspecting keyword overrides and exact applicable policy. Do not apply to contraception by accident. This is a test candidate, not a commitment or a promise of lower CPA. Choose copy OR bid first.
- Keep budget A$50 until spend/auction evidence actually shows a budget constraint and incremental contribution supports more spend. Preserve the nine exact exclusions; do not re-propose them.
- Watch `urinary tract infection doctor` EXACT (A$41.66, zero orders), but do not classify a small sample as permanently bad. Check search intent before proposing a pause.
- Measure UTI and contraception separately through anonymous allowlisted service-intent context if existing telemetry is insufficient. Never infer subtype solely from a campaign name, and do not put clinical data in Ads.

**Contraception:** retain a small existing presence; it is not yet a proven separate scaling engine. `online contraception doctor` EXACT produced two backend orders and A$41.67 contribution in this audit. Use the dedicated landing page; preserve the current start/switch/continue service boundaries from clinical authority. Do not promote prescription medicines or broaden into generic women's-health consultations.

### Medical certificates: acquisition efficiency, then volume

**Evidence:** 27 orders; actual CPA A$26.57; retained cash less fees A$27.50/order; contribution A$0.93/order. Target CPA A$22 is not a guarantee. At the same order mix, realised CPA A$22 implies about A$5.50/order contribution; A$20 implies A$7.50. These are arithmetic scenarios, not newly mandated thresholds.

1. Keep A$30/day while recent exact targets and paused losers are assessed. Inspect override and parent-status before changing any keyword.
2. Protect promising phrase terms `no appointment medical certificate`, `doctor certificate online`, `get medical certificate online`. Exact versions were already added; avoid duplication and avoid assuming phrase performance transfers unchanged to exact.
3. Prioritise `medical certificate today` PHRASE (A$105.85 spend, A$0.87 contribution) and `medical certificate now` PHRASE (A$44.84 spend, −A$20.62) for search-intent diagnosis. Existing Smart Bidding means manual per-keyword CPC cuts may not be an effective lever; use an exact negative, pause or ad relevance change only where justified. Preserve high-quality demand.
4. Test aligned ad copy for certificate queries rated below-average relevance; retain distinct work/carer destinations and clinical qualification. No unnecessary campaign fragmentation at this volume.
5. Reanalyse first-screen dropoff with deployed telemetry: first view → real interaction → Continue tap → validation result → next view, with equal observation windows. Separately check restored/skipped steps, guest/signed-in, mobile, consent and checkout handoffs. Aggregate only; no clinical answer collection.
6. Reproduce the leading failure on local/preview with synthetic cases before fixing it. Preserve required dates, reason, duration rules, consent and safety escalations. If the evidence shows intent abandonment rather than a defect, choose one clarity test, not a wholesale rebuild.
7. Only after extra orders add contribution, propose a small budget step (candidate A$30→A$35, then independently review A$40). Owner approves each exact step; do not trigger automatically from rank/budget loss or a single profitable day.

**Known flow evidence:** the earlier 30-day first-screen cohort had 217 flows, 155 progressed, 62 did not. Those per-step cohorts were independent, not an additive funnel or 62 lost sales. Defaults contaminated older engagement events; PR #597 fixed measurement, not necessarily abandonment. The recent seven-day comparisons had approximately 71% first-step completion both weeks, with fewer validation blocks. No new certificate regression is proven. Checkout conversion and successful customer delivery remain separate checks.

### Scripts: diagnose the decline before adding acquisition pressure

| Measure | Sep 9–15 | Sep 16–22 |
|---|---:|---:|
| Spend | 945.49 | 922.56 |
| Clicks | 225 | 166 |
| CPC | 4.20 | 5.56 |
| Backend orders | 53 | 29 |
| Contribution | 749.35 | 18.82 |

Google conversions fell `script online` EXACT 14→4, `online script` EXACT 12→2 and `get escript online` PHRASE 6→1, on nearly flat combined spend. `telehealth prescription` remained comparatively steadier at 15→12. Sep 12 had 22 Google conversions, inflating the earlier comparison. Weakness preceded Sep 19's ROAS adjustment. Medicine exclusions added Sep 19 were reversed roughly 12 minutes later; they are not a demonstrated explanation for a week-long decline.

All-channel observed prescription start cohorts fell 105→76; first-step completions within the queried observation logic 64→39; checkout reached 55→37. Validation event coverage declined, not spiked. Recent cohorts can be immature, last-completion aggregation has revisit limitations, and missing telemetry/attribution remains possible. These figures do not prove a causal paid funnel or a specific form defect.

**Investigation sequence before mutation:**

1. Reconcile daily backend payment truth, refunds, repeat/new mix, fee coverage and Google's reporting lag. Compare matching weekdays and show the strong Sep 12 separately; do not silently remove it from totals.
2. Compare search-term intent, keyword/ad-group/device/hour mix, CPC, auction access and policy status on the three affected terms. Inspect change history around Sep 10, 17 and 19; distinguish correlation from an effect beginning after the change.
3. Build a bounded anonymous cohort with mature observation and attribution coverage. Locate the first diverging step; separate clinical steering/hard blocks from unresolved validation. Inspect errors only with privacy-safe aggregates.
4. Reproduce medication selection, restore, back-navigation, mobile validation and checkout transition locally/preview. Include valid requests and correct service steering; do not weaken prescribing safeguards to recover a conversion metric.
5. If a defect is proven, ship the smallest fix with regression evidence. If intent mix is the explanation, prepare exact query exclusions or targeted ad-relevance change. If the bidding target is demonstrably responsible, prepare an exact target adjustment; do not assume lowering ROAS improves cashflow.

Hold A$120/day and current 1.50 target during diagnosis unless an actual incident or separately approved loss limit warrants intervention. Protect historically profitable `telehealth prescription`, `online script`, `get escript online`, while recognising their latest performance changed. `script online` has thin thirty-day contribution despite A$845 spend and below-average relevance: prioritise its ad/intent fit. Do not pause a previously profitable term solely for a short-window zero.

**Later growth:** the campaign is limited to 08:00–20:00 while service intake is 24/7. Once current results are understood, test a bounded evening extension with the existing budget and separately measured hours. Do not expand hours, budget and bidding simultaneously. No off-hours profitable demand is yet demonstrated.

### ED: recommended pause, optional tightly bounded learning

For near-term cashflow, recommend pausing ED through an approved proposal. All four backend orders came through `telehealth mens health` PHRASE, generating only A$29.23 keyword contribution on A$185.37 spend. The campaign total is −A$74.23. A$53.25 of non-converting spend is already paused; do not claim that saving again. Other enabled non-winning terms spent A$50.21 across 17 clicks, too sparse to prove permanent failure individually.

If the owner chooses to retain learning, use a winner-focused pilot with a proposed A$5/day average budget, a proposed maximum A$50 cumulative contribution loss from the new test start, and a 14-day review. These numbers need approval; accounting lag can overshoot an operational loss alert and the daily budget can overdeliver. No automatic emergency pause is authorised yet. Inspect competitor/general men's-health terms before exact negatives; do not broadly exclude all competitors without evidence. No broad keyword expansion, drug-name targeting or presumed ED LTV. No new ED copy/landing redesign without a measured mismatch.

### Remaining campaigns and channels

- **Hair loss:** stay paused; no restart until a specific new acquisition hypothesis has its own capped, approved test. Current losses are historical.
- **Display and old Specialist campaign:** stay paused. Preserve intentional paused state; inspect drift but do not delete history.
- **General consult:** remains retired; not a revenue expansion option.
- **Weight management:** remains organic-only unless its scorecard and separate paid/compliance approval are met. Higher price is not evidence of paid profitability. No weight-loss ad or prescription-drug acquisition assumptions in the A$30k base case.
- **Brand search:** audit existing organic/direct coverage and brand-query spend before proposing a separate defensive campaign. Avoid counting cannibalised organic orders as incremental paid growth.
- **PMax, broad match, cold social, health retargeting and Customer Match:** not default scaling recommendations. New formats/channels require separate eligibility, privacy, intent and cash evidence; do not upload patient lists.

## 5. API, conversions, refunds and deployment work

### Production API gap

The source and successful local calls use v24. Production has a masked `GOOGLE_ADS_API_VERSION` override; the value was not recovered. A command that loaded local `.env` data is not production proof. The manager ID in the email matches ours. Production, an older deployment or another integration could be the v22 caller; origin is unknown.

After review: verify effective deployed version through a minimal authenticated safe read or explicitly set the production override to tested v24, redeploy if needed, then verify reporting and normal conversion/adjustment operation. Inventory other manager callers. Never expose the environment wholesale, log tokens or resend a successful conversion as a test. v25 is optional maintenance, not required to escape v22 sunset. Treat **7 October** as the deadline in the owner's email; the official table corroborates October 2026 but not that exact day. Target closure well before it. A healthy pre-sunset cron cannot establish a supported version.

Acceptance: effective deployed version known; supported authenticated request observed from that deployment; no unexpected caller remains unowned; purchases/adjustments continue through existing deduplication and retry paths. Rollback must retain a supported tested version, never knowingly restore sunset v22.

### Remaining refund reconciliation

One A$29.95 adjustment is still retrying within Google's matching grace period ending **25 September 2026 03:06:58.863 UTC / 13:06 Sydney**. At Sep 23 03:45 UTC: heartbeat OK; 30 adjustment claims succeeded, 14 resolved_not_counted, one retryable_failed; actionable unknown/stale/expired counts zero. Legacy diagnostic counts are not current failures.

Existing hourly cron and monitor own retries. No second monitor or manual duplicate upload. Confirm either applied adjustment, provider-confirmed conversion not counted after grace, or a genuine terminal failure. Healthy heartbeat alone cannot close it. If unresolved after grace, identify the actual provider/config/claim blocker. Stop the monitor only after verified outcome, following the owner's existing automation instruction. This is an Ads reporting adjustment, not evidence the customer still needs a refund.

### Existing payment and attribution controls

Preserve current-session checkout guards, webhook/fallback idempotency, exact refund cash timing, partial-refund top-ups, disputed-cash treatment and durable fee caching. Before code work inspect existing tests; add only missing meaningful regression cases. No rewriting working payment infrastructure for this plan. Qualify stale-click, consent-denied, missing-click-ID, repeat/direct and unlinked-payment cases separately. Google does not report every search or match every upload; discrepancies need classification, not fabricated reconciliation.

## 6. Cashflow beyond Ads

1. **Fresh whole-business bridge:** captured cash → refunds/disputes → retained revenue → payment fees → channel spend → fixed bills → payout/bank timing. Report incomplete evidence instead of an exact invented profit.
2. **Cash runway:** owner chooses the affordable acquisition float and reserve using private bank/payout/bill evidence. Show the coming 7/14/30-day outflows and mature receipts before a material scale step. Pending Stripe funds are not available bank cash. No bank transfer or billing-method edit is authorised.
3. **Checkout recovery:** audit existing consented recovery and retry flows before adding more reminders. Fix confirmed consent/link/session or delivery failures. No unsolicited outbound messages. Measure incremental paid recoveries net of refunds, not email opens or raw clicks.
4. **Repeat purchasing:** improve patient-initiated return navigation and existing permitted refill journeys. Preserve one-off care and eligibility. Reconcile mature cohorts and strict attribution without double-counting repeat value. Existing reminder gates remain until separately changed; no subscriptions, discounting, automatic prescriptions or new sequences in this plan.
5. **Organic acquisition:** inspect the existing service pages with qualified search opportunity using Search Console, landing and purchase evidence. Fix indexing/route/CTA defects first. Prioritise UTI, prescription and certificate commercial pages; educational guides stay education-only. No mass article programme or invented SEO forecast.
6. **Second source:** research one eligible search/referral channel only after the core paid system is measurable. Google eligibility does not automatically transfer. Require a concrete channel, compliant destination, attribution, spend/loss cap and owner approval before launch.
7. **Pricing:** no price change proposed now. Measure realised order mix and contribution first. Do not upsell medically unnecessary duration, relax clinical criteria or assume a higher price improves profit. Any future price test must include completion/refunds and update Stripe/source/display consistently.

## 7. A$30k feasibility and solo capacity

There is insufficient evidence to promise a date or claim current profitable auction supply supports A$30k. The arithmetic is feasible; scalable acquisition and workload need proof.

### Illustrative service mix, not a forecast or service quota

| Service | Monthly orders | Assumed retained cash/order | Retained cash |
|---|---:|---:|---:|
| Certificates | 300 | 28.00 | 8,400.00 |
| Repeat prescriptions | 400 | 32.00 | 12,800.00 |
| Women's health | 177 | 49.75 | 8,805.75 |
| Total | 877 | — | 30,005.75 |

These deliberately rounded assumptions are not list prices or verified future service AOVs; reconcile them with actual service-level cash and permissible priority fees. This means about **29.2 paid orders/day**, including **19.2 prescribing requests/day** that each need an individual doctor outcome. ED, Hair and paid Weight Management contribute zero in this base illustration. No fixed mix is adopted as strategy.

Certificate protocol code currently caps automatic issuance at ten/day, three per five minutes, minimum 15-minute delay and no soft flags; runtime can be narrower. Ten paid certificate orders/day does not mean ten automatic approvals. Eligibility, peaks, manual referrals, refunds and support remain. Do not increase the clinical cap as a marketing optimisation; Medical Director governance is separate.

Measure active review work separately from elapsed queue time, without assigning hypothetical cash labour cost. Verify Parchment completion, certificate delivery, payment/refund recovery and support load. Existing queue/P95 targets are investigation signals, not invented automatic commercial vetoes. Actual safety incidents, explicit holds and fulfilment failures still block affected growth. Solo is the owner's preferred operating model, not permission to automate prescribing or bypass clinical review.

### Acquisition sensitivity, not an approved budget

If A$20k of A$30k retained revenue came from paid acquisition and A$10k from direct/organic/returning sources:

| Paid cash ROAS | Ads required for A$20k paid cash | Paid fees at illustrative 3% | Paid contribution before fixed costs |
|---|---:|---:|---:|
| 1.4× | 14,285.71 | 600 | 5,114.29 |
| 1.8× | 11,111.11 | 600 | 8,288.89 |
| 2.2× | 9,090.91 | 600 | 10,309.09 |

The 3% fee assumption is sensitivity-only; decisions use actual fees. A$10k non-paid revenue is not established, and returning revenue must have one accounting owner. Current settings imply much less spend capacity than these scenarios. Do not immediately raise budgets to this table: first prove incremental contribution and available cash, then expand in small scoped steps. If profitable demand/capacity does not materialise, revise pace and mix instead of buying the target at a loss.

## 8. Test cadence and stop/scale rules

The owner clarified that 14–28 days was tentative. Recommend this adaptive policy for review, replacing the rigid waiting rule only after approval:

- **Immediately/daily:** operational integrity, unexpected settings, payment/fulfilment faults, severe privacy/compliance issues, spending/billing failures. An actual fault is not protected by a test calendar.
- **Seven completed days:** same-weekday early commercial checkpoint. Directional unless effect is clear and mature. Do not repeatedly reset bidding after noisy days.
- **Fourteen days:** normal decision window for a small existing-campaign change, provided conversion/refund lag and useful exposure are accounted for.
- **21–28 days or longer:** low-volume or inconclusive evidence; do not label a winner solely because time elapsed. Formal split bidding/creative experiments often need 4–6 weeks, potentially longer with lag.

Every test records incumbent and treatment, primary cash/order measure, secondary metrics, start time, observation maturity, budget and maximum tolerated loss, exact rollback and owner. Propose default 10–15% commercial steps where policy permits, not an automatic new account rule. Some clinically/commercially clear intent exclusions do not require weeks of wasted spend; prepare exact approval promptly.

**Decision:** expand only if verified positive campaign contribution and observed incremental results justify more exposure. Maintain if promising but uncertain within approved risk. Reverse the specific test if it demonstrably underperforms or reaches its approved loss limit. Unavailable trustworthy economics blocks a scale proposal, not necessarily all existing ad delivery. Emergency live pause authority must be explicitly defined; read-only automation cannot silently acquire it.

Boundary cases for reviewer: cash contribution below zero / exactly zero / above zero; exactly A$30,000 retained cash counts as target attainment; exactly the approved loss ceiling triggers review/approved action; missing fees are unavailable, not zero; repeated webhook or mutation cannot duplicate cash/conversions/spend changes; a newest cohort without complete observation cannot be compared as mature.

## 9. Sequenced execution packages — all gated by review

| Package | Work | Completion evidence | Dependencies / rollback |
|---|---|---|---|
| R0 Review | Opus tests this plan; owner resolves material choices; refresh snapshots | Written findings/disposition, chosen ED route, test limits and action scope | No implementation before review; no model review mistaken for live approval |
| R1 Measurement and continuity | Production API version, remaining refund outcome, fee/attribution completeness, account automation/access inventory | Production/provider receipts and explicit remaining gates; no PHI | Credential/owner access as needed; supported-version rollback |
| R2 Diagnose core losses | Scripts search/medication investigation; certificate Continue and checkout analysis | Reproduced defect or bounded intent hypothesis; mature aggregate cohort | Source/Google/backend/analytics comparisons; no speculative redesign |
| R3 First changes | Exact ED proposal; one UTI test; one evidence-backed certificate/Scripts repair per independent scope | Validate-only → owner approval → apply → independent read-back; code tests/browser/release evidence where needed | Do not bundle unrelated controls; exact inverse action; preserve original receipts |
| R4 Scale winners | Small budget/bid/hour changes only where diagnosed constraint responds | Cash contribution, orders and incremental exposure read at planned checkpoints | Fresh risk/cash check; no automatic jumps to scenario budgets |
| R5 Compound revenue | Existing repeat/recovery repair, three qualified service-page opportunities, one second-source feasibility review | Retained cash and mature cohort evidence, delivery/consent compliance | No outbound sends, channel launch or spend without specific authority |
| R6 Sustain solo | Weekly allocation and workload review; monthly A$15k/20k/25k/30k progress | Reconciled whole-business cash and capacity evidence | Real service hold/incident rules; no automatic clinical cap expansion |

Packages can have independent read-only analysis, but changing overlapping campaign controls simultaneously harms causal interpretation. No deadline in this document promises the revenue target. API sunset is the hard external date; cash growth follows evidence.

## 10. Implementation gaps versus gates

| Item | Classification | Required next proof |
|---|---|---|
| Effective production Ads version | Configuration/evidence gate, not a proven v22 defect | Safe deployed-version read or explicit supported override + deployment verification |
| Single pending refund adjustment | Provider matching gate within grace | Final matching/adjustment outcome; concrete blocker if grace expires |
| UTI/contraception funnel distinction | Candidate implementation gap | Inspect existing allowlisted fields and coverage, then minimal repair if insufficient |
| Certificate automatic-default engagement | Already repaired measurement issue | New cohort evidence; no claim that repair increased sales |
| Scripts conversion decline | Confirmed outcome, cause unresolved | Intent/cohort investigation and local reproduction before a code fix |
| A$75 Women's budget warning | Candidate report semantics defect | Confirm source treats ceiling as mandatory; focused correction/test |
| Campaign edits and ED pause | Human action-scope gate | Exact fresh provider-validated proposal and owner approval |
| Bank reserve/billing backup/recovery | Owner/credential gate | Private owner-controlled verification, no secret disclosure |
| Code deployed successfully | Deployment gate, not guaranteed business improvement | Release evidence, runtime checks and later measured results |
| A$30k solo | Demand/cash/capacity evidence gate | Reconciled run-rate and observed safe manual workload |

## 11. Opus 5.5 review brief

Review independently; do not implement or mutate providers. Challenge this document against current source, canonical docs and the dated evidence. Return ranked findings, supporting evidence, exact corrections and approve/revise/block per work package.

Specifically test:

1. Are payment-time cash cohorts being confused with click-time Google conversions, acquisition cohorts or first-order economics? Are refunds, old-order cash movements, repeat/direct orders and unknown attribution counted correctly once?
2. Are the A$30k scenarios arithmetically correct and clearly assumptions? Does solo capacity respect clinical protocol caps, manual prescribing and operational reality?
3. Is any paused/already-excluded spend presented as a new saving? Do proposed keywords/negatives conflict with existing shared/ad-group controls or healthcare rules?
4. Does the Scripts diagnosis overclaim causality, ignore lag or rely on contaminated/immature funnel measurement? What narrower query or reproduction would decide the cause?
5. Are the proposed UTI bid/copy and certificate budget steps justified, scoped and reversible under actual Smart Bidding and policy? Is fragmentation likely to harm the sample?
6. Are hardening tasks already implemented? Remove duplicates. Distinguish verified gaps from audit coverage gaps, and avoid an unnecessary new control platform.
7. Can API/version, token access and refund reconciliation be proven without secrets, PHI, synthetic live purchases or duplicate uploads?
8. Are permissions clear? Opus review does not itself approve live actions. Are loss limits, emergency authority, spend exposure and owner decisions concrete enough?
9. Does each package have an observable acceptance result, suitable tests, rollback, and a clear human/provider/deployment/evidence gate?
10. What is missing that materially changes cash, conversion, safety or scale? Reject cosmetic work, feature bloat, blanket channel expansion and unsupported savings estimates.

**Requested review outcome:** a corrected implementation order and the smallest first batch of exact changes, with unproven hypotheses left labelled. Do not turn all recommendations into mandatory engineering work.

## 12. Sources and audit trail

Project authorities: `docs/REVENUE_MODEL.md`, `docs/ROADMAP.md`, `docs/OPERATIONS.md`, `docs/ADVERTISING_COMPLIANCE.md`, `docs/BUSINESS_PLAN.md`, `docs/CLINICAL.md`; source includes `lib/google-ads/client.ts`, conversion API/claim paths and `lib/analytics/posthog-release-conversion.ts`. Review current files before implementation; this draft does not silently update their policies.

Local audit artifacts from this task: `/Users/rey/.codex/outputs/google-ads-audit-2026-09-23.md`, `/Users/rey/.codex/outputs/google-ads-keyword-audit-2026-09-23.csv`, and dated UTI execution receipt `/Users/rey/.codex/outputs/uti-growth-review-2026-09-22.md`. The numeric baseline and material caveats are embedded above so Opus can review without those local artifacts. Earlier Fable recommendations are not evidence merely because they were supplied; resolve disagreements through the current sources and provider/cash records.

Official primary sources consulted:

- [Ad Rank factors](https://support.google.com/google-ads/answer/1722122?hl=en): auction relevance/bid explanation.
- [Impression share definitions](https://support.google.com/google-ads/answer/7103314?hl=en): rank/budget loss are opportunity metrics, not sales forecasts.
- [Experiment timing](https://support.google.com/google-ads/answer/13826584?hl=en): formal experiment duration guidance.
- [API sunset schedule](https://developers.google.com/google-ads/api/docs/sunset-dates): v22 October 2026; v24 May 2027. Exact October 7 date is from the owner's email.
- [Account security](https://support.google.com/google-ads/answer/2375456?hl=en): MFA, allowed domains and manager mandates.
- [Auto-apply controls](https://support.google.com/google-ads/answer/10276359?hl=en) and [scope](https://support.google.com/google-ads/answer/10279006?hl=en): inspect subscription/history; no automatic budget-increase claim.
- [Budget exposure](https://support.google.com/google-ads/answer/1704424?hl=en): average daily overdelivery and normal monthly limits.

No customer identifiers, clinical answers, bank balances, credentials or recovery codes belong in the plan or reviewer output.
