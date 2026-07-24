# Comparison surface submission kit - 2026-07-09

Status: prepared only. Do not submit to MediCompare, Finder, or any other third party without operator confirmation.

InstantMed fact-sheet terminology refreshed 2026-07-13. Third-party surface research rechecked 2026-07-24 (see the research table and the 2026-07-24 recheck receipt below); the kit is submission-ready pending operator confirmation.

Purpose: get InstantMed into the Australian third-party comparison surfaces that answer engines cite for telehealth, online medical certificates, and online doctor comparisons.

## Source checks

### InstantMed source of truth

Verified against:

- `CLAUDE.md` Platform Identity, pricing table, active service scope, hours rule, and public-doctor wording.
- `lib/constants/index.ts` for legal identity, domain, contact details, ProductReview review destination, and `PRICING`.
- `docs/ADVERTISING_COMPLIANCE.md` for LegitScript status and marketing boundaries.
- `components/seo/schemas/same-as.ts` for external identity anchors.

Current factual baseline:

- Brand: InstantMed.
- Website: `https://instantmed.com.au`.
- Legal entity: InstantMed Pty Ltd.
- ABN: 64 694 559 334.
- Address: Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010.
- Support: `support@instantmed.com.au`, 0450 722 549.
- Certification: LegitScript Healthcare Merchant Certification approved, Cert ID 48400566.
- Service model: Australian telehealth for selected one-off services. Patients start with a secure clinical form. AHPRA-registered doctors review requests and may contact the patient if clinically needed.
- Active services: medical certificates, repeat prescriptions, erectile dysfunction assessment, hair loss assessment, women's health for UTI and starting or switching the contraceptive pill.
- Do not include: general consult as a live public service, weight loss as a live public service, drug names, doctor count, doctor names, FRACGP, star ratings, review counts, testimonials, or outcome guarantees.

### Third-party surface research

| Surface | Current finding | Exact channel | Notes |
| --- | --- | --- | --- |
| MediCompare | The live page is `Compare Online Medical Certificate Providers in Australia (2026)` at `https://medicompare.com.au/online-medical-certificates/`. The table captures provider, price, bulk billing, hours, certificate type, special conditions, turnaround, and ease of use. InstantMed is absent. | Email `info@medicompare.com.au` from `https://medicompare.com.au/contact-us/`. | No public self-service provider submission form found. Their editorial page says writers research providers from official sources, analyse pricing, review user experience, and then editorial/medical fact-check before publication. |
| Finder | Finder's online doctor page at `https://www.finder.com.au/health-insurance/online-doctor` has a provider table and the line "Does your company belong in this list?" linking to Partner with Finder. InstantMed is absent. | Partner form at `https://www.finder.com.au/partner-with-us#form`. The rendered page embeds the partner intake with `data-tf-live="01JDGQPRJQJRNE8R82E8T4VGXS"` and a Pipedrive webforms loader. | If the partner form fails, use Finder contact fallback `https://www.finder.com.au/contact-us#hs-chat-open`. The contact page also links back to Partner with us. |
| Trustpilot | The `medical_certificate_service` category at `https://au.trustpilot.com/categories/medical_certificate_service` ranks providers by TrustScore and review count. No InstantMed business profile exists on Trustpilot at all (checked 2026-07-24). | Standard free Trustpilot business-profile claim (operator account action). | Opening the profile is a prerequisite for appearing in the category; review accrual strategy stays ProductReview-first, so treat Trustpilot as a secondary claim-and-hold surface, not a second active review destination. |

ProductReview caveat: this should be prepared now, but it will land better once the ProductReview listing has a few genuine reviews. MediCompare and similar surfaces use public review signals as part of their quality judgement. InstantMed already routes off-site review asks to ProductReview by default. Do not include review counts or star ratings in any submission copy.

### 2026-07-24 recheck receipt

