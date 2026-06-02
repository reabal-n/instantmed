# Conversion Funnel Audit

Generated: 2026-06-02T08:46:29.769Z

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
### 2. P0 - Google Ads conversion signal is decoupled from real revenue: google_ads_server_conversion=100 and ads_conversions=22 vs only 27 total paid orders (18 ads-attributed) in 30d. purchase_completed (client)=6 vs purchase_completed_server=24 also disagree.

- Evidence: PostHog 30d: google_ads_server_conversion=100, purchase_completed=6, purchase_completed_server=24; Ads 30d ads_conversions=22 local_orders=18; Supabase 30d paid=27 adAttributed=26
- Affected service: all
- Funnel stage: attribution
- CAC impact: Smart Bidding optimizes on inflated 100 conversions vs ~18-27 real; true ads_cac is $92.71 local but reported ads_cpa $75.85 understates by ~22%. Misfeeding signal sustains overspend on low-value clicks.
- Compliance risk: low
- Confidence: high
- Recommended fix: Audit the server conversion upload pipeline; reconcile google_ads_server_conversion to deduped purchase_completed_server. Stop counting non-purchase events as conversions. Align Ads conversion action to one verified server purchase event before any budget increase.
### 3. P1 - Draft-to-intake conversion is low enough to indicate intake friction or recovery weakness.

- Evidence: 30d partial intakes 119, converted 0, recovery sent 6, stale recovery eligible approx 1.
- Affected service: All active request flows
- Funnel stage: Intake step progression and abandoned-draft recovery
- CAC impact: High: paid clicks are leaking before checkout creation.
- Compliance risk: Low
- Confidence: medium
- Recommended fix: Prioritize the highest-volume partial-intake steps in the report, shorten pre-payment fields where clinically safe, and tighten recovery eligibility/delivery metrics.
### 4. P1 - Recovery/abandonment program produces zero conversions despite 119 partials and 6 recovery emails sent; 21 partials have email captured but no recovered purchase.

- Evidence: Supabase 30d partial totals: count=119, converted=0, recoverySent=6, withEmail=21; abandonedEmailSent=8 at totals level
- Affected service: medical-certificate (75 of 119 partials at certificate step)
- Funnel stage: recovery
- CAC impact: 119 partials vs 27 paid = large recoverable pool. Even 10% recovery (~12 orders) at AOV ~$39.93 adds ~$479 net at near-zero CAC, materially lowering blended CAC.
- Compliance risk: low
- Confidence: high
- Recommended fix: Fix recovery email targeting/coverage: only 6 of 119 partials and 21 with email were contacted. Expand triggers to all email-captured partials, verify deliverability, add med-cert-specific recovery copy.
### 5. P1 - Massive intake-to-checkout funnel drop: intake_started=384, step_completed=1308, checkout_viewed=75, paid=27 (30d). ~80% of those who view checkout do not pay.

- Evidence: PostHog 30d: intake_started=384, checkout_viewed=75; Supabase paid=27, paidRate=0.7297; failedPayment=2, pendingPayment=1
- Affected service: medical-certificate
- Funnel stage: checkout
- CAC impact: Only ~20% (75/384) reach checkout. Recovering intake->checkout to 30% could roughly double orders without added spend, halving effective CAC.
- Compliance risk: low
- Confidence: medium
- Recommended fix: Instrument step-level drop-off between step_completed and checkout_viewed; identify which intake step (certificate step holds 75 partials) sheds users; reduce required fields / clarify pricing pre-checkout.
### 6. P2 - Inverted funnel event logic and duplicate payment completions reported in analytics

- Evidence: PostHog 30d metrics show 83 'intake_funnel_payment_completed' events but only 38 'intake_funnel_payment_initiated' and 'intake_funnel_intake_started' events.
- Affected service: all
- Funnel stage: checkout
- CAC impact: Distorts conversion funnel visualization and reporting, rendering quantitative optimizations of checkout layout impossible.
- Compliance risk: low with reason: Analytics tracking bug only.
- Confidence: high
- Recommended fix: Add idempotent event tracking or state checks on the payment completion client trigger to prevent multi-firing on page refreshes or automatic redirect polls.
### 7. P2 - Static partial step tracking database queries preventing recovery automation flow updates

