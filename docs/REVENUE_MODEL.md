# InstantMed Revenue Model

> **Authority:** revenue milestones, economic definitions, paid-scaling gates, and hiring/capacity thresholds.
> Live values come from the admin dashboard. Durable strategy lives in `docs/BUSINESS_PLAN.md`. Current priorities and status live in `docs/ROADMAP.md`.

**Last updated:** 2026-09-09

---

## 1. Revenue Milestone Ladder

The active goal is staged, evidence-backed revenue growth:

| Milestone | Timing | Decision unlocked |
|-----------|--------|-------------------|
| **$2,000/month** rolling net-retained revenue run-rate | Within 30 days | Proves that the current baseline can move through focused channel work. |
| **$5,000/month** rolling net-retained revenue run-rate | Within 90 days | Proves repeatable demand across more than one order source. |
| **$10,000/month** rolling net-retained revenue run-rate | Next phase | Triggers a formal capacity and staffing review; it does not trigger an automatic hire. |

`$1M` annual gross remains a distant directional north star for the one-off model. It is not the active planning frame and does not override the milestone ladder.

### Milestone Definition

**Net-retained revenue** is captured order revenue less refunds and disputes for the same reporting window.

Window membership follows durable cash-event time: purchases enter by `paid_at`; each Stripe refund leaves independently at its expanded balance transaction's `created` time exposed by `stripe_refund_cash_movements.refund_cash_at`; a failed or cancelled refund re-enters only at its exact failure balance transaction's `created` time exposed by `refund_reversed_at`; Stripe dispute withdrawals leave by `stripe_disputes.funds_withdrawn_at`; and won-dispute funds re-enter by `stripe_disputes.funds_reinstated_at`, even when the original order predates the window. `Refund.created` records object creation, not a pending refund's later balance movement. A partial refund and a later top-up therefore affect their own cash windows instead of assigning the cumulative intake total to the latest `intakes.refunded_at` snapshot. Dispute creation and closure do not move revenue by themselves; withdrawal and reinstatement amounts come from Stripe's matching balance transactions. When a refund and dispute refer to the same intake, the combined outstanding loss is capped at that order's captured amount so one payment cannot be removed twice.

The refund ledger is append-only and sourced only from exact Stripe Refund/event identities. The dashboard reads live-mode evidence in every environment and fails revenue closed when immutable observations conflict, when a cumulative intake refund is not fully covered by exact evidence, or when a cash movement in the fetched reporting horizon cannot be linked to an intake. Historical repair must read bounded Stripe Refund-list windows and preserve each exact Refund creation, balance debit, and balance reversal timestamp; it must never split or backdate a cumulative intake field by inference. Test-mode evidence cannot satisfy or poison production health because intakes do not carry a Stripe mode.

The dashboard measures the rolling 30-day value from payment truth. A milestone counts only when:

- revenue comes from real paid orders, excluding seeded E2E and failed checkout rows
- refunds and disputes are deducted
- paid acquisition is first-order contribution-positive or inside an explicitly approved bounded test
- real clinical incidents, explicit service holds, fulfilment failures and payment integrity remain separately actionable; numeric queue or support targets do not invalidate cash revenue

Leads, clicks, intake starts, gross checkout value, and temporary revenue that is later refunded do not count as milestone attainment.

## 2. Current Pricing Authority

Canonical prices live in `PRICING` in `lib/constants/index.ts`. Stripe price IDs are mapped in `lib/stripe/price-mapping.ts`.

This document does not duplicate the price table. Pricing changes must update the code source, Stripe mapping, tests, and any approved public display surfaces together.

The current model is one-off transactions only. Repeat-Rx subscriptions, memberships, bundles, pharmacy fulfilment, and recurring prescribing are inactive until `docs/BUSINESS_PLAN.md` deliberately changes the model.

## 3. Service Economics

Measure economics by service. A blended account-level result can hide a profitable service subsidising an unprofitable one.

| Service state | Revenue rule |
|---------------|--------------|
| Medical certificates | Live. Low-budget acquisition may continue while contribution and queue health are measured. |
| Repeat prescriptions | Live low-budget pilot. Measure prescribing time, fulfilment, refunds, and first-order contribution separately. |
| ED | Live low-budget pilot. Keep contraindication, doctor-contact, refund, and unsuitable-case rates visible. |
| Hair loss | Live low-budget pilot. Keep unsuitable-case, fulfilment, and refund rates visible. |
| Women's health | Live low-budget pilot for UTI + new/switch pill only. Measure UTI and contraception separately where data permits. |
| Weight management | Live 2026-08-10 at $89.95 (highest-priced service). Organic-only pilot; no paid traffic assumption until the launch checklist scorecard passes and ads are separately approved. |
| General Consult | Retired. No paid traffic or revenue assumption. |

Target service mix is learned from retained revenue and capacity evidence. It is not fixed by a speculative long-range order table.

