# ROADMAP.md - InstantMed

> **Authority:** the sole source of truth for the current operating phase, ordered active work, status, and checkpoints.
> `docs/BUSINESS_PLAN.md` owns durable strategy. `docs/REVENUE_MODEL.md` owns milestones and economic gates. Implementation plans may elaborate one item but may not redefine this queue.
>
> **Last refreshed:** 2026-07-13. Refresh whenever priority or status changes; perform a deliberate review at least monthly.

---

## 1. Current Operating Phase

**Controlled demand validation.**

Acquisition is in scope for launched services. The current job is to prove repeatable, contribution-positive demand while keeping public truth, clinical safety, queue health, refunds, fulfilment, and support load controlled.

This phase does not authorise new services, subscriptions, weight-loss launch, broad general consults, pharmacy fulfilment, or uncontrolled advertising spend.

## 2. Active Revenue Rung

**Target:** `$2,000/month` rolling net-retained revenue run-rate within 30 days.

The complete `$2k -> $5k -> $10k` ladder, definitions, contribution formula, and hiring thresholds live only in `docs/REVENUE_MODEL.md`. Current values come from the admin dashboard, not this document.

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
- support Inbox unread counts through the active aggregate-only Telegram bridge
- operational issues requiring a decision rather than another dashboard visit

Google Ads mutations and customer replies require operator approval. The implementation workflows live in `docs/OPERATIONS.md`. Gmail remains the source of truth for conversations; the app does not store email bodies or PHI. Thread summaries and reply drafts remain blocked until the OpenAI workspace, DPA, retention, APP 8, and public processor disclosures are explicitly approved for identifiable health-support mail.

### Weekly review

Review channel/service contribution, refund and chargeback trends, queue/support capacity, reactivation evidence, and fresh GSC/authority opportunities.

## 4. Ordered Active Queue

| Rank | Priority | Current status | Success / stop checkpoint |
|------|----------|----------------|---------------------------|
| 1 | **Truth and measurement gate** - reconcile canonical docs; repair public 24/7, automation, and 18+ contradictions; close the batch-review and synthetic-E2E boundaries; correct Google Ads dollar units; make review-email consent fail closed and tracking aggregate-only. | **Complete 2026-07-12.** Canon ownership and public eligibility/protocol language are contract-guarded; Ads dollar semantics are corrected; the doctor batch-review queue is reconciled; paid E2E fixtures use deterministic excluded identities; review email requires an explicit readable opt-in row; review redirect tracking is aggregate-only. | Complete only when each named boundary has implementation plus focused proof. Re-open any closed sub-boundary when production evidence or an operator decision exposes drift. |
| 2 | **Operator brief and support approval surface** - keep the Overview brief actionable, route aggregate support counts to Telegram, and preserve the approval boundary for Ads changes and customer replies. | **Count-only bridge active and backend-owned.** Overview shows the milestone, exceptions, and Ads performance; the hourly Vercel cron reads only Gmail's aggregate `INBOX.threadsUnread` counter and pages Telegram only for a positive count. The local Codex mailbox schedule is retired. Identifiable Gmail summaries/drafts remain blocked by the privacy-processor gate. | One calm decision surface, aggregate-only alerts, no copied mailbox, no PHI in analytics, and no send or Ads mutation without approval. |
| 3 | **External reputation and distribution** - accrue genuine ProductReview evidence, submit selected Australian comparison/directories, and distribute the existing employer verification workflow to HR, payroll, and employment-law publishers. | Operator distribution sprint pending. | Completed submissions/outreach receipts plus attributable traffic/orders; no unsupported review or acceptance claims. |
| 4 | **Prove paid contribution by service** - keep launched services live at low budgets, review performance daily, improve keywords/negatives/assets/sitelinks with approval, and scale only a service that passes the first-order contribution gate. | Live bounded pilots; not approved to scale. | Explicit labour rates, trusted measurement, positive first-order contribution, stable safety/refund/queue metrics, and operator approval for the exact change. |
| 5 | **Reactivation checkpoint** - assess repeat-Rx refill reminders after three real weekly waves; keep certificate reactivation bounded. | Measurement window open. | Continue only if delivery and paid reorder conversion justify more work. Stop or rework a near-zero lever. |
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