- Evidence: Supabase 30d and 90d partial totals are identical down to every integer (e.g., both show count=119, withEmail=21, certificate=75, medication=14).
- Affected service: all
- Funnel stage: recovery
- CAC impact: Indicates that cart recovery emails (recoverySent) are not executing dynamically for fresh drop-offs, directly lowering potential revenue and increasing CAC.
- Compliance risk: low with reason: Cart recovery cron failure only.
- Confidence: high
- Recommended fix: Audit the Supabase cron job or PostgreSQL query tracking partial completions to ensure date filtering parameter (30d vs 90d) is correctly parsed and not returning cached static datasets.
### 8. P2 - Refunds concentrated and notable: general service refunded 1 of 2 orders (50%), 30d total refundAud=$79.90 on netAud=$998.25.

- Evidence: Supabase 30d service general: paid=2 refunded=1 refundAud=49.95; totals refunded=2 refundAud=79.9
- Affected service: general
- Funnel stage: checkout
- CAC impact: High refund rate on general erodes net revenue and signals possible expectation mismatch; small volume limits dollar impact now but scales badly.
- Compliance risk: medium - refunds may indicate service/clinical expectation mismatch worth review
- Confidence: medium
- Recommended fix: Review general-service refund reasons; clarify scope/eligibility on landing and pre-payment. Low volume so monitor rather than act on spend.
### 9. P2 - High partial/abandonment volume with limited recovery

- Evidence: Supabase 30d partial totals: count=119 converted=0 recoverySent=6 withEmail=21; many partial-step counts (certificate=75, medication=14, checkout=7) with converted=0
- Affected service: intake|recovery
- Funnel stage: intake|recovery
- CAC impact: Large number of unfinished intakes wastes acquisition spend and depresses conversion rate; low recovery sends means recoverable revenue is being lost
- Compliance risk: low with reason: abandonment is a business performance issue, not a compliance violation in the evidence
- Confidence: medium
- Recommended fix: Increase recovery coverage: capture email earlier in flow, send automated abandoned-intake emails/SMS for all partials, instrument and A/B test earlier email capture and visible CTA to complete checkout.
### 10. P3 - Failed payments and refunds present but low-volume

- Evidence: Supabase 30d failedPayment=2 refunded=2 refundAud=79.9; 90d failedPayment=5 refunded=4 refundAud=119.8
- Affected service: checkout|payments
- Funnel stage: checkout
- CAC impact: Small effect on CAC now; if systemic could increase churn and support costs
- Compliance risk: low with reason: small number of refunds/failures documented, no evidence of data breach
- Confidence: high
- Recommended fix: Inspect payment gateway logs for failure reasons, add retry/clear error messages, surface payment failure reasons to users and recovery emails.

## Immediate Ads Triage

