# ROADMAP.md - InstantMed

> **Authority:** the sole source of truth for the current operating phase, ordered active work, status, and checkpoints.
> `docs/BUSINESS_PLAN.md` owns durable strategy. `docs/REVENUE_MODEL.md` owns milestones and economic gates. Implementation plans may elaborate one item but may not redefine this queue.
>
> **Last refreshed:** 2026-08-11. Refresh whenever priority or status changes; perform a deliberate review at least monthly.

---

## 1. Current Operating Phase

**Controlled demand validation.**

Acquisition is in scope for launched services. The current job is to prove repeatable, contribution-positive demand while keeping public truth, clinical safety, queue health, refunds, fulfilment, and support load controlled.

This phase does not authorise new services, subscriptions, broad general consults, pharmacy fulfilment, or uncontrolled advertising spend. (Weight management launched 2026-08-10 by explicit operator decision (decisions adopted 2026-08-07) — see docs/plans/2026-08-07-weight-loss-launch-plan.md.)

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

Google Ads mutations and customer replies require operator approval. The implementation workflows live in `docs/OPERATIONS.md`. Support conversations stay in Gmail and are handled manually; the app does not store email bodies or PHI. Automatic Telegram paging for support Inbox mail is retired; paid-request Telegram alerts are a separate operational channel. Thread summaries and reply drafts remain blocked until the OpenAI workspace, DPA, retention, APP 8, and public processor disclosures are explicitly approved for identifiable health-support mail.

### Weekly review

Review channel/service contribution, refund and chargeback trends, queue/support capacity, reactivation evidence, and fresh GSC/authority opportunities.

## 4. Ordered Active Queue

| Rank | Priority | Current status | Success / stop checkpoint |
|------|----------|----------------|---------------------------|
| 1 | **Truth and measurement gate** - reconcile canonical docs; repair public 24/7, automation, and 18+ contradictions; close the batch-review and synthetic-E2E boundaries; correct Google Ads dollar units; make optional-email lifecycle truth explicit and tracking aggregate-only. | **Clinical protocol reactivated 2026-08-12:** clean, unflagged one-to-three-day work, study, and carer certificates may issue under a code-owned Medical Director-approved protocol after 15 minutes, capped at 3 per five minutes and 10 per day. Concerning, uncertain, unsupported-purpose, and flagged requests route to a doctor before issue. The database flag may stop but cannot widen the lane. The exact-flow conversion repair from 2026-07-29 remains in force. | Complete only when each named boundary has implementation plus focused proof. Re-open any closed sub-boundary when production evidence or an operator decision exposes drift. |
| 2 | **Role-owned staff decision surfaces** - keep each staff route focused on one job, preserve approval boundaries for Ads changes and customer replies, and keep support conversations in Gmail. | **Staff surface rehaul completed 2026-07-29.** Dashboard owns live clinical work; Business owns revenue, contribution, canonical conversion, acquisition, and measurement checkpoints; Operations shows unresolved action groups or one all-clear state; Ledger is server-filtered source-record search with a masked support projection; Patients is a compact directory; Setup owns configuration. Mobile clinical review stays on the same request page, including full-height Parchment handoff and a disabled `Complete request` control until durable issuance confirmation. Automatic Gmail polling and support-inbox Telegram paging remain retired. | One calm decision surface per route; no copied mailbox, support-email Telegram spam, PHI in analytics, hidden clinical actions on mobile, or send/Ads mutation without approval. |
| 3 | **External reputation and distribution** - accrue genuine ProductReview evidence, submit selected Australian comparison/directories, and distribute the existing employer verification workflow to HR, payroll, and employment-law publishers. | **Sprint started 2026-07-23.** ProductReview baseline: 2 public reviews against 131 review-request sends (1.5% directional send-to-posted proxy, not attributable conversion). Business preserves the review-request funnel and manually recorded external-review total as a separate measurement checkpoint through the mid-August decision date; self-reported acquisition remains a separate instrument from recorded attribution. | Completed submissions/outreach receipts plus attributable traffic/orders; no unsupported review or acceptance claims. |
| 4 | **Prove paid contribution by service** - keep launched services live at low budgets, review performance daily, improve keywords/negatives/assets/sitelinks with approval, and scale only a service that passes the first-order contribution gate. | **Daily manager active in read-only shadow as of 2026-07-31.** The permanent 09:15 Sydney heartbeat owns closed-day Telegram verification and revenue recommendations, with a Monday deep audit of queries, keyword cohorts, creative/assets, device/daypart/location performance, access, policy, and change history. The operator CLI can now bind a restricted JSON packet to a fresh account baseline, validate it, and send the validated immutable card to Telegram. Live mutation and Telegram approval flags remain off until the seven-day proof and exact-packet gate pass. | Trusted measurement, positive first-order contribution, stable safety/refund/queue metrics, and operator approval for the exact change. |
| 5 | **Reactivation checkpoint** - assess repeat-Rx refill reminders after three real weekly waves; observe the active bounded certificate protocol. | Measurement window open. Default-on email consent (2026-07-17) unblocked send volume for ~87% of patients; restart the three-wave clock from the first post-change wave. Certificate protocol volume, manual-route reasons, revocations, refunds, and queue impact remain observation signals, not permission to widen policy. | Continue only if delivery and paid reorder conversion justify more work. Stop or rework a near-zero lever. Any certificate-policy widening requires a separate reviewed code decision. |
| 6 | **Compounding work** - deepen only fresh GSC-proven winners; profile before performance changes; run bounded repository cleanup quarterly. | Evidence-led backlog. | A specific query/page or measured hotspot justifies each session. No broad speculative sweep. |

