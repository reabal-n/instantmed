# Advertising Compliance

> Canonical advertising rules for InstantMed marketing, Google Ads, landing pages, metadata, schema, and reusable copy.
> Read this before changing any public acquisition surface.

**Last updated:** 2026-07-27

> **In an active complaint?** Stop and load the runbook before doing anything else: [`docs/runbooks/comparative-tagline-complaint.md`](runbooks/comparative-tagline-complaint.md). It covers AHPRA notifications, TGA notices, Medical Board letters, Google Ads disapprovals, competitor cease-and-desists, patient complaints about ad copy, and media inquiries.

---

## 1. Current Certification Status

| Item | Status |
|------|--------|
| LegitScript Healthcare Merchant Certification | Approved, Cert ID 48400566 |
| Google Ads account | Approved for Online Pharmacy Certification / healthcare promotion |
| Google Ads customer ID | 920-501-0513 |
| Google support ticket | 4-3698000041178 |
| Google support note | Certification approved and previous restrictions lifted. Ads may need manual resubmission or editing to trigger review. |
| Australia — prescription drug services | Service promotion allowed with limitations when certification and local-law requirements are satisfied |

Google certification makes InstantMed eligible to promote certified telemedicine services in Australia under Google's platform limits. **Google certification eligibility is not TGA clearance.** Australian health-service advertising must still avoid directly or indirectly referring to prescription medicines. InstantMed therefore applies a stricter operator rule: **Medicine-name and active-ingredient keywords are OFF.** Service and condition vocabulary remains allowed subject to the rules below.

Certification is not blanket approval for all wording. Every ad, asset, keyword, landing page, destination URL, schema field, and audience setting still needs to comply with Google, AHPRA/Medical Board, TGA, privacy, and consumer-law rules.

**Eligible (Limited) is compatible with certified healthcare serving.** The Google Ads API equivalent, `APPROVED_LIMITED`, is expected for certified healthcare inventory and is not by itself a reason to pause a compliant ad. The unacceptable live states are `PROHIBITED`, disapproved, misleading-price, or unsubstantiated variants. The certification label does not remove Google's healthcare inventory restrictions, prescription-drug-service classification, or the need to resubmit or edit assets when a fresh policy review is required.

## 2. Measurement Requirements

Paid Google traffic must keep Google Ads auto-tagging on and use an account-level or campaign-level final URL suffix with non-clinical diagnostics:

`utm_source=google&utm_medium=cpc&utm_id={campaignid}&campaignid={campaignid}&adgroupid={adgroupid}&keyword={keyword}&creative={creative}&matchtype={matchtype}&device={device}&network={network}`

Do not put prescription medicine names, diagnoses, or patient-specific terms into manual URL parameters. If a tracking template is required later, it must preserve the landing URL with `{lpurl}`.

Paid conversions are uploaded from the Stripe webhook through `lib/analytics/google-ads-post-payment.ts`. Data Manager API is the rollout path when `GOOGLE_DATA_MANAGER_CONVERSIONS_ENABLED=true`; the legacy Google Ads API upload path remains an explicit fallback while reporting/preflight still use Google Ads API where useful. Every Google-looking paid intake must produce a PHI-safe `audit_logs.action = google_ads_conversion_upload` row. Data Manager rows store the returned `request_id` and `upload_identifier`; legacy rows may also store `upload_job_id`. `/api/cron/google-ads-conversions` runs hourly to retry failed or missing uploads from Supabase payment truth. Server uploads must use the stored payment time, drop expired click identifiers when enhanced-conversion user data is available, and treat click-window expiry as terminal rather than re-uploading the same stale identifier.

`GOOGLE_ADS_CONVERSION_ACTION_PURCHASE` must be an offline click-import conversion action with Google Ads type `UPLOAD_CLICKS`. Do not use the browser website purchase/tag conversion action ID here. This server-side offline import is the canonical Primary purchase conversion for paid bidding because it is fed from Stripe/Supabase payment truth and deduped by intake/payment identifiers. Browser website purchase tags may remain enabled only as Secondary diagnostics; they must send the intake id as `transaction_id` and must not be a separate primary bidding action for the same purchase.

