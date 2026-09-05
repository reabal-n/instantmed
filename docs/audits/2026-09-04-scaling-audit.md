# Comprehensive review and scaling audit — 4 September 2026

> **Purpose.** Follow-up to the [3 September revenue-first audit](./2026-09-03-comprehensive-audit.md). It answers three questions: what was implemented since then and does the evidence show it working; what the numbers look like today; and how to keep scaling from the current ~$9,000 a month to $12,000 and then $20,000 without breaking clinical safety, compliance, or the one-doctor capacity limit.
>
> **Evidence as at 2026-09-04 14:30 AEST**, aggregate-only, no patient-identifying data: Supabase read-only SQL, the Google Ads API read-only, PostHog SQL, Vercel error clusters, GitHub. The 3 September document remains the reference for the full keyword and search-term tables; this one repeats only what changed.

---

## 1. Executive summary

**One day of implementation moved five of the fourteen plan items; the money levers that were switched on are live and verified, and the run-rate is still flat.** Net-retained revenue for the last 30 days is $9,239 on 291 orders. The last 7 days delivered 61 orders against 81 the week before, the second consecutive soft week. The Scripts budget step was approved (+20%, $79 → $95) but has had one day to work. Refill reminders are sending. Guest-checkout encryption is fixed. The fraud queue was cleared. The two long-stuck certificates are still undelivered, the dependency-audit gate is red again on a new advisory, and none of the Google Ads hygiene changes (negatives, keyword pauses, schedule, device) have been applied yet.

**Scaling verdict.** The business can reach ~$12,000 a month inside six weeks with the approved plan alone. Getting to $20,000 needs three things the current setup does not have: a second reviewing doctor, a second paid channel, and a repeat-purchase loop that is measured. Section 9 lays out the ladder with gates and kill criteria.

| Headline | Value |
|---|---|
| Net-retained, last 30 days (to 4 Sep) | **$9,239** on 291 orders (refunds 3.2% of gross) |
| Prior 30 days | $3,239 on 110 orders |
| Last 7 / prior 7 / 14–21 / 21–28 days | 61 / 81 / 69 / 62 orders |
| Since 3 September (≈1.5 days) | 16 orders, $524 |
| Ads-attributed orders, last 30 days | 155 (53%) |
| Google Ads spend, last 30 days | $3,205 → 155 orders → $5,236 net → ≈ $1,886 contribution (36%) |
| Returning buyers, last 30 days | 16 of 229 (7%) |
| Manual review latency, last 7 days | p50 116 min, p95 5.8 h (30-day p50 was 80 min) |
| Certificates protocol-issued, last 7 days | 16 of 20 (80%) |

**Scorecard: 75 / 100** (was 74). Security 80 → 84 (encryption gap closed at the source), clinical operations 74 → 76 (fraud queue owned and cleared), unit economics 78 → 79 (scale step taken). Revenue & growth 82 → 80 (two soft weeks). Everything else unchanged; the codebase score would have risen with the browserslist fix but a new moderate advisory keeps the required gate red.

---

## 2. What was implemented since 3 September, and what the evidence says

The only merge was PR #512 ("close checkout and operations integrity gaps", 3 Sep 06:21 UTC, +1,690/−281, CI green). The Ads change was one approved proposal. A second body of work is in flight on branch `codex/lenient-repeat-rx-intake` (three commits, unmerged, not on main).