### Google Ads attribution-hold clearance

An open **Attribution Investigation Hold** blocks scaling for that service even when tracking returns to GREEN. It clears only after the cause is recorded, any required correction is complete, a fresh rolling 30-day reconciliation shows at least 90% expected-service attribution across at least 10 recognised orders, and the Operator records an explicit **Attribution Investigation Resolution**. An unknown cause cannot be cleared. The ordinary seven-consecutive-GREEN-days scaling gate remains separate and still applies afterward.

### Protocol governance and historical auto-issued medical certificates

Raised by the removal of the 24-hour post-approval attestation (#428, 2026-08-04) and the follow-up integrity work (#439/#440). The operator / Medical Director approved the bounded reactivation recorded in `lib/clinical/auto-approval-governance.ts` on 2026-08-12. The active protocol uses pre-issuance routing and does not rely on post-issue batch attestation. Historical retrospective work remains separate.

| # | Decision | Why it is open | Owner |
|---|----------|----------------|-------|
| A | ~~Should any engine **soft flag** become a pre-issuance block?~~ **DECIDED:** AI-draft `requiresReview` was promoted on 2026-08-07; the 2026-08-12 active rollout also requires no engine soft flags. Keyword co-symptom flags retain `info` display severity but route to a doctor before issue. Any relaxation requires another reviewed code-policy decision. | Operator (done) |
| B | ~~Medical Director decision on the certificate protocol boundary.~~ **DECIDED 2026-08-12:** activate only clean one-to-three-day work, study, and carer requests after 15 minutes, capped at 3 per five minutes / 10 per day, with no soft or attention flags. Return-to-work, Centrelink / Services Australia, fitness or capacity, compensation, and every concerning or uncertain request route to a doctor before issue. The database kill switch may stop but cannot widen this boundary. The repository does not represent separate external legal advice as completed. | Medical Director (done) |
| C | **Retrospective review of soft-flagged certificates issued since #428 merged** (2026-08-07 03:01 UTC). | Between the attestation being removed and soft flags being surfaced, any soft-flagged certificate had no human review surface at all. Certificates issued before #440 also have no persisted `risk_flags`, so they cannot be found through the dashboard — they need an `ai_audit_log` query on `metadata->softFlags`. **Sized 2026-08-07: exactly 8 intakes (May 26 – Aug 5), all draft-lane, 3 of 8 batch-reviewed under the old regime, all 8 still standing approved, zero since #428 merged.** Ten minutes in the ledger. | Operator |

Work the highest-ranked actionable item. If an item is blocked by a scheduled measurement window, record that checkpoint and move to the next actionable item without changing the ranking.

## 5. Deferred Backlog

- `/blog` vs `/guides` routing cleanup after guide quality and indexing stabilise
- type centralisation and import-boundary enforcement, only as bounded refactors
- optional `/admin/ops` release feed if operational evidence shows it is useful
- category-by-category guide work only when GSC or service strategy selects the page
- read-performance caching or middleware changes only after profiling and a fresh security review
- prospective per-engine AI attribution only after the **AI Attribution Expansion Gate** is met: at least 10 reportable AI-attributed paid orders in a closed 30-day window, or a concrete acquisition decision that cannot be made without separating named assistant traffic from Direct. Until then, only current classifier correctness, referrer privacy, source-document truth, and migration replay-safety repairs are active work

Deferred items are not active merely because an older implementation plan describes them.

## 6. Deliberately Out Of Scope

The durable exclusions live in `docs/BUSINESS_PLAN.md`. During controlled demand validation, do not build or launch:

- subscriptions, memberships, or recurring prescribing
- owned pharmacy, dispensing, delivery, or inventory
- weight-management paid ADVERTISING (the service itself launched 2026-08-10; ads remain gated)
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
