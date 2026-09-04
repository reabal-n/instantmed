# SEO Content Policy

> Canonical policy for organic educational content, prescription information pages, condition pages, symptom pages, and high-intent SEO pages.
> Read this before creating or editing public SEO content.

**Last updated:** 2026-09-05

---

## 1. Strategic Decision

Keep educational prescription SEO pages. Do not delete the organic education moat.

The correction is not "remove all medicine education." The correction is to separate **education** from **promotion**.

Educational pages can explain medicines, risks, contraindications, interactions, side effects, and when to seek care. They must not read like paid acquisition pages for prescription-only medicines.

## Page Template Contracts

Organic SEO pages do not share one template. Pick the page type first, then apply the matching CTA and compliance boundary.

| Page type | Routes | Primary job | CTA/link boundary |
|---|---|---|---|
| Health guide | `/blog/[slug]` from `content/blog/*.mdx` | Reviewed education and source-backed explanation | No service CTAs, no `/request`, no service sales panels, no location SEO blocks. Related reading may link neutrally to `/blog/*`, `/conditions/*`, and `/symptoms/*`; the service-linking permission below does not apply. |
| Condition page | `/conditions/[slug]` | Education-first condition explainer | May explain telehealth fit and limits, but must not behave like a treatment landing page. No above-fold treatment promises, no platform stats as clinical proof, no drug-specific CTAs. |
| Symptom page | `/symptoms/[slug]` | Non-diagnostic symptom education | Must avoid "symptom + X = diagnosis" framing. Use uncertainty, red flags, and what a doctor may ask. |
| Medication guide | usually `/blog/[slug]` | Medicine education: uses, risks, contraindications, interactions, monitoring | Medicine names may appear in education. No "get/buy/start [medicine] online", no prescription-only medicine prices, no medicine-specific request URLs, no paid destination use. |
| Comparison page | `/compare/[slug]` | Factual, dated comparison and research support | Tables must be sourced and dated. No competitor star ratings, review counts, stale prices, or unsupported superiority claims. |
| Money / landing page | Service-level routes such as `/medical-certificate`, `/prescriptions`, `/erectile-dysfunction`, `/hair-loss`, `/womens-health`, `/uti-assessment-online`, `/contraceptive-pill-assessment-online`, `/pricing` | Convert service-level demand into a secure request or pricing decision | May use service-level CTAs and pricing from approved constants. No drug names, prescribing guarantees, review counts, star ratings, testimonials, or medicine-specific checkout links. |
| Trust / utility page | `/trust`, `/how-it-works`, `/verify`, `/clinical-governance`, `/what-we-wont-do` | Explain governance, verification, privacy, security, clinical limits, and entity facts | May link to relevant money pages and education guides. No doctor count, doctor names, testimonial proof, or broad online-GP positioning. |

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

Use pathway-accurate clinical CTAs:

- "Request a doctor review" only where the request is guaranteed to enter individual doctor review
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

### Guide-only article pages

Health guide articles (`content/blog/*.mdx`, currently rendered at `/blog/[slug]`) are stricter than service landing pages. They must read as reviewed educational guides, not acquisition pages.

Do not add:

- mid-article consultation CTAs
- service CTA cards
- "How InstantMed can help" sales sections
- related-service acquisition panels
- location SEO blocks such as "Available in Sydney"
- service or acquisition links in the guide body, including request, prescription, consult, or medical-certificate destinations; neutral educational and ordinary trust/legal links are governed by §5

Allowed inside guide articles:

- related reading
- FAQs
- author and reviewer details
- safety boundaries, red flags, source notes, and neutral telehealth suitability context

Neutral telehealth suitability context must stay informational. It can explain when a remote review may or may not fit, but it must not link to `/request` or otherwise become an acquisition device inside the guide body.

### Supported guide components

Guide article bodies are parsed by `lib/blog/mdx.ts`, not by a general MDX component map. Only the supported component tags below may appear in `content/blog/*.mdx`. Unknown capitalized tags are audit failures in `pnpm content:audit:strict`.