| Plan item (3 Sep) | Status | Evidence |
|---|---|---|
| 1. Approve the Scripts budget step | **Done** (+20%, not the +50% the "strong" tier allowed) | Proposal verified 3 Sep: `campaignBudgets/15589755119` 79,000,000 → 95,000,000 micros. Day one at $95: spend $66, 0% lost to budget, 2 Google-attributed conversions. The engine still emits `SCRIPTS_SCALE_GATES_PASSED`; the policy holds the next step for 3 days and 10 orders. |
| 2. Medication step | **Partly done; leniency unmerged** | #512 shipped a focus fix (`getBlockedFocusTarget` moves focus to the first missing directions control). The structural change — one plain-language directions field instead of amount/unit/frequency selects, 205 lines removed from the step — sits on the unmerged branch with schema and test changes in `lib/request/validation.ts` and `lib/validation/repeat-script-schema.ts`. Controlled-substance, dedicated-service and unchanged-dose checks are preserved in that diff. |
| 3. Refill reminders on | **Done and sending** | `REFILL_REMINDER_EMAILS_ENABLED` set in production; 3 `refill_reminder` emails sent and delivered on 3 Sep; 2 prescriptions stamped. Not yet in `CRITICAL_CRONS`, so a silent stop would not page. The reorder CTA already carries `utm_source=refill_reminder&utm_medium=email&utm_campaign=reactivation`, so attributed reorders will show in the database channel split. |
| 4. Women's health graduation | Not yet eligible | 11–12 recognised orders of the 20 required; margin 54%; `CROSS_SERVICE_ATTRIBUTION` still flagged. |
| 5. Med Certs pruning and RSA rewrite | Not started | Same keywords enabled; 80.6% of impressions still lost to budget at $20/day; QS 6 with ad relevance below average. |
| 6. Hair-loss pause | Pending 11 Sep | Still enabled at $10/day: $183 in 30 days, 61 clicks, 0 database orders. |
| 7. Schedule and device modifiers | Not started; engine cannot do it | Schedule unchanged (08–20 on Scripts and Med Certs); no device modifiers. The ads engine has no `ad_schedule` or device-modifier mutation family (it reads schedule state but cannot write it). |
| 8. Negatives list | Not applied | None of the 3 Sep negatives exist yet (`levitra`, `vardenafil`, `stendra`, `regaine`, `hairy pill`, `how to`, `quiz`, `medicare`, `herpes`); only `chemist warehouse` pre-existed on Med Certs and Scripts. |
| 9. Priority honesty | Not decided | Since 1 Sep: 6 priority buyers, 1 missed the 3-hour target and was refunded. |
| 10. Checkout failure taxonomy | Unknown | Not in #512's file list; PostHog check below. |
| 11. `/prescriptions` indexing | Not started | — |
| 12. tROAS 1.4 | Correctly waiting | Sequenced after item 1's observation window. |
| 13. Re-enable the old Scripts RSA | Not started | Ad 809646001672 still paused. |
| 14. Weight-management decision | Due 9 Sep | Still 0 intakes, 0 drafts since launch. |
| Eng. ticket 1: CI gate | **Done, then red again** | `browserslist: ^4.28.7` override landed in #512. A new moderate advisory (GHSA-px8p-9vwx-vf98, `fflate` 0.4.8 via `posthog-js` 1.364.7, patched ≥ 0.4.9) now fails `pnpm security:audit`, so the next PR's build goes red. Fix: `fflate: ^0.4.9` in the workspace overrides (the sixth advisory-floor incident; Renovate remains uninstalled). |
| Eng. ticket 4: guest-checkout PHI dual-write | **Done** | `lib/stripe/guest-checkout.ts` now inserts through `encryptProfilePhi`; a backfill script shipped (`scripts/encrypt-phi-backfill.ts`, 266-line test). Profiles created since 3 Sep: phone 4 of 5 encrypted, DOB 9 of 11 (was 12% / 8%). The remaining plaintext-only rows are the pre-fix backlog until the backfill runs in production. |
| Eng. ticket 5: stuck certificates | **Rescue path hardened; the two patients still have nothing** | `lib/admin/certificate-delivery-rescue.ts` reworked. Three resend attempts since 3 Sep: one admin resend **failed with "Template render failed: React is not defined"**, one admin resend and one patient self-serve resend delivered — all for other certificates. The 196-day and 101-day certificates still show zero retries and zero resends. |
| Eng. ticket 6: fraud flags | **Done** | Migration `20260902090000` converged review state; `lib/admin/fraud-flag-review.ts` and an ops action shipped; all 16 flags are now `reviewed` (15) or `dismissed` (1). |
| Eng. ticket 8: signal hygiene | Not started | The empty-argument RPC probe, the `delivery_tracking` writes and the ads-conversions heartbeat semantics are unchanged. |
| Eng. ticket 11: synthetic monitor | Partly | #512 added a production-synthetic isolation contract and a one-line workflow change; the GitHub schedule throttling itself is not addressed by a contract test. |

