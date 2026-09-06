# Comprehensive review and scaling audit — 4 September 2026

> **Reconciled 6 September 2026.** The original September 4 summary and action list are superseded by this review. Original text remains in Git history. The dated September 5 investigation below remains evidence for its stated windows, not a current execution queue.
>
> **Authority:** [ROADMAP](../ROADMAP.md) owns the operator-selected session order; [REVENUE_MODEL](../REVENUE_MODEL.md) owns economics, staffing and scaling gates. This audit neither authorizes patient sends/data repairs nor creates additional Ads approvals.

## Current verdict

The original audit contained useful observations but became contradictory as fixes shipped and later evidence corrected its explanations. Its 75/100 score and $12k-in-six-weeks forecast were judgments, not validated business outcomes. Do not use them as release or investment gates.

The completed week ending September 4 retained **$1,901.65 versus $2,625.35**, down **$723.70 / 27.6%**. Certificates explained **62.8%** of that decrease. This is the corrected dated cash-ledger result; it does not establish that every subsequent week has the same cause. The aggregate evidence and source/coverage limitations remain below.

## Verified status at the 6 September review

Production, code, GitHub, Supabase, PostHog and Vercel checks were performed around **14:35–14:42 Sydney**. No clinical content, patient identifiers or raw correspondence is included. Sentry issue statuses were not freshly rechecked in this pass.

| Work | Current evidence | Disposition |
|---|---|---|
| Dependency floor, medication-entry simplification, hosted-payment/delivery hardening, refill monitoring/reporting | Shipped across #513/#516; current source contains the fflate floor and monitored refill cron. This is release evidence, not a fresh registry-wide vulnerability scan. | Do not reimplement from the old checklist |
| Prescribing completion/recovery, note preservation, transient flags, pending-email and missing-record alerts | #519–#523 merged; production `56adfcc8be76508aa0299ea85611e83b094b1dc9` is READY, exact main CI and post-deploy smoke passed | Preserve these guards through the dashboard work |
| Restored-draft checkout | Sep6 12:18 Sydney repeat-prescription `persistence` failure followed by abandonment; linked request was cancelled/failed/unpaid with an existing session; no later paid result observed through review | Reproduce the exact branch before repair; cancelled-state correlation is a lead, not root-cause proof |
| Profile encryption backlog | 417 DOB, 278 phone and 18 Medicare fields lacked encrypted copies among reportable profiles; counts overlap. Four new profiles checked had expected encrypted fields | Harden existing backfill key compatibility, conditional writes and error privacy before an authorized production apply |
| Clinical retrospective | Fixed cohort 9, resolved 0, unresolved 9 | Medical Director review, separate from agent build completion |
| Scheduled email/refill health | Zero overdue pending emails; refill heartbeat healthy; five delivered reminder sends, zero attributed or same-patient paid reorders, cohort immature | Measure paid outcomes; do not add another nudge |
| Browser synthetic | Workflow requests five-minute cadence; actual completed runs remain hours apart | Add independent freshness evidence and an attainable execution/detection contract |
| Operational signal quality | Sentry critical/warning dispatch emits each run; Telegram has separate cooldown. One post-release flag-cache transport error remained; PostHog heartbeat failure subsequently recovered | Preserve healthy metrics and surface new/worse incidents; investigate recurrence without a speculative retry layer |
| Ads adjustment health | Unknown outcomes, irreversible zeros, stale claims and expired reservations all zero; historical counters 5/5/1; two expired April targets remain | Up to $39.90 historical reporting uncertainty; no current cash-leak claim or fabricated resolution |
| March certificate | Superseded original and historical send evidence; retired regeneration path explains missing successor | Leave unchanged and unsent, per operator direction; no automatic restore |

The backfill script source review additionally found that a local new-ciphertext round trip does not prove production key compatibility, writes currently lack a source-snapshot guard, and errors include profile IDs. The reliability plan includes proving and correcting those conditions before running the historical repair.

