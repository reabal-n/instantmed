# ROADMAP.md - InstantMed

> **Authority:** the sole source of truth for the current operating phase, ordered active work, status, and checkpoints.
> `docs/BUSINESS_PLAN.md` owns durable strategy. `docs/REVENUE_MODEL.md` owns milestones and economic gates. Implementation plans may elaborate one item but may not redefine this queue.
>
> **Last refreshed:** 2026-08-18. Refresh whenever priority or status changes; perform a deliberate review at least monthly.

---

## 1. Current Operating Phase

**Controlled demand validation.**

Acquisition is in scope for launched services. The current job is to prove repeatable, contribution-positive demand while keeping public truth, clinical safety, queue health, refunds, fulfilment, and support load controlled.

This phase does not authorise new services, subscriptions, broad general consults, pharmacy fulfilment, or uncontrolled advertising spend. (Weight management launched 2026-08-10 by explicit operator decision (decisions adopted 2026-08-07) — see docs/plans/2026-08-07-weight-loss-launch-plan.md.)

## 2. Active Revenue Rung

**Active target:** `$5,000/month` rolling net-retained revenue run-rate within 90 days.

The `$2,000` rung was crossed with 71 real paid orders and `$2,066.30` rolling 30-day net-retained revenue as of 2026-07-22. At the same snapshot, `$29.10` net AOV implies approximately 172 monthly orders for the active `$5,000` rung.

**Numeric threshold crossed; formal rung remains open.** The closed 30-day window ending 2026-08-14 contained 171 reportable paid orders, `$5,355.50` gross revenue, `$229.55` of refund events, zero dispute events, and `$5,125.95` net-retained revenue. Do not mark the rung achieved yet: the same-window Gmail aggregate returned 12 unique inbound support-address threads (9 Gmail-personal, 3 updates), so even the personal-only proxy is 5.3 contacts per 100 orders against the below-5 target; no message bodies were inspected. The reportable manual clinical cohort also had first-review P95 5.27h against the below-2h target. Revenue volume has arrived before the support and queue controls needed to certify it.

**Immediate control checkpoint:** add deliberate overnight/early-morning review coverage, then remeasure first clinician open on a fresh dated window. Eighteen of 23 two-hour breaches came from 00:00–11:59 Melbourne payments and appeared across repeat Rx, ED, and manual medical certificates; 18:00–23:59 had zero breaches. This is coverage batching, not missing instrumentation or a service-specific code defect. The hourly `stale-queue` control already sends an aggregate Telegram reminder when paid work waits more than 30 minutes, but an alert is not a clinical rota: the owner must assign capable overnight/early-morning coverage before claiming that operational response is continuously staffed. Queue P95 above two hours is a service/daypart capacity warning rather than a blanket portfolio freeze; hold an affected scale change when capable coverage or fulfilment is unavailable. A privacy-safe support-ticket classification still must demonstrate fewer than five contacts per 100 orders before the `$5,000` rung is formally certified.

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
| 3 | **External reputation and distribution** - accrue genuine ProductReview evidence, submit selected Australian comparison/directories, and distribute the existing employer verification workflow to HR, payroll, and employment-law publishers. | **Sprint started 2026-07-23; measurement contract repaired 2026-08-14.** Historical 2026-07-23 baseline: 2 public reviews against 131 review-request sends (1.5% directional send-to-posted proxy, not attributable conversion). The funnel now reconciles every eligible request into confirmed sent, awaiting-run, cooldown, suppression, legacy-unverifiable, or actionable-backlog truth. No review-timing experiment is active: retain 48 hours, investigate actionable confirmed-send coverage first, and keep manually verified external-review totals separate from traversal and self-reported acquisition. | Completed submissions/outreach receipts plus attributable traffic/orders; no unsupported review or acceptance claims. |
| 4 | **Prove and scale paid contribution by service** - review performance daily, cut losing queries/assets, repair weak campaigns, and move capital toward services with verified first-order contribution. | **Fresh closed-window account truth 2026-08-18.** Scripts is enabled at A$60/day with Maximise Conversion Value and tROAS 1.5; its rolling 30 days contain 75 Scripts orders, A$1,194.57 fee-aware contribution, 51.14% margin, and 6.49% refunds. The last material Ads change was 2026-08-18 Sydney time, so another increase waits for the machine-enforced three closed days plus ten attributed post-change orders. Medical certificates are enabled at A$20/day but remain near break-even (24 orders, A$23.29 contribution, 3.41% margin); improve query/copy efficiency before more budget. ED is enabled at A$12/day and is only marginally positive (5 orders, A$7.17 contribution, 2.87% margin). Hair Loss is paused after a A$117.10 rolling loss; its medicine-name paid-destination link is removed in source and must be production-verified before a narrow relaunch. Persisted daily tracking is GREEN. | Trusted measurement, positive first-order contribution, healthy service-specific fulfilment, and operator approval for each exact immutable mutation. Scale winners; cut or repair losers. |
| 5 | **Reactivation checkpoint** - assess repeat-Rx refill reminders after three real weekly waves; observe the active bounded certificate protocol. | Measurement window open. Default-on email consent (2026-07-17) unblocked send volume for ~87% of patients; restart the three-wave clock from the first post-change wave. Certificate protocol volume, manual-route reasons, revocations, refunds, and queue impact remain observation signals, not permission to widen policy. | Continue only if delivery and paid reorder conversion justify more work. Stop or rework a near-zero lever. Any certificate-policy widening requires a separate reviewed code decision. |
| 6 | **Compounding work** - deepen only fresh GSC-proven winners; profile before performance changes; run bounded repository cleanup quarterly. | Evidence-led backlog. | A specific query/page or measured hotspot justifies each session. No broad speculative sweep. |

