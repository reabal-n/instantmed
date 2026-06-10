# InstantMed Revenue Model

> Canonical revenue model for the current one-off, solo-doctor operating phase.
> Read this before changing pricing, service mix, growth targets, subscriptions, or staffing assumptions.

**Last updated:** 2026-06-01

---

## 1. Revenue Target

The current target is **$1M AUD annual gross revenue** from one-off transactions.

| Period | Gross revenue required |
|--------|------------------------|
| Annual | $1,000,000 |
| Monthly | $83,333 |
| Weekly | $19,231 |
| Daily | $2,740 |

This is gross revenue, not net profit. It excludes Stripe fees, refunds, software costs, indemnity, tax, advertising spend, admin time, and doctor labour.

## 2. Current Pricing

All canonical prices live in `lib/constants/index.ts`.

| Service | Current price |
|---------|---------------|
| Med cert, 1 day | $24.95 |
| Med cert, 2 days | $29.95 |
| Med cert, 3 days | $39.95 |
| Repeat prescription | $29.95 |
| ED consult | $49.95 |
| Hair loss consult | $49.95 |
| Women's health | $59.95 |
| Weight loss | $89.95 |
| Priority fee | $9.95 |

Repeat Rx subscription acquisition is dormant/future strategy. Patient-facing checkout, nudge cron, email template, env requirement, and display price were retired. Treat subscriptions as inactive unless explicitly reactivated in this document and `docs/BUSINESS_PLAN.md`.

## 3. Orders Needed For $1M

| Blended AOV | Orders per year | Orders per month | Orders per day |
|-------------|-----------------|------------------|----------------|
| $24 | 41,667 | 3,472 | 114 |
| $30 | 33,333 | 2,778 | 91 |
| $35 | 28,571 | 2,381 | 78 |
| $45 | 22,222 | 1,852 | 61 |
| $55 | 18,182 | 1,515 | 50 |

The business should not try to reach $1M with $24.95 med certs alone. It needs a blended AOV lift from 2-3 day med certs, repeat prescriptions, hair loss, ED, women's health, weight loss, and priority fees.

## 4. Target Service Mix

### Conservative $1M Scenario

| Service | Share | AOV | Monthly orders | Monthly revenue |
|---------|-------|-----|----------------|-----------------|
| Med certs | 65% | $27 | 2,000 | $54,000 |
| Repeat prescriptions | 15% | $30 | 462 | $13,860 |
| Hair loss | 7% | $50 | 215 | $10,750 |
| ED | 7% | $50 | 215 | $10,750 |
| Women's health | 3% | $60 | 92 | $5,520 |
| Weight loss | 3% | $90 | 92 | $8,280 |

This mix produces about $103k monthly gross at roughly 3,076 orders/month. It leaves room for refunds and seasonality while still clearing the $83k/month target.

### Solo-Doctor Reality Check

The limiting resource is not traffic. It is doctor review time plus support load.

| Work type | Target active doctor time |
|-----------|---------------------------|
| Safe med-cert protocol case | Near-zero active time averaged across QA |
| Manual med cert | 2-5 minutes |
| Repeat prescription | 6-10 minutes |
| Hair loss | 6-12 minutes |
| ED | 8-15 minutes |
| Women's health | 8-15 minutes |
| Weight loss | 15-25 minutes |

If service mix shifts too far into ED, women's health, or weight loss before staffing, revenue can rise while clinical risk and burnout rise faster.

## 5. Key Unit Economics

Track these weekly by service:

| Metric | Target |
|--------|--------|
| Intake start to payment conversion | 35-55% for qualified starts |
| Payment success rate | 95%+ |
| Approval rate | Service-specific, but should not be manipulated upward |
| Refund rate | Below 8-10% |
| Chargeback rate | Below 0.5% |
| Support tickets | Below 5 per 100 orders |
| Doctor minutes per order | Falling over time without higher complaints |
| Median med-cert turnaround | Below 30 minutes |
| Doctor queue P95 | Below 2 hours during operating hours |
| Organic share of orders | Increasing month over month |