Before rebuilding or deepening a guide, classify the article against `docs/ARTICLE_TEMPLATE.md` §2. The archetype controls the section spine and visual roles; this policy controls the compliance boundary.

Component tags must use opening and closing tags on their own lines for block authoring. Inline note syntax is supported only for short `EvidenceNote` and `PolicyNote` compatibility, but block syntax is preferred.

Use `KeyTakeaway` near the top of a rewritten guide when the reader needs the practical answer before the full explanation:

```mdx
<KeyTakeaway title="Short answer">
- First practical point.
- Second practical point.
</KeyTakeaway>
```

Use `DecisionBox` for neutral suitability or escalation logic. The three inner headings are fixed and must stay in this order:

```mdx
<DecisionBox title="Where this fits">
### May fit telehealth
- Routine, low-risk context.
### Needs in-person care
- Physical examination or testing is needed.
### Urgent care
- Severe, rapidly worsening, or emergency symptoms.
</DecisionBox>
```

Use `EvidenceNote` for source or evidence context:

```mdx
<EvidenceNote title="Source note" source="AHPRA">
This guide uses the live register rather than static screenshots because registration status can change.
</EvidenceNote>
```

Use `PolicyNote` for workplace, university, government, or platform-policy context:

```mdx
<PolicyNote title="Policy context">
Employer and institution evidence rules can vary. The article should explain the policy boundary without promising acceptance.
</PolicyNote>
```

Use `CareBoundary` for scope-of-care limits, telehealth limits, and no-guarantee boundaries:

```mdx
<CareBoundary title="What this guide cannot decide">
This guide can explain common decision points, but a doctor needs to assess whether remote care is suitable for a particular person.
</CareBoundary>
```

Use standard GitHub-style Markdown tables for comparisons. Do not build comparison grids with styled divs in guide content. The renderer outputs real semantic `<table>` elements for Markdown tables, which supports accessibility, indexing, and LLM extraction.

Article visuals must be local assets under `public/images/blog/<slug>/`. Every rewritten article must have at least two GPT-generated local visuals, ideally three for high-intent or clinical topics. Visuals can include controlled, short readable copy when generated from the `lib/blog/visuals.ts` registry; do not let the image model invent claims, prices, diagnoses, drug names, service CTAs, or legal rules. The same clinical distinctions and labels must also exist in React/HTML through `components/blog/article-visuals.tsx` so the page remains accessible, reviewable, and indexable. Generated guide visuals should carry the deterministic `InstantMed` wordmark added by `scripts/generate-blog-visual-images.ts`; do not ask GPT to draw or spell the brand mark.

Article images are educational assets, not mood boards. A generated image is acceptable only if it adds standalone patient value. The reader should learn concrete distinctions, steps, anatomy, warning signs, decision criteria, process details, risk factors, or prevention actions from the image itself. This applies to every visual format: infographic, anatomical explainer, patient poster, mechanism diagram, comparison graphic, process visual, warning graphic, body map, lab explainer, telehealth workflow, or hero image.

Text-heavy explanations belong in HTML first. If a concept needs dense wording, use `KeyTakeaway`, `DecisionBox`, `EvidenceNote`, `PolicyNote`, or a semantic Markdown table before asking the image model to carry that information. Generated-image text from the registry should use short labels only, with a hard cap of 1-5 words per label. Longer explanations must render as HTML text next to or below the image.

Reject and regenerate any article image that is mostly:

- a blank phone, laptop, app screen, document, certificate, checklist, or card
- a medicine box, inhaler, pill packet, warning triangle, shield, balance scale, or single symbolic object
- a beige tabletop, desk flat lay, notepad, stethoscope, mug, plant, empty folder, or sterile stock-photo prop set
- generic abstract blobs, icon rows, three empty cards, corporate SaaS illustration, or clip-art metaphor
- a scenic Australian filler image such as beaches, skylines, maps, flags, postcard footers, or gum trees unless geography is central to the article
- any image where most of the canvas could be swapped into another article without losing meaning