## 4. First-Order Contribution

Scaled paid acquisition must be first-order contribution-positive until repeat purchasing is proven with real cohort data.

For each service and paid channel:

```text
Below-capacity first-order contribution after acquisition
  = net-retained order revenue
  - Stripe/payment fees
  - attributable acquisition cost
```

Fixed software, insurance, accounting, and general business overhead stay outside this channel-level calculation. They remain business costs, but they do not determine whether one extra paid order contributes positively.

This is the decision formula while the owner-doctor fulfils demand within existing capacity. Owner-doctor time has zero marginal cash cost in that phase. Queue and support measurements inform capacity decisions; actual clinical incidents, explicit service holds and fulfilment failures still block affected-service growth. Do not invent a contractor rate or sample active minutes to create a hypothetical cash expense.

If an order actually incurs paid incremental doctor or support labour, subtract that realised cost. It is then no longer below-capacity owner volume.

Paid-to-decision elapsed time (`paid_at` to `approved_at` or `declined_at`) is an operational latency measure. It includes queue and waiting time, so it is not active doctor labour and must not be used as the labour input in the contribution formula.

Do not use assumed lifetime value, hoped-for repeat orders, approval rate, or gross AOV to justify first-order losses. Repeat revenue cannot subsidise a first-order loss in a profitable-scale recommendation.

First means the customer's earliest reportable paid order across all services and channels, ordered by payment time and intake ID for ties. The Ads reader keeps identifiers in memory, reads complete historical purchases for affected patients, deducts canonical cash-ledger refunds and disputes (including older first orders with cash movement in the window), and uses actual durable Stripe fees. All campaign acquisition spend is charged to first orders. Historical snapshots without this cohort evidence remain unavailable for first-order qualification; the mutation reader may add a fresh, timestamped in-memory read for the stored run's exact window, without rewriting that run. Blended campaign contribution remains separate.

## 5. Operating scorecard

Review these metrics by service before increasing paid demand:

| Metric | Definition | Decision rule |
|--------|------------|---------------|
| Rolling 30-day net-retained revenue | Captured revenue less refunds and disputes in the rolling window. | Track against the active `$2k -> $5k -> $10k` milestone. |
| Paid order volume | Real paid intakes, excluding seeded E2E and failed checkout rows. | Growth must not overload clinical or support capacity. |
| First-order contribution after acquisition | Formula in section 4, by service and channel, using retained revenue, payment fees, and attributable acquisition cost. | Must be positive for scaling; untrusted revenue, fee, or acquisition inputs block a scaling decision. |
| Refund rate | Refunded or partially refunded paid intakes by service. | Advisory weekly eligibility/copy review; actual refund cash remains deducted from profit. |
| Chargeback rate | Stripe disputes divided by paid orders. | Investigate clusters in the same week; actual dispute cash remains deducted. |
| Support tickets per 100 orders | Patient support contacts per 100 paid orders. | Advisory friction and capacity review; workload count alone is not a scaling veto. |
| Paid-to-decision elapsed time | Time from payment to approval or decline, including queue and waiting time. | Track operational responsiveness only; this is not an active-labour input. |
| Queue P95 | Paid-to-first-clinician-open wait for reportable manual-review requests, by service. | Two hours remains an operating target. P95, oldest wait and 24-hour breaches are advisory investigation signals, not automatic commercial holds. |
| Clinical/fulfilment health | Safety escalations, unsuitable cases, Parchment completion, delivery failures. | Any unsafe or unreliable pattern blocks scaling. |
| Capacity review state | Section 8 thresholds. | Review staffing and workflow when triggered; only a real incident or explicit service hold blocks commercial scaling. |

## 6. Paid Growth Guardrails

Every launched service remains a low-budget pilot while it gathers data. Remaining live is not the same as being approved to scale.

**Owner decision — 2026-09-09:** confirmed positive first-order cash contribution is the commercial qualification for a profitable-scale proposal. The previous 20/30/40% margin tiers, 10/30/50-order minimums, refund-rate veto, 90% service-purity graduation, and fixed post-change waiting/sample rules are superseded. They must not reject verified positive cash contribution.

Material budget increases still require compliant ads and destinations, trustworthy purchase/refund/dispute/fee/spend evidence, positive first-order contribution for the campaign, no actual clinical incident, explicit service hold or fulfilment failure, and exact operator approval. Unknown or non-positive first-order economics cannot be called profitable. Tracking faults remain blocking; diagnostics or conversion-reporting lag alone are advisory when critical financial and attribution inputs are trustworthy.

Refund rate, queue P95/oldest/wait duration, missing queue data, support contacts and QA workload are advisory investigation signals. Review eligibility, copy, workflow and capacity weekly. Support and completed-QA attestations expire after seven days; selection-only `qa_sampled` is not completed QA. Only evidenced clinical incidents, explicit service holds and actual fulfilment failures create operational commercial holds. No numerical wait or workload threshold manufactures one.