## Recommendations retired or corrected

- The former mandatory second-doctor triggers at 90 weekly orders/$4k monthly Ads spend are superseded by REVENUE_MODEL's owner-capacity policy. Revenue triggers a capacity review; the canonical sustained-prescription-demand rule owns automatic added coverage.
- A fixed weekly +20% Scripts step is not current policy. Require fresh earned-tier economics, three closed post-change days **and** ten attributed orders, tracking/attribution/operating gates and exact operator approval.
- The proposed manual Scripts device/time bid modifiers do not apply to Target ROAS. Google's [Target ROAS guidance](https://support.google.com/google-ads/answer/6268637?hl=en) says ordinary adjustments are ignored; ad-schedule eligibility remains a separate question.
- Certificate budget starvation was an unproven explanation. The later complete campaign join showed lower paid efficiency despite similar clicks; qualified demand and conversion must be examined before more spend. A broad form redesign is not established by the tracked progression data.
- Microsoft Ads, broad outreach, a second reminder and automatic clinical-model changes are not active implementation work. The operator deferred embedded AI/support/Lena evaluations on September 6.
- The original resend instructions are withdrawn. Historical document validity, delivery proof and clinical review are distinct; no certificate or patient email is automatically changed by audit reconciliation.

## Active plans and retained checkpoints

