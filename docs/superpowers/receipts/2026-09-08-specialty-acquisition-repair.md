# Plan 2 specialty acquisition repair — September 8, 2026

**Status: approved, applied and independently verified on September 8; the Plan 2 intervention is complete.** ADS-20260908-03 changed only the two selected Hair/ED keyword statuses. All five campaigns remain enabled with unchanged budgets, bids, ads and remaining keywords. This is the bounded repair selected after the operator rejected campaign pauses and requested profitable acquisition. It remains part of [Plan 2](../plans/2026-09-06-02-certificate-revenue-recovery.md), under [ROADMAP](../../ROADMAP.md). Profitability is the following observation outcome, not an application claim. No new numbered plan, campaign or scheduler was created.

## Exact applied change

Immutable proposal **ADS-20260908-03** changed these two existing phrase keywords:

| Campaign, still enabled | Keyword | Exact criterion resource suffix | Before → after | August 9–September 7 evidence |
|---|---|---|---|---|
| Hair — `24040886790` | `online hair loss treatment` | `197218556326~313221537559` | ENABLED → PAUSED | 25 clicks, A$76.34 spend, zero attributed paid orders |
| ED — `24040886787` | `private mens health consultation` | `197218555566~2495591908798` | ENABLED → PAUSED | 23 clicks, A$68.27 spend, zero attributed paid orders |

Both resources have the prefix `customers/9205010513/adGroupCriteria/`. Each inherits A$3 CPC from its ad group. Every other keyword, the campaign statuses, ads, bids, budgets and landing pages remain unchanged. Hair remains A$10/day, ED A$12/day, Women's A$20/day, Scripts A$95/day and certificates A$20/day. This selects one keyword-eligibility change per affected campaign, not overlapping creative, bid and page tests.

The two criteria account for **A$144.61 historical spend**. That is not guaranteed future savings: remaining keywords can buy replacement traffic, and legitimate assessment searches may also be lost. This is a measured attempt to improve retained contribution, not a promise of profitability or proof either phrase could never convert.

## Why these two, and why Women's stays live unchanged

All windows use completed Sydney dates, ending September 7. Fresh Ads configuration and performance reads were taken September 8 around 10:27–10:33 UTC. ED/Women's paid and refund cash were joined through existing advertiser ValueTrack fields using the canonical cash ledger at 10:34 UTC; all 22 orders map to known configured keyword/ad-group/creative values, with actual fees for all 22. Hair's bounded reportable paid read returned exactly one current30 order, independently mapped to a different enabled keyword; the parent [cash receipt](2026-09-08-certificate-revenue-recovery.json) remains refund-cash authority. No raw search queries, patient identifiers, clinical answers or click identifiers are retained here.

| Campaign / retained productive slice | Orders | Retained AUD | Fees | Ads cost | Contribution after fees/Ads |
|---|---:|---:|---:|---:|---:|
| Hair campaign | 1 | 49.95 | 1.14 | 227.79 | −178.98 |
| ED campaign | 9 | 469.45 | 10.62 | 372.28 | 86.55 |
| ED `telehealth mens health` keyword, kept active | 8 | 419.50 | 9.48 | 206.95 | 203.07 |
| Women's campaign | 13 | 619.30 | 15.43 | 285.55 | 318.32 |
| Women's UTI ad group | 12 | 589.35 | 14.62 | 261.97 | 312.76 |
| Women's contraception ad group | 1 | 29.95 | 0.81 | 23.58 | 5.56 |

Hair's sole attributed paid order came through **`hair loss medication online`**, enabled phrase criterion `197218556326~882753180437`, which stays eligible at its current bid. Since the first full H1 day, August 29, that keyword has seven clicks/A$20.60 and one retained A$49.95 order. The selected Hair keyword has 15 clicks/A$44.53 and zero orders in the same full-day exposure. These small samples support preserving the working route while reducing unproductive eligibility; they do not establish an H1 winner. August 28 is excluded from that full-day comparison because the product shipped at 15:13 Sydney.

ED's eight paid orders on the retained telehealth keyword, plus one on an already-paused historical keyword, account for all nine cash orders. The selected private-men's-health phrase has none. Every ED cash order also maps to the incumbent RSA; the newer RSA's 31 clicks/A$91.88 have no cash orders, but no RSA change is stacked with this keyword repair. Google reports six ED conversions while cash proves nine; conversion-column absence was reconciled before selecting the keyword.

Women's is already contribution-positive at **51.4%** in current30. The UTI ad group supplies 11 Women's orders and one repeat prescription; contraception supplies one repeat prescription and **no demonstrated new/switch-pill order**. Its A$5.56 contribution is positive but too small to prove a viable new-pill acquisition route. Preserve the correct, cheaper repeat-pill handoff; do not relabel those purchases or force the expensive service to manufacture purity. Graduation still needs **20 recognized orders**, ≥90% expected-service purity, ≥20% contribution, <10% refunds and canonical operating/tracking gates. Current purity is 11/13 = 84.6%.

