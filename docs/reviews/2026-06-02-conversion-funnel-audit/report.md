# Conversion Funnel Audit

Generated: 2026-06-02T09:15:45.621Z

## Executive Verdict

Paid search is not economically sustainable in the current 30-day window: $1,668.80 spend against $419.15 local Google-attributed net revenue. The immediate lever is not more funnel polish; it is stopping spend leakage while fixing the conversion and attribution breaks below.

Three-model panel status: gemini-gemini-3.5-flash=ok, opus-claude-opus-4-8 (anthropic-models-api)=ok, gpt-gpt-5-mini=ok. 3 model report(s) completed and were synthesized only where backed by artifacts or data.

## Funnel Table

| Segment | Spend | Clicks | Ads conv | Ads CPA | Local paid | Local CAC | Local net |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30d Google Ads | $1,668.80 | 511 | 22 | $75.85 | 18 | $92.71 | $419.15 |
| 90d Google Ads | $2,149.93 | 693 | 22 | $97.72 | 18 | $119.44 | $419.15 |
| 30d medical-certificate | see Ads campaign extract | n/a | n/a | n/a | 21 | n/a | $768.50 |
| 30d erectile-dysfunction | see Ads campaign extract | n/a | n/a | n/a | 3 | n/a | $149.85 |
| 30d general | see Ads campaign extract | n/a | n/a | n/a | 2 | n/a | $49.95 |
| 30d repeat-prescriptions | see Ads campaign extract | n/a | n/a | n/a | 1 | n/a | $29.95 |

## Ranked Fix Backlog

### 1. P0 - Google Ads spend is far above local paid-order revenue.

- Evidence: 30d spend $1,668.80, local paid orders 18, local net revenue $419.15, local CAC $92.71.
- Affected service: All paid services
- Funnel stage: Ads auction and budget allocation
- CAC impact: Critical: current AOV cannot support the measured CAC.
- Compliance risk: Low
- Confidence: high
- Recommended fix: Pause or cap spend outside proven exact/high-intent terms, move bidding to local purchase truth, and do not scale until CAC is below service gross margin.
### 2. P0 - Recovery funnel converts 0 of 119 partial intakes despite 6 recovery emails and 21 captured emails. Zero recovered revenue across both 30d and 90d.

- Evidence: 30d & 90d partial totals: count=119, converted=0, recoverySent=6, withEmail=21; abandonedEmailSent=8 (30d) with converted=0
- Affected service: medical-certificate (75 of 119 partials at certificate step)
- Funnel stage: recovery
- CAC impact: 119 abandoned intakes at AOV ~$38-40 = ~$4,500 recoverable pipeline fully lost. Recovery sends are firing but converting nobody, wasting the abandonment capture investment.
- Compliance risk: low
- Confidence: high
- Recommended fix: Verify recovery email links resume the correct intake/session; only 21 of 119 partials have emails captured, so move email capture earlier (before certificate step). Test the recovery link end-to-end against checkout.
### 3. P0 - Attribution tracking pipeline broken/frozen, resulting in zero new ad-attributed orders recorded in Supabase or Google Ads over the last 60 days.

- Evidence: Supabase 30d and 90d 'adAttributed' counts are frozen at exactly 26. Google Ads 30d and 90d conversions are identical at 22, and 'local_orders' is identical at 18, despite Supabase showing 50 new paid orders (77 in 90d vs 27 in 30d).
- Affected service: attribution
- Funnel stage: attribution
- CAC impact: Artificially inflates local CAC from $92.71 to $119.44 (a 28.8% increase) and starves Google Ads Smart Bidding algorithms of critical conversion data.
- Compliance risk: low
- Confidence: high
- Recommended fix: Implement persistent client-side storage (e.g., localStorage) for UTM and gclid parameters on landing page load, and ensure they are attached to the API payload during intake creation and synced back via Google Ads Offline Conversion Tracking.
### 4. P2 - Database logging of partials/drafts and recovery email triggers are completely frozen.

- Evidence: 30d and 90d partial totals are identical down to the exact integer (count=119, converted=0, expired=3, recoverySent=6, withEmail=21), indicating no new drafts have been saved or processed in the last 60 days.
- Affected service: recovery
- Funnel stage: recovery
- CAC impact: Completely disables the abandoned cart recovery mechanism, resulting in 0% recovery conversion rate for highly qualified warm leads.
- Compliance risk: low
- Confidence: high
- Recommended fix: Repair the database triggers or serverless cron jobs responsible for capturing partial intake states and launching email recovery templates.
### 5. P2 - Medical-certificate carries disproportionate refund and abandonment load; paidRate 0.6774 (30d) vs 1.0 for ED/general/repeat-scripts.