The [five-session sequence and release protocol](../ROADMAP.md#4-ordered-active-queue) now reconcile this audit with the supplied Astra capability review and dashboard proposal. Reliability precedes certificate revenue; three dashboard builds then address concise clinical review, usable Parchment space and queue/Requests navigation. The first dashboard build exposes medicine, dose and frequency in the current modal immediately.

Use Astra for source investigation, bounded coding, independent review, aggregate analysis and browser verification. The [official release](https://openai.com/index/gpt-6-astra/) describes capabilities; its benchmarks do not certify InstantMed behavior or revenue uplift. Existing application clinical and voice model configuration remains unchanged.

Keep the Sep9 weight, Sep11 hair, Women's health graduation and Sep19 earliest settled ED checkpoints in ROADMAP. Commercial observation runs alongside independent internal UI builds; due reads must not wait until all five builds finish. The nine historical clinician reviews and March certificate disposition stay outside automated build outcomes.

## Historical evidence: 5 September

The following sections retain their original dates and windows. Their release-status wording and relative phrases such as “not yet three days” describe the observation time, not today's outstanding work. Use the reconciled status above and ROADMAP for execution.

## 2026-09-05 revenue leak investigation

Fresh aggregate reads on 5 September, 18:20–19:08 Sydney time. This section supersedes earlier numeric snapshots in this audit for the current decision. Strategy, milestones and experiment gates remain owned by BUSINESS_PLAN, REVENUE_MODEL and ROADMAP; historical suggestions elsewhere in this audit are not additional approvals.

### The revenue bridge

All amounts are AUD. Complete Sydney days exclude 5 September's partial sales. Purchases enter at `paid_at`; refunds use the live AUD cash-movement ledger. Reporting exclusions and synthetic fixtures are excluded. Refund-ledger health is clear and there are no live disputes. The [aggregate evidence](2026-09-05-revenue-bridge.json) contains service rows and period boundaries without patient data.

| Period ending 4 September | Orders | Gross | Refund cash | Retained revenue | Ads spend | Blended revenue/spend | Contribution after fees and Ads |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 day | 17 | $529.00 | $89.85 | $439.15 | $169.95 | 2.58x | $255.11 |
| 7 days, 29 Aug–4 Sep | 63 | $2,036.35 | $134.70 | $1,901.65 | $907.15 | 2.10x | $941.03 |
| Previous 7 days, 22–28 Aug | 82 | $2,775.00 | $149.65 | $2,625.35 | $961.77 | 2.73x | $1,589.46 |
| 30 days, 6 Aug–4 Sep | 292 | $9,548.10 | $394.10 | $9,154.00 | $3,272.03 | 2.80x | $5,625.32 |

Contribution excludes fixed overhead and an invented owner-doctor wage; this is not net profit. Fee receipts are used where present, with the existing 1.7% + 30c fallback for missing receipts. Blended revenue/spend includes organic, direct, referral and returning orders and must not be labelled paid ROAS. The separate paid-channel reader reports 7-day retained ROAS **1.28x versus 1.47x**, and 30-day **1.57x**, with 30-day paid contribution **$1,719.45**. That reader uses its existing campaign attribution and intake refund timing; the business cash ledger owns the top-line bridge above.

For the alternative Monday–Friday comparison: 31 Aug–4 Sep retained **$1,507.25 on 52 orders**, versus **$2,046.45 on 62 orders** for 24–28 Aug, down 26.3%. The drop is not an incomplete-week comparison artefact.

The preceding four complete Saturday–Friday weeks show that the comparison week was also the strongest of the four:

| Week | Total orders | Certificate orders | ChatGPT-attributed certificate orders |
|---|---:|---:|---:|
| 8–14 August | 59 | 22 | 10 |
| 15–21 August | 69 | 28 | 10 |
| 22–28 August | 82 | 35 | 17 |
| 29 August–4 September | 63 | 21 | 5 |

Latest overall orders are closer to the earlier weeks, but ChatGPT-attributed certificate purchases are below both earlier weeks. This supports a previous-week spike plus a current-week referral-purchase shortfall; it does not establish an algorithm change or isolate the cause of that shortfall.

| Service | Previous 7-day orders | Latest orders | Previous retained | Latest retained | Revenue change |
|---|---:|---:|---:|---:|---:|
| Medical certificates | 35 | 21 | $998.20 | $543.95 | **−$454.25** |
| Repeat prescriptions | 37 | 36 | $1,077.90 | $1,058.00 | −$19.90 |
| ED | 4 | 2 | $229.65 | $109.85 | −$119.80 |
| Women's health | 6 | 4 | $319.60 | $189.85 | −$129.75 |
| Total | 82 | 63 | $2,625.35 | $1,901.65 | **−$723.70 (−27.6%)** |

Certificates explain 62.8% of the decline. Orders fell 23.2%; gross average order value fell from $33.84 to $32.32. Refund cash fell $14.95 and softened the revenue decline rather than causing it. Prescription sales were broadly stable, so the post-prescribing completion incident is not established as the cause of this week's lost sales.

### Where the loss sits

- **Certificate referral purchases weakened.** Orders carrying `utm_source=chatgpt.com` fell 17 to 5, with gross revenue $474.15 to $124.75. This is observed attribution, not proof that ChatGPT reduced recommendations. Tracked ChatGPT certificate starts were 10 versus 11; this subset is too small and has different coverage from database purchases to assert a referral traffic collapse.
- **Paid certificates converted less efficiently.** The complete click-ID plus UTM campaign join gives 7 to 2 orders and $214.65 to $54.90 retained revenue, while clicks increased 21 to 23 and spend stayed approximately $116–118. The narrower UTM-only read gives 6 to 2; use the complete campaign join for Ads decisions. Latest retained ROAS is **0.47x** before payment fees. This requires a focused query/landing/checkout review before more certificate spend; 23 clicks is not enough to diagnose a specific creative or keyword as the cause.
- **Fewer people started certificate requests overall.** Exact-flow PostHog start cohorts were 53 to 37, with checkout progression 32/53 (60.4%) versus 23/37 (62.2%). The pre-checkout form did not show a new overall conversion collapse. Mobile event counts show the same lower volume; no single device failure is established. PostHog cohorts exclude `is_e2e` and are a tracked subset, not the accounting order total.
- **Recorded checkout failures are smaller than last week.** Certificate failures affected 5 flows previously and 1 on 31 August. Repeat-prescription failures affected 4 flows in the latest week, including one `unknown` session-creation failure in the 19:00 Sydney hour on 4 September. That tracked flow has no subsequent paid event. It predates the 5 September failure-code instrumentation and has no specific failure code; Sentry issue access returned HTTP 403, so its cause remains unresolved. Do not assign the whole revenue gap to this event or claim every checkout problem is fixed. No customer session replay or clinical payload was accessed.
- **Specialty volume fell.** ED campaign clicks fell 33 to 22 but its campaign-attributed orders stayed 2; the service-level reduction includes non-ED-campaign sales. Women's health campaign clicks fell 40 to 37; service orders fell 6 to 4. Two recent Women's campaign purchases are repeat scripts, so its attribution-purity/graduation gate remains material.
- **Hair remains a bounded losing pilot.** Fresh 30-day campaign evidence: $191.79 spent, 64 clicks, zero campaign-attributed orders. One total hair-loss order exists outside this campaign. Keep the existing 11 September checkpoint; prepare the pause proposal then if no retained campaign orders arrive.

### Applied work and next gates

1. **Fulfilment:** PR #520 includes retryable callback read errors, reference conflict protection, paginated exact-prescription recovery, valid audit patient links, truthful email outcomes with durable retry ownership, and draft saves while prescribing/before case navigation. Clinical completion remains explicit. Local unit verification: 7,111 tests passed; desktop/mobile integration verification and release receipts belong to the PR. No real prescription, patient status, email or refund was mutated during the investigation.
2. **Commercial measurement:** refreshed the 1/7/30-day scorecard, matched weekday comparison, service bridge, campaign attribution and fee-aware contribution. Fresh operational reads show no unresolved prescribing queue; P95 review times remain watch-level for scripts (5.04h) and women's health (5.92h), with zero recorded 24h breaches in the evaluated cohort. Missing support/QA evidence is not declared green.
3. **Scripts:** retain the approved $95/day step. Its 3 September change has not yet accumulated three complete post-change days. Do not stack another variable or treat `snapshot`'s unclassified tracking placeholder as the daily classified result; the latest delivered brief is GREEN, and new mutations still require the full fresh gate.
4. **Search:** read-only GSC inspection completed. `/medical-certificate`, `/medical-certificate-online` and `/erectile-dysfunction` are indexed. `/prescriptions` and `/online-prescriptions` are discovered but not indexed. Both prescription pages return 200, self-canonicalise and allow indexing today. The authenticated browser Live Tests passed at 19:04 and 19:06 Sydney time: both URLs are available to Google and can be indexed. `/online-prescriptions` already had an indexing-request confirmation, so it was not resubmitted. `/prescriptions` was submitted and Google confirmed that it entered the priority crawl queue by 19:08. Actual indexing is still pending Google; submission is not indexing or ranking proof. This is a growth constraint, not evidence for the certificate revenue decline.
5. **Retention:** 5 refill reminders delivered and no `refill_reminder`-attributed paid reorder yet; 46 certificate reactivation emails delivered and one attributed order ($29.95). Recovery emails already account for 20 paid orders and $638.70 gross in the closed 30 days. Measure completed reorders and retained revenue; a delivered email is not retention success.
6. **Pilot decisions:** retain the existing 9 September weight and 11 September hair review dates and Women's health's 20-order, margin, refund and attribution gates. Outreach remains deferred. No Ads changes or customer messages were sent.

### Sentry follow-up, 5 September 20:35 Sydney

Authenticated Sentry browser access was established after the initial API-token 403. The seven-day `production` issue feed contained 22 unresolved groups, including informational clinical outcomes. Live aggregate Supabase checks separated current work from historical and scheduled records:

- [INSTANTMED-92](https://reys-projects.sentry.io/issues/7641340725/): all 43 supposedly stuck pending emails were review invitations scheduled for future patient-cooldown dates. The corrected creation-and-schedule cutoff returned **zero overdue sends**, without changing any send or cooldown.
- [INSTANTMED-BK](https://reys-projects.sentry.io/issues/7708980292/): one historical March request has only a superseded certificate and an earlier sent-email record. Reconciliation remains necessary; this is not evidence of a new missing certificate or this week's lost sales. No certificate status or clinical record was changed.
- [INSTANTMED-3B](https://reys-projects.sentry.io/issues/7510764948/): the latest production mismatch was 5 September 05:05 UTC on `cd34d973e58a`, before the request-matching fixes. Newer events in the same group were local E2E tests and must not be counted as production regressions.
- [INSTANTMED-B2](https://reys-projects.sentry.io/issues/7674730049/) and [INSTANTMED-4P](https://reys-projects.sentry.io/issues/7585910968/): adjustment health reported zero unknown outcomes, expired reservations, or stale pending claims; five historical zero-value successes and eight expired targets remain visible. These counts may overlap. The latest partial failure was `CONVERSION_NOT_FOUND`. No Ads settings, conversions, or adjustment records were mutated.
- [INSTANTMED-BM](https://reys-projects.sentry.io/issues/7709146191/): an ordinary absent request was logged as a database incident. The detail reader now uses optional-single-row semantics; genuine database errors still report normally.
- Vercel's seven-day aggregates contained 43 feature-flag refresh transport failures. A synthetic test reproduced embedded prescribing falling back to disabled after one dropped connection; the reader now retries once after 150 ms with a fresh five-second abort signal so Next's request cache cannot reuse the rejected fetch. The real Supabase SDK with a request-memoization fixture reproduces the failure and verifies two network attempts followed by successful flag caching. Existing sustained-failure behaviour is preserved. No provider write is retried.

The local fixes passed 7,125 unit tests, lint, typecheck, and documentation checks. Release CI and deployment are separate evidence. The original 4 September session-creation failure still has no proven cause; the week's checkout text search in Sentry returned no matching issue. The `check:sentry --issues` diagnostic now distinguishes issue-list access from source-map release access without exposing credentials or event payloads.

### Remaining-issue investigation, 5 September 22:20 Sydney

- **Certificate:** the remaining March record has an admin `superseded_for_regeneration` audit, no successor, and the unchanged original PDF hash/storage timestamp. The retired `regenerate-certificate.ts` path superseded first, then called the approval path; subsequent email receipts did not create a replacement. The current implementation has retired that path and uses atomic corrections. Keep the original status and audit intact pending doctor review of the intended document; do not turn an unsuccessful correction into automatic clinical validation or a resend.
- **Ads:** five succeeded-zero orders have zero actual retained cash and only a combined five-cent difference from today's Ads floor. Five more have a resolved-not-counted zero claim. One claim-less legacy zero target has a provider miss observed after the existing 72-hour grace. The monitoring correction distinguishes these eleven historical outcomes from two unresolved April targets, whose original amounts total $39.90. The latter misses occurred inside grace and cannot prove non-counting. Neither potential historical Ads overstatement nor a floor difference is current cash leakage. No payment, claim, audit record, or Google conversion is changed by the monitoring correction.
- **Checkout:** exact-flow event correlation places the failed repeat-prescription attempt at 4 September 19:13:40 Sydney on mobile Chrome, before any new intake was saved in the corresponding window. The tracked flow returned from review through earlier steps, with no second checkout or subsequent paid event through this investigation. There is still no exact cause: old message-derived classification returned `unknown`, Sentry has no matching checkout-tagged issue, and the precise Vercel log query hit the account's log billing limit. The typed failure taxonomy is already deployed; no speculative payment retry or validation relaxation is justified by this evidence.

The SQL migration is a read-time health correction with separate historical counters. Its isolated PostgreSQL checks cover zero-floor differences, one-cent cash restoration, missing cash evidence, newer unresolved claims, strict grace timing, later uploads, conflicting exact values, production provenance, and service-role access. Deployment and CI receipts belong to the implementation PR.