Google Ads value bidding optimizes **Net Retained Purchase Value**, not gross checkout value. Stripe refunds and disputes adjust the original server purchase import by the same intake/order id: full refunds and disputes send a `RETRACTION`, partial refunds send a `RESTATEMENT` with the retained AUD value, and every attempt writes a PHI-safe `audit_logs.action = google_ads_conversion_adjustment` row. Terminal adjustment failures only become bidding-risk alerts when the original purchase upload had a Google click identifier (`gclid`, `gbraid`, or `wbraid`); user-data-only terminal misses are diagnostic noise because no click conversion necessarily counted. The purchase import remains Primary; browser purchase tags, GA4 purchase mirrors, and other duplicate purchase diagnostics stay Secondary/non-bidding.

Funnel milestones and page/intake/checkout actions must stay Secondary, non-bidding signals. Do not attach invented dollar values to page views, intake completion, checkout starts, or other micro-conversions. Use PostHog/internal funnel analytics for product diagnostics and reserve Google Ads purchase value optimization for real paid orders.

## 3. Core Rule

InstantMed can advertise telehealth services. It must not advertise prescription-only medicines to the public.

This applies to:

- Google Ads copy
- sitelinks, callouts, snippets, images, assets
- landing pages
- metadata and schema
- URLs and query parameters
- paid campaign destinations
- remarketing and audience setup

### What "prescription drug terms" actually means

A **prescription drug term** is a medicine name or active ingredient on Google's [Restricted drug terms](https://support.google.com/adspolicy/answer/15595717?hl=en) list — `sildenafil`, `tadalafil`, `Viagra`, `Cialis`, `finasteride`, `dutasteride`, `semaglutide`, `Ozempic`, and so on.

The words **"prescription", "script", "eScript", "repeat prescription", and "medication"** are **not** prescription drug terms. They are service vocabulary and are permitted on every surface. Do not treat a Google policy flag on a phrase like "online prescription for hair loss" as evidence that the phrase is prohibited — Google's automated classifier is inconsistent here (it has passed "buy prescription online" while flagging "hair loss prescription online"), and an inconsistent classifier is not a rule.

### Surface matrix

The restriction is **surface-specific**, but InstantMed's operator policy is deliberately stricter than any technical keyword eligibility:

| Surface | Medicine names / active ingredients | Service words ("prescription", "script") |
|---|---|---|
| **Keywords (what we bid on)** | **OFF by operator policy** | Allowed |
| **Ad copy** (headlines, descriptions, assets) | **Prohibited in Australia** | Allowed |
| **Paid landing page / destination** | **Prohibited in Australia** | Allowed |
| **Organic educational page** | **Allowed** under `docs/SEO_CONTENT_POLICY.md` | Allowed |

Two rules govern that table:

1. In Australia, Google does not allow prescription drug terms in a telemedicine ad or its destination, and TGA guidance separately prohibits direct or indirect public advertising of prescription medicines through a health service.
2. Google platform eligibility never overrides Australian advertising law or InstantMed's stricter keyword policy.

**An organic educational page that names medicines must never become a paid destination.** That single boundary is what lets InstantMed publish real medicine and condition education while advertising only services. It is a routing rule, not a content rule — see §7.

## 4. Source Policies

