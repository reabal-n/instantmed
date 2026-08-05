# Business dashboard: revenue/profit trends + ads performance (2026-08-05)

> **Authority:** Reference only. `docs/ROADMAP.md` remains the sole active priority queue; this design records the operator-requested trends restoration shipped 2026-08-05 and does not authorise further scope by itself.

## Goal

The 2026-07-29 trim removed all trend visibility from `/admin/analytics`. Operator request (2026-08-05): restore

- revenue for **today / yesterday / last 7 days / last 30 days** with **% change vs the prior equivalent period**;
- **approximate profit after ad costs** (net retained − ads spend − payment fees);
- **ads performance**: spend, CPA, **CPC**, net-retained ROAS, first-order contribution.

Keep the page a bounded decision surface — this is a trends layer, not a return of the deleted metrics wall (scorecard, geography, event-total funnel stay dead).

## Approach (chosen: extend in place)

- **A (chosen)**: extend the canonical `lib/data/revenue-dashboard.ts` read additively; assemble a daily ads-spend ledger from **delivered immutable agent runs** (each run's `snapshot.totals.daily` covers exactly one closed Sydney day); persist clicks in future snapshots for CPC. One new pure view-model module composes it.
- B — standalone trends module with its own queries: rejected; duplicates the canonical window math that `getRevenueWindowBounds` exists to unify.
- C — live Google Ads API on page load: rejected; violates the delivered-evidence doctrine pinned by `business-dashboard-contract.test.ts` ("never refresh economics on page load").

## Data design

### Revenue (`lib/data/revenue-dashboard.ts`, additive)

- Fetch horizon widens 30d → **60d** (paid + refund reads) so prior-30d comparisons exist. Sub-reads stay windowed, so existing window outputs are unchanged; `serviceMix`, `monetisation`, and any other whole-array consumers are re-scoped to the last-30d slice explicitly.
- `PaidRevenueRow` gains `stripe_fee_cents` (the ads-agent fee cache; partial coverage).
- `daily` becomes **31 Sydney buckets** (30 closed days + today, today partial) and each day gains `feeEstimateCents`.
- New exported fee estimator: actual cached `stripe_fee_cents` when present, else `round(amount × 1.7%) + 30c` (AU domestic card baseline). Always labelled approximate in UI.

### Ads spend ledger (`lib/ads-agent/runs.ts`)

New reader `getRecentDeliveredAdsAgentRunDailySpend`: last ≤35 **delivered** runs, each mapped to `{ dateKey: snapshot.windows.daily.startDate, spendCents, clicks }` where spend = enabled + paused + other `totals.daily` portfolios (skip the day when spend is null — unknown ≠ zero). Dedup by dateKey, newest wins. Coverage is surfaced, never silently interpolated. Runs exist since 2026-07-28, so early ledgers are sparse by construction.

### Clicks → CPC (`lib/ads-agent/snapshot.ts`, `types.ts`, `business-read-model.ts`)

- `aggregateSpendRows` additionally sums `metrics.clicks`; `CampaignEconomics` + `CampaignPortfolioEconomics` gain nullable `clicks`.
- `business-read-model` derives `clicksTotal`/`cpcCents` **softly**: old runs without clicks yield null CPC and must NOT null the whole economics aggregate.
- CPC renders "Unavailable" (the shared null-metric fallback) until the first post-change run delivers.

### View model (`lib/admin/business-trends.ts`, pure + tested)

- **Period tiles**: today (delta vs same-time yesterday), yesterday, last 7 Sydney days, rolling 30d — net retained, orders, AOV, Δ% (null-safe when prior = 0).
- **Profit rows** on **closed windows only** (no partial-day spend exists): yesterday / last 7 closed days / the latest run's own rolling-30 window. `profit = Σ dailyNet − Σ dailyFeeEstimate − spend`, each row carries spend coverage (`N of M days`) and goes unavailable-with-reason when spend is unknown. Labelled "≈ after ads + payment fees; excludes fixed costs".
- **Chart series**: 31 daily bars (net retained), single-series by design — the palette validator failed every in-system two-hue pair (gray fails the chroma floor; teal/muted is ΔE 2.3 in dark), so delivered spend renders in the hover readout and the sr-only table rather than as a painted second series.

## UI (5 `DashboardCard`s, contract updated deliberately)

1. Scale gate + milestone (unchanged; evidence line gains an open-conditions count).
2. **Revenue & profit** — 4 period tiles with delta badges, 31-day bar chart, profit strip. Absorbs the old "30d net retained" + "Paid orders" tiles.
3. **Ads performance** — Spend / CPA / CPC / net-retained ROAS / first-order contribution tiles + evidence detail row (diagnostic, evidence age, Stripe fees, ads net retained, yesterday spend). Absorbs the old footer strip + contribution tile.
4. Cohort funnel (unchanged). 5. Acquisition + measurement checkpoints (unchanged).

Old "Gate issues" tile retires — the count + named reasons live on card 1.

## Tests

- New `business-trends` unit tests (deltas, pacing, fee mix, profit coverage, ledger merge).
- `revenue-dashboard`: 60d horizon must not leak into serviceMix/monetisation; 31-bucket daily.
- `runs` ledger reader: parse tolerance, dedup, null-spend skip. Snapshot clicks tests. Read-model CPC soft-derivation tests.
- `business-dashboard-contract.test.ts` re-pinned: 5 cards, new anchor strings, 7th reader.

## Out of scope

Non-ads operating costs (infra, Parchment, Resend) in profit; per-campaign tables (the daily Telegram brief owns those); any Ads mutation surface; PostHog-derived revenue.