## 6. Operating Scorecard

Review weekly before scaling paid traffic or adding clinical capacity. The point is not to make the dashboard bigger; it is to stop revenue ambition from outrunning doctor capacity, attribution quality, and support load.

| Metric | Current gate | Target / decision rule |
|--------|--------------|------------------------|
| Monthly gross revenue | Pull from Stripe/Supabase paid intakes, net of refunded orders in the same period. | Scale only when revenue is growing with stable refund, chargeback, and queue metrics. |
| Paid order volume | Paid intakes by service line, excluding seeded E2E and failed checkout rows. | 30-50 orders/day triggers admin/support planning; service mix must not overload prescribing review time. |
| CAC ceiling | Paid spend divided by paid first orders by channel. | Keep CAC below 30% of first-order gross profit for low-AOV services before increasing spend. |
| Refund rate | Refunded or partially refunded paid intakes by service line. | Stay below 8-10%; spikes pause paid ramp and trigger eligibility/copy review. |
| Chargeback rate | Stripe disputes divided by paid orders. | Stay below 0.5%; any cluster gets same-week root-cause review. |
| Support tickets per 100 orders | Support-visible patient/admin contacts per 100 paid orders. | Stay below 5 per 100; above target means fix product friction before adding demand. |
| Doctor minutes per order | Sample by service from queue/review timestamps and operator review notes. | Must fall or stay stable as volume rises; do not hide worsening complexity behind revenue growth. |
| Queue P95 | Doctor queue P95 during operating hours, by service line. | Keep below 2h during operating hours and below the 24h hard ceiling. |
| Hire trigger state | Admin/support, doctor coverage, and QA sampling thresholds from §9. | Treat any triggered state as an operating decision before paid growth. |

**Do not ramp ED or hair-loss paid traffic** until Google Ads purchase attribution is verified, refund/chargeback baselines are stable, and queue P95 is under control for the existing paid mix.

## 7. Profit Levers

| Lever | Why it matters |
|-------|----------------|
| Increase 2-3 day med-cert attach rate | Raises med-cert AOV without adding much clinical complexity. |
| Add priority fee carefully | Raises AOV, but must not create unsafe time pressure. |
| Cross-sell repeat prescriptions post-med-cert | Low CAC expansion from existing trust. |
| Keep hair loss and ED one-off for now | Higher AOV without subscription support debt. |
| Reduce support tickets | Every support ticket consumes margin and doctor/admin capacity. |
| Improve eligibility screening before payment | Lowers refunds and complaints. |
| Invest in compliant SEO | Paid healthcare traffic is expensive and policy-constrained. |

## 8. Paid Growth Guardrails

Do not scale paid spend until:

- paid landing pages follow `docs/ADVERTISING_COMPLIANCE.md`
- prescription drug names are not used in ad copy or paid destinations
- no paid campaign uses advertiser-curated health audiences
- refund and chargeback rates are stable
- conversion is measured from click to paid order
- CAC is under 30% of first-order gross profit for low-AOV services

## 9. Hiring Triggers

| Trigger | Hire |
|---------|------|
| 30-50 orders/day or 10+ support tickets/day | Admin/support first |
| Queue P95 above 2 hours during operating hours | Additional doctor coverage |
| QA sampling falls behind | Doctor or clinical admin support |
| Revenue consistently above $60k-$80k/month | Start formal staff plan |
| Weight loss demand grows | Add monitoring/admin capacity before scaling |

## 10. What Not To Do Yet

- Do not launch subscriptions while operating solo.
- Do not add pharmacy fulfilment.
- Do not promise ongoing monitoring unless staff exists to deliver it.
- Do not push weight loss as a high-volume automated product.
- Do not use med-cert subscriptions or bundles.
- Do not optimise approval rate at the expense of clinical defensibility.