| Source | Operational rule |
|--------|------------------|
| [Google healthcare and medicines policy](https://support.google.com/adspolicy/answer/176031?hl=en-AU) | Certified telemedicine can advertise in Australia with limits. Ads and destinations must still comply with healthcare and restricted-drug policies. |
| [Google prescription drug services policy](https://support.google.com/adspolicy/answer/15598647?hl=en-AU) | Google restricts online prescribing, dispensation, and sale of prescription drugs. Certified telemedicine advertisers can run in Australia only under Google's location limits, and ads targeting Australia cannot use prescription drug terms in the ad or destination. |
| [Google restricted drug terms policy](https://support.google.com/adspolicy/answer/15595717?hl=en) | Google restricts monitored medicine names and active ingredients across ads, landing pages, and keywords. InstantMed does not rely on possible platform keyword eligibility: medicine-name and active-ingredient keywords remain off by operator policy. |
| [Google personalized advertising policy](https://support.google.com/adspolicy/answer/143465) | **Audience-scoped, not keyword-scoped.** Sensitive health categories may not use advertiser-curated audiences: Customer Match, your-data segments, remarketing lists, audience expansion, lookalikes, custom segments. Predefined Google audiences (in-market, affinity, demographics, life events) and location targeting remain permitted. This policy does **not** restrict search keywords; a `HEALTH_IN_PERSONALIZED_ADS` flag on a keyword is a classifier artefact, and the compliance question to ask is "are any advertiser-curated audiences attached to this campaign?" |
| [Medical Board advertising guidance](https://www.medicalboard.gov.au/Codes-Guidelines-Policies/Advertising-a-regulated-health-service/) | Health advertising must not be misleading, use testimonials, create unreasonable expectations, or encourage unnecessary use. |
| [TGA health service advertising guidance](https://www.tga.gov.au/resources/guidance/advertising-health-service) | Do not directly or indirectly promote prescription-only medicines. Health-service ads should focus on consultations, not medicine access. |

## 5. Approved Acquisition Positioning

### Platform

Use:

> No appointment. No waiting room. Start with a secure clinical form.

### Medical Certificates

Use:

> No video. No call. No appointment.

Only use this on medical certificate surfaces where the active doctor-review pathway supports no-call completion for suitable administrative documentation requests.

### Prescription And Specialty Services

Use:

> Complete a secure clinical form. A doctor reviews it and may call you briefly before prescribing.

Also safe:

- "No booked appointment"
- "No waiting room"
- "Doctor-reviewed online"
- "Prescription only if clinically appropriate"
- "eScript token sent if approved"
- "Collect from any Australian pharmacy"
- assessment/review language for ED, hair loss, weight management, and women's health

### Page-Type Application

Money and service landing pages may convert, but must stay service-level:

- Medical certificate pages may use no-video/no-call/no-appointment framing only where the certificate protocol supports it.
- Prescription, ED, hair-loss, women's-health, and weight-management pages must use form-first doctor-review framing and may say the doctor may call briefly before prescribing.
- Paid destinations must not contain prescription-only medicine names, drug classes, drug prices, treatment menus, or schema/FAQ copy that implies medicine access before doctor review.
- Comparison pages are allowed only when factual, dated, and source-backed. They must not publish competitor review counts, star ratings, or superiority claims that cannot be independently verified.
- Trust and utility pages may explain entity facts, governance, verification, privacy, and clinical limits. They must not introduce doctor-count, doctor-name, or testimonial proof.

## 6. Prohibited Marketing Claims

Do not use:

- "No doctor"
- "Guaranteed prescription"
- "Guaranteed treatment"
- "Treatment guaranteed"
- "Get [drug name] online"
- "Buy [drug name]"
- "Cheap [drug name]"
- "Prescription in 15 minutes"
- "No call needed" on prescription, ED, hair loss, women's health, or weight loss pages
- "Accepted by all employers"
- "98% accepted"
- "Doctor approves in 2 hours or your money back"
- patient testimonials or purported testimonials about a regulated health service
- public review-count, numeric-rating, testimonial, or aggregate-rating schema claims on regulated-health advertising surfaces
- before/after outcomes
- "clinically proven medication" in public acquisition copy
- prescription-only medicine prices
- treatment menus, injection references, or copy that implies medicine access before doctor review
- prescription medicine names or obvious substitutes in schema, FAQ copy, mockups, navigation, metadata, or URL params

## 7. Drug Terms

### Paid Ads And Paid Landing Pages

Do not use prescription drug names, brand names, drug classes, or obvious substitutes in:

- ad headlines
- descriptions
- sitelinks
- callouts
- structured snippets
- image text
- paid landing page hero copy
- paid landing page metadata
- paid landing page schema
- URLs or query params
- public page mockups, navigation labels, FAQ schema, and structured data

Examples to avoid on paid destinations:

- sildenafil
- tadalafil
- Viagra
- Cialis
- finasteride
- dutasteride
- semaglutide
- tirzepatide
- Ozempic
- Wegovy
- Mounjaro
- weight loss injections

The same medicine names and active ingredients are also OFF as keywords under the operator rule below.

### Keywords

**Medicine-name and active-ingredient keywords are OFF.** This is InstantMed operator policy, not a statement that every service or condition term is prohibited.

- Service and condition keywords such as "online prescription", "repeat script online", "ED assessment", and "hair loss assessment" remain allowed when the ad and destination stay service-level and compliant.
- Before adding health keywords in bulk, validate them one at a time with the Google Ads API `validateOnly` flag. The classifier is order-sensitive and inconsistent (it passes "online doctor hair loss" and blocks "hair loss doctor online"), so a batch add fails opaquely on the first violation and hides the rest.
- `HEALTH_IN_PERSONALIZED_ADS` and `PRESCRIPTION_DRUG_SALE` both return `isExemptible: true`. An exemption is legitimate where the underlying policy is genuinely satisfied — no advertiser-curated audiences attached (§10), certification current (§1), no medicine name in ad or destination (§7). Record the reason when exempting. Do not exempt to work around a rule that actually applies.

### Organic Educational Pages

Educational prescription SEO pages may mention medicine names if they follow `docs/SEO_CONTENT_POLICY.md`.

They must not be used as paid ad destinations. This is the boundary that lets InstantMed publish genuine medicine and condition education without putting the Ads account at risk: the constraint is on **where paid traffic lands**, not on what the education may say.

## 8. URL Rules

Do not include medicine names in URLs used by paid traffic or checkout routing.

Avoid:

- `/request?service=prescription&medication=sildenafil`
- hair-loss request URLs with `drug=finasteride`
- paid traffic to `/prescriptions/med/sildenafil`

Use:

- `/request?service=repeat-script`
- `/request?service=consult&subtype=ed`
- `/request?service=consult&subtype=hair_loss`
- `/request?service=consult&subtype=womens_health`

Medication details should be collected inside the secure intake, not in URL params.

## 9. Campaign Structure

A live service does not itself authorise a campaign. Campaign creation, activation, budget changes, or paid traffic require the exact approval workflow in `docs/OPERATIONS.md`.

**tCPA is an average acquisition target, never a CPC or per-conversion cap.** Individual conversions can cost more or less than the target. Do not describe tCPA as limiting the price of a click or guaranteeing the cost of each conversion.

| Campaign type | Allowed approach |
|---------------|------------------|
| Medical certificate search | Service terms, price, speed, no appointment, doctor-reviewed. Avoid unsupported employer/university acceptance claims. |
| Repeat prescription search | Repeat medication review, eScript if approved, no booked appointment. Avoid drug names in ad/destination. |
| ED search | ED assessment or men's health assessment. Avoid drug names, performance guarantees, explicit sexualized copy, or "no call needed." |
| Hair loss search | Hair loss assessment. Avoid drug names and outcome guarantees. |
| Weight-management search (live service; paid Ads not approved) | No campaign may run without separate exact operator approval. If approved, use weight-management assessment framing and avoid injection/drug references, guaranteed weight loss, and body-shaming language. |
| Women's health search | Narrow condition/service terms. Avoid sensitive targeting and guaranteed outcomes. |

### Negative-keyword governance

Keep negative keywords in three explicit layers: account hard exclusions, service-specific exclusions, and dated experimental exclusions.

1. **Account hard exclusions** for terms that must never serve anywhere, including controlled-substance, high-stakes, gated-service, and clearly unsafe intent.
2. **Service-specific exclusions** that protect one campaign from irrelevant or unsuitable intent without suppressing valid demand for another launched service.
3. **Dated experimental exclusions** tied to a named test window and evidence receipt, so temporary learning controls do not silently become permanent account policy.

Adding, removing, or moving a negative keyword between layers is a Google Ads mutation and requires the exact approval workflow in `docs/OPERATIONS.md`.

## 10. Audience Rules

Do not use for health campaigns:

- Customer Match
- uploaded patient lists
- remarketing lists built from health pages
- lookalike/similar audiences
- custom segments based on sensitive health interests
- retargeting people who visited ED, hair loss, weight loss, women's health, or prescription pages

Prefer:

- search intent
- compliant keywords
- location targeting
- device/daypart optimisation
- broad match only after conversion data is stable
- non-sensitive predefined Google audiences where permitted

## 11. Resubmission SOP

When an ad is disapproved or stuck after certification:

1. Confirm the campaign uses only certified domain destinations.
2. Confirm ad copy and assets contain no prohibited drug terms.
3. Confirm the destination page contains no paid-prohibited drug terms or prescription price claims.
4. Confirm no advertiser-curated health audiences are attached.
5. Edit the ad or asset slightly to trigger review.
6. Save and wait for review.
7. If still restricted, appeal with: Google Ads customer ID 920-501-0513, support ticket 4-3698000041178, LegitScript Cert ID 48400566, and the exact destination URL.

## 12. Engineering Guardrails

Future implementation should add:

- banned-phrase checks for marketing copy
- paid-destination checks for drug terms
- metadata/schema scanner
- URL-param scanner for medication names
- screenshot/export of current ad landing pages before campaign launch
- weekly crawl of production for compliance drift
