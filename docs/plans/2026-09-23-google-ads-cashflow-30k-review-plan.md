# Google Ads hardening and cashflow plan: A$30,000/month solo

**Status:** finalised 24 September 2026 after Opus review and independent verification; replaces the September 23 draft. **Owner:** Rey. **Currency:** AUD.

**Authority:** Reference only. This document elaborates the ranked growth item in `docs/ROADMAP.md`; it is not a parallel programme. `docs/REVENUE_MODEL.md` owns economics, `docs/OPERATIONS.md` owns live mutations, and `docs/ADVERTISING_COMPLIANCE.md` owns acquisition/privacy boundaries. The owner has authorised finalising this plan and repairing the reported reconciliation alerts. This does not approve all future bids, budgets, customer messages, clinical changes or provider configuration changes.

## 1. Outcome and commercial rules

The active destination is **at least A$30,000 rolling 30-day net-retained revenue while operating solo**. A$15k, A$20k and A$25k are progress checkpoints, not automatic spending releases. Revenue is captured cash less exact refund/dispute movements in the same window; it is not take-home profit.

Campaign contribution is attributed retained cash from first and repeat orders minus actual payment fees and advertising spend, plus any actual incremental paid fulfilment costs. Business profit also subtracts overhead and applicable taxes. Bank cash depends on payout and billing dates. Report these separately.

Campaign contribution remains the commercial scaling qualification. First-order economics remain visible; measured mature repeat cohorts also participate in the existing Scripts spending-ceiling calculation. Do not remove that control or count historical repeat value twice. No invented LTV, fixed margin tiers, autonomous pauses, new staffing programme or automatic clinical-cap expansion.

## 2. Evidence and corrections accepted

Closed 30-day audit, August 24–September 22, reconciled against the stored September 22 report:

| Campaign | Orders | Spend | Retained cash | Fees | Contribution | First-order contribution |
|---|---:|---:|---:|---:|---:|---:|
| Scripts | 139 | 3,103.30 | 4,357.55 | 127.22 | 1,127.03 | 150.65 |
| Women's Health | 22 | 578.45 | 1,068.85 | 24.78 | 465.62 | 436.48 |
| Certificates | 27 | 717.29 | 763.65 | 21.17 | 25.19 | −28.17 |
| ED | 4 | 288.83 | 219.70 | 5.10 | −74.23 | −74.23 |
| Hair loss, paused | 1 | 247.94 | 49.95 | 1.14 | −199.13 | −199.13 |

First-order contribution subtracts the entire campaign spend from first-order cash after fees. Scripts has 102 first orders and 37 repeat orders, not proof of 37 distinct returning patients or a separately measured repeat-acquisition profit. Women's Health has 21 first orders. These figures support prioritising Women's Health without changing the campaign-contribution policy.

Production Sentry verification on September 24 found 210 v22 requests and zero v24 requests over 24 hours. The production API gap is confirmed. The owner's notice gives October 7 as the v22 deadline. Source defaults and successful local calls are not deployment evidence.

Privacy verification found ten production Google Ads/DoubleClick spans containing `medication` over 30 days. Code grants ad personalisation by default. Cancellation URLs carry a resume token and lack the relevant tag exclusion. Actual token transmission is **not yet proven**; manual page views already strip query parameters, while other tag requests require browser verification.

Five of nine September 22 UTI exact exclusions overlap earlier phrase exclusions. Opus's corrected historical spend for the four additional exclusions is A$20.31; this is historical exposure, not measured future savings. Read post-change queries and all applicable negative scopes before proposing another exclusion.

## 3. Immediate implementation order