1. Stop scaling until local paid-order CAC is below gross margin. Current 30d local CAC: $92.71.
2. Cap or pause campaigns/ad groups without local paid-order matches, even when Ads reports soft conversions.
3. Segment Search Partners separately and disable it unless it proves lower local CAC than Google Search.
4. Add negatives for low-intent or off-scope terms surfaced in the search-term extract; do not mutate live campaigns until approved.
5. Compare 30d vs 90d terms before re-enabling old terms; recent spend concentration is still not profitable.
6. Avoid using automated Target CPA or Maximize Conversions bidding models while the server conversion pixel is frozen at 100 events, as the algorithm will optimize on stale data.
7. Do not increase budgets until the conversion signal discrepancy (100 server conversions vs ~27 real paid) is reconciled - current Smart Bidding is likely optimizing on inflated data.
8. Recommend holding med-cert spend flat and adding negative review only after intake->checkout instrumentation identifies the drop step; no live mutation approved.
9. Consider capping spend on keywords feeding only med-cert until blended AOV/CAC improves; evaluate reallocation to ED/general after landing-page conversion is verified.
10. No live Ads mutations performed or approved in this audit.
11. Cap budgets on campaigns where reported local_CAC > observed avgOrderValue (Google Ads 30d local_cac=$92.71 vs Supabase avgOrderValueAud=39.93).
12. Avoid aggressive bidding/expansion while server-side conversion counts are inconsistent (google_ads_server_conversion=100 vs Ads conversions=22).

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
| medical-certificate | landing | mobile | ok | [captures/medical-certificate-landing-mobile/final.png](captures/medical-certificate-landing-mobile/final.png) | [captures/medical-certificate-landing-mobile/capture.webm](captures/medical-certificate-landing-mobile/capture.webm) | [captures/medical-certificate-landing-mobile/trace.zip](captures/medical-certificate-landing-mobile/trace.zip) | console=0, failed_requests=1 |
| repeat-prescriptions | landing | desktop | ok | [captures/repeat-prescriptions-landing-desktop/final.png](captures/repeat-prescriptions-landing-desktop/final.png) | [captures/repeat-prescriptions-landing-desktop/capture.webm](captures/repeat-prescriptions-landing-desktop/capture.webm) | [captures/repeat-prescriptions-landing-desktop/trace.zip](captures/repeat-prescriptions-landing-desktop/trace.zip) | console=0, failed_requests=1 |
| repeat-prescriptions | landing | mobile | ok | [captures/repeat-prescriptions-landing-mobile/final.png](captures/repeat-prescriptions-landing-mobile/final.png) | [captures/repeat-prescriptions-landing-mobile/capture.webm](captures/repeat-prescriptions-landing-mobile/capture.webm) | [captures/repeat-prescriptions-landing-mobile/trace.zip](captures/repeat-prescriptions-landing-mobile/trace.zip) | console=0, failed_requests=1 |
| erectile-dysfunction | landing | desktop | ok | [captures/erectile-dysfunction-landing-desktop/final.png](captures/erectile-dysfunction-landing-desktop/final.png) | [captures/erectile-dysfunction-landing-desktop/capture.webm](captures/erectile-dysfunction-landing-desktop/capture.webm) | [captures/erectile-dysfunction-landing-desktop/trace.zip](captures/erectile-dysfunction-landing-desktop/trace.zip) | console=0, failed_requests=1 |
| erectile-dysfunction | landing | mobile | ok | [captures/erectile-dysfunction-landing-mobile/final.png](captures/erectile-dysfunction-landing-mobile/final.png) | [captures/erectile-dysfunction-landing-mobile/capture.webm](captures/erectile-dysfunction-landing-mobile/capture.webm) | [captures/erectile-dysfunction-landing-mobile/trace.zip](captures/erectile-dysfunction-landing-mobile/trace.zip) | console=0, failed_requests=1 |
| hair-loss | landing | desktop | ok | [captures/hair-loss-landing-desktop/final.png](captures/hair-loss-landing-desktop/final.png) | [captures/hair-loss-landing-desktop/capture.webm](captures/hair-loss-landing-desktop/capture.webm) | [captures/hair-loss-landing-desktop/trace.zip](captures/hair-loss-landing-desktop/trace.zip) | console=0, failed_requests=1 |
| hair-loss | landing | mobile | ok | [captures/hair-loss-landing-mobile/final.png](captures/hair-loss-landing-mobile/final.png) | [captures/hair-loss-landing-mobile/capture.webm](captures/hair-loss-landing-mobile/capture.webm) | [captures/hair-loss-landing-mobile/trace.zip](captures/hair-loss-landing-mobile/trace.zip) | console=0, failed_requests=0 |
| medical-certificate | attribution-continuity | mobile | ok | [captures/medical-certificate-attribution-continuity-mobile/final.png](captures/medical-certificate-attribution-continuity-mobile/final.png) | [captures/medical-certificate-attribution-continuity-mobile/capture.webm](captures/medical-certificate-attribution-continuity-mobile/capture.webm) | [captures/medical-certificate-attribution-continuity-mobile/trace.zip](captures/medical-certificate-attribution-continuity-mobile/trace.zip) | console=0, failed_requests=3 |
| medical-certificate | request-to-checkout | mobile | failed | [captures/medical-certificate-request-to-checkout-mobile/final.png](captures/medical-certificate-request-to-checkout-mobile/final.png) | [captures/medical-certificate-request-to-checkout-mobile/capture.webm](captures/medical-certificate-request-to-checkout-mobile/capture.webm) | [captures/medical-certificate-request-to-checkout-mobile/trace.zip](captures/medical-certificate-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| repeat-prescriptions | request-to-checkout | mobile | failed | [captures/repeat-prescriptions-request-to-checkout-mobile/final.png](captures/repeat-prescriptions-request-to-checkout-mobile/final.png) | [captures/repeat-prescriptions-request-to-checkout-mobile/capture.webm](captures/repeat-prescriptions-request-to-checkout-mobile/capture.webm) | [captures/repeat-prescriptions-request-to-checkout-mobile/trace.zip](captures/repeat-prescriptions-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| erectile-dysfunction | request-to-checkout | mobile | failed | [captures/erectile-dysfunction-request-to-checkout-mobile/final.png](captures/erectile-dysfunction-request-to-checkout-mobile/final.png) | [captures/erectile-dysfunction-request-to-checkout-mobile/capture.webm](captures/erectile-dysfunction-request-to-checkout-mobile/capture.webm) | [captures/erectile-dysfunction-request-to-checkout-mobile/trace.zip](captures/erectile-dysfunction-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| hair-loss | request-to-checkout | mobile | failed | [captures/hair-loss-request-to-checkout-mobile/final.png](captures/hair-loss-request-to-checkout-mobile/final.png) | [captures/hair-loss-request-to-checkout-mobile/capture.webm](captures/hair-loss-request-to-checkout-mobile/capture.webm) | [captures/hair-loss-request-to-checkout-mobile/trace.zip](captures/hair-loss-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |

## Model Reports

### gemini-gemini-3.5-flash

Status: ok

Critical mobile intake script failures are blocking checkout conversions, compounded by frozen attribution reporting and flawed funnel measurement logic.

- P1: Server-side conversion and ad attribution tracking are frozen, hiding real performance metrics (high)
- P2: Inverted funnel event logic and duplicate payment completions reported in analytics (high)
- P2: Static partial step tracking database queries preventing recovery automation flow updates (high)

Rejected unsupported or duplicate raw findings: 1.
### opus-claude-opus-4-8 (anthropic-models-api)

Status: ok

Funnel reveals a severe intake-to-purchase collapse (75 checkout views -> 27 paid in 30d) concentrated in medical-certificate, plus serious measurement integrity problems: Google Ads server conversions (100) and ads-reported conversions (22) wildly diverge from actual paid orders (27 total, 18 ads-attributed local), inflating CAC truth. Recovery email program is effectively dead (0 conversions from 119 partials). Request-to-checkout captures failed across all services with console errors, indicating a likely intake progression defect that warrants manual verification before scaling spend.

- P0: Google Ads conversion signal is decoupled from real revenue: google_ads_server_conversion=100 and ads_conversions=22 vs only 27 total paid orders (18 ads-attributed) in 30d. purchase_completed (client)=6 vs purchase_completed_server=24 also disagree. (high)
- P1: Recovery/abandonment program produces zero conversions despite 119 partials and 6 recovery emails sent; 21 partials have email captured but no recovered purchase. (high)
- P1: Massive intake-to-checkout funnel drop: intake_started=384, step_completed=1308, checkout_viewed=75, paid=27 (30d). ~80% of those who view checkout do not pay. (medium)
- P2: Spend concentrated on medical-certificate keywords while higher-AOV services (ED $49.95, general $49.95) get near-zero ad attribution (adAttributed=0). (low)
- P2: Refunds concentrated and notable: general service refunded 1 of 2 orders (50%), 30d total refundAud=$79.90 on netAud=$998.25. (medium)
- P3: Persistent requestFailures=1 on all landing page captures (desktop+mobile), excluding hair-loss mobile. (low)

Rejected unsupported or duplicate raw findings: 1.
### gpt-gpt-5-mini

Status: ok

Raw model summary included an unsupported local-capture-as-production interpretation. Accepted findings below were filtered against the actual artifacts.

- P0: Unit economics are negative: CAC materially exceeds order value (high)
- P1: Attribution wiring inconsistent between systems (Google Ads, PostHog, Supabase) (high)
- P1: Client/server event duplication and missing client events (high)
- P2: High partial/abandonment volume with limited recovery (medium)
- P3: Failed payments and refunds present but low-volume (high)

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