# Revenue, paid acquisition and AI referrals — execution receipt

Owner instruction: September 9, 2026, Codex task `01a0860a-d25c-7d30-b15c-b04d9f949ddc`: implement the reconciled campaign changes, prioritise revenue and profit, remove arbitrary commercial vetoes and improve LLM acquisition. All dates below use Australia/Sydney unless an explicit UTC timestamp is shown. Currency is AUD.

## Commercial decision and evidence

Confirmed positive first-order cash contribution now qualifies profitable-scale proposals. Actual refunds, disputes, Stripe fees and all campaign advertising spend remain deducted. Refund percentages, queue times, workload counts, margin tiers, order-count thresholds, service-purity graduation, diagnostic scores and fixed post-change waiting periods are advisory. Explicit clinical incidents, service holds, failed fulfilment, concrete compliance failures, unreliable financial evidence and exact owner approval still matter. No clinical eligibility, prescribing decision or certificate protocol was widened.

Closed payment window: August 10–September 8, from `2026-08-09T14:00:00.000Z` inclusive to `2026-09-08T14:00:00.000Z` exclusive. Source: delivered Ads run `9a34f440-3fe4-4f53-9d96-59bfd1b37847`, September 8 report. First-customer-order history spans all services and channels; all campaign spend is charged to first orders.

| Campaign | First orders | Net retained first-order cash | Actual first-order Stripe fees | First-order contribution after all campaign Ads |
|---|---:|---:|---:|---:|
| Scripts | 69 | $2,216.00 | $61.65 | **$181.67** |
| Med certs | 24 | $688.65 | $18.98 | $89.07 |
| ED | 9 | $469.45 | $10.62 | $87.11 |
| Women's Health | 12 | $589.35 | $14.62 | $271.43 |
| Hair Loss | 1 | $49.95 | $1.14 | **−$190.82** |

Scripts spent $1,972.68. Its blended contribution of $1,122.28 includes repeat orders and is separate from first-order contribution. Google conversion-date accounting reports 106 orders and $3,194.19, versus 74 credited by click date. Database retained cash is $3,194.10. This is a nine-cent value difference, not evidence that 30% of orders are missing; do not change count settings or manufacture repeat-order credits.

Independent review found a campaign-attribution edge case in the new first-order reader: it needed the same numeric campaign-ID fallback and paid-marker predicate as existing Ads reporting. Correction `11985680c` shares the canonical resolver and query projection across both paths and passed scoped independent re-review. Regression tests cover an older refund changing apparent profit into a loss and exclusion of a non-Google UTM-only purchase. A read-only live comparison found **zero discrepancies** across 302 cash-cohort rows, including 153 campaign-relevant rows; all campaign contribution deltas were zero. The Scripts mutation's economic basis remains $181.67.

## Live Google Ads actions

Account `9205010513`. Each applied operation has an immutable draft, exact Codex task approval, Google validate-only receipt, one apply and independent read-back. Full operations, hashes, request IDs, approval times and rollback values are in [the machine-readable receipts](2026-09-10-profit-growth-receipts.json). Daily budgets remain Scripts $95, Med Certs $20, Women's Health $20, ED $12 and Hair Loss $10.

| Action | Proposal | State |
|---|---|---|
| Women's UTI and new/switch-pill RSAs use their matching child destinations | ADS-20260909-01 | Created and read back; Google review pending at the latest policy read. |
| Pause Scripts phrase keywords `online prescription Australia` and `prescription repeat` | ADS-20260909-03 | Applied and verified. |
| Remove campaign phrase negative `backdated medical certificate`, campaign exact `online medical certificate australia`, and ad-group exact `carer's leave certificate` / `carers certificate` | ADS-20260910-01 | Applied and verified. Four actual exclusions, preserving clinical limits on past absence dates. |
| Replace the work-certificate RSA with bounded clinical-assessment copy | ADS-20260910-02 | Created and read back; Google review pending at the latest policy read. |
| Pause the old work-certificate RSA containing the unconditional no-call claim | ADS-20260910-03 | Applied and verified; no claim that Google's approval establishes compliance. |
| Med Certs schedule 08:00–20:00 → 00:00–24:00 daily | ADS-20260910-04 | Applied and verified; $20/day and $22 target CPA unchanged. |
| Exclude unsupported `trt` phrase from ED | ADS-20260910-05 | Applied and verified; no broad exclusion of otherwise relevant city/clinic searches. |
| Scripts target ROAS 1.50 → 1.35 | ADS-20260910-06 | Applied and verified; $95/day unchanged. |

