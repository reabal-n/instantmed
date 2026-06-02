# Conversion Funnel Audit

Generated: 2026-06-02T05:43:52.164Z

## Executive Verdict

Paid search is not economically sustainable in the current 30-day window: $1,657.68 spend against $419.15 local Google-attributed net revenue. The immediate lever is not more funnel polish; it is stopping spend leakage while fixing the conversion and attribution breaks below.

Three-model panel status: gemini-gemini-3.5-flash=ok, opus-claude-opus-4-8 (anthropic-models-api)=ok, gpt-gpt-5-mini=ok. 3 model report(s) completed and were synthesized only where backed by artifacts or data.

## Funnel Table

| Segment | Spend | Clicks | Ads conv | Ads CPA | Local paid | Local CAC | Local net |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 30d Google Ads | $1,657.68 | 509 | 22 | $75.35 | 18 | $92.09 | $419.15 |
| 90d Google Ads | $2,138.81 | 691 | 22 | $97.22 | 18 | $118.82 | $419.15 |
| 30d medical-certificate | see Ads campaign extract | n/a | n/a | n/a | 21 | n/a | $768.50 |
| 30d erectile-dysfunction | see Ads campaign extract | n/a | n/a | n/a | 3 | n/a | $149.85 |
| 30d general | see Ads campaign extract | n/a | n/a | n/a | 2 | n/a | $49.95 |
| 30d repeat-prescriptions | see Ads campaign extract | n/a | n/a | n/a | 1 | n/a | $29.95 |

## Ranked Fix Backlog

### 1. P0 - Google Ads spend is far above local paid-order revenue.

- Evidence: 30d spend $1,657.68, local paid orders 18, local net revenue $419.15, local CAC $92.09.
- Affected service: All paid services
- Funnel stage: Ads auction and budget allocation
- CAC impact: Critical: current AOV cannot support the measured CAC.
- Compliance risk: Low
- Confidence: high
- Recommended fix: Pause or cap spend outside proven exact/high-intent terms, move bidding to local purchase truth, and do not scale until CAC is below service gross margin.
### 2. P0 - Attribution/event duplication and misalignment between Google Ads, PostHog, and Supabase making CAC unreliable

- Evidence: Google Ads 30d ads_conversions=22 spend=$1,657.68; PostHog (30d) google_ads_server_conversion=count=100; Supabase (30d) adAttributed=26 and paid=27; PostHog purchase_completed=6 vs purchase_completed_server=24
- Affected service: attribution
- Funnel stage: attribution
- CAC impact: Cannot reliably compute CAC (Google ads conversions 22 vs Supabase adAttributed 26 vs PostHog server conversions 100) — billing/bid decisions at risk of large errors and wasted spend
- Compliance risk: low with reason: measurement mismatch is not a regulatory compliance issue but critically impacts financial decisions
- Confidence: high
- Recommended fix: Stop duplicate server->Google conversion calls; map server conversions only to final Supabase paid rows, deduplicate by order id/gclid, align PostHog server events with Supabase paid (paid timestamp) and remove extra google_ads_server_conversion emissions until reconciled
### 3. P1 - Prescription landing page has a new-prescription CTA to the retired bare consult flow.

- Evidence: components/marketing/prescriptions-landing.tsx contains /request?service=consult; /request?service=consult now redirects to the service hub/services overview rather than a payable new-prescription intake.
- Affected service: Repeat prescriptions / new prescription secondary CTA
- Funnel stage: Landing CTA to intake
- CAC impact: Paid users looking for a new prescription can be sent into an ambiguous retired pathway, wasting clicks before checkout.
- Compliance risk: Medium: a generic consult CTA can revive a retired back-channel for gated services.
- Confidence: high
- Recommended fix: Replace the CTA with an explicit active pathway or remove it until a compliant structured new-prescription subtype exists.
### 4. P1 - Draft-to-intake conversion is low enough to indicate intake friction or recovery weakness.

- Evidence: 30d partial intakes 113, converted 0, recovery sent 5, stale recovery eligible approx 0.
- Affected service: All active request flows
- Funnel stage: Intake step progression and abandoned-draft recovery
- CAC impact: High: paid clicks are leaking before checkout creation.
- Compliance risk: Low
- Confidence: medium
- Recommended fix: Prioritize the highest-volume partial-intake steps in the report, shorten pre-payment fields where clinically safe, and tighten recovery eligibility/delivery metrics.
### 5. P1 - Database schema error prevents tracking and populating the 'public.intake_abandonment' table