Fourteen third-party surfaces were swept on 2026-07-24 (MediCompare med-cert/prescriptions/GP-consult categories and its NextClinic profile, OnCare and NewDoc and Doccy and ConsultNow competitor listicles, Finder, ProductReview category, Trustpilot category, Similarweb/Sitelike programmatic alternatives pages, NextClinic's own blog, and Reddit community threads). Durable findings:

- InstantMed appears on zero third-party comparison, review, or directory surfaces. `https://medicompare.com.au/instantmed/` returns 404 while roughly 34 other providers, including very small ones, have staff-written profiles with an author byline and a medical-reviewer credit. Inclusion bar is clearly low; absence is the anomaly.
- MediCompare rank order tracks public star ratings, and the ProductReview and Trustpilot categories rank on review volume. Review mass is the upstream input for every downstream listing outcome; the submission ask is inclusion and factual correctness, never ranking.
- Attributes these surfaces actually compare, for framing any submission: entry price, review score and volume, bulk-billing availability, wait-time claim, 24/7 availability, app availability, certificate-type breadth, and legitimacy signals (AHPRA, Fair Work validity, employer verification). InstantMed's strongest honest differentiators for a pitch: genuine 24/7 operation, full refund when the doctor declines, and instant employer verification at `/verify` (no comparison surface currently has a refund-on-decline column; it can be offered to MediCompare as a data point).
- Community threads (Reddit) turn on two axes: cheapness and "will my employer accept it". The employer-acceptance axis is the one InstantMed can win; cheapness is deliberately conceded per settled pricing policy.
- Competitor-authored listicles (OnCare, NewDoc, Doccy, ConsultNow, NextClinic blog) rank for comparison queries while listing themselves first; they are not realistic listing targets, but they are evidence that InstantMed's own indexed comparison surface can rank for the same queries.

## Asset checklist before submission

Prepare these links and assets before the operator submits:

- Brand logo: `public/branding/logo.png`.
- Wordmark: `public/branding/wordmark.png`.
- LegitScript seal asset: `public/logos/legitscript.png`.
- Homepage: `https://instantmed.com.au`.
- Medical certificates: `https://instantmed.com.au/medical-certificate`.
- Repeat prescriptions: `https://instantmed.com.au/prescriptions`.
- ED assessment: `https://instantmed.com.au/erectile-dysfunction`.
- Hair loss assessment: `https://instantmed.com.au/hair-loss`.
- Women's health: `https://instantmed.com.au/womens-health`.
- UTI assessment: `https://instantmed.com.au/uti-assessment-online`.
- Certificate verification: `https://instantmed.com.au/verify`.
- ProductReview profile: `https://www.productreview.com.au/listings/instantmed`.
- LegitScript verification page: `https://www.legitscript.com/websites/?checker_keywords=instantmed.com.au`.
- ABR entity page: `https://abr.business.gov.au/ABN/View?abn=64694559334`.

Do not attach patient examples, certificates, screenshots containing PHI, review screenshots, star badges, or testimonial copy.

## Submission-ready fact sheet

Version date: 2026-07-13.

### Short profile copy

InstantMed is an Australian telehealth service for adults seeking online doctor review for selected one-off services: medical certificates, repeat prescription requests, erectile-dysfunction assessment, hair-loss assessment, and women's health pathways for UTI and starting or switching the contraceptive pill. Requests start with a secure clinical form. An AHPRA-registered doctor reviews the information and may contact the patient if clinically needed. Approved certificates or eScript tokens are delivered digitally.

InstantMed Pty Ltd, ABN 64 694 559 334. Surry Hills, NSW. LegitScript certified, ID 48400566. Australia only. 18+.

### Table data for MediCompare

| Field | InstantMed submission value |
| --- | --- |
| Provider | InstantMed |
| Website | `https://instantmed.com.au` |
| Medical certificate pricing | 1 day: $24.95. 2 days: $29.95. 3 days: $39.95. Optional Priority review: +$9.95. |
| Bulk billing | Not advertised as bulk billed. Private fixed-fee service. |
| Hours | Operates 24/7. |
| Certificate types | Routine sick leave, carer's leave, and study leave certificates. |
| Certificate duration | Up to 3 days, issued only if clinically appropriate after doctor review. |
| Certificate exclusions | Not for high-stakes requests such as court, fitness-to-drive, fitness-to-fly, workers compensation, NDIS, or exam deferral evidence. |
| Review model | Secure form first. Doctor review before issue. Doctor may contact the patient if clinically needed. |
| Turnaround wording | No customer-facing review-time guarantee supplied. Optional Priority review is available for +$9.95. |
| Verification | Free certificate verification at `https://instantmed.com.au/verify`. |
| Ease of use | Web-based secure form. No app required. |
| Other active services | Repeat prescriptions, ED assessment, hair loss assessment, women's health for UTI and starting or switching the contraceptive pill. |
| Prescriptions | eScript token sent if approved. Patients can use any Australian pharmacy. |
| Eligibility | Australia only. 18+. Medicare optional for medical certificates, required for prescriptions and consult pathways. |
| Credentials | Reviewed by AHPRA-registered doctors. LegitScript Healthcare Merchant Certification approved, Cert ID 48400566. |

### Table data for Finder

| Finder field | InstantMed submission value |
| --- | --- |
| Provider | InstantMed |
| Services available | Medical certificates, repeat prescriptions, ED assessment, hair loss assessment, women's health for UTI and starting or switching the contraceptive pill. |
| Fees per consult | Medical certificates from $24.95. Repeat prescriptions $29.95. ED, hair loss, and women's health $49.95. Optional Priority review +$9.95. |
| Can the appointment be bulk billed? | Not advertised as bulk billed. Private fixed-fee service. |
| Will it also post prescriptions? | No posted prescriptions. If approved, eScript tokens are delivered digitally for use at any Australian pharmacy. |
| Are mental health services available? | No dedicated mental-health service currently listed as active. |
| Website | `https://instantmed.com.au` |

### Compliance notes to include only if asked

- InstantMed does not guarantee a certificate, prescription, or treatment outcome.
- Prescribing pathways require doctor review, and the doctor may contact the patient before prescribing.
- Certificate verification is free at `/verify`.
- Reviews and ratings should be sourced by the comparison site from its own review methodology. InstantMed should not supply or quote star ratings, review counts, or testimonials.

## MediCompare outreach draft

Send to: `info@medicompare.com.au`.

Subject: Provider information for MediCompare telehealth listings - InstantMed

Body:

Hello MediCompare team,

I am writing from InstantMed, an Australian telehealth service for selected one-off services including medical certificates, repeat prescriptions, ED assessment, hair loss assessment, and women's health pathways.

I noticed InstantMed is not currently included on your 2026 online medical certificate comparison page or in your provider review set. Could you advise the evidence required for editorial review or listing consideration?

To make fact-checking easier, here is our dated provider fact sheet:

- Website: `https://instantmed.com.au`
- Legal entity: InstantMed Pty Ltd
- ABN: 64 694 559 334
- Address: Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010
- Certification: LegitScript Healthcare Merchant Certification, ID 48400566
- Service model: patients start with a secure clinical form. AHPRA-registered doctors review requests and may contact the patient if clinically needed.
- Active services: medical certificates, repeat prescriptions, erectile-dysfunction assessment, hair-loss assessment, women's health for UTI and starting or switching the contraceptive pill
- Medical certificate pricing: 1 day $24.95, 2 days $29.95, 3 days $39.95, optional Priority review +$9.95
- Repeat prescription price: $29.95
- ED, hair loss, and women's health price: $49.95
- Medical certificate scope: routine sick leave, carer's leave, and study leave certificates, up to 3 days, issued only if clinically appropriate after doctor review
- Prescriptions: if approved, eScript tokens are delivered digitally and can be used at any Australian pharmacy
- Verification: free certificate verification at `https://instantmed.com.au/verify`
- Hours: operates 24/7
- Eligibility: Australia only, 18+

We understand listing and ranking decisions are independent, and that review signals may affect where a provider appears. We are not asking for a ranking guarantee. We are asking for the correct evidence path for inclusion or correction.

Please let us know whether you need logo files, service screenshots, certification evidence, or any additional information from our current public pages.

Kind regards,

[Operator name]
InstantMed
`support@instantmed.com.au`
0450 722 549

## Finder partner-form draft

Use: `https://www.finder.com.au/partner-with-us#form`.

If the form provides a free-text partnership/request field, paste:

InstantMed is an Australian telehealth service for selected one-off services including medical certificates, repeat prescriptions, ED assessment, hair loss assessment, and women's health pathways. Finder's online doctor comparison page invites companies that belong in the list to partner with Finder. Could you advise the partner or editorial requirements for adding InstantMed to the online doctor and GP services comparison?

Current factual details:

- Website: `https://instantmed.com.au`
- Legal entity: InstantMed Pty Ltd, ABN 64 694 559 334
- Location: Surry Hills, NSW
- Certification: LegitScript Healthcare Merchant Certification, ID 48400566
- Medical certificates: 1 day $24.95, 2 days $29.95, 3 days $39.95, optional Priority review +$9.95
- Repeat prescriptions: $29.95
- ED, hair loss, and women's health: $49.95
- Services: medical certificates, repeat prescriptions, ED assessment, hair loss assessment, women's health for UTI and starting or switching the contraceptive pill
- Prescriptions: if approved, eScript tokens are delivered digitally for use at any Australian pharmacy
- Bulk billing: no
- Dedicated mental-health service: no
- Operates 24/7
- Australia only, 18+
- Certificate verification: `https://instantmed.com.au/verify`

We are not asking Finder to publish any star rating, review count, testimonial, or outcome guarantee supplied by InstantMed. Please use Finder's normal data, partner, and editorial process.

## Marketing compliance review

Keep.

No blocked public-facing lines remain in the prepared fact sheet or outreach drafts. The copy is factual, dated, source-backed, and framed as a request for editorial or partner requirements rather than a ranking request.

Deliberately excluded:

- Outcome guarantees.
- Star ratings, review counts, testimonial snippets, and aggregate-rating language.
- Doctor count, individual doctor names, FRACGP, peer-review, or training claims.
- Prescription medicine names and drug-price claims.
- "No call" prescribing wording.
- Customer-facing review-hours windows or SLA guarantees.
- Weight loss and general consult as live services.

Source of truth for each factual claim:

- Legal identity, ABN, address, support, ProductReview destination, and pricing: `lib/constants/index.ts`.
- Doctor wording, active services, eligibility, hours, and retired/gated services: `CLAUDE.md`.
- LegitScript status and regulated marketing boundaries: `docs/ADVERTISING_COMPLIANCE.md`.
- Review/rating non-display boundary and entity links: `components/seo/schemas/same-as.ts`.

Verification to run before final handoff: `pnpm doc:audit`.
