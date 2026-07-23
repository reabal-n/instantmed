# ROADMAP.md - InstantMed

> **Authority:** the sole source of truth for the current operating phase, ordered active work, status, and checkpoints.
> `docs/BUSINESS_PLAN.md` owns durable strategy. `docs/REVENUE_MODEL.md` owns milestones and economic gates. Implementation plans may elaborate one item but may not redefine this queue.
>
> **Last refreshed:** 2026-07-23. Refresh whenever priority or status changes; perform a deliberate review at least monthly.

---

## 1. Current Operating Phase

**Controlled demand validation.**

Acquisition is in scope for launched services. The current job is to prove repeatable, contribution-positive demand while keeping public truth, clinical safety, queue health, refunds, fulfilment, and support load controlled.

This phase does not authorise new services, subscriptions, weight-loss launch, broad general consults, pharmacy fulfilment, or uncontrolled advertising spend.

## 2. Active Revenue Rung

**Active target:** `$5,000/month` rolling net-retained revenue run-rate within 90 days.

The `$2,000` rung was crossed with 71 real paid orders and `$2,066.30` rolling 30-day net-retained revenue as of 2026-07-22. At the same snapshot, `$29.10` net AOV implies approximately 172 monthly orders for the active `$5,000` rung.

The complete `$2k -> $5k -> $10k` ladder, definitions, contribution formula, and capacity thresholds live only in `docs/REVENUE_MODEL.md`. Live values continue to come from the admin dashboard; the figures above are a dated rung-attainment checkpoint.

## 3. Standing Operator Rhythm

### Immediate alerts

Surface without waiting for the daily brief:

- clinical or patient-safety risk
- payment, refund, prescribing, certificate, or email delivery failure needing action
- formal complaint or privacy risk
- paid-conversion measurement failure that could corrupt bidding

### Daily approval brief

One bounded operator brief should show:

- progress against the active net-retained revenue rung
- Google Ads spend, retained revenue, service-level contribution readiness, and exact proposed mutations
- support issues that need an operator decision; conversations stay in Gmail and are handled manually
- operational issues requiring a decision rather than another dashboard visit

Google Ads mutations and customer replies require operator approval. The implementation workflows live in `docs/OPERATIONS.md`. Gmail remains the source of truth for conversations; the app does not store email bodies or PHI. Automatic Telegram paging for support Inbox mail is retired; paid-request Telegram alerts are a separate operational channel. Thread summaries and reply drafts remain blocked until the OpenAI workspace, DPA, retention, APP 8, and public processor disclosures are explicitly approved for identifiable health-support mail.

### Weekly review

Review channel/service contribution, refund and chargeback trends, queue/support capacity, reactivation evidence, and fresh GSC/authority opportunities.

## 4. Ordered Active Queue