Every budget, keyword, negative keyword, asset, sitelink, targeting, bid-strategy, pause or enable change follows `docs/OPERATIONS.md`; no routine Ads mutation is autonomous. The **maximum 50% budget step** remains a hard ceiling, and a proposed increase is additionally bounded by the measured first-order cash break-even ceiling (retaining at least one cent). The live Scripts tROAS floor and exact approved amounts remain enforced. There is no permission for unlimited spend or an automatic budget increase.

Sample size and time since a change are uncertainty signals. Preserve closed-day/order counts and actual before/after timestamps; disclose overlapping experiments rather than imposing a fixed three-day/10-order delay. An observation is not proof that the change caused the result. An active experiment constrains causal attribution, not revenue indefinitely: the owner may explicitly close its measurement window as inconclusive before authorizing another variable, retaining original checkpoints and the exact stop timestamp. Closing measurement does not roll back the existing Ads budget.

Campaign cash includes real recognised cross-service orders, but their actual service identity must remain visible. Women's Health repeat-pill handoffs are prescriptions, not women's consultations. The current purchase rows do not persist the explicit `womens-health-repeat-handoff` source marker, so campaign-attributed prescriptions cannot truthfully be divided into repeat-pill handoffs and unrelated leakage. Keep cross-service warnings; the bounded future fix is to persist the existing explicit handoff marker into checkout attribution and report handoff counts separately, without reading clinical answers or relabelling all Scripts orders.

A target cost per acquisition (tCPA) is an average acquisition target. It is not a CPC limit, a guaranteed per-conversion price, or permission to ignore service-level retained contribution.

### Bounded Learning Exception

A campaign may temporarily be contribution-negative only as an operator-approved learning experiment with:

- a fixed maximum budget
- named campaign/service and match types
- a defined start/end window
- a minimum useful sample or time checkpoint
- an explicit stop/kill threshold
- no claim that the campaign is "scaling"

When the budget, time, or kill threshold is reached, stop and present the result before any extension.

## 7. Profit Levers

| Lever | Why it matters |
|-------|----------------|
| Improve qualified conversion | More paid orders from the same compliant demand. |
| Increase 2-3 day med-cert mix appropriately | Raises med-cert AOV without adding the same complexity as a new service. |
| Use Priority review carefully | Raises AOV but must not create unsafe time pressure. |
| Encourage appropriate one-off repeat requests | Expands revenue from existing trust without assuming subscription LTV. |
| Improve service-level paid intent | Better keywords and negatives reduce unsuitable and refund-heavy traffic. |
| Reduce support contacts | Protects margin and owner capacity. |
| Reduce avoidable owner handling safely | Releases constrained capacity without inventing a hypothetical labour expense; clinical quality and complaints must remain stable. |
| Compound compliant organic and external authority | Reduces dependence on paid acquisition over time. |

## 8. Hiring And Capacity Triggers

Revenue alone does not decide staffing. The `$10,000` rung triggers a capacity review only. The sole automatic trigger for adding doctor coverage is sustained demand of 20 or more prescription requests per hour; every other signal below triggers diagnosis, demand control, or an operating decision rather than an automatic doctor hire.

| Trigger | Required decision |
|---------|-------------------|
| `$10k/month` rolling net-retained run-rate | Formal capacity and staffing review only; no automatic hire. |
| Sustained 20+ prescription requests/hour | Add verified doctor coverage before further ramp. This is the only automatic extra-doctor trigger. |
| Support contacts above 5 per 100 orders | Investigate friction or support capacity; the count alone does not veto profitable scale. |
| Queue P95 above 2 but below 6 hours | Advisory watch: diagnose workflow, service mix and coverage. |
| Queue P95 at or above 6 hours, oldest unresolved work at or above 20 hours, or any 24-hour breach | Investigate the affected service. Elapsed time alone creates neither an automatic commercial hold nor a hire. |
| Fresh completed clinical QA is behind | Review QA capacity; workload alone is advisory. Selection alone is not completed QA. |
| Weight-management scaling is considered | The 2026-08-10 launch is one-off review only (D-E): continuation is a new consult, so no standing monitoring capacity is assumed. Any move beyond that model needs its own capacity decision. |

Future clinicians use `doctor` accounts with verified capability flags. Future non-clinical operators use `support`. The owner remains the sole human admin.

## 9. What Not To Do Yet

- Do not launch subscriptions or recurring prescribing.
- Do not add pharmacy fulfilment, dispensing, delivery, or inventory.
- Do not promise ongoing monitoring without staff to deliver it.
- Weight management stays doctor-reviewed and low-volume: never automated, and not advertised until separately approved.
- Do not confuse zero marginal owner-labour cash cost below capacity with unlimited owner capacity.
- Do not optimise approval rate at the expense of clinical defensibility.
- Do not increase Ads spend without the operator approving the exact mutation.