Australia-presence targeting, English, Google Search only, disabled partners/display and Manual CPC are already set correctly on the specialty campaigns. Device, daypart and geographic samples do not support a new exclusion. Product/retail negatives for Hair remain a later candidate if inappropriate matching continues; they are not bundled into this first test. Women's intent-specific destination is also a later candidate: its current allowed paid destination is `/womens-health`, and current mutation controls reject the child URLs. A low Quality Score is a diagnostic, not proof that a profitable page should be replaced. [Google's guidance](https://support.google.com/google-ads/answer/6167130?hl=en) supports evaluating landing relevance alongside conversion and engagement evidence.

## Immutable proposal and validation

- Proposal: `ADS-20260908-03`; mutation family `keyword_status`; two atomic operations.
- Operation hash: `b1a3627fce225408d1e4a1144f66932ce421dcd0fecad70c8479ceeb8e136c8e`.
- Full account baseline hash: `61ed5e102a9c22412453c8f0d40ebe85ac95c0f96b2d89c637ab687ce23a9a90`.
- Google operations hash: `bf5beb7af232018ab5612e6c44c8d42048d11c8c5f28f8d776c919e1178f2c88`.
- Google validate-only: **2026-09-08T10:42:12.850Z**, `ok=true`, request `kQCwYBEWWu6xKjeN1rfa1w`.
- Expires: **2026-09-09T10:41:51.683Z / September 9 20:41:51.683 Sydney**.
- Exact Codex approval, live application and fresh provider read-back: **complete**, as recorded below.

The complete live experiment reads before approval (**12:15:56.415 UTC**) and immediately before apply (**12:17:05.561 UTC**) returned only Scripts `EXP-20260903-01`; neither targeted campaign had a database lock. Both actual criterion-to-ad-group-to-campaign chains were verified, and the immutable full-account baseline matched. The gateway's combined presentation-label lookup was not used as the sole lock evidence. Scripts and the rejected earlier pause packet were untouched. Every future mutation still needs current resource/lock checks and its own exact approval.

## Approval, application and independent read-back

- **Approval:** Codex-task decision consumed once at `2026-09-08T12:16:35.908Z`, reference `codex-task:01a08047-a0fc-71c1-b731-18f73cb010ea`, for the unchanged operation and baseline hashes above. The operator explicitly requested finishing the keyword repair while keeping every campaign running.
- **Fresh Google validation:** the normal apply gateway passed validate-only again; its `apply_started` audit records request `2pixt8gl8wSrgG1nT2KlEA` and the same Google operations hash. No bypass or direct ad-hoc Google mutation was used.
- **Atomic application:** recorded apply start `2026-09-08T12:17:19.872Z`, outcome `applied`, Google request `8lbdJ3Em-eQ2XGad50roiQ`, no error. Partial failure remained disabled.
- **Gateway read-back:** `2026-09-08T12:17:55.689Z`, outcome `verified`; both `op-01` and `op-02` have expected-state hash `281d4d8cf0bd9160389dde565e9487f793f3aa9d64a4464ca7d156ef201fc67b`. The durable proposal state is `verified`.
- **Independent full-account read:** completed `2026-09-08T12:19:09.364Z`. Live hash is `052c146a0a3e1d07d157336328adc09bcce04cfc36f3613a44633421bd94d14e`. Restoring only the two target status fields in an in-memory copy reproduces the original full-account hash `61ed5e102a9c22412453c8f0d40ebe85ac95c0f96b2d89c637ab687ce23a9a90` exactly. Thus no other captured mutable account configuration changed.
- **Campaign guard:** certificates ENABLED A$20/day; Scripts ENABLED A$95/day, tROAS 1.5; ED ENABLED A$12/day; Hair ENABLED A$10/day; Women's ENABLED A$20/day. Both changed keywords retain their inherited A$3 ad-group CPC. Converting keywords, ads, pages and every other captured setting are unchanged.
- **Execution configuration:** the existing local CLI flag was unset before and after; `GOOGLE_ADS_AGENT_MUTATIONS_ENABLED=true` was scoped only to the explicitly approved apply invocation. No persistent local or Vercel environment setting was changed, and the unreadable sensitive production flag was not represented as known.

This proves exact application and preservation of the other settings. It does not establish post-change contribution or authorize another variable. The earlier campaign-pause proposal remains rejected, and no campaign pause was applied.

## Observation and rollback

Use the gateway's recorded apply start, **2026-09-08T12:17:19.872Z / September 8 22:17:19.872 Sydney**, as the conservative acquisition-change cutoff. Google application and read-back were complete by **12:17:55.689 UTC**. The receipt timestamp is the worker's start, not an invented exact Google event time; the independent read returned no newly available target ChangeEvent rows. Keep Hair H1 and ED E1 rendered and preserve their original opening/deadline records, but classify their affected product cohorts as confounded from this cutoff. No clean H1/E1 causal lift or H2/E2 activation follows from the mixed sample.

Retain September 11's early Hair/account read and September 19's ED settlement observation. The first **seven complete Sydney days after application are September 9–15**, read on **September 16**: UTC interval `[2026-09-08T14:00:00Z, 2026-09-15T14:00:00Z)`. Compare campaign and retained-keyword spend, qualified starts, attributed paid orders, actual/estimated fees, refund/dispute cash and contribution. Keep September 8's partial apply-day separate. This is a diagnostic checkpoint, not pilot graduation; September 15's overall revenue read remains distinct. No new reminder or automation was created.

Review a deterioration or persistent irrelevant replacement traffic at the next existing daily brief and prepare the next bounded repair, rather than silently stacking variables. Keep the already-crossed Hair A$150 loss gate visible with the operator's explicit continue-and-repair decision; no automatic campaign pause or budget increase is authorized. Trustworthy tracking, clinical safety, fulfilment and queue safeguards continue to apply.

Rollback requires a fresh exact `PAUSED → ENABLED` keyword-status proposal for either or both of the same resources, current evidence and operator approval. Preserve inherited A$3 CPC; do not restore a removed or independently changed resource blindly. Profitability remains an observation outcome, not a completion claim for provider application.

## September 8 review reconciliation and remaining growth work

The operator supplied a review ending September 1 and asked to finish Plan 2 before Plan 3. **REVISE that review against the closed September 7 evidence.** Preserve its direction to improve qualified demand before raising budgets, but do not repeat its obsolete zero-order premise or turn its landing-page opinions into a proven revenue defect.

- Hair now has one retained order through `hair loss medication online`; ED's `telehealth mens health` has eight retained ED orders and A$203.07 contribution. Preserve both productive keywords. ADS-20260908-03 selects two different criteria with zero attributed paid orders.
- Women's UTI ad group has A$312.76 contribution. Its existing child page already passes validated `intent=uti`; the pill child already passes `intent=ocp_new`. `lib/request/initial-url-seeding.ts` preselects the answer but deliberately retains the editable service-choice step. Current Ads proposal parsing and service-destination validation permit `/womens-health`, not either child destination. A future destination test therefore needs a small reviewed control change and an exact Ads proposal. Do not build duplicate pages or preselection, silently skip safety/identity checks, or remove the correct cheaper repeat-pill handoff. Selector bypass and new RSA copy are separate hypotheses, not prerequisites for Plan 2 closure.
- Scripts' refund explanation is **operator-reported**: recurring Panadeine/codeine requests. The aggregate audit does not establish that all 11 campaign refunds came from that cause. A bounded fresh Ads read at **2026-09-08T11:23:40.145Z** checked 288 current campaign, ad-group, attached shared-list and account-list negatives. Scripts already excludes `codeine` at campaign and shared-list level. No checked negative explicitly named Panadeine or the selected spelling variants. Across 196 visible query clicks/A$1,010.65 of the campaign's 403 clicks/A$1,923.62, the named medicine/typo group returned only one click/A$1.83 and zero Google conversions. Hidden queries and broad generic entry remain unclassified; this is not refund-cause reconciliation or proof of historical negative coverage. Do not add duplicate codeine exclusions or claim a query repair would remove ten percent of refunds.

**Operator clarification after the review:** Panadeine Forte may be prescribed case by case; the concern is repeated requests. This preserves the current individual-doctor-review boundary and supersedes the earlier conditional blanket-exclusion suggestion. Keep the existing pre-payment advisory/acknowledgement and clinician judgment; no categorical medicine ban, numerical repeat limit, timing rule or automatic prescribing/decline decision was authorized or implemented. The reported refund cause remains unquantified at the individual-order level. Refund cash and acquisition/processing costs stay in the economics.

For the owner's stated solo A$20–30k/month revenue objective, no staffing project is selected. At the dated A$31.20 retained AOV that is roughly 22–32 orders/day, a capacity scenario rather than a forecast. Prioritise qualified Women's UTI demand and profitable Scripts entry, while preserving existing certificate/AI-search observation windows. Scripts still needs the queue/refund gates for another budget step; Women's still needs its canonical 20-order/90%-purity graduation evidence. These are distinct from implementation and deployment work.

This review reconciliation authorizes no additional runtime change, campaign, budget increase, external message, reminder or Plan 3 execution. The separately approved two-keyword repair has now been applied and verified; its commercial observation remains open.
