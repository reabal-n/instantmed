# SEO Content Policy

> Canonical policy for organic educational content, prescription information pages, condition pages, symptom pages, and high-intent SEO pages.
> Read this before creating or editing public SEO content.

**Last updated:** 2026-04-28

---

## 1. Strategic Decision

Keep educational prescription SEO pages. Do not delete the organic education moat.

The correction is not "remove all medicine education." The correction is to separate **education** from **promotion**.

Educational pages can explain medicines, risks, contraindications, interactions, side effects, and when to seek care. They must not read like paid acquisition pages for prescription-only medicines.

## 2. Allowed Organic Content

Educational pages may include:

- medicine names and generic names
- plain-English explanations of what the medicine is generally used for
- safety warnings
- common contraindications
- side effects
- interactions
- "ask a doctor or pharmacist" guidance
- links to official references where appropriate
- neutral discussion of telehealth suitability
- clear disclaimers that treatment depends on doctor assessment

## 3. Prohibited Organic Content

Educational pages must not include:

- "Buy [medicine] online"
- "Get [medicine] online"
- "Start a consultation for [medicine]"
- "Same-day [medicine]"
- "Cheap [medicine]"
- prescription-only medicine prices
- medicine-specific checkout CTAs
- outcome guarantees
- "we will prescribe"
- "no call needed" for prescribing requests
- drug names in request URL params
- before/after claims
- testimonials about treatment outcomes

## 4. CTA Rules

### Allowed CTAs

Use generic clinical-review CTAs:

- "Request a doctor review"
- "Start a secure request"
- "Ask about an existing medication"
- "Start a repeat medication request"
- "Start a private assessment"

### Prohibited CTAs

Do not use:

- "Start a sildenafil consultation"
- "Get finasteride online"
- "Request Ozempic"
- "Buy ED medication"
- "Get treatment today"
- "Start treatment now" on drug-specific pages

## 5. Internal Linking Rules

Educational medicine pages may link to generic service pages:

- `/prescriptions`
- `/request?service=prescription`
- `/erectile-dysfunction`
- `/hair-loss`
- `/weight-loss`
- `/womens-health`

They must not pass medicine names into request URLs.

Avoid:

- `/request?service=prescription&medication=sildenafil`
- `/request?service=consult&drug=finasteride`

Use:

- `/request?service=prescription`
- `/request?service=consult&subtype=ed`
- `/request?service=consult&subtype=hair_loss`

## 6. Paid Traffic Boundary

Do not use educational prescription or medicine pages as paid ad destinations.

Paid campaigns should use service-level landing pages only:

- `/medical-certificate`
- `/prescriptions`
- `/erectile-dysfunction`
- `/hair-loss`
- `/weight-loss`
- `/womens-health`

Those paid destinations should avoid prescription drug names and follow `docs/ADVERTISING_COMPLIANCE.md`.

## 7. Schema And Metadata

Educational pages may use neutral article/FAQ metadata.

Do not put promotional prescription claims in:

- title tags
- meta descriptions
- OpenGraph descriptions
- JSON-LD
- FAQ schema
- breadcrumbs
- canonical URLs

Avoid metadata like:

> Get sildenafil online from an Australian doctor.

Use:

> Learn what sildenafil is, key safety considerations, and when to speak with a doctor.

## 8. Medical Certificate SEO

Med-cert SEO pages must not claim:

- accepted by all employers
- 98% accepted
- university special consideration support
- deferred exam support
- court, tribunal, jury, workers comp, insurance, NDIS, TAC, or fitness-for-duty support

Use:

> Issued if clinically appropriate after doctor review. Employer and institution policies may vary.

## 9. Review Checklist

Before publishing or editing SEO content:

- no promotional prescription-only medicine language
- no medicine-specific request URL
- no prescription-only medicine price
- no patient testimonial
- no guaranteed outcome
- no unsupported acceptance claim
- no "no call needed" claim for prescribing
- clear doctor-review caveat
- clear redirection to urgent/in-person care where appropriate
- aligned with `docs/ADVERTISING_COMPLIANCE.md`