| Priority | Action | Completion evidence | Gate |
|---|---|---|---|
| 1 | Repair the reported reconciliation alerts: synthetic fixture filtering, separate clinical waiting from payment failure, one aggregate alert owner, preserve genuine integrity and overdue-review detection | Regression tests, CI, production release, next natural cron result | Code/release work authorised September 24; never mark a patient delivered to silence an alert |
| 2 | Replace the production v22 override with supported v24 and expose effective API version in integration readiness | Same production jobs successfully use v24; no v22 traces during a full observed day; next daily brief succeeds | Exact production configuration/deployment action |
| 3 | Contain health-context advertising signals and protect cancellation capability URLs | Synthetic browser network proof for fresh load and client navigation, with measurement still working; no sensitive query parameters in outbound tags or Sentry | Separate privacy/compliance implementation and release; disabling personalisation alone is not proof of containment |
| 4 | Correct existing Ads tooling: ceiling warning, negative coverage checks, existing experiment registration | Focused tests, audit read-back and explicit unavailable states | Small code changes; no live Ads mutation implied |
| 5 | Run campaign reviews below and prepare the single best incremental cash opportunity | Fresh ledger economics, exact validated proposal, risk/rollback and independent provider read-back after approval | Owner approves each live mutation |

The API change and refund reconciliation have separate acceptance criteria. The A$29.95 refund's matching grace ends September 25 at 03:06:58.863 UTC (13:06 Sydney). The hourly job already retries. Accept only an applied adjustment or provider-confirmed non-counting after grace; a healthy heartbeat or successful v24 request does not establish either. Escalate a concrete blocker if unresolved after grace. Do not reopen merged PRs #597/#598.

## 4. Campaign actions

### Women's Health: first growth priority

Retain the A$50/day, A$4 CPC control pending the September 19 bid test review, scheduled October 7 unless explicitly closed early. Separate UTI from contraception. Near-zero budget-lost share means raising an unused budget is not the immediate lever. Approximately 74% rank loss warrants inspecting bid competitiveness, query/ad/landing relevance and eligibility.

A$3.86 average CPC near a A$4 maximum suggests investigating the ceiling; it does not prove every auction is constrained. Historical A$5.55 break-even CPC is not a safe marginal bid guarantee. The code currently blocks A$4.40. A proposed higher code ceiling (for example A$5) requires its own bounded change; it neither sets the live bid nor authorises spending. Then prepare one UTI-only bid test with fresh economics, maximum incremental loss, review date and exact inverse.

Protect proven intent (`uti treatment online`, `online doctor for uti`). Check existing campaign, ad-group and shared negatives before adding terms. No medication-name acquisition, health retargeting or broader clinical eligibility. At roughly five orders weekly, avoid splitting into multiple simultaneous ad-copy experiments. A relevance repair can be justified by evidence without pretending a short test proves a conversion lift.

### Scripts: improve acquisition efficiency, preserve productive demand

Opus's stored-series review reports weekly campaign orders of 29, 20, 26, 53 and 29 across August 19–September 22. All-channel prescription orders were 38, 34, 39, 56 and 39. The spike is not a normal baseline. September 9–15 versus September 16–22 spend was A$945.49 versus A$922.56; clicks 225 versus 166; CPC A$4.20 versus A$5.56; contribution A$749.35 versus A$18.82. Earlier normal weekly spend was approximately A$516.

Review the September 17 budget change on October 1 and September 19 tROAS restoration on October 3. Compare equivalent weekdays against pre-September-9 and immediate pre-change periods, showing the spike separately. A$120 versus A$95 is A$25/day of budget difference; the roughly A$60/day historical actual-spend difference is a different comparison.

Prepare a return-to-A$95 option if additional spend fails to earn incremental contribution. Keep 1.50 tROAS as the current control. Do not stack a keyword pause, target adjustment and budget rollback. Review `script online`, `online script`, `get escript online` and `telehealth prescription` by intent and mature retained cash, not a short-window zero alone.

Keep a **bounded** medication-flow check using comparable mobile/source cohorts and equal follow-up. A 51% completion rate may resemble history without being optimal. The old 52% mobile baseline and recent all-channel data are not directly comparable. Reproduce a specific failure before code changes; otherwise select one evidence-backed clarity test. No wholesale intake rebuild or weaker prescribing checks.