Net: **items 1, 3, eng-1, eng-4, eng-6 landed and verified; item 2 is half-landed; eng-5 shipped code but has not yet reached the two patients it was for.**

---

## 3. Numbers today

### 3.1 Revenue windows (same definitions as 3 Sep)

| Window | Orders | Net | Refunds | Ads orders | Scripts | Certificates | Consults |
|---|---|---|---|---|---|---|---|
| Last 30 days | 291 | $9,238.90 | $304.25 | 155 | 147 | 114 | 30 |
| Prior 30 days | 110 | $3,239.20 | $179.60 | 58 | 46 | 59 | 5 |
| Last 7 days | 61 | $1,971.50 | $44.85 | 33 | 34 | 20 | 7 |
| Prior 7 days | 81 | $2,580.45 | $149.65 | 41 | 34 | 37 | 10 |
| 14–21 days ago | 69 | $2,181.30 | $109.75 | 33 | 37 | 25 | 7 |
| 21–28 days ago | 62 | $1,956.55 | $0.00 | 34 | 32 | 25 | 5 |

The soft week is a certificate dip (20 vs 37) and a consult dip (7 vs 10); scripts held at 34. Certificates are the lane with 80% of paid impressions lost to budget, so the dip is at least partly self-imposed.

### 3.2 Google Ads, last 30 days (API, to 3 Sep)

| Campaign | Budget/day | Spend | Clicks | Google conv | DB orders | DB net | Contribution (margin) | Impr. share | Lost to budget | Lost to rank |
|---|---|---|---|---|---|---|---|---|---|---|
| Scripts | **$95** (was $79) | $1,827 | 386 | 87 | 108 | $3,404 | $1,478 (43%) | <10% | 32% | 61% |
| Med Certs | $20 | $585 | 113 | 25 | 25 | $744 | $138 (19%) | <10% | **81%** | 18% |
| ED Pilot | $12 | $361 | 104 | 7 | 10 | $519 | $147 (28%) | 11% | 1% | 88% |
| Women's Health | $20 | $249 | 85 | 11 | 12 | $569 | $306 (54%) | 21% | 0% | 79% |
| Hair Loss Pilot | $10 | $183 | 61 | 1 | 0 | $0 | −$183 | <10% | 78% | 20% |

Change history since 3 Sep: one `CAMPAIGN_BUDGET/UPDATE` via the API (the step). Nothing else.

### 3.3 Operations

- Manual review latency last 7 days: p50 116 min, p95 348 min. The 30-day p50 was 80 min; the median is drifting up as volume holds. One person made all 14 decisions since 3 Sep and all 278 in the prior window.
- Protocol issuance: 16 of 20 certificates in the last 7 days (80%).
- Open paid work right now: 1 (a fresh prescription, minutes old). Stuck: the 159-day `delivery_pending` certificate plus the 101-day one.
- Priority since 1 Sep: 6 buyers, 1 breach, 1 refund.
- Vercel, last 3 days: 17 feature-flag cache revalidation failures across 15 users (Supabase `fetch failed`), a new `[feature-flags] Feature flag read failed; using uncached defaults` cluster, one `PGRST116` on the doctor review-data route, and the certificate-resend template error above.
- Cron watchdog: `review-request` 4 minutes overdue once. `refill-reminders` has no heartbeat row.
- Lena voice inbox: 0 messages (default-off as designed).

### 3.4 Funnel and web vitals (PostHog refresh)