- Evidence: Supabase Funnel (30d and 90d query errors): 'Could not find the table public.intake_abandonment in the schema cache'.
- Affected service: all
- Funnel stage: recovery
- CAC impact: Prevents recovery campaigns from correctly executing and retrieving abandoned carts, causing a lack of automated conversion uplift.
- Compliance risk: low with reason (Internal backend database schema error)
- Confidence: high
- Recommended fix: Run database migrations to generate the missing 'public.intake_abandonment' table and clear/reload the Supabase schema cache.
### 6. P1 - Massive intake abandonment with effectively zero recovery conversions

- Evidence: Supabase partial totals: count=113, converted=0, recoverySent=5, withEmail=19. certificate step alone count=70 converted=0. PostHog intake_started=383 but checkout_viewed=75 (30d); intake_abandoned_passive=50.
- Affected service: medical-certificate
- Funnel stage: intake
- CAC impact: ~80% of intake starts never reach checkout; given local_cac $92.09 and AOV ~$39.93, abandonment is the dominant CAC inflator. Recovering even a fraction materially lowers blended CAC.
- Compliance risk: low
- Confidence: high
- Recommended fix: Instrument per-step drop-off, capture email earlier (only 19/113 have email), and build a working recovery sequence; 0 converted from 5 recoverySent indicates broken or ineffective recovery.
### 7. P2 - Checkout-step abandoners with email are not being sent recovery

- Evidence: Supabase partial step checkout: count=7, withEmail=7, recoverySent=0, converted=0. review step: count=8, withEmail=8, recoverySent=1.
- Affected service: medical-certificate
- Funnel stage: recovery
- CAC impact: 15 highest-intent abandoners (review+checkout) with email captured are being left unrecovered; these are the cheapest incremental conversions available.
- Compliance risk: low
- Confidence: high
- Recommended fix: Prioritize automated recovery emails to checkout/review abandoners with email on file; measure recovered conversion rate.

## Immediate Ads Triage

1. Stop scaling until local paid-order CAC is below gross margin. Current 30d local CAC: $92.09.
2. Cap or pause campaigns/ad groups without local paid-order matches, even when Ads reports soft conversions.
3. Segment Search Partners separately and disable it unless it proves lower local CAC than Google Search.
4. Add negatives for low-intent or off-scope terms surfaced in the search-term extract; do not mutate live campaigns until approved.
5. Compare 30d vs 90d terms before re-enabling old terms; recent spend concentration is still not profitable.
6. Pause prescription-specific keyword ad groups and campaigns targeting the prescription landing page until the CTA redirection mismatch is corrected.
7. Do not scale med-cert campaigns: real local_cac $92.09 exceeds gross AOV $38.02; cap budget until intake conversion and CTA fixes ship.
8. Pause or reduce repeat-prescriptions paid traffic until the consult CTA dead-end is fixed (adAttributed=1, near-zero conversion).
9. Hold Smart Bidding / value-based bidding changes until google_ads_server_conversion overcounting (100 vs 27 real paid) is reconciled.
10. No live mutations performed; recommendations only.
11. Cap daily budgets on Google Ads immediately until attribution is reconciled
12. Pause or reduce bids for campaigns where reported local_cac ($92.09) > avg order value (~$40)
13. Add negatives for low-intent keywords and restrict broad match where CAC is high
14. Do not perform live creative/targeting mutations in this audit — only pause/cap is recommended

## Tracking Continuity