Acceptance floor for generated article visuals:

- one clear educational idea per image
- three to seven readable labels or short callouts when the format supports text
- at least two instructional devices, such as pathway arrows, comparison columns, mini diagrams, body/anatomy callouts, timeline markers, checklist zones, warning hierarchy, data markers, or practical action strips
- one clear reading path from headline to takeaway
- no essential detail in the bottom-right badge-safe zone reserved for the post-processed InstantMed wordmark
- no fake official forms, fake certificates, fake app screenshots, fake doctor chats, patient identifiers, prescription details, medication brand promotion, or service CTA

Acceptable article visual formats:

- medical infographic
- anatomical explainer
- patient education poster
- mechanism-of-action diagram
- comparison graphic
- step-by-step process visual
- red-flag warning graphic
- lifestyle and prevention illustration
- symptom-location body map
- lab result explainer
- telehealth workflow graphic
- blog hero image

Baseline guide quality:

- answer the reader's practical question in the first screen
- use at least six H2 sections for a rewritten guide unless the topic is genuinely narrow
- target a comprehensive guide length, generally 1,200+ words
- include a visible sources or references section
- include safety boundaries, red flags, in-person limits, or urgent-care limits where clinically relevant
- keep guide bodies education-only: no consultation CTA, no service CTA card, and no related-service acquisition panel

## 5. Internal Linking Rules

Medicine, condition, symptom, and other non-guide educational surfaces may link neutrally to an active generic service or pathway from the list below when it is relevant. The link must describe the service or review pathway without promising a medicine, prescription, or outcome.

Health guide bodies in `content/blog/*.mdx` do not inherit the service-linking permission. They remain education-only: neutral related-reading links to `/blog/*`, `/conditions/*`, and `/symptoms/*` are allowed, but `/prescriptions`, `/request`, and other service or acquisition destinations are not.

Neutral links from guides to ordinary trust or legal pages remain allowed when they support the explanation rather than act as a conversion device.

Only active services may be used as acquisition links. Weight management launched on 2026-08-10, so organic and onsite content may link to its service page without implying a prescription outcome or ongoing treatment program.

- `/prescriptions`
- `/request?service=prescription`
- `/erectile-dysfunction`
- `/hair-loss`
- `/womens-health`
- `/weight-loss`
- `/uti-assessment-online`
- `/contraceptive-pill-assessment-online`

They must not pass medicine names into request URLs.

Avoid:

- `/request?service=prescription&medication=sildenafil`
- hair-loss request URLs with `drug=finasteride`

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
- `/womens-health`
- `/uti-assessment-online`
- `/contraceptive-pill-assessment-online`

Weight management is live for organic and onsite acquisition, but `/weight-loss` is not an approved paid destination. It may enter the paid-destination list only after a separate exact operator approval under `docs/OPERATIONS.md`.

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

> Issued only when clinically appropriate. Standard certificate requests may follow the Medical Director-approved protocol; concerning or uncertain requests require doctor review before issue. Employer and institution policies may vary.

## 9. Third-Party SEO Research

Third-party SEO tools may supply dated SERP, keyword-volume, backlink, competitor, and Search Console evidence. Their output is evidence, not permission to publish, create a page, make a claim, or change strategy. Before adopting a result, map it to an active service, the page-template contract above, and the current `docs/ROADMAP.md` priority.

Tool demand never overrides the prohibitions in this policy. In particular, it cannot justify prescription-medicine acquisition pages, medicine-specific request paths, testimonials or review claims, unsupported comparisons, city/local-pack pages, or a new service. OpenSEO authentication, credits, project-context ownership, and research writebacks are governed by `docs/OPERATIONS.md` and `instantmed-openseo-research`.

## 10. Review Checklist

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