The women's replacements are `202440288434~824041494895` (UTI) and `202440288474~824041494898` (pill). Their existing hub ads stay enabled while replacements are under review. The exact old-ad pause packet is prepared, but applying it before replacement eligibility would risk stopping both groups. The new work-certificate RSA is `194546863806~824123285516`; other certificate ad groups remain available while it is reviewed.

The first women's Google apply succeeded and its durable apply receipt was stored, but the subsequent audit append failed transiently. Recovery re-appended that same stored request and hashes, then read back both created ads. Google creation was **not repeated**. ADS-20260909-02 was an earlier Scripts keyword draft blocked before Google mutation by the previous experiment lock; it is preserved as a failed validation, not an apply.

The September 3 Scripts budget observation `EXP-20260903-01` was explicitly closed as inconclusive at `2026-09-09T13:58:43.596Z`, retaining the $95 budget and original evidence. Its original October 3 endpoint cannot silently veto the newly authorised work. Keyword pauses and the bid change share a new observation cohort, so later results cannot isolate either variable's effect.

## Contribution observations

- Certificate overnight observation starts at actual schedule apply, `2026-09-09T14:07:19.397Z` (September 10, 00:07:19 AEST), and reaches fourteen days at `2026-09-23T14:07:19.397Z` (September 24, 00:07:19 AEST). Review first-order contribution, total retained cash, cost per paid order and overnight versus daytime click cohorts. Eighteen of 119 historical certificates were paid outside the old hours; payment time alone does not establish click time or forecast demand.
- The $150 certificate test-loss threshold prompts a contribution review. It is not an autonomous pause, numeric graduation gate or permission to increase budget. Existing daily cash/Ads reporting continues. No native Google split experiment was created; this is an observational before/after comparison. Copy and negative repairs are nearby changes, so do not claim isolated schedule lift.
- Hair keeps its September 8 keyword repair and $10 budget. Read the September 9–15 window on September 16, retaining the current loss rather than calling it a winner. ED's September 10 exclusion also confounds its earlier keyword/product window. H1/E1 remain rendered; H2/E2 were not activated.
- Review Scripts decline reasons weekly as an eligibility/copy signal, with actual refund cash deducted. Six repeat-prescription declines on September 4–6 remain relevant to the recently changed medication step, but neither the count nor elapsed review time is a scaling veto.
- Women's campaign revenue includes genuine cross-service cash. Its purchase rows do not persist the explicit repeat-pill handoff marker, so a historical prescription order cannot reliably be labelled a deliberate pill handoff. Report women's orders and cross-service script orders separately, with that limitation; do not invent a handoff or relabel a script as a women's consultation.

## LLM acquisition diagnosis and action

Matched Sydney weeks are August 26–September 1 and September 2–8. Public AI-referral analytics was deferred until interaction, so these are **captured sessions**, not all visits. The payment cohort uses the same session's flow and a fixed 24-hour observation window; the calendar revenue ledger retains its existing attribution rules.

| ChatGPT measure | Prior week | Recent week |
|---|---:|---:|
| Captured referral sessions | 34 | 21 |
| Intake starts within 24 hours | 18 | 10 |
| Checkout within 24 hours | 10 | 8 |
| Flow-linked paid within 24 hours | 7 | 5 |
| Session-to-paid conversion | 20.6% | 23.8% |
| Calendar-attributed certificate orders | 12 | 2 |

