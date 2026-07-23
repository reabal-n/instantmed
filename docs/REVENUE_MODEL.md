# InstantMed Revenue Model

> **Authority:** revenue milestones, economic definitions, paid-scaling gates, and hiring/capacity thresholds.
> Live values come from the admin dashboard. Durable strategy lives in `docs/BUSINESS_PLAN.md`. Current priorities and status live in `docs/ROADMAP.md`.

**Last updated:** 2026-07-23

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

The dashboard measures the rolling 30-day value from payment truth. A milestone counts only when:

- revenue comes from real paid orders, excluding seeded E2E and failed checkout rows
- refunds and disputes are deducted
- paid acquisition is first-order contribution-positive or inside an explicitly approved bounded test
- clinical QA, queue health, chargebacks, and support load remain controlled

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
| Weight loss | Gated. No paid traffic or revenue assumption. |
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

This is the decision formula while the owner-doctor fulfils demand within existing capacity. Owner-doctor time has zero marginal cash cost in that phase, but it is still a capacity constraint: growth must stay inside the queue, safety, fulfilment, and support guardrails below. Do not invent a contractor rate or sample active minutes to create a hypothetical cash expense.

If an order actually incurs paid incremental doctor or support labour, subtract that realised cost. It is then no longer below-capacity owner volume.

Paid-to-decision elapsed time (`paid_at` to `approved_at` or `declined_at`) is an operational latency measure. It includes queue and waiting time, so it is not active doctor labour and must not be used as the labour input in the contribution formula.

Do not use assumed lifetime value, hoped-for repeat orders, approval rate, or gross AOV to justify first-order losses.

## 5. Operating scorecard

Review these metrics by service before increasing paid demand:

| Metric | Definition | Decision rule |
|--------|------------|---------------|
| Rolling 30-day net-retained revenue | Captured revenue less refunds and disputes in the rolling window. | Track against the active `$2k -> $5k -> $10k` milestone. |
| Paid order volume | Real paid intakes, excluding seeded E2E and failed checkout rows. | Growth must not overload clinical or support capacity. |
| First-order contribution after acquisition | Formula in section 4, by service and channel, using retained revenue, payment fees, and attributable acquisition cost. | Must be positive for scaling; untrusted revenue, fee, or acquisition inputs block a scaling decision. |
| Refund rate | Refunded or partially refunded paid intakes by service. | Stay below 8-10%; a spike pauses scaling and triggers eligibility/copy review. |
| Chargeback rate | Stripe disputes divided by paid orders. | Stay below 0.5%; any cluster gets same-week review. |
| Support tickets per 100 orders | Patient support contacts per 100 paid orders. | Stay below 5 per 100; above target means fix friction before adding demand. |
| Paid-to-decision elapsed time | Time from payment to approval or decline, including queue and waiting time. | Track operational responsiveness only; this is not an active-labour input. |
| Queue P95 | Paid-to-review wait by service. | Keep below 2 hours and below the 24-hour hard ceiling. |
| Clinical/fulfilment health | Safety escalations, unsuitable cases, Parchment completion, delivery failures. | Any unsafe or unreliable pattern blocks scaling. |
| Capacity review state | Section 8 thresholds. | A triggered state requires an operating decision before further ramp. |

## 6. Paid Growth Guardrails

Every launched service remains a low-budget pilot while it gathers data. Remaining live is not the same as being approved to scale.

Material budget increases require:

- compliant ads and destinations under `docs/ADVERTISING_COMPLIANCE.md`
- trustworthy purchase and refund/dispute measurement
- a complete contribution calculation using retained revenue, payment fees, and attributable acquisition cost
- positive first-order contribution for the service being scaled
- stable refund, chargeback, clinical, queue, fulfilment, and support metrics
- explicit operator approval for the exact change

Every budget, keyword, negative keyword, asset, sitelink, targeting, bid-strategy, pause, or enable recommendation follows the approval workflow in `docs/OPERATIONS.md`. No routine Google Ads mutation is autonomous.

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
| Support contacts above 5 per 100 orders | Fix product friction or add bounded support capacity before scaling. |
| Queue P95 above 2 hours or any work approaching the 24-hour ceiling | Pause the growth that worsens the queue and diagnose workflow, service mix, and coverage; this is not an automatic hire. |
| Clinical QA sampling falls behind | Pause growth that worsens the gap and restore QA capacity before resuming. |
| Weight-loss launch is reconsidered | Approve monitoring and support capacity as part of the launch decision before accepting paid requests. |

Future clinicians use `doctor` accounts with verified capability flags. Future non-clinical operators use `support`. The owner remains the sole human admin.

## 9. What Not To Do Yet

- Do not launch subscriptions or recurring prescribing.
- Do not add pharmacy fulfilment, dispensing, delivery, or inventory.
- Do not promise ongoing monitoring without staff to deliver it.
- Do not launch or advertise weight loss as an automated or high-volume service.
- Do not confuse zero marginal owner-labour cash cost below capacity with unlimited owner capacity.
- Do not optimise approval rate at the expense of clinical defensibility.
- Do not increase Ads spend without the operator approving the exact mutation.