PostHog refresh run 4 Sep 04:32 UTC (`is_e2e` excluded, exact `flow_instance_id` joins; "post-merge" = after #512 deployed at 06:30 UTC on 3 Sep).

| Cohort (starts 4 Aug–3 Sep) | Starts | Checkout | Pay-init | Paid | Start→paid |
|---|---|---|---|---|---|
| All | 607 | 294 | 246 | 235 | 38.7% |
| Medical certificate | 205 | 117 | 100 | 99 | 48.3% |
| Repeat prescription | 279 | 129 | 114 | 109 | 39.1% |
| ED | 50 | 19 | 16 | 15 | 30.0% |
| Women's health | 58 | 22 | 15 | 11 | 19.0% |
| Weight management | 10 | 5 | 0 | 0 | 0% |
| Hair loss | 5 | 2 | 1 | 1 | 20% |

- **Medication step**: 20 Aug–2 Sep, 133 flows viewed and 70 completed (53%); 68 flows blocked, 268 block events; `currentDose` fired 115 times on 29 flows (4.0 per blocked flow), `dedicated_service_steer` 90 on 22, `doseChanged` 52 on 26, `strength-0` 40 on 20. Post-merge sample: 13 viewed, 7 completed, 2 `currentDose` flows at 1.5 events each — too small to read. The #512 change was a focus fix, so the blocker taxonomy is unchanged by design; the structural change is the unmerged branch. Re-measure after 7 post-merge days (~100 flows).
- **Certificate step**: 100 viewed, 69 completed (69%) in the same window; 3 blocked flows.
- **Checkout failures**: 51 events on 19 flows in the prior two weeks (27 `unknown`, 24 `identity_or_session`, all `stage=session_creation`; 15 of 19 flows later paid). **Zero post-merge `checkout_failed` events** against a base of ~3.6 a day — either the server guard in #512 removed the class or the sample is too short; check again in a week. The `reason` property has never been recorded, so the documented `missing_checkout_url`/`exception` branches have never fired.
- **Traffic**: rolling 7-day session entries 274 vs 331 the week before (paid Google 126 vs 154, organic Google 55 vs 66, direct 44 vs 59, ChatGPT 29 vs 31); bot pageviews 2 in 14 days. The soft week is traffic, not conversion.
- **Web vitals (mobile p75)**: LCP 1,270 ms (was 1,372), CLS 0.081 (was 0.136), INP 104 ms flat; `/request` CLS 0.144 still the outlier.
- **New event since deploy**: `business_alert_ops_approved_certificate_missing_record` has fired on every 30-minute business-alerts run since 06:31 UTC on 3 Sep (45 events). It is #512's new ops invariant (approved certificate intakes with no current valid certificate record) and it is non-zero because of the two undelivered certificates. Valid signal, but at one alert per 30 minutes it will be muted within a week unless the rows are resolved or the alert is deduplicated.

---

## 4. Scorecard

| Category | 3 Sep | 4 Sep | Why it moved |
|---|---|---|---|
| Revenue & growth | 82 | 80 | Second soft week; certificate lane dipped 46%. |
| Unit economics & paid acquisition | 78 | 79 | Scripts step taken; hygiene items still unapplied. |
| Conversion funnel | 71 | 71 | Leniency change unmerged; no measurable change yet. |
| Acquisition & traffic | 44 | 44 | No change. |
| Clinical operations | 74 | 76 | Fraud queue owned and cleared; latency creeping. |
| Reliability & infrastructure | 76 | 76 | Feature-flag fetch failures continue; resend template error appeared. |
| Security & privacy | 80 | 84 | Guest-checkout dual-write fixed; backfill script shipped. |
| Codebase health | 78 | 78 | browserslist fixed, fflate red; same dead-code baseline. |
| Documentation & organisation | 72 | 72 | Bookkeeping kept in step; CLAUDE.md unchanged. |
| Delivery process & CI | 66 | 67 | One clean, well-described PR; still zero independent review. |
| Public surface & SEO | 80 | 80 | No change. |
| Performance & accessibility | 88 | 88 | No change. |
| **Overall** | **74** | **75** | |

---

## 5. Risks and regressions to watch this week

1. **Required CI gate red again** (fflate). Every PR, including the leniency branch, fails until the floor lands.
2. **Certificate resend template error** ("React is not defined") on an admin resend, 3 Sep. One patient's rescue attempt silently failed; the two long-stuck certificates were not the target of any attempt.
3. **Review latency drift**: p50 80 → 116 min in the last 7 days at flat volume. The scale plan adds 30–45 orders a month; without a second reviewer the P95 will breach the 2-hour target more often and the priority promise will fail more than one time in six.
4. **Supabase fetch failures from Vercel** now show as two clusters (cache revalidation and direct read fallback). No owner, no retry/keep-alive tuning yet.
5. **Refill reminders unmonitored**: a silent stop would not page.
6. **Med Certs budget starvation**: 81% of eligible impressions lost to budget while the lane's weekly orders fell 46%.
7. **New ops alert firing every 30 minutes** (`business_alert_ops_approved_certificate_missing_record`, 45 events since deploy): correct detection of the two stuck certificates, but continuous re-firing trains the operator to ignore it. Resolve the rows and add a fingerprint cooldown.

---

## 6. Google Ads: what to do now that the step is in

- **Scripts**: let the $95 step observe (3 days, ≥10 orders, refund <10%). If contribution margin holds ≥ 30%, take the next step at +20% ($95 → $114) and repeat weekly. The policy tier allows +50% but the operator chose +20%; that is the right cadence for a lane losing 61% to rank, because bigger budget steps buy costlier auctions. After two clean steps, lower tROAS 1.5 → 1.4 (floor 1.35).
- **Med Certs**: apply the pruning (pause `carers leave certificate` phrase and `medical certificate online` phrase), rewrite the two RSAs so headlines carry the ad-group keyword, then raise budget $20 → $30 when CPA ≤ $20 for 7 days. This lane is starved and its weekly orders just halved.
- **Women's health**: on the 20th recognised order, raise CPC ceiling $3.00 → $4.50 and budget $20 → $30. Read the cross-service attribution first: 2 of 12 orders were scripts, which is acceptable leakage.
- **Hair loss**: accept the pause proposal on 11 September unless a retained order appears.
- **Negatives**: apply the 3 September list (shared list: `levitra`, `vardenafil`, `stendra`, `spedra`, `avanafil`, `bimix`, `blue pill`, `regaine`, `hairy pill`, `zova`, `reviews`, `where can i buy`; Scripts and Med Certs: `how to`, `how do i`, `can i`, `where can i`, `herpes`, `bv`, `antibiotics online`; Women's health: `quiz`, `how to`; Med Certs: `medicare`).
- **Schedule and device**: the engine cannot write these. Either add `ad_schedule` and device-modifier mutation families with validate/apply/verify receipts (engineering ticket) or apply them once in the console with read-back and record the change in the proposals ledger. Extend 08–20 to 06–22 with −20% on the shoulders, −25% at 13:00, −15% Sunday; −20% desktop on Scripts.
- **RSA test**: re-enable ad 809646001672 alongside the current Scripts RSA.
- **Account hygiene**: remove the 19 paused single-keyword ad groups and "Ad group 1" from Med Certs; confirm automatically created assets are off.

---

## 7. Retention: make the loop measurable

Refill reminders are live and the reorder link is already tagged `utm_source=refill_reminder`. Before the first cohort matters (mid-October), add `refill-reminders` to `CRITICAL_CRONS` and put sends and attributed orders on `/admin/analytics`. Target: ≥ 10% of reminded prescriptions reorder within 21 days. If the first two waves clear that bar, add a second nudge at day 84 and a one-tap reorder path that prefills the previous repeat (still one-off transactions; no subscription).

Recovery email keeps working (6 sends since 3 Sep; 5 orders in the prior 30 days). Certificate reactivation stays near zero and should be left alone.

---

## 8. Engineering tickets, updated

| # | Ticket | Status | Next action |
|---|---|---|---|
| 1 | CI gate | Reopened | `fflate: ^0.4.9` override; install Renovate so the seventh advisory arrives as a PR. |
| 2 | Medication step leniency | Unmerged branch | Rebase `codex/lenient-repeat-rx-intake` on main, run the blocking E2E (`e2e/prescription-flow.spec.ts` now carries 35 new lines from #512), merge, then measure `medication` step completion for 14 days (baseline 147/280). |
| 3 | Refill reminders | Live, tagged | Heartbeat entry and analytics tile. |
| 4 | Guest-checkout PHI | Done | Run `scripts/encrypt-phi-backfill.ts` in production; update SECURITY.md coverage receipt. |
| 5 | Stuck certificates | Code shipped, patients unserved | Resend the 196-day and 101-day certificates; fix the "React is not defined" render path in the manual resend (likely a server-only template import missing the JSX runtime); add an ops row for `delivery_failed` older than 24 h. |
| 6 | Fraud flags | Done | Nothing. |
| 7 | Checkout failure taxonomy | Unverified | Confirm in PostHog (Section 3.4) whether `failure_category=unknown` still dominates; if so, name the buckets. |
| 8 | Signal hygiene | Open | RPC probe, `delivery_tracking`, ads-conversions heartbeat semantics. |
| 9 | Priority add-on | Decision pending | Copy change or SLA alert at 90 minutes. |
| 10 | Public surface | Open | `priceRange`, `/weight-loss` schema, OG images, H1 word-splits. |
| 11 | Synthetic monitor | Partly | Move the schedule to a Vercel cron or Checkly. |
| 12 | Docs | Open | Migration receipts out of CLAUDE.md, archive finished plans, README, gitignore `output/`. |
| 13 | Ads engine | Open | `ad_schedule` and device-modifier mutation families; women's-health graduation state for the CPC ceiling. |
| 15 | **New:** ops alert dedup | Open | Give `business_alert_ops_approved_certificate_missing_record` the same fingerprint cooldown the other critical alerts use; it currently re-fires every run. |
| 14 | **New:** Supabase fetch resilience | Open | Retry-once with fresh connection on `UND_ERR_SOCKET` in the feature-flag reader and the dashboard data loaders; or move the flag read behind a short in-memory TTL so a single reset never reaches a request. |

---

## 9. How to keep scaling: the ladder

The unit economics are known well enough to plan in stages. Each stage has an entry condition, the levers that carry it, the gates that must hold, and the kill criteria that stop it.

### Stage A — $9k → $12k a month (now to mid-October)

**Entry:** already met. **Carries it:** the approved plan. Scripts +20% steps weekly under the policy gates; Med Certs pruning then +50% budget; women's health graduation; hair-loss pause; negatives; leniency merge; refill reminders measured. **Expected:** +$2,500 to +$3,500 net a month; orders ~380–400.

**Gates:** per-campaign contribution margin ≥ 30% (Scripts), ≥ 20% (others); refund rate < 10% per lane; tracking GREEN; manual-review P95 < 6 h and zero 24-hour breaches.

**Kill / pause criteria:** any lane's refund rate over 10% in a rolling 30 days pauses that lane's scaling; a second 24-hour breach in a month freezes budget steps until capacity is added.

### Stage B — $12k → $20k a month (October to December)

**Entry:** Stage A gates held for four weeks, and a second reviewer is active. **Carries it:**

1. **Capacity.** Activate the second doctor profile (AHPRA verification, capability flags per `docs/DOCTOR_ONBOARDING.md`) when the rolling 7-day order count exceeds 90. Split coverage by hours (the 13:00–19:00 band and weekends are where latency and priority breaches concentrate). This is the single hard prerequisite; every acquisition lever below produces refunds and complaints without it.
2. **Second paid channel: Microsoft Ads.** Bing already delivers 5 organic orders a month with zero effort; Microsoft Ads imports Google Search campaigns directly, healthcare policy is comparable, and CPCs are typically 30–50% lower. Start with Scripts and Med Certs at $15/day each, same negatives, same landing pages, same server-side purchase import (needs a Microsoft UET/offline-conversion path, one engineering ticket). Kill at 60 clicks without an order per campaign.
3. **Google reach.** After Scripts has taken three clean +20% steps, add exact-match variants of the converting search terms that have no keyword today ("prescription online", "get a script online", "telehealth script online", "instant script online", "quick script online"); add a small branded campaign only if organic brand searches show ads from competitors; keep everything on Search, no Performance Max or Display (healthcare policy and the account's own history).
4. **Landing-page conversion for the specialty lanes.** ED converts 29% start→paid and 6% click→order; women's health 21%. Both are Manual CPC lanes losing 80–88% to rank, so conversion, not bids, is the cheap lever: shorter first screen, the "doctor may call or message" expectation set once, price visible early, and the medication-free copy the compliance rules require. Target ED and WH start→paid ≥ 35% before raising their caps a second time.
5. **AI-assistant channel.** ChatGPT is 18% of orders at zero cost and doubled month on month. Keep the pages it cites answer-dense and structured (`llms.txt` is live; keep `/prescriptions` and `/medical-certificate` indexable and fast); track `utm_source=chatgpt.com` weekly; treat Copilot's 5,500 citations as the next free channel to earn.
6. **Organic money pages.** Get `/prescriptions` indexed and internally linked; the three blog guides that already rank should link to it. Move `/medical-certificate` off position 47 with an authority pass, not more content.
7. **Retention loop.** Refill reminders measured (Section 7); a second nudge at day 84; one-tap reorder. At 145 scripts a month and a 15% reorder rate, this alone is 20+ orders a month by December at zero acquisition cost.

**Expected:** ~600 orders a month, net $18,000–20,000, ads spend $5,500–6,500 at blended ROAS ≥ 1.6.

**Gates added:** second reviewer live before ads spend exceeds $4,000 a month; support contacts measured and under 5 per 100 orders (this still cannot be measured from any connected system and must be instrumented); complaint count tracked.

### Stage C — beyond $20k a month (2027)

**Entry:** Stage B gates held for eight weeks. **Options, in order of confidence:**

1. **Women's health expansion.** The UTI ad group is the highest-margin paid inventory on the account; the contraception ad group underperforms. Build a dedicated contraception landing experience before spending on it.
2. **Priority tier that earns its price.** With two reviewers, honour the 3-hour promise and then test $14.95 with a stated window; today's 16% attach at $9.95 is already $470 a month.
3. **Weight management.** Zero organic demand at 25 days post-launch; paid advertising is gated by the business plan. Either commit to a bounded organic and AI-assistant program with a 90-day order target or shelve. Do not start ads without a business-plan change.
4. **Hair loss.** Re-enter only with a rebuilt landing experience and exact-match service terms; the current pilot attracts product shoppers.
5. **Employer verification as distribution.** The verify surface exists; distribution to HR and payroll publishers is roadmap rank 3 and costs nothing but outreach.
6. **Doctor roster and protocol.** Two to three doctors on a rota, the certificate protocol kept at its current boundary, and Lena live for support so the owner's time goes to clinical work. Any widening of protocol issuance is a reviewed policy decision, not a scaling lever.

**Not on the ladder:** subscriptions or recurring prescribing, pharmacy or delivery, general consults, conversational AI intake, drug-name advertising, review-count or testimonial marketing, price rises on the $24.95 certificate. These are excluded by the business plan or by advertising and clinical rules.

### The arithmetic

| Stage | Orders/month | Net/month | Ads spend | Ads orders (at CPA ≈ $20–22) | Reviewers |
|---|---|---|---|---|---|
| Today | 291 | $9,239 | $3,205 | 155 | 1 |
| A | 380–400 | $12,000–12,500 | $3,900–4,300 | 190–210 | 1 (at the limit) |
| B | 580–620 | $18,000–20,000 | $5,500–6,500 | 270–300 | 2 |
| C | 800+ | $25,000+ | $7,500+ | 350+ | 2–3 + support |

Contribution stays near 55–60% of net at every stage if CPA holds at $20–22 and refunds under 5%; the doctor-hours column, not the ads column, is what changes the slope.

---

## 10. This week

1. Land the `fflate` floor so PRs can merge; then merge the leniency branch after the blocking E2E passes.
2. Resend the two stuck certificates; fix the resend template error.
3. Apply the negatives and the two Med Certs keyword pauses through the proposal path.
4. Add `refill-reminders` to the heartbeat list.
5. Decide the 9 September weight-management checkpoint and the 11 September hair-loss pause.
6. Watch Scripts through its 3-day window; take the next +20% step if margin ≥ 30%.
7. Decide the priority add-on wording, or schedule the second reviewer's hours.

---

## Appendix. Open questions for the operator

1. Second reviewer: agree the trigger (rolling 7-day orders > 90) and start onboarding now, since verification takes weeks?
2. Microsoft Ads as the second channel in October: yes or no in principle, so the offline-conversion import can be built?
3. Scripts step cadence: +20% weekly under the gates, or the policy's +50% once?
4. Priority review: honour or re-word?
5. Weight management on 9 September: bounded organic program or shelve?
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