An evening-hours test is later and separately approved. Certificate orders paid overnight do not establish overnight ad-click incrementality or Scripts demand. Under a spent daily budget, broader hours can redistribute existing exposure.

### Certificates: repair conversion before buying substantially more traffic

Keep the owner-selected A$30/day and A$22 target CPA as the control. Review October 7, with a later read through October 20 if uncertainty remains. The recent 30-day campaign contribution is only A$25.19; A$40/day is not yet justified by unused demand alone.

Use the deployed anonymous events to measure first view → real interaction → Continue tap → validation → progression, then consent → payment attempt → server-paid order. Compare mobile, restored/fresh and source cohorts with equal follow-up. The historical 217 views / 155 progressing flows are independent step observations, not 62 proven lost purchases. Default-driven engagement contamination was fixed by #597; that does not prove conversion improved.

Prioritise reproducible handoff/validation problems. Otherwise test one clear expectation or intent mismatch. Preserve dates, eligibility, consent and duration rules. Protect promising certificate queries, and inspect `medical certificate today` / `medical certificate now` against current negatives and cash. Changes must account for Smart Bidding rather than assuming manual keyword bids control spend.

Funnel improvements benefit non-ad traffic too. Do not present certificate automation as unlimited: the protocol code ceiling is ten/day with other eligibility, rate and delay gates; prescribing always needs an individual doctor outcome. Any clinical-cap change is separate.

### ED and remaining campaigns

ED is a low-priority cashflow candidate. Prepare a pause proposal if current results still justify it, but retain the existing approved pilot controls until a decision: A$12/day, A$3 CPC ceiling, A$150 loss cap and a pause proposal after 30 clicks without an order. These generate proposals, not automatic pauses. Do not introduce the draft's additional A$5/day/A$50-loss regime. If learning continues, inspect the existing `telehealth mens health` winner and weak intent before expansion.

Hair loss, Display and old Specialist remain paused. General consult stays retired. Weight management remains organic-only pending its separate launch/paid gates. Brand search needs cannibalisation evidence before a new campaign. No default PMax, broad-match expansion, patient audiences or cold-social launch.

## 5. Ten bounded hardening recommendations

| # | Action | Reuse or actual gap |
|---|---|---|
| 1 | Verify manager/users, MFA, recovery and billing access | One-off owner/credential check; no new access system |
| 2 | Inspect auto-apply settings and flag unexplained external edits | UI audit first; existing change history needs actionable comparison, not only a count |
| 3 | Check affordable cash exposure before each scale proposal | Existing contribution/cash controls; owner confirms reserve privately |
| 4 | Supported production API version and readiness visibility | Confirmed configuration gap plus small readiness change |
| 5 | Validate primary purchase goal, duplicate imports and exact refund outcomes | Reuse current conversion/claim system; do not rebuild it |
| 6 | Keep end-to-end health actionable | Reuse heartbeat and provider diagnostics; separate queue waiting from integrity failures |
| 7 | Prevent health-context advertising personalisation and capability-URL leakage | Confirmed exposure plus browser evidence gate; preserve privacy-safe measurement |
| 8 | Detect existing negative coverage across all scopes | Extend current proposal checks with match-type/token-aware coverage, not substring guesses |
| 9 | Register each real test, loss limit, duration, baseline and overlapping changes | Reuse `experiment:create`; inspect/enforce overlap behaviour rather than assume registration alone prevents conflicts |
| 10 | Make exceptions explain the needed action | Fix ceiling-versus-mandate warning; retain missing-fee/config/unknown-state failures |

## 6. Test windows and change calendar

Use daily checks for breakage, privacy, spend/loss limits and delivery. Use seven days as an early directional read, not an automatic verdict. Fourteen completed days is the default campaign decision checkpoint; extend to 28 or longer when volume/lag is insufficient. A relevant failure or an approved loss limit can end a test earlier. No arbitrary waiting rule overrides a genuine incident.