The visit decline is 38.2%; the small matched cohort does not show worse conversion. The larger calendar order fall includes lagged older referrals and must not be divided by the current session count. Certificate landing pages held seven to eight captured sessions; the comparison page fell eleven to five and had one start, zero flow-linked paid orders across all sixteen captured sessions.

The concrete growth target is `/compare/online-medical-certificate-options`. Commit `9d66c13fc` refreshes its July table against nine providers' current first-party pages, shows a dated source list and publisher disclosure, qualifies inconsistent advertised prices, and adds a clear link to InstantMed certificate details near the introduction. This improves the usefulness and verifiability of an existing discovery page and tests an easier next step. It does not guarantee more citations or orders. Record its deployment timestamp; the existing certificate copy window becomes confounded from that point.

The separate measurement repair records exact supported AI landings without waiting for interaction and deduplicates the referral within the actual PostHog session. Private routes remain excluded, Sentry and ordinary acquisition remain deferred, and the revenue-attribution cookie is unchanged. This repair measures traffic; it does not create it.

Next growth work should follow qualified demand on certificate and prescription pages, their paid contribution and the sources AI answers actually cite. Public crawl access and `llms.txt` already exist; no new AI-specific file or schema is needed. Current OpenAI guidance covers [OAI-SearchBot access and ChatGPT referral tags](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq). Google recommends normal indexing, useful text and internal discovery for [its AI search features](https://developers.google.com/search/docs/appearance/ai-features).

Existing September 5 indexing requests for the prescription and UTI pages are preserved; reinspection dates remain September 12 and 19. No outreach, new directory submissions, patient messaging or extra indexing requests were sent. External reputation work remains a concrete future distribution lever, requiring real placements and attributable visits rather than invented citation claims.

## Code release and verification

Code delivery is tracked in [PR #546](https://github.com/reabal-n/instantmed/pull/546), with implementation through `8d1c36fe9`. The final whole-branch review and scoped correction review are approved. The PR's Verification section records the final release checks, required CI, merged commit and production deployment evidence; the local proof below does not substitute for those boundaries. Live Ads actions above are already applied. Google still reported all three replacement RSAs under review at `2026-09-09T14:58:45.989Z`.

Local proof includes 160 focused profit/attribution tests, 106 focused AI/loader/privacy tests, 47 marketing/compliance/hours tests, typecheck, focused lint and the 124-test documentation audit. The AI regressions exercise the installed SDK's expired-session rotation, cookie persistence when Web Storage is denied, failure when no durable marker is available, and marking only an accepted capture. Four delayed-import cases preserve the original comparison landing and classified source for instrumentation/provider entry points and UTM/referrer sources; two private-navigation cases suppress initialization or capture before SDK session access.

Public comparison checks cover 390-pixel mobile and 1440-pixel desktop layouts, light/dark appearance, all nine semantic rows, source links, no horizontal overflow and navigation to the certificate service. AI browser proof uses the real local app with all ingest requests intercepted and discarded: one event on an exact AI arrival, still one after reload, zero for ordinary passive and private visits, and no console errors. These are local observations, separate from deployment and provider-side acquisition results.

The release run first exposed a shared worktree dependency link, repaired with an isolated offline install of the unchanged frozen lockfile. It then identified unused exports left by the policy change; `63d9a0088` removes the obsolete date helper and separates the unchanged cash reducer from its data reader. The dead-code baseline remains unchanged at 2,301 findings. Final release outcomes and the actual comparison/measurement deployment timestamp are recorded in PR #546 so this pre-merge source receipt does not invent a future deployment result.

Rollback: revert the code through a PR; restore Scripts tROAS 1.50 or certificate schedules through an exact approved inverse packet if commercial evidence warrants it. Recreate removed negatives using their original text, match type and scope—removed Google criterion IDs cannot be re-enabled. Do not restore misleading old certificate copy as a rollback. No database migration, persistent environment change, new provider, clinical policy change or patient-record mutation is part of this release.