| Rank | Priority | Current status | Success / stop checkpoint |
|------|----------|----------------|---------------------------|
| 1 | **Truth and measurement gate** - reconcile canonical docs; repair public 24/7, automation, and 18+ contradictions; close the batch-review and synthetic-E2E boundaries; correct Google Ads dollar units; make optional-email lifecycle truth explicit and tracking aggregate-only. | **Complete 2026-07-12; communication lifecycle and analytics privacy follow-ups completed 2026-07-19.** The additive truth schema, review-request lifecycle, and partial-recovery candidate RPC are applied and verified. Partial-intake recovery has authoritative policy gates, encrypted bearer-only replay, durable ownership before candidate limits, marker-first terminal suppression, and sent-only reconciliation. PostHog capture is personless and replay-free while Google Ads enhanced conversions remain intact. Live PostHog IP anonymisation is enabled; generic autocapture, console capture, heatmaps, and session recording are disabled. PostHog still reports 84-month, unenforced event retention because that field is vendor-controlled and read-only through the project API; vendor escalation remains open, and public disclosures do not promise a shorter window. | Complete only when each named boundary has implementation plus focused proof. Re-open any closed sub-boundary when production evidence or an operator decision exposes drift. |
| 2 | **Operator brief and support approval surface** - keep the Overview brief actionable, preserve the approval boundary for Ads changes and customer replies, and keep support conversations in Gmail. | **Manual support handling restored 2026-07-14.** Overview shows the milestone, exceptions, and Ads performance. Automatic Gmail polling and support-inbox Telegram paging are retired; support conversations stay in Gmail and are handled manually. The aggregate-only internal diagnostic receiver remains off in production. Identifiable Gmail summaries/drafts remain blocked by the privacy-processor gate. | One calm decision surface, no copied mailbox, no support-email Telegram spam, no PHI in analytics, and no send or Ads mutation without approval. |
| 3 | **External reputation and distribution** - accrue genuine ProductReview evidence, submit selected Australian comparison/directories, and distribute the existing employer verification workflow to HR, payroll, and employment-law publishers. | **Sprint started 2026-07-23.** ProductReview baseline: 2 public reviews against 131 review-request sends (1.5% directional send-to-posted proxy, not attributable conversion). Keep the current request workflow through the mid-August decision checkpoint while the measurable funnel accrues. | Completed submissions/outreach receipts plus attributable traffic/orders; no unsupported review or acceptance claims. |
| 4 | **Prove paid contribution by service** - keep launched services live at low budgets, review performance daily, improve keywords/negatives/assets/sitelinks with approval, and scale only a service that passes the first-order contribution gate. | Live bounded pilots; not approved to scale. | Trusted measurement, positive first-order contribution, stable safety/refund/queue metrics, and operator approval for the exact change. |
| 5 | **Reactivation checkpoint** - assess repeat-Rx refill reminders after three real weekly waves; keep certificate reactivation bounded. | Measurement window open. Default-on email consent (2026-07-17) unblocked send volume for ~87% of patients; restart the three-wave clock from the first post-change wave. | Continue only if delivery and paid reorder conversion justify more work. Stop or rework a near-zero lever. |
| 6 | **Compounding work** - deepen only fresh GSC-proven winners; profile before performance changes; run bounded repository cleanup quarterly. | Evidence-led backlog. | A specific query/page or measured hotspot justifies each session. No broad speculative sweep. |

Work the highest-ranked actionable item. If an item is blocked by a scheduled measurement window, record that checkpoint and move to the next actionable item without changing the ranking.

## 5. Deferred Backlog

- `/blog` vs `/guides` routing cleanup after guide quality and indexing stabilise
- type centralisation and import-boundary enforcement, only as bounded refactors
- optional `/admin/ops` release feed if operational evidence shows it is useful
- category-by-category guide work only when GSC or service strategy selects the page
- read-performance caching or middleware changes only after profiling and a fresh security review

Deferred items are not active merely because an older implementation plan describes them.

## 6. Deliberately Out Of Scope

The durable exclusions live in `docs/BUSINESS_PLAN.md`. During controlled demand validation, do not build or launch:

- subscriptions, memberships, or recurring prescribing
- owned pharmacy, dispensing, delivery, or inventory
- weight-loss paid requests or advertising
- broad general consult intake
- staff-heavy follow-up programs without approved capacity
- conversational AI intake

## 7. Plan And History Rules

- This file is the only active priority queue.
- A new implementation plan must link to one ranked item and inherit its checkpoint.
- Completed or superseded plans move to `docs/plans/archive/` and are not execution instructions.
- Git and pull-request history own shipped history. Do not maintain a parallel release log here.
- Memory may point to this file but must not duplicate its queue or status.

## 8. Refresh Procedure

1. Refresh live metrics from the admin dashboard; do not paste volatile values here.
2. Update status/checkpoint notes without silently reordering priorities.
3. Change the phase or priority order only after an explicit operator decision.
4. Move completed implementation plans to archive and update doc bookkeeping.
5. Bump `Last refreshed:`.
6. Run `corepack pnpm doc:audit` and `git diff --check`.