- Evidence: 30d medical-certificate: paidRate=0.6774, refunded=1, refundAud=29.95, abandonedEmailSent=8; other services paidRate=1.0
- Affected service: medical-certificate
- Funnel stage: intake
- CAC impact: med-cert is the only ad-attributed service (adAttributed=25 of 26) yet has lowest paid rate, so ad spend funds the weakest-converting funnel. Higher-AOV ED ($49.95) gets zero ad support.
- Compliance risk: medium
- Confidence: medium
- Recommended fix: Consider testing ad budget allocation toward ED/repeat-scripts which convert at 100%; investigate med-cert refund driver (eligibility rejection) to reduce wasted paid intakes.
### 6. P2 - Low recovery email coverage relative to partials; abandonedEmailSent appears small vs partial withEmail.

- Evidence: Supabase 30d: abandonedEmailSent=8 partial totals: count=119 withEmail=21 recoverySent=6
- Affected service: recovery
- Funnel stage: recovery
- CAC impact: Low recovery throughput wastes existing acquisition spend — improving recovery could increase conversion rate and lower effective CAC.
- Compliance risk: low with reason
- Confidence: medium
- Recommended fix: Increase abandoned-cart/recovery email triggers and cadence, ensure gclid/email captured at first step, and A/B test recovery timing and subject lines. Use the 21 withEmail partials as primary recovery targets.

## Immediate Ads Triage

1. Stop scaling until local paid-order CAC is below gross margin. Current 30d local CAC: $92.71.
2. Cap or pause campaigns/ad groups without local paid-order matches, even when Ads reports soft conversions.
3. Segment Search Partners separately and disable it unless it proves lower local CAC than Google Search.
4. Add negatives for low-intent or off-scope terms surfaced in the search-term extract; do not mutate live campaigns until approved.
5. Compare 30d vs 90d terms before re-enabling old terms; recent spend concentration is still not profitable.
6. Temporarily cap daily Google Ads spend or switch from CPA/Maximize Conversions to Maximize Clicks/Manual CPC bidding to prevent budget waste while conversion tracking is broken.
7. Do not scale budget on high-performing keyword sets until attribution parameters are successfully persisting to Supabase and syncing to Google Ads.
8. Do NOT scale spend until server conversion inflation (100 vs ~27 real) is reconciled — Smart Bidding is optimizing on bad signal (no live mutation performed).
9. Recommend capping med-cert spend pending refund/paidRate investigation (0.6774 paid rate absorbs nearly all ad budget).
10. Recommend testing reallocation toward ED/repeat-scripts (100% paid rate, higher AOV) once checkout capture failures are cleared.
11. Add negative-keyword review only after re-running production checkout captures; no keyword data quality issues evidenced yet.
12. Pause or heavily cap Google search/conversion campaigns until attribution and server-side conversion deduplication are fixed (evidence: Google Ads 30d ads_cpa=$75.85 local_cac=$92.71 vs AOV ~$39.93).
13. Do not create new bid or conversion-based optimisations until conversion events are reconciled (PostHog google_ads_server_conversion=100 vs Google ads_conversions=22).
14. If immediate pause is not acceptable, reduce daily budgets materially and run a small validation budget only after fixes.

## Tracking Continuity

- `gclid`/UTM capture was verified via synthetic production landing captures and the attribution-continuity artifact.
- Deep intake captures block analytics/draft writes to prevent production pollution; use PostHog/Supabase extracts for real funnel counts.
- Server-side Google Ads conversion import remains the source of purchase truth; the report compares it against local paid-order match.
- Continuity artifact: [captures/medical-certificate-attribution-continuity-mobile/dom-evidence.json](captures/medical-certificate-attribution-continuity-mobile/dom-evidence.json) and [captures/medical-certificate-attribution-continuity-mobile/final.png](captures/medical-certificate-attribution-continuity-mobile/final.png).

## Browser Evidence

Video links point to generated local `.webm` captures in this workspace. The repository review policy intentionally keeps those videos out of git; screenshots, traces, HARs, DOM evidence, model reports, and data extracts are the committed evidence.