No mandatory 10–15% budget staircase. Choose an exact step under the existing maximum-step and cash rules, proportional to evidence and incremental risk. A 50% allowed maximum is not a recommendation to use it.

| Existing change | Checkpoint / interpretation |
|---|---|
| Scripts budget September 17; tROAS September 19 | October 1 / October 3; normal and immediate pre-change baselines |
| Women's Health bid September 19 | October 7, or explicitly close early before another bid change |
| Certificate A$30/keywords September 22 | October 7; later cohort through October 20 if needed |
| UTI negatives September 22 | Read only subsequent query exposure for incremental benefit |
| Landing pages #589 and consent #594, September 21 | Annotate funnel comparisons; do not attribute all movement to Ads |
| Request speed/certificate telemetry #597/#598, September 22 | Measurement cutover; new cohort evidence required |
| Certificate 24/7 checkpoint September 24; copy September 24/October 24 | Read existing test before designing hours/copy changes |
| Refill reminder wave September 27 | Mature strict attribution and retained cash; no new unsolicited sends |

## 7. Revenue feasibility and solo capacity

Refresh whole-business revenue from the canonical cash ledger before presenting a new forecast. Opus's roughly A$11.2k/350-order and A$4.8k non-paid figures are estimates, not an independently reconciled replacement for ledger truth. Preserve fee-completeness checks; missing fees mean profit is unavailable, not zero.

The verified paid baseline is A$6,459.70 retained cash / A$4,935.81 spend = approximately **1.31×**, or **1.27× after A$179.41 fees**, leaving A$1,344.48 before overhead. This is historical, not a marginal-return promise.

At a verified A$30 retained AOV, A$30k would require 1,000 orders/month; at A$35 it would require about 858. These are conditional arithmetic, not predicted service mixes. Do not assume 177 Women's Health orders, A$32 Scripts AOV or A$10k non-paid revenue without evidence. Likewise, the review's 60–65 Women's Health demand ceiling is not established enough to use as a hard cap.

If non-paid revenue remained A$4.8k, paid retained cash would need A$25.2k. At unchanged 1.31× ROAS that implies approximately A$19.24k monthly Ads spend—nearly four times this baseline and a substantial cash exposure, **not a budget recommendation**. Improve contribution and prove incremental demand before contemplating that spend. Forecast low/base/high cases only after fresh source-level ledger and capacity reads; leave unmet demand explicit.

Track actual manual review time, protocol eligibility, refunds, support and fulfilment alongside retained revenue. No second doctor or clinical shortcut is presumed. The owner chooses staffing based on demonstrated load under current operating policy.

## 8. Repeat and unpaid growth

Repair existing consented refill and patient-initiated return paths where evidence shows a failure. Count returned cash once and distinguish attribution from incrementality. Preserve the existing mature-wave gate before another reminder. Customer messages require their own authority.

Inspect the three existing service-page opportunities with the strongest Search Console intent and downstream purchase evidence. Repair indexing/routing/conversion defects before content expansion. Educational guides remain education-only.

Hold second-channel preparation/launch until the owner reopens it after Google opportunities are assessed. Remove the former October 6 preparation deadline; neither A$20k nor A$30k requires a second paid channel by definition.

## 9. Completion and remaining gates

- **Implementation:** alert classification/filtering; readiness version; targeted privacy containment; ceiling warning; negative overlap; existing experiment coverage. Verify each independently.
- **Human/credential:** account access/billing review, bank cash envelope and exact Ads/provider mutations. The A$30k goal itself is already decided.
- **Deployment:** green required checks and production receipt; a commit is not a live fix.
- **Provider:** final refund result independent of API health.
- **Evidence:** mature test cohorts, canonical revenue/fees, incremental demand and solo capacity. No promised date for A$30k.

Weekly allocation review uses existing reporting, ranks incremental contribution opportunities and keeps one clear next action per campaign. No new dashboard, mass keyword expansion or additional monitoring platform is required.