### Google Ads attribution-hold clearance

An open **Attribution Investigation Hold** blocks scaling for that service even when tracking returns to GREEN. It clears only after the cause is recorded, any required correction is complete, a fresh rolling 30-day reconciliation shows at least 90% expected-service attribution across at least 10 recognised orders, and the Operator records an explicit **Attribution Investigation Resolution**. An unknown cause cannot be cleared. The ordinary seven-consecutive-GREEN-days scaling gate remains separate and still applies afterward.

**Attribution Investigation Resolution — Scripts, 2026-08-15.** Cause: ED and hair-loss requests had bypassed their dedicated pathways through the cheaper repeat-prescription lane. Correction: the dedicated-service hard routing shipped 2026-08-05/06. Fresh closed-window evidence ending 2026-08-14 showed 70 expected Scripts orders out of 72 recognised orders (97.2%), clearing the 90% / 10-order threshold. The Operator resolved the investigation and the code-owned hold was removed. This resolution does not satisfy the separate seven-consecutive-GREEN-days gate and does not authorise a live Ads mutation.

### Organic-only service checkpoints

- **Weight management — 2026-09-09:** recheck Search Console discovery/indexing, landing-page traffic, intake starts, paid orders, clinical suitability, fulfilment, refunds, and queue load after the first 30 organic days. The page and intake path are already linked across the public service surfaces and both canonical URLs are in the sitemap; Google had not discovered them in the 2026-08-14 inspection. Manually request indexing for `/weight-loss` through an authenticated Search Console session when available. This checkpoint does not authorise paid advertising.
- **Women's health — next weekly review:** make an explicit keep/park decision from current demand, clinical maintenance cost, and compliant distribution evidence. Do not silently retire a live clinical pathway or infer a decision from sparse volume.

### Protocol governance and historical auto-issued medical certificates

Raised by the removal of the 24-hour post-approval attestation (#428, 2026-08-04) and the follow-up integrity work (#439/#440). The operator / Medical Director approved the bounded reactivation recorded in `lib/clinical/auto-approval-governance.ts` on 2026-08-12. The active protocol uses pre-issuance routing and does not rely on post-issue batch attestation. Historical retrospective work remains separate.

| # | Decision | Why it is open | Owner |
|---|----------|----------------|-------|
| A | ~~Should any engine **soft flag** become a pre-issuance block?~~ **DECIDED 2026-08-07; enforced in #442 on 2026-08-10:** AI-draft `requiresReview` is a pre-issuance block; the 2026-08-12 active rollout also requires no engine soft flags. #439 surfaced and persisted the signal but did not change eligibility. Keyword co-symptom flags retain `info` display severity but route to a doctor before issue. Any relaxation requires another reviewed code-policy decision. | Operator (done) |
| B | ~~Medical Director decision on the certificate protocol boundary.~~ **DECIDED 2026-08-12:** activate only clean one-to-three-day work, study, and carer requests after 15 minutes, capped at 3 per five minutes / 10 per day, with no soft or attention flags. Return-to-work, Centrelink / Services Australia, fitness or capacity, compensation, and every concerning or uncertain request route to a doctor before issue. The database kill switch may stop but cannot widen this boundary. The repository does not represent separate external legal advice as completed. | Medical Director (done) |
| C | **Retrospective review of the complete historical soft-flagged auto-issued cohort.** | Between the attestation being removed and #442 enforcing the pre-issuance block, a soft-flagged certificate could issue without a durable human review surface. The production lane was aggregate-verified 2026-08-18: fixed cohort 9/9, zero resolved, nine unresolved, and all nine remain structurally ready for review. Review each case in the authenticated Medical Director lane; every open and no-correction receipt is actor-bound and audit-writing. No automated process may infer the clinical outcome. | Medical Director |

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
