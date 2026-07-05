# SEO Content Policy

> Canonical policy for organic educational content, prescription information pages, condition pages, symptom pages, and high-intent SEO pages.
> Read this before creating or editing public SEO content.

**Last updated:** 2026-07-04

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

### Guide-only article pages

Health guide articles (`content/blog/*.mdx`, currently rendered at `/blog/[slug]`) are stricter than service landing pages. They must read as reviewed educational guides, not acquisition pages.

Do not add:

- mid-article consultation CTAs
- service CTA cards
- "How InstantMed can help" sales sections
- related-service acquisition panels
- location SEO blocks such as "Available in Sydney"
- request, prescription, consult, or medical-certificate links in the guide body, except neutral related-reading links to other `/blog/*` guides

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

Educational medicine pages may link to generic service pages:

- `/prescriptions`
- `/request?service=prescription`
- `/erectile-dysfunction`
- `/hair-loss`
- `/weight-loss`
- `/womens-health`
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
- `/weight-loss`
- `/womens-health`
- `/uti-assessment-online`
- `/contraceptive-pill-assessment-online`

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