- `gclid`/UTM capture was verified via synthetic production landing captures and the attribution-continuity artifact.
- Deep intake captures block analytics/draft writes to prevent production pollution; use PostHog/Supabase extracts for real funnel counts.
- Server-side Google Ads conversion import remains the source of purchase truth; the report compares it against local paid-order match.
- Continuity artifact: [captures/medical-certificate-attribution-continuity-mobile/dom-evidence.json](captures/medical-certificate-attribution-continuity-mobile/dom-evidence.json) and [captures/medical-certificate-attribution-continuity-mobile/final.png](captures/medical-certificate-attribution-continuity-mobile/final.png).
- Supabase extract caveats: intake_abandonment: Could not find the table 'public.intake_abandonment' in the schema cache.

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
| hair-loss | landing | mobile | ok | [captures/hair-loss-landing-mobile/final.png](captures/hair-loss-landing-mobile/final.png) | [captures/hair-loss-landing-mobile/capture.webm](captures/hair-loss-landing-mobile/capture.webm) | [captures/hair-loss-landing-mobile/trace.zip](captures/hair-loss-landing-mobile/trace.zip) | console=0, failed_requests=1 |
| medical-certificate | attribution-continuity | mobile | ok | [captures/medical-certificate-attribution-continuity-mobile/final.png](captures/medical-certificate-attribution-continuity-mobile/final.png) | [captures/medical-certificate-attribution-continuity-mobile/capture.webm](captures/medical-certificate-attribution-continuity-mobile/capture.webm) | [captures/medical-certificate-attribution-continuity-mobile/trace.zip](captures/medical-certificate-attribution-continuity-mobile/trace.zip) | console=0, failed_requests=3 |
| medical-certificate | request-to-checkout | mobile | failed | [captures/medical-certificate-request-to-checkout-mobile/final.png](captures/medical-certificate-request-to-checkout-mobile/final.png) | [captures/medical-certificate-request-to-checkout-mobile/capture.webm](captures/medical-certificate-request-to-checkout-mobile/capture.webm) | [captures/medical-certificate-request-to-checkout-mobile/trace.zip](captures/medical-certificate-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| repeat-prescriptions | request-to-checkout | mobile | failed | [captures/repeat-prescriptions-request-to-checkout-mobile/final.png](captures/repeat-prescriptions-request-to-checkout-mobile/final.png) | [captures/repeat-prescriptions-request-to-checkout-mobile/capture.webm](captures/repeat-prescriptions-request-to-checkout-mobile/capture.webm) | [captures/repeat-prescriptions-request-to-checkout-mobile/trace.zip](captures/repeat-prescriptions-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| erectile-dysfunction | request-to-checkout | mobile | failed | [captures/erectile-dysfunction-request-to-checkout-mobile/final.png](captures/erectile-dysfunction-request-to-checkout-mobile/final.png) | [captures/erectile-dysfunction-request-to-checkout-mobile/capture.webm](captures/erectile-dysfunction-request-to-checkout-mobile/capture.webm) | [captures/erectile-dysfunction-request-to-checkout-mobile/trace.zip](captures/erectile-dysfunction-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |
| hair-loss | request-to-checkout | mobile | failed | [captures/hair-loss-request-to-checkout-mobile/final.png](captures/hair-loss-request-to-checkout-mobile/final.png) | [captures/hair-loss-request-to-checkout-mobile/capture.webm](captures/hair-loss-request-to-checkout-mobile/capture.webm) | [captures/hair-loss-request-to-checkout-mobile/trace.zip](captures/hair-loss-request-to-checkout-mobile/trace.zip) | console=1, failed_requests=0 |

## Model Reports

### gemini-gemini-3.5-flash

Status: ok

Raw model summary included an unsupported local-capture-as-production interpretation. Accepted findings below were filtered against the actual artifacts.

- P1: Prescription landing page has a CTA leading to a retired bare consult flow redirecting to the general service hub (high)
- P1: Database schema error prevents tracking and populating the 'public.intake_abandonment' table (high)
- P2: Severe attribution mapping discrepancies between server-side triggers, Google Ads, and local database orders (high)

Rejected unsupported or duplicate raw findings: 1.
### opus-claude-opus-4-8 (anthropic-models-api)

Status: ok

Raw model summary included an unsupported local-capture-as-production interpretation. Accepted findings below were filtered against the actual artifacts.

- P1: Prescription landing CTA routes to retired bare consult flow that redirects away from a payable intake (high)
- P1: Massive intake abandonment with effectively zero recovery conversions (high)
- P1: Conversion tracking fragmentation makes Ads CAC and optimization untrustworthy (high)
- P1: Missing intake_abandonment table breaks abandonment analytics pipeline (high)
- P2: Checkout-step abandoners with email are not being sent recovery (high)
- P2: CAC exceeds gross AOV on medical-certificate, core paid service is unprofitable per order (high)
- P3: Recurring single request failure on production landing captures (low)

### gpt-gpt-5-mini

Status: ok

Measurement and attribution wiring are unreliable and ads unit economics look loss-making; recovery and intake tracking gaps plus a retired CTA on prescription landing are preventing capture of obvious conversion volume.

- P0: Attribution/event duplication and misalignment between Google Ads, PostHog, and Supabase making CAC unreliable (high)
- P1: Ads unit economics appear negative: CAC materially exceeds average order value (high)
- P1: Prescription landing CTA points to retired bare consult flow (non-payable) instead of an active payable new-prescription intake (high)
- P1: Missing intake_abandonment table causing Supabase query errors and a blind spot for recovery (high)
- P2: High volume of partial intakes lack captured email addresses, limiting recovery potential (medium)

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
