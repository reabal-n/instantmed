# ROADMAP.md - InstantMed

> **Authority:** the sole source of truth for the current operating phase, ordered active work, status, and checkpoints.
> `docs/BUSINESS_PLAN.md` owns durable strategy. `docs/REVENUE_MODEL.md` owns milestones and economic gates. Implementation plans may elaborate one item but may not redefine this queue.
>
> **Last refreshed:** 2026-09-08. Refresh whenever priority or status changes; perform a deliberate review at least monthly.

---

## 1. Current Operating Phase

**Controlled demand validation.**

Acquisition is in scope for launched services. The current job is to prove repeatable, contribution-positive demand while keeping public truth, clinical safety, queue health, refunds, fulfilment, and support load controlled.

This phase does not authorise new services, subscriptions, broad general consults, pharmacy fulfilment, or uncontrolled advertising spend. (Weight management launched 2026-08-10 by explicit operator decision (decisions adopted 2026-08-07) — see docs/plans/2026-08-07-weight-loss-launch-plan.md.)

## 2. Active Revenue Rung

**Active target:** `$5,000/month` rolling net-retained revenue run-rate within 90 days.

The `$2,000` rung was crossed with 71 real paid orders and `$2,066.30` rolling 30-day net-retained revenue as of 2026-07-22. At the same snapshot, `$29.10` net AOV implies approximately 172 monthly orders for the active `$5,000` rung.

**Numeric threshold crossed; formal rung remains open.** The closed 30-day window ending 2026-08-14 contained 171 reportable paid orders, `$5,355.50` gross revenue, `$229.55` of refund events, zero dispute events, and `$5,125.95` net-retained revenue. Do not mark the rung achieved yet: the same-window Gmail aggregate returned 12 unique inbound support-address threads (9 Gmail-personal, 3 updates), so even the personal-only proxy is 5.3 contacts per 100 orders against the below-5 target; no message bodies were inspected. The reportable manual clinical cohort also had first-review P95 5.27h against the below-2h target. Revenue volume has arrived before the support and queue controls needed to certify it.

**Owner operating decision — 2026-08-18:** No staffing or rota project is active. Requests may wait for the owner-doctor within the existing public timing language and the internal 24-hour maximum; the owner will decide when workload requires another doctor. Keep measuring queue age and escalate only a patient-safety issue or a breach of that maximum. The current first-review P95 remains evidence to watch, but it does not block the approved acquisition tests. A privacy-safe support-ticket classification still must demonstrate fewer than five contacts per 100 orders before the `$5,000` rung is formally certified. The proposed support-email agent is deferred until the operator reopens it and the existing privacy approval gates are satisfied.

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

Google Ads mutations and customer replies require operator approval. The implementation workflows live in `docs/OPERATIONS.md`. Email support conversations stay in Gmail and are handled manually; the app does not store email bodies or PHI. Automatic Telegram paging for support Inbox mail is retired; paid-request Telegram alerts are a separate operational channel. Thread summaries and reply drafts remain blocked until the OpenAI workspace, DPA, retention, APP 8, and public processor disclosures are explicitly approved for identifiable health-support mail.

### Weekly review

Review channel/service contribution, refund and chargeback trends, queue/support capacity, reactivation evidence, and fresh GSC/authority opportunities.

## 4. Ordered Active Queue

**Operator-selected execution order — 2026-09-06:** confirmed checkout/data/monitoring reliability, then certificate revenue, then the clinical dashboard. Each numbered plan runs in a new session after the preceding build finishes. The dashboard's first priority is concise clinical information: the complete medicine, dose/directions and frequency must be visible together in both review and the prescribing modal. The operator delegates layout details and defers embedded AI, Lena and support-drafting evaluations. This is the execution sequence for the existing ranks, not a new strategy, staffing trigger or commercial approval. See the [reconciled audit](audits/2026-09-04-scaling-audit.md) for the dated evidence and superseded recommendations.

| Session | Plan | Parent rank | Completion boundary |
|---|---|---|---|
| 1 | [Checkout, data and monitoring reliability](superpowers/plans/2026-09-06-01-checkout-data-reliability.md) | 1 | Reproduced checkout repair, safely verified encryption work, truthful monitoring and separate release/production receipts |
| 2 | [Certificate revenue recovery](superpowers/plans/2026-09-06-02-certificate-revenue-recovery.md) | 4 | Fresh diagnosis, one justified intervention or explicit no-build decision, and a measurement handoff |
| 3 | [Concise clinical review and notes](superpowers/plans/2026-09-06-03-concise-clinical-review.md) | 2 | Scannable current request, medicine/dose/frequency visible in the existing modal, clarification accessible, readable notes with preserved saves |
| 4 | [Room to prescribe](superpowers/plans/2026-09-06-04-parchment-prescribing-workspace.md) | 2 | Larger usable Parchment workspace consuming Session 3's summary, with verified mobile and return-state behavior |
| 5 | [Queue and Requests navigation](superpowers/plans/2026-09-06-05-queue-requests-navigation.md) | 2 | Clear rows, consolidated filters/actions and safe return navigation around the released workspace |