| Service | Journey | Viewport | Status | Screenshot | Video | Trace | Notes |
|---|---|---:|---|---|---|---|---|
| medical-certificate | landing | desktop | ok | [captures/medical-certificate-landing-desktop/final.png](captures/medical-certificate-landing-desktop/final.png) | [captures/medical-certificate-landing-desktop/capture.webm](captures/medical-certificate-landing-desktop/capture.webm) | [captures/medical-certificate-landing-desktop/trace.zip](captures/medical-certificate-landing-desktop/trace.zip) | console=0, failed_requests=1 |
| medical-certificate | landing | mobile | ok | [captures/medical-certificate-landing-mobile/final.png](captures/medical-certificate-landing-mobile/final.png) | [captures/medical-certificate-landing-mobile/capture.webm](captures/medical-certificate-landing-mobile/capture.webm) | [captures/medical-certificate-landing-mobile/trace.zip](captures/medical-certificate-landing-mobile/trace.zip) | console=0, failed_requests=3 |
| repeat-prescriptions | landing | desktop | ok | [captures/repeat-prescriptions-landing-desktop/final.png](captures/repeat-prescriptions-landing-desktop/final.png) | [captures/repeat-prescriptions-landing-desktop/capture.webm](captures/repeat-prescriptions-landing-desktop/capture.webm) | [captures/repeat-prescriptions-landing-desktop/trace.zip](captures/repeat-prescriptions-landing-desktop/trace.zip) | console=0, failed_requests=1 |
| repeat-prescriptions | landing | mobile | ok | [captures/repeat-prescriptions-landing-mobile/final.png](captures/repeat-prescriptions-landing-mobile/final.png) | [captures/repeat-prescriptions-landing-mobile/capture.webm](captures/repeat-prescriptions-landing-mobile/capture.webm) | [captures/repeat-prescriptions-landing-mobile/trace.zip](captures/repeat-prescriptions-landing-mobile/trace.zip) | console=0, failed_requests=1 |
| erectile-dysfunction | landing | desktop | ok | [captures/erectile-dysfunction-landing-desktop/final.png](captures/erectile-dysfunction-landing-desktop/final.png) | [captures/erectile-dysfunction-landing-desktop/capture.webm](captures/erectile-dysfunction-landing-desktop/capture.webm) | [captures/erectile-dysfunction-landing-desktop/trace.zip](captures/erectile-dysfunction-landing-desktop/trace.zip) | console=0, failed_requests=1 |
| erectile-dysfunction | landing | mobile | ok | [captures/erectile-dysfunction-landing-mobile/final.png](captures/erectile-dysfunction-landing-mobile/final.png) | [captures/erectile-dysfunction-landing-mobile/capture.webm](captures/erectile-dysfunction-landing-mobile/capture.webm) | [captures/erectile-dysfunction-landing-mobile/trace.zip](captures/erectile-dysfunction-landing-mobile/trace.zip) | console=0, failed_requests=1 |
| hair-loss | landing | desktop | ok | [captures/hair-loss-landing-desktop/final.png](captures/hair-loss-landing-desktop/final.png) | [captures/hair-loss-landing-desktop/capture.webm](captures/hair-loss-landing-desktop/capture.webm) | [captures/hair-loss-landing-desktop/trace.zip](captures/hair-loss-landing-desktop/trace.zip) | console=0, failed_requests=2 |
| hair-loss | landing | mobile | ok | [captures/hair-loss-landing-mobile/final.png](captures/hair-loss-landing-mobile/final.png) | [captures/hair-loss-landing-mobile/capture.webm](captures/hair-loss-landing-mobile/capture.webm) | [captures/hair-loss-landing-mobile/trace.zip](captures/hair-loss-landing-mobile/trace.zip) | console=0, failed_requests=1 |
| medical-certificate | attribution-continuity | mobile | ok | [captures/medical-certificate-attribution-continuity-mobile/final.png](captures/medical-certificate-attribution-continuity-mobile/final.png) | [captures/medical-certificate-attribution-continuity-mobile/capture.webm](captures/medical-certificate-attribution-continuity-mobile/capture.webm) | [captures/medical-certificate-attribution-continuity-mobile/trace.zip](captures/medical-certificate-attribution-continuity-mobile/trace.zip) | console=0, failed_requests=4 |
| medical-certificate | request-to-checkout | mobile | failed | [captures/medical-certificate-request-to-checkout-mobile/final.png](captures/medical-certificate-request-to-checkout-mobile/final.png) | [captures/medical-certificate-request-to-checkout-mobile/capture.webm](captures/medical-certificate-request-to-checkout-mobile/capture.webm) | [captures/medical-certificate-request-to-checkout-mobile/trace.zip](captures/medical-certificate-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| repeat-prescriptions | request-to-checkout | mobile | failed | [captures/repeat-prescriptions-request-to-checkout-mobile/final.png](captures/repeat-prescriptions-request-to-checkout-mobile/final.png) | [captures/repeat-prescriptions-request-to-checkout-mobile/capture.webm](captures/repeat-prescriptions-request-to-checkout-mobile/capture.webm) | [captures/repeat-prescriptions-request-to-checkout-mobile/trace.zip](captures/repeat-prescriptions-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| erectile-dysfunction | request-to-checkout | mobile | failed | [captures/erectile-dysfunction-request-to-checkout-mobile/final.png](captures/erectile-dysfunction-request-to-checkout-mobile/final.png) | [captures/erectile-dysfunction-request-to-checkout-mobile/capture.webm](captures/erectile-dysfunction-request-to-checkout-mobile/capture.webm) | [captures/erectile-dysfunction-request-to-checkout-mobile/trace.zip](captures/erectile-dysfunction-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| hair-loss | request-to-checkout | mobile | failed | [captures/hair-loss-request-to-checkout-mobile/final.png](captures/hair-loss-request-to-checkout-mobile/final.png) | [captures/hair-loss-request-to-checkout-mobile/capture.webm](captures/hair-loss-request-to-checkout-mobile/capture.webm) | [captures/hair-loss-request-to-checkout-mobile/trace.zip](captures/hair-loss-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |

## Model Reports

### gemini-gemini-3.5-flash

Status: ok

Severe tracking and attribution freeze detected alongside mobile intake failures, inflating reported CAC by 28.8% and starving Google Ads algorithms.

- P0: Attribution tracking pipeline broken/frozen, resulting in zero new ad-attributed orders recorded in Supabase or Google Ads over the last 60 days. (high)
- P2: Database logging of partials/drafts and recovery email triggers are completely frozen. (high)

Rejected unsupported or duplicate raw findings: 1.
### opus-claude-opus-4-8 (anthropic-models-api)

Status: ok

InstantMed's funnel is leaking spend through severe attribution inflation (Google Ads reporting ~100 server conversions vs 18-27 real paid orders) and a recovery system that converts 0 of 119 abandoned intakes. Medical-certificate dominates volume but carries all the abandonment and refund risk. Request-to-checkout captures failed with console errors across all four services, warranting investigation but not yet confirmed as a live user outage.

- P0: Google Ads server conversion count (100) grossly exceeds actual paid orders (Supabase 30d paid=27, local_orders=18). Conversion signal sent to Ads is inflated ~4-5x. (high)
- P0: Recovery funnel converts 0 of 119 partial intakes despite 6 recovery emails and 21 captured emails. Zero recovered revenue across both 30d and 90d. (high)
- P1: Massive top-of-funnel drop: 384 intake_started vs 75 checkout_viewed vs 6 client purchase_completed (30d). Only ~20% reach checkout. (medium)
- P2: Medical-certificate carries disproportionate refund and abandonment load; paidRate 0.6774 (30d) vs 1.0 for ED/general/repeat-scripts. (medium)
- P3: Ads spend efficiency degrades over window: 90d local_cac=$119.44 vs 30d local_cac=$92.71, with identical order counts (18) across both windows. (medium)

Rejected unsupported or duplicate raw findings: 2.
### gpt-gpt-5-mini

Status: ok

Ads are losing money and measurement is broken. High CAC > AOV plus multiple attribution/count mismatches and request-to-checkout automation failures need urgent fixes before scaling spend.

- P0: Ads unit economics are negative (CAC materially exceeds AOV). (high)
- P0: Attribution/measurement mismatch and probable duplicate server-side conversions are inflating or misreporting conversions. (high)
- P1: Large intake/request drop-offs; many partials are not converted and recovery is limited. (medium)
- P2: Low recovery email coverage relative to partials; abandonedEmailSent appears small vs partial withEmail. (medium)
- P2: Revenue and conversion counts do not reconcile across systems (Google Ads, PostHog, Supabase). (high)

Rejected unsupported or duplicate raw findings: 1.

## Data Extracts

- [Google Ads 30d](data/google-ads-30d.json)
- [Google Ads 90d](data/google-ads-90d.json)
- [Supabase funnel 30d](data/supabase-funnel-30d.json)
- [Supabase funnel 90d](data/supabase-funnel-90d.json)
- [PostHog 30d](data/posthog-30d.json)
- [PostHog 90d](data/posthog-90d.json)
- [Evidence pack](data/evidence-pack.json)

## Safety Notes

- No Google Ads campaign mutations were made.
- No live card charge was attempted.
- Production landing/attribution captures did not submit clinical forms; local request captures blocked draft and analytics writes.
- Artifacts use synthetic patient data only, and text/JSON outputs redact emails, phone numbers, click IDs, UUIDs, Stripe identifiers, and payment/session tokens.
- Capture videos remain local `.webm` files under the audit directory because `docs/reviews/.gitignore` intentionally excludes reproducible browser videos.