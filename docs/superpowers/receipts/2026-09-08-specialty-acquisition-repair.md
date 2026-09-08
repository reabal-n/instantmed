# Plan 2 specialty acquisition repair — September 8, 2026

**Status: prepared and Google validate-only passed; exact operator approval remains pending. Nothing applied.** This is the bounded repair selected after the operator rejected campaign pauses and requested profitable ED, Hair and Women's Health acquisition. It remains part of [Plan 2](../plans/2026-09-06-02-certificate-revenue-recovery.md), under [ROADMAP](../../ROADMAP.md). No new numbered plan, campaign or scheduler is created.

## Exact proposed change

Immutable proposal **ADS-20260908-03** pauses only these two existing phrase keywords:

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
- Approval, live apply and fresh provider read-back: **not yet performed**.

The complete live experiment read at **10:41:08.301Z** returned only Scripts `EXP-20260903-01`; neither targeted campaign has a database experiment lock. The existing gateway looks up locks by its presentation label, so the combined label alone is insufficient proof. Independently recheck every targeted criterion's owning campaign and all live locks immediately before apply; any matching lock, account drift, expiry, disabled mutation flag or changed criterion aborts. Do not mutate Scripts or use a combined label to evade a lock. The rejected earlier pause packet is not reusable.

## Observation and rollback

The actual successful apply time, if approved, is the acquisition-change boundary. Keep Hair H1 and ED E1 rendered and preserve their original opening/deadline records, but classify the affected product cohorts as confounded from this boundary. No clean H1/E1 causal lift or H2/E2 activation follows from the mixed sample. If approval never arrives or apply aborts, no new acquisition epoch starts.

Retain September 11's early Hair/account read and September 19's ED settlement observation. At **seven complete Sydney days after the apply day**, compare campaign and retained-keyword spend, qualified starts, attributed paid orders, actual/estimated fees, refund/dispute cash and contribution, with partial apply-day results separate. If applied September 8, this first full window is **September 9–15**, read on September 16. That is a diagnostic checkpoint, not pilot graduation; the existing September 15 overall revenue read remains separately scheduled in the roadmap's standing cadence. No new reminder or automation is created.

Review a deterioration or persistent irrelevant replacement traffic at the next existing daily brief and prepare the next bounded repair, rather than silently stacking variables. Keep the already-crossed Hair A$150 loss gate visible with the operator's explicit continue-and-repair decision; no automatic campaign pause or budget increase is authorized. Trustworthy tracking, clinical safety, fulfilment and queue safeguards continue to apply.

Rollback requires a fresh exact `PAUSED → ENABLED` keyword-status proposal for either or both of the same resources, current evidence and operator approval. Preserve inherited A$3 CPC; do not restore a removed or independently changed resource blindly. Profitability remains an observation outcome, not a completion claim for provider application.