**Plan 1 engineering releases through PR #536 are complete, including the Telegram correction and its normal production observation.** Its [execution receipt](superpowers/plans/2026-09-06-01-checkout-data-reliability.md#execution-receipt) owns the release ledger. The [September 8 Plan 2 observation refresh](superpowers/plans/2026-09-06-02-certificate-revenue-recovery.md#plan-1-observations-refreshed-here) found a healthy normal review-request outcome: one sent/stored-delivered and three future cooldowns, zero due; independent Resend verification remains unavailable. Dependable two-hour browser cadence was **not accepted**: four actual scheduled completions had 4–6-hour internal gaps and an 8h07m boundary gap. The six-hour observer threshold does not prove two-hour execution. The historical critical incident remains acknowledged without repeat delivery, not clinically resolved.

**Plan 2 remains active — September 8: certificate investigation complete; exact keyword repair awaiting approval.** Certificates stayed at 24 completed-week orders and retained revenue rose A$14.95, supporting no certificate build or commercial change. The operator rejected the Scripts/Hair campaign pause and directed profitable specialty acquisition repair with campaigns kept live. [ADS-20260908-03](superpowers/receipts/2026-09-08-specialty-acquisition-repair.md) pauses only two unproductive Hair/ED phrase criteria; Google validate-only and independent review passed. Women's stays unchanged after a positive contribution diagnosis. The [Plan 2 handoff](superpowers/plans/2026-09-06-02-certificate-revenue-recovery.md#execution-receipt) owns evidence, browser limitations and release state. Exact approval and governed documentation release remain open; no Ads change is applied or sent. **Plans 3–5 remain unstarted.** No new reminder or scheduler was created.

### Sequential build session protocol

1. Start by reading this queue, the selected plan, its canonical satellite docs and the preceding execution receipt. Verify current branch/deployment and outstanding incidents; do not inherit a stale green status or implement a plan already completed elsewhere. The planning commit/PR must be available in the selected checkout before building.
2. Work one numbered plan per session. Use Astra for code investigation, bounded implementation, independent review, aggregate analysis and seeded browser QA. Provider benchmarks are capability evidence, not acceptance criteria. Choosing Astra in Codex does not change InstantMed's application model, support processing or voice scope.
3. Keep changes reviewable. Refactor only a demonstrated responsibility boundary needed by the task. Session 1 permits separate PRs for checkout, encryption and monitoring; each needs its own proof. Preserve stack pins, safety/identity rules, patient isolation, exact-current-payment guards and durable prescription completion.
4. Use Node 24 and corepack pnpm 10.23.0. Run meaningful focused tests, applicable isolated database checks, lint/typecheck, browser proof and the required release gates. UI acceptance covers laptop/mobile, light/dark, keyboard, long/missing content and failure/recovery states. Give the operator a small seeded visual comparison set for dashboard changes.
5. Open draft PRs, resolve independent review findings, then follow the main-branch governance and exact-head required CI rules before merge. No bypass or production promotion from local proof alone. Keep source, local tests, CI, provider proof, production deployment and visual/operator acceptance distinct.
6. Record the tested head, PR/merge SHA, ready production deployment, post-deploy smoke, relevant browser/operational proof, rollback scope and unresolved observations in that plan's execution receipt. Delete only merged branches/worktrees. Update this queue's status/checkpoint without maintaining a second release ledger.
7. A build is finished when its implementation/release checks are complete and outstanding measurement is explicitly handed off. If required production data work, authorization or provider setup remains blocked, do not mark that plan complete; the operator decides whether to proceed with the documented exception. A growth investigation may conclude no build is justified, with evidence and a next sample/date.
8. End with the next plan's path and ready-to-use prompt. Do not automatically create or start the next task, schedule wakeups or begin a sixth build. The operator opens each new session after reviewing the preceding handoff.

**Separate operator/evidence work:** the nine historical retrospective cases remain Medical Director-owned; no agent supplies their clinical outcomes. The March superseded certificate remains unchanged and unsent. The two April Ads discrepancies remain historical reporting uncertainty. Preserve current Scripts and specialty gates and deferred outreach. These items must not be silently treated as completed code work.

**Astra scope:** use the capabilities described in the [official release](https://openai.com/index/gpt-6-astra/) for engineering/browser/analysis work in these sessions, judged by repository and production evidence. Embedded support, Lena expansion/activation and clinical-model comparisons stay deferred. Any later evaluation starts with synthetic or approved deidentified cases and the existing processor, privacy, clinical and cost gates; no automatic model switch or customer messaging.

| Rank | Priority | Current status | Success / stop checkpoint |
|------|----------|----------------|---------------------------|
| 1 | **Truth and measurement gate** - reconcile canonical docs; repair public 24/7, automation, and 18+ contradictions; close the batch-review and synthetic-E2E boundaries; correct Google Ads dollar units; make optional-email lifecycle truth explicit and tracking aggregate-only. | **Clinical protocol reactivated 2026-08-12:** clean, unflagged one-to-three-day work, study, and carer certificates may issue under a code-owned Medical Director-approved protocol after 15 minutes, capped at 3 per five minutes and 10 per day. Concerning, uncertain, unsupported-purpose, and flagged requests route to a doctor before issue. The database flag may stop but cannot widen the lane. The exact-flow conversion repair from 2026-07-29 remains in force. | Complete only when each named boundary has implementation plus focused proof. Re-open any closed sub-boundary when production evidence or an operator decision exposes drift. |
| 2 | **Role-owned staff decision surfaces** - keep each staff route focused on one job, preserve approval boundaries for Ads changes and customer replies, and keep support conversations in Gmail. | **Staff surface rehaul completed 2026-07-29; Lena production release in progress 2026-08-28.** Dashboard owns live clinical work; Business owns revenue and acquisition; Operations owns unresolved action groups; the admin-only Voice inbox owns confirmed Medical Director messages; Ledger owns source-record search; Patients owns the directory; Setup owns configuration. Automatic Gmail polling and support-inbox Telegram paging remain retired. Lena remains default-OFF until the additive migration, deployed routes, provider environment, Twilio routing, and controlled-call proof are complete. | One calm decision surface per route; no copied mailbox, support-email Telegram spam, voice audio/full-transcript store, unauthenticated patient disclosure, AI clinical action, PHI in Telegram/analytics, hidden clinical actions on mobile, or send/Ads mutation without approval. |
| 3 | **External reputation and distribution** - accrue genuine ProductReview evidence, submit selected Australian comparison/directories, and distribute the existing employer verification workflow to HR, payroll, and employment-law publishers. | **Sprint started 2026-07-23; delivery verified 2026-08-19.** Historical 2026-07-23 baseline: 2 public reviews against 131 review-request sends (1.5% directional send-to-posted proxy, not attributable conversion). The live 30-day receipt at 2026-08-19 showed 176 eligible requests: 148 confirmed sent and delivered, 6 awaiting the next run, 18 cooldown-deferred, 4 policy-suppressed, and 0 actionable backlog. The actual Sydney send run is now outcome-heartbeated and watchdog-monitored. Delivery coverage is no longer the active defect; retain the neutral 48-hour ask and keep manually verified external-review totals separate from traversal and self-reported acquisition. | Completed submissions/outreach receipts plus attributable traffic/orders; no unsupported review or acceptance claims. |
| 4 | **Prove and scale paid contribution by service** - review performance daily, cut losing queries/assets, repair weak campaigns, and move capital toward services with verified first-order contribution. | **September 8:** certificate no-build decision. The approved 2026-09-03 Scripts step from A$79/day to A$95/day was applied and read back; four closed days and 16 attributed orders meet the sample gate, but P95 9.221h and 11/107 refunds (10.28%) block further scale. Hair has one recognized order and −A$178.98 current30 contribution, beyond its A$150 loss cap. The operator rejected the exact Scripts/Hair pause and selected repair while campaigns remain enabled at their current budgets. Investigate actual keyword, ad-group and cash-order economics for ED, Hair and Women's Health; prepare the smallest exact repair. Women's remains A$20/day and has not met its 20-recognized-order / 90% purity graduation gates. H1/E1 stay rendered and H2/E2 held; any approved acquisition repair must record the affected product window as confounded from the actual apply time. [Plan 2](superpowers/plans/2026-09-06-02-certificate-revenue-recovery.md#checkpoints-and-separate-commercial-packet) owns packet and observation state. | Trusted measurement, positive first-order contribution, healthy service-specific fulfilment, and operator approval for each exact immutable mutation. Scale winners at the maximum economics-authorised step; cut or repair losers. |
| 5 | **Reactivation checkpoint** - assess repeat-Rx refill reminders after three real weekly waves; observe the active bounded certificate protocol. | Measurement window open. Default-on email consent (2026-07-17) unblocked send volume for ~87% of patients; restart the three-wave clock from the first post-change wave. Certificate protocol volume, manual-route reasons, revocations, refunds, and queue impact remain observation signals, not permission to widen policy. | Continue only if delivery and paid reorder conversion justify more work. Stop or rework a near-zero lever. Any certificate-policy widening requires a separate reviewed code decision. |
| 6 | **Compounding work** - deepen only fresh GSC-proven winners; profile before performance changes; run bounded repository cleanup quarterly. | Evidence-led backlog. **2026-08-24:** free-channel compounding + repeat-Rx conversion execution plan adopted (`docs/plans/2026-08-24-free-channel-compounding-and-repeat-rx-conversion.md`); AI Attribution Expansion Gate recorded cleared (41 AI-attributed paid orders, closed 30-day window). **2026-08-25:** all three plan items shipped: PR #493 repeat-Rx medication-step mobile repair (52.0% mobile-completion baseline recorded in the plan addendum), PR #494 `/medical-certificate-online` verification section, and PR #496 the bounded `/prescriptions` answer-density session. Their measurement windows are open. **2026-08-28:** the paced search-truth, external-authority, and winner-only revenue loop was documented in `docs/superpowers/plans/2026-08-28-organic-authority-revenue-compounding.md`; it inherits ranks 1, 3, and 6 and makes no queue reorder. | A specific query/page or measured hotspot justifies each session. No broad speculative sweep. |

### Growth operating gate — adopted 2026-09-05

Two hours remains the clinical-queue operating target; a trailing-seven-day manual-review P95 above two but below six hours is advisory watch, stays visible, and does not suppress an otherwise valid operator-approval scale proposal or cancel already-approved bounded acquisition. New campaigns, bid/budget increases, and next product variables require a valid queue read with P95 below six hours, zero 24-hour breaches, and trusted economics. Hard evidence of harm still wins: P95 at or above six hours, oldest unreviewed at 20 hours, a 24-hour breach, clinical incident, fulfilment failure, explicit service hold, fresh verified support above 5 per 100 paid orders, or fresh completed QA behind produces an approval-ready pause proposal. Missing or stale optional support, completed-QA, incident, service-hold, or fulfilment inputs do not manufacture harm or freeze an otherwise evidence-backed proposal; missing or invalid queue evidence remains unavailable and blocks the next variable. Every outcome remains proposal-only and requires the exact operator approval; no state changes Ads autonomously.

ED E1 remains open under its predeclared window. Its earliest settled close is `2026-09-19T05:13:53.870Z`; no ED E2 presentation or registry change is authorised before the PHI-free retained-order, clinical, fulfilment, and settlement receipt is complete.

**Case-specific operator decision — September 8:** the operator declined the proposed Scripts/Hair campaign pauses and requested ED, Hair and Women's Health profitability repairs while campaigns remain live. Record the breached metrics and the rejection; do not repeatedly present the same pause as an outstanding approval. This selects repair at existing budgets, not a budget increase, pilot graduation or removal of clinical/fulfilment safeguards. Exact new Ads operations still require the immutable approval workflow. If an approved repair changes Hair/ED acquisition before the product window closes, preserve the original dates and assignments but record the actual cutoff and confounding; do not claim clean H1/E1 causal lift or activate H2/E2 from that mixed cohort.

### Service SEO priority checkpoint — 2026-09-05

The operator selected **medical certificates, repeat prescriptions, ED, hair loss, and women's health (UTI and new/switch pill)** for the next organic-search and AI-referral work package. Service fit and qualified paid demand select the work; high-click antibiotics-access or unrelated medicine articles do not. This refines ranks 3 and 6 without changing the overall queue. All five service families receive discovery and intent research, including specialties with little historical search volume; further page investment still needs evidence and must respect active experiments.

The [service SEO priorities plan](superpowers/plans/2026-09-05-service-seo-priorities.md) delivered its bounded on-site batch in merged PR #518; the current production release includes it. The nine-page query/link inventory and five service briefs are complete, and public robots/representative assets passed crawl checks. Both prescription pages passed authenticated Search Console Live Tests on 5 September; `/prescriptions` was submitted and the existing `/online-prescriptions` request was confirmed. **September 8 read-back:** six of nine service pages indexed; both prescription URLs and the UTI child still discovered/not indexed with no crawl. All nine remain HTTP 200, self-canonical, index-follow and in the sitemap. No resubmission; recheck September 12 and 19. The public change clarified only the UTI and new/switch pill child-page assessment summaries/process wording. Certificate/prescription windows and ED/Hair cohorts remain intact, with material changes held to their gates. External visibility remains deferred. Plan 2's no-build decision does not establish a copy uplift or indexing success.

### Google Ads attribution-hold clearance

An open **Attribution Investigation Hold** blocks scaling for that service even when tracking returns to GREEN. It clears only after the cause is recorded, any required correction is complete, a fresh rolling 30-day reconciliation shows at least 90% expected-service attribution across at least 10 recognised orders, and the Operator records an explicit **Attribution Investigation Resolution**. An unknown cause cannot be cleared. The ordinary seven-consecutive-GREEN-days scaling gate remains separate and still applies afterward.

**Attribution Investigation Resolution — Scripts, 2026-08-15.** Cause: ED and hair-loss requests had bypassed their dedicated pathways through the cheaper repeat-prescription lane. Correction: the dedicated-service hard routing shipped 2026-08-05/06. Fresh closed-window evidence ending 2026-08-14 showed 70 expected Scripts orders out of 72 recognised orders (97.2%), clearing the 90% / 10-order threshold. The Operator resolved the investigation and the code-owned hold was removed. This resolution does not satisfy the separate seven-consecutive-GREEN-days gate and does not authorise a live Ads mutation.

### Scheduled service checkpoints

- **Weight management — 2026-09-09:** not yet due at the September 8 read; recheck landing traffic, starts, paid orders, clinical suitability, fulfilment, refunds and queue load. The main `/weight-loss` page is now indexed (stored August 21 crawl); `/weight-loss-online` remains discovered/not indexed. Preserve separate request/indexing evidence; do not repeat an indexing submission from this checkpoint. This checkpoint does not authorise paid advertising.
- **Hair-loss paid pilot — 2026-09-11 readout retained:** one recognized campaign order now exists, but September 8's −A$178.98 current30 contribution crosses the A$150 loss cap. The rule required us to produce the exact campaign-status pause proposal for operator approval; ADS-20260908-02 passed validate-only and was then **rejected**. The operator selected acquisition repair with the campaign kept live at A$10/day. Read back any exact approved repair and its paid contribution on September 11; retain the loss-cap breach as evidence, without treating continued observation as graduation. The Ads Agent must not apply the pause autonomously; no H2 activation or rebuilt campaign is authorized.
- **Women's health paid pilot — live 2026-08-18:** campaign `24144825264` remains observed enabled at A$20/day with a A$3 maximum CPC and its existing scoped intent. September 8 current30 evidence is **13 recognized orders, 11 expected-service (84.6% purity)**. It has not graduated: require **at least 20 recognised orders**, ≥20% contribution margin, <10% refunds, ≥90% expected-service attribution and canonical tracking/operational gates. Historical launch and exclusion-repair receipts remain in the dated audit; no new variable is authorized.
- **Search reinspection — 2026-09-12 and 2026-09-19:** bounded stored-index read for the two prescription pages and UTI child; preserve September 5's existing Live Test/request receipts and do not resubmit daily.
- **Certificate revenue — 2026-09-15:** compare completed September 8–14 Sydney with September 1–7 using canonical cash, paid contribution/source mix and equal 24-hour exact-flow observation. This is the next sample, not an uplift deadline or new commercial gate.
- **Existing copy windows — 2026-09-24 and 2026-10-24 Sydney:** certificate first close September 23 `16:14:42.297Z`, second October 23 `16:14:42.297Z`; prescription first close September 23 `17:03:12.673Z`, second October 23 `17:03:12.673Z`. Use exact production-ready cohorts and the original two-window free-channel rules in [Plan 2](superpowers/plans/2026-09-06-02-certificate-revenue-recovery.md#existing-release-and-measurement-boundaries); no second copy session now.
- **Refill first post-consent wave — 2026-09-27 09:00:39.097 AEST:** its full 21-day boundary is September 26 `23:00:39.097Z`. Current evidence is five immature post-consent sends, two old pre-consent sends, all delivered, zero clicks/paid reorders and zero qualifying mature waves. Keep the three fully mature weekly waves each ≥10% strict UTM conversion plus outcome guardrails; no new nudge or retained-cash inference from the gross-paid funnel.

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
