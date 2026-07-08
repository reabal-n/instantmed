# SEO GEO LLM Task 5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Increase qualified organic and AI-assisted demand by fixing crawlable internal evidence links, finalizing page-template rules, improving high-impression snippets, and strengthening off-page citation surfaces without adding feature bloat or regulated-health risk.

**Architecture:** Treat SEO and GEO as the same core system: crawlable, source-backed, useful HTML with clear page-type contracts. Keep conversion pages, educational guides, condition pages, medication guides, and comparison pages on separate templates so acquisition copy does not leak into education surfaces and prescription-only medicine promotion does not leak into paid or service surfaces.

**Tech Stack:** Next.js 15.5 App Router, React 18, TypeScript 5.9, Tailwind v4, MDX health-guide parser, GSC scripts in `tools/gsc-mcp-server`, PostHog/Supabase analytics, Chrome/CDP, Playwright.

## Global Constraints

- Do not change production code before completing Task 1 read-only evidence refresh.
- Use the logged-in Chrome work profile for GSC/OAuth repair; Dia is fallback only.
- Do not touch `next.config.mjs` `skipTrailingSlashRedirect: true`; it is required for PostHog trailing slash API requests.
- Do not change trailing-slash redirects or canonical routing unless live URL inspection proves a specific crawl problem.
- Do not upgrade pinned stack packages, rename `middleware.ts`, add Turbopack, or change Next/React/Tailwind/Framer versions.
- Do not render review counts, star ratings, testimonials, or aggregate-rating schema on regulated-health advertising surfaces.
- Do not use prescription-only medicine names, drug prices, drug-specific CTAs, drug-specific request URLs, or treatment guarantees on paid or service landing pages.
- Do not promise "no call needed" on prescribing, ED, hair loss, women's health, weight loss, or repeat prescription pages.
- Blog guide bodies stay education-only: no `/request`, no service CTA cards, no related-service acquisition panels, and no location SEO blocks.
- Public surfaces must not disclose doctor count, individual doctor names, FRACGP, peer review, or team training unless formally verified.
- Keep Tasks 1-4 from the other session out of scope; this plan starts Task 5 only.

---

## Reconciled Decisions

Claude/Fable's feedback is mostly accepted, with one important correction from raw production HTML checks.

- **Accepted:** CTR fixes and contextual internal links should ship in the same first sprint; CTR is the fast visible win and internal linking is the compounding win.
- **Accepted:** Off-page citation/profile hygiene should run in parallel because it is mostly operator/manual work and does not need to wait for code.
- **Accepted:** Condition and medication templates need explicit contracts so they do not behave like money pages.
- **Corrected:** The claim that footer/global service links are absent from raw HTML is not current production truth. Raw HTML checks on `/`, `/medical-certificate`, `/pricing`, `/prescriptions`, `/hair-loss`, `/erectile-dysfunction`, `/trust`, and `/compare/online-medical-certificate-options` showed service/footer anchors present. The first implementation batch should not be a footer rewrite; it should add contextual evidence links and template contracts.
- **Corrected:** `/compare/online-medical-certificate-options` is already in `KEEP_INDEXED_COMPARE` and `app/compare/sitemap.ts`; do not plan to "add it to the sitemap" unless live inspection proves drift.
- **Corrected:** NHSD registration is already done in `docs/runbooks/NHSD_REGISTRATION.md`; only verify and maintain it.

## Page Template Contracts

These contracts are the execution target. Add them to the canonical docs before changing page content.

### Money / Landing Pages

Routes:
- `/medical-certificate`
- `/prescriptions`
- `/erectile-dysfunction`
- `/hair-loss`
- `/womens-health`
- `/uti-assessment-online`
- `/contraceptive-pill-assessment-online`
- `/pricing`

Allowed:
- Conversion CTAs to service-level request flows.
- Pricing from `PRICING` / `PRICING_DISPLAY`.
- Doctor-review framing.
- Refund boundary from approved constants/copy.
- Source-backed, static HTML explainers and FAQs.

Not allowed:
- Drug names in hero, metadata, schema, FAQ, public mockups, or navigation.
- "No call needed" for prescribing or specialty services.
- Guaranteed prescription, guaranteed treatment, guaranteed acceptance, or outcome promises.
- Review counts, star ratings, testimonials, or aggregate-rating schema.
- Medicine-specific checkout links or request URL params.

### Trust / Utility Pages

Routes:
- `/trust`
- `/how-it-works`
- `/verify`
- `/clinical-governance`
- `/what-we-wont-do`

Purpose:
- Explain governance, verification, privacy, security, clinical limits, and how the service works.

Allowed:
- Links to relevant money pages and education guides.
- Direct answers that help humans and LLMs understand entity facts.
- Factual identifiers: InstantMed Pty Ltd, ABN, contact details, LegitScript ID, AHPRA-registered doctors.

Not allowed:
- Doctor count, doctor names, credential claims beyond approved copy.
- Testimonial/review proof.
- Broad "doctor for anything" positioning.

### Compare Pages

Routes:
- `/compare/[slug]`, especially `/compare/online-medical-certificate-options`.

Purpose:
- Factual, dated, source-backed comparison surfaces for human research and LLM citation.

Allowed:
- Tables with source dates.
- Provider feature facts where sourceable.
- InstantMed facts from constants/docs.
- Links to `/medical-certificate`, `/pricing`, `/verify`, and neutral education pages.

Not allowed:
- Competitor star ratings or review counts on InstantMed surfaces.
- Stale competitor prices.
- Superiority claims that cannot be independently verified.
- Prescription medicine promotion.

### Blog / Guide Pages

Routes:
- `/blog/[slug]` from `content/blog/*.mdx`.

Purpose:
- Reviewed educational content.

Required:
- First-screen direct answer.
- Exactly one `KeyTakeaway` when rewritten.
- Six or more H2 sections unless genuinely narrow.
- Semantic Markdown tables where comparative.
- `DecisionBox`, `EvidenceNote`, `PolicyNote`, and `CareBoundary` only when earned.
- Visible sources/references.
- Two to three local educational visuals for rewritten guides, with labels controlled through `lib/blog/visuals.ts`.

Not allowed:
- Mid-article service CTAs.
- `/request`, `/medical-certificate`, `/prescriptions`, `/erectile-dysfunction`, or `/hair-loss` links in guide bodies except where `docs/SEO_CONTENT_POLICY.md` explicitly allows non-guide educational medicine pages.
- Location SEO blocks.
- Medicine-specific request links.

### Condition Pages

Routes:
- `/conditions/[slug]`.

Purpose:
- Education-first condition explainers, not acquisition pages.

Target spine:
1. What it is.
2. Common symptoms and uncertainty.
3. Red flags / urgent care.
4. What a doctor may ask.
5. Tests or assessment options.
6. Treatment depends on cause and individual review.
7. Telehealth fit and limits.
8. Sources and related reading.

Not allowed:
- Above-fold "available now", "no in-person visit required", or broad online-treatment promises.
- Platform stats/social-proof as clinical proof.
- Drug-specific CTAs or treatment guarantees.

### Medication Pages

Current home:
- Medication education should remain guide-style under `/blog`.

Purpose:
- Explain medicine uses, safety, contraindications, side effects, interactions, monitoring, and when to seek care.

Allowed:
- Medicine names in educational context.
- Links to official references.
- Neutral telehealth suitability context.

Not allowed:
- "Get/buy/start [medicine] online".
- Prescription-only medicine prices.
- Medicine-specific CTAs or request URLs.
- Treatment outcome promises.
- Paid ad destinations.

## Files And Responsibilities

- `docs/SEO_CONTENT_POLICY.md`: Add page-template matrix for guide, condition, symptom, medication, comparison, and internal-link boundaries.
- `docs/ADVERTISING_COMPLIANCE.md`: Add landing/money-page and compare-page acquisition boundaries.
- `docs/ARTICLE_TEMPLATE.md`: Cross-reference template contracts without duplicating compliance law.
- `components/marketing/med-cert-landing.tsx`: Add crawlable contextual evidence links for medical-certificate guides.
- `app/pricing/pricing-content.tsx`: Add crawlable contextual links from pricing FAQ/guide sections to bulk billing, PBS, refund, and compare resources.
- `app/trust/page.tsx` and `app/trust/trust-client.tsx`: Add crawlable trust/evidence links, or move a small server-rendered evidence-link strip into `page.tsx` above the client component.
- `app/compare/[slug]/page.tsx`: Add contextual next-step/evidence links for the online medical certificate comparison page.
- `app/(marketing)/page.tsx`: Add a small raw-HTML trust/guide link block only if the evidence refresh still shows homepage guide links missing.
- `app/hair-loss/page.tsx` / `components/marketing/hair-loss-landing.tsx`: Add or preserve server-rendered related education links for hair-loss guides.
- `components/marketing/erectile-dysfunction-landing.tsx`: Add or preserve server-rendered related education links for AHPRA/safety-screening guides.
- `app/conditions/[slug]/page.tsx`: Harden condition template to education-first.
- `scripts/*` only if needed for a contract test or content audit extension; do not add a new crawler unless the existing raw HTML check cannot be encoded simply.

## Task 1: Read-Only Evidence Refresh

**Files:**
- Read: `package.json`
- Read: `tools/gsc-mcp-server/gsc-index-audit.mjs`
- Read: `tools/gsc-mcp-server/commercial-intent-pulse.mjs`
- Read: `tools/gsc-mcp-server/commercial-intent-inspect.mjs`
- Read: `tools/gsc-mcp-server/authority-resource-pulse.mjs`
- Read: `next.config.mjs`
- Read: `app/robots.ts`
- Read: `app/sitemap.ts`
- Read: `lib/seo/index-policy.ts`
- Create: none
- Modify: none
- Test: none

**Interfaces:**
- Consumes: current Google ADC, GSC property access, production HTML, PostHog/Supabase access if available.
- Produces: a short evidence note in the implementation PR description; no persisted data file required unless the operator asks for one.

- [ ] **Step 1: Confirm branch and clean state**

Run:

```bash
git status --short
git branch --show-current
```

Expected: no unrelated dirty files from this task. If dirty files exist, inspect before proceeding and do not revert user work.

- [ ] **Step 2: Confirm GSC ADC identity**

Run:

```bash
gcloud auth application-default print-access-token >/tmp/instantmed-gsc-token.txt && \
rm -f /tmp/instantmed-gsc-token.txt
```

Expected: token command succeeds. If it fails or GSC scripts return empty/permission errors, repair with logged-in Chrome work profile:

```bash
BROWSER='open -a "Google Chrome"' gcloud auth application-default login hello@instantmed.com.au \
  --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters \
  --project=instantmed
```

If Chrome opens the wrong profile, copy the OAuth URL into the already logged-in InstantMed Chrome work-profile window. Use Dia only if Chrome profile auth is blocked.

- [ ] **Step 3: Run GSC and SEO read-only scripts**

Run:

```bash
pnpm seo:gsc-index-audit -- --inspect-limit=20
pnpm seo:commercial-pulse
pnpm seo:commercial-inspect
pnpm seo:authority-pulse
```

Expected: scripts complete without mutating data. If `seo:gsc-index-audit` is blocked, continue using repo truth, live robots/sitemap inspection, and raw HTML checks; do not freeze the work.

- [ ] **Step 4: Run raw production HTML link check**

Run:

```bash
node <<'NODE'
const pages=[
  '/',
  '/medical-certificate',
  '/pricing',
  '/prescriptions',
  '/hair-loss',
  '/erectile-dysfunction',
  '/trust',
  '/compare/online-medical-certificate-options',
];
const targets=[
  '/blog/doctors-note-australia',
  '/blog/parents-sick-child-certificate',
  '/blog/work-from-home-sick-certificate',
  '/blog/is-telehealth-bulk-billed-australia',
  '/blog/can-you-get-antibiotics-online-australia',
  '/blog/finasteride-vs-minoxidil-hair-loss',
  '/blog/ahpra-registered-doctor-meaning',
  '/medical-certificate',
  '/pricing',
  '/prescriptions',
  '/hair-loss',
  '/erectile-dysfunction',
  '/compare/online-medical-certificate-options',
  '/trust',
  '/verify',
];
for (const page of pages) {
  const res=await fetch('https://instantmed.com.au'+page,{redirect:'manual'});
  const text=await res.text();
  const anchors=[...text.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match)=>({
      href: match[1],
      text: match[2].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,80),
    }));
  console.log('\nPAGE',page,'status',res.status,'anchors',anchors.length,'bytes',text.length);
  for (const target of targets) {
    const matches=anchors.filter((anchor)=>
      anchor.href===target ||
      anchor.href==='https://instantmed.com.au'+target ||
      anchor.href.startsWith(target+'#')
    );
    if (matches.length) console.log(' ', target, matches.length, matches.map((m)=>m.text).join(' | '));
  }
}
NODE
```

Expected: service/footer anchors are present; contextual guide links are the main gap.

- [ ] **Step 5: Use Chrome/CDP and Playwright for rendered proof**

Use the existing logged-in Chrome/CDP session for visual and console checks, and Playwright for repeatable checks where a spec already exists. Do not mutate dashboards or OAuth state during this read-only task.

- [ ] **Step 6: Commit**

Do not commit Task 1 unless it creates a documented evidence note. If it does:

```bash
git add docs/superpowers/plans/2026-07-08-seo-geo-llm-task5-plan.md
git commit -m "docs: record seo geo evidence refresh"
```

## Task 2: Document Page Template Contracts

**Files:**
- Modify: `docs/SEO_CONTENT_POLICY.md`
- Modify: `docs/ADVERTISING_COMPLIANCE.md`
- Modify: `docs/ARTICLE_TEMPLATE.md`
- Test: `pnpm doc:audit`

**Interfaces:**
- Consumes: Page Template Contracts section in this plan.
- Produces: durable docs that future SEO and content work must follow.

- [ ] **Step 1: Add template contract section to `docs/SEO_CONTENT_POLICY.md`**

Add a section after the strategic decision and before allowed content:

```markdown
## Page Template Contracts

Organic SEO pages do not share one template. Pick the page type first, then apply the matching CTA and compliance boundary.

| Page type | Routes | Primary job | CTA/link boundary |
|---|---|---|---|
| Health guide | `/blog/[slug]` from `content/blog/*.mdx` | Reviewed education and source-backed explanation | No service CTAs, no `/request`, no service sales panels, no location SEO blocks. Related reading should stay guide-to-guide unless a narrower policy below explicitly allows otherwise. |
| Condition page | `/conditions/[slug]` | Education-first condition explainer | May explain telehealth fit and limits, but must not behave like a treatment landing page. No above-fold treatment promises, no platform stats as clinical proof, no drug-specific CTAs. |
| Symptom page | `/symptoms/[slug]` | Non-diagnostic symptom education | Must avoid "symptom + X = diagnosis" framing. Use uncertainty, red flags, and what a doctor may ask. |
| Medication guide | usually `/blog/[slug]` | Medicine education: uses, risks, contraindications, interactions, monitoring | Medicine names may appear in education. No "get/buy/start [medicine] online", no prescription-only medicine prices, no medicine-specific request URLs, no paid destination use. |
| Comparison page | `/compare/[slug]` | Factual, dated comparison and research support | Tables must be sourced and dated. No competitor star ratings, review counts, stale prices, or unsupported superiority claims. |
```

- [ ] **Step 2: Add landing-page contract to `docs/ADVERTISING_COMPLIANCE.md`**

Add after "Approved Acquisition Positioning":

```markdown
### Page-Type Application

Money and service landing pages may convert, but must stay service-level:

- Medical certificate pages may use no-video/no-call/no-appointment framing only where the certificate protocol supports it.
- Prescription, ED, hair-loss, women's-health, and weight-management pages must use form-first doctor-review framing and may say the doctor may call briefly before prescribing.
- Paid destinations must not contain prescription-only medicine names, drug classes, drug prices, treatment menus, or schema/FAQ copy that implies medicine access before doctor review.
- Comparison pages are allowed only when factual, dated, and source-backed. They must not publish competitor review counts, star ratings, or superiority claims that cannot be independently verified.
- Trust and utility pages may explain entity facts, governance, verification, privacy, and clinical limits; they must not introduce doctor-count, doctor-name, or testimonial proof.
```

- [ ] **Step 3: Cross-reference from `docs/ARTICLE_TEMPLATE.md`**

Add one sentence under the opening "Division of labour" block:

```markdown
For condition, symptom, medication, comparison, and money-page template boundaries, start with `docs/SEO_CONTENT_POLICY.md` and `docs/ADVERTISING_COMPLIANCE.md`; this document controls only health-guide structure and visual workflow.
```

- [ ] **Step 4: Run doc audit**

Run:

```bash
pnpm doc:audit
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add docs/SEO_CONTENT_POLICY.md docs/ADVERTISING_COMPLIANCE.md docs/ARTICLE_TEMPLATE.md
git commit -m "docs: define seo page template contracts"
```

## Task 3: Add Contextual Evidence Links To Money And Trust Pages

**Files:**
- Modify: `components/marketing/med-cert-landing.tsx`
- Modify: `app/pricing/pricing-content.tsx`
- Modify: `app/trust/page.tsx`
- Modify: `app/trust/trust-client.tsx` only if the link block cannot live in the server page wrapper
- Modify: `app/compare/[slug]/page.tsx`
- Modify: `app/(marketing)/page.tsx` only if Task 1 confirms homepage contextual guide links are still missing
- Test: raw HTML link check from Task 1
- Test: `pnpm lint`
- Test: `pnpm typecheck`

**Interfaces:**
- Consumes: page-template contracts from Task 2.
- Produces: crawlable contextual links from high-authority pages to existing guides/trust/comparison pages.

- [ ] **Step 1: Add medical-certificate evidence links**

In `components/marketing/med-cert-landing.tsx`, add a small server-rendered section near the existing resource/evidence area. Use only these links:

```ts
const MED_CERT_EVIDENCE_LINKS = [
  {
    href: "/blog/doctors-note-australia",
    title: "Doctor's note or medical certificate?",
    body: "Plain-English differences between common evidence terms in Australia.",
  },
  {
    href: "/blog/parents-sick-child-certificate",
    title: "Carer's certificates for a sick child",
    body: "How carer's leave evidence works when a child is unwell.",
  },
  {
    href: "/blog/work-from-home-sick-certificate",
    title: "Sick while working from home",
    body: "When remote work can still be sick leave and how evidence may be requested.",
  },
]
```

Render with neutral label text such as "Related evidence guides". Do not add service CTAs inside those guide pages.

- [ ] **Step 2: Add pricing evidence links**

In `app/pricing/pricing-content.tsx`, add inline/contextual links:

- In the "Is InstantMed bulk billed?" FAQ answer, link "bulk-bill" or "private telehealth service" to `/blog/is-telehealth-bulk-billed-australia`.
- Near PBS/pharmacy-cost explanation, link to `/blog/pbs-pharmaceutical-benefits-scheme`.
- Near comparison or transparency copy, link to `/compare/online-medical-certificate-options`.
- Near refund copy, link to `/refund-policy`.

Use existing `Link` import. Keep anchors factual and short.

- [ ] **Step 3: Add trust page evidence links in server HTML**

Prefer adding a server-rendered section in `app/trust/page.tsx` before `<TrustPage />`:

```tsx
import Link from "next/link"

const trustEvidenceLinks = [
  { href: "/blog/ahpra-registered-doctor-meaning", label: "What AHPRA registration means" },
  { href: "/clinical-governance", label: "Clinical governance" },
  { href: "/privacy", label: "Privacy and data handling" },
  { href: "/verify", label: "Certificate verification" },
]
```

Render as a compact `<nav aria-label="Trust evidence">` so links are crawlable even though `trust-client` is client-rendered.

- [ ] **Step 4: Add compare-page next-step links**

In `app/compare/[slug]/page.tsx`, for slug `online-medical-certificate-options`, add contextual links to:

- `/medical-certificate`
- `/pricing`
- `/verify`
- `/blog/doctors-note-australia`

Keep language factual. Do not add competitor review counts, star ratings, or superiority claims.

- [ ] **Step 5: Re-run raw HTML link check**

Run the Task 1 raw HTML script.

Expected new links appear in served HTML for `/medical-certificate`, `/pricing`, `/trust`, and `/compare/online-medical-certificate-options`.

- [ ] **Step 6: Run checks**

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/marketing/med-cert-landing.tsx app/pricing/pricing-content.tsx app/trust/page.tsx app/trust/trust-client.tsx 'app/compare/[slug]/page.tsx' 'app/(marketing)/page.tsx'
git commit -m "feat(seo): add contextual evidence links to money pages"
```

Only stage files actually changed.

## Task 4: Harden Condition Page Template

**Files:**
- Modify: `app/conditions/[slug]/page.tsx`
- Optional Modify: `lib/seo/data/conditions.ts` only if copy data needs template-safe fields
- Test: `pnpm lint`
- Test: `pnpm typecheck`
- Test: raw HTML check for one indexed and one iceboxed condition

**Interfaces:**
- Consumes: condition page contract from Task 2.
- Produces: education-first condition page template that no longer reads like a treatment acquisition surface.

- [ ] **Step 1: Remove platform stats from condition page proof**

In `app/conditions/[slug]/page.tsx`, remove `PLATFORM_STATS` rendering from condition pages. Do not replace it with social proof.

- [ ] **Step 2: Change hero CTA posture**

Replace above-fold CTA copy patterns that imply online treatment availability with a lower-friction, educational posture. The hero may link to a service only where `condition.ctaHref` is already configured, but the surrounding copy must not imply guaranteed suitability.

Use language like:

```tsx
<p className="text-sm text-muted-foreground">
  Online care is not suitable for every situation. A doctor decides what fits after assessment.
</p>
```

- [ ] **Step 3: Rename "How we can help" section**

Rename acquisition-heavy headings:

- "How we can help" -> "Where online review may fit"
- "What we can help with" -> "May fit online review"
- "What needs in-person care" -> "Needs in-person or urgent care"

- [ ] **Step 4: Add source/related-reading area**

Add a section near the end:

```tsx
<section className="px-4 py-12">
  <div className="mx-auto max-w-4xl">
    <h2 className="text-2xl font-semibold tracking-tight text-foreground">
      Related reading
    </h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <Link href="/blog/when-telehealth-cant-help" className="text-primary hover:underline">
        When telehealth cannot safely help
      </Link>
      <Link href="/blog/telehealth-safety-screening" className="text-primary hover:underline">
        How telehealth safety screening works
      </Link>
    </div>
  </div>
</section>
```

If those slugs are not in the keep-set at execution time, use another indexed safety/telehealth guide from `lib/seo/index-policy.ts`.

- [ ] **Step 5: Run checks**

```bash
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add 'app/conditions/[slug]/page.tsx' lib/seo/data/conditions.ts
git commit -m "refactor(seo): make condition pages education first"
```

Only stage files actually changed.

## Task 5: CTR And Metadata Fixes For Existing Demand

**Files:**
- Modify only pages selected by refreshed GSC evidence
- Likely Modify: `content/blog/pbs-pharmaceutical-benefits-scheme.mdx`
- Likely Modify: `content/blog/finasteride-vs-minoxidil-hair-loss.mdx`
- Likely Modify: `content/blog/ahpra-registered-doctor-meaning.mdx`
- Likely Modify: `content/blog/is-telehealth-bulk-billed-australia.mdx`
- Likely Modify: `content/blog/doctors-note-australia.mdx`
- Likely Modify: `app/medical-certificate/page.tsx`
- Test: `pnpm content:audit:strict`
- Test: `pnpm lint`
- Test: `pnpm typecheck`

**Interfaces:**
- Consumes: final 28d and 90d GSC query rows.
- Produces: tighter titles/descriptions and first-screen answers for pages that already have impressions.

- [ ] **Step 1: Select pages from live GSC**

Pick pages only when all are true:

- GSC shows impressions in final 28d or 90d.
- CTR is weak relative to position and query intent.
- Existing page is the correct intent match.
- Changing title/description will not create a regulated-health claim.

- [ ] **Step 2: Update one page at a time**

For each selected page, make only one of these changes unless evidence supports more:

- Metadata title.
- Metadata description.
- First paragraph/direct answer.
- FAQ question wording that matches actual GSC query language.

Do not rewrite entire guides in this task.

- [ ] **Step 3: Run content checks**

For blog changes:

```bash
pnpm content:audit:strict
```

For app route changes:

```bash
pnpm lint
pnpm typecheck
```

- [ ] **Step 4: Browser and raw HTML proof**

Use Chrome/CDP and Playwright if layout changed. Use raw HTML checks if metadata/canonical/link claims changed.

- [ ] **Step 5: Commit**

```bash
git add content/blog app/medical-certificate/page.tsx
git commit -m "feat(seo): improve snippets for existing search demand"
```

Only stage files actually changed.

## Task 6: GEO / LLM Extractability Blocks

**Files:**
- Modify: `app/(marketing)/page.tsx`
- Modify: `app/pricing/pricing-content.tsx`
- Modify: `app/prescriptions/page.tsx`
- Modify: `app/hair-loss/page.tsx` or `components/marketing/hair-loss-landing.tsx`
- Modify: `app/erectile-dysfunction/page.tsx` or `components/marketing/erectile-dysfunction-landing.tsx`
- Modify: `app/compare/[slug]/page.tsx`
- Modify: `content/blog/ahpra-registered-doctor-meaning.mdx` only if evidence supports it
- Test: `pnpm lint`
- Test: `pnpm typecheck`
- Test: `pnpm content:audit:strict` if blog changes

**Interfaces:**
- Consumes: page-template contracts and compliance docs.
- Produces: short, source-backed, static HTML answer blocks that humans and AI retrieval systems can quote.

- [ ] **Step 1: Add extractable block pattern**

Use simple HTML sections, not a new design system. Pattern:

```tsx
<section aria-labelledby="instantmed-facts" className="px-4 py-12">
  <div className="mx-auto max-w-4xl">
    <h2 id="instantmed-facts" className="text-2xl font-semibold tracking-tight text-foreground">
      Key facts about InstantMed
    </h2>
    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
      <div>
        <dt className="font-medium text-foreground">Who reviews requests?</dt>
        <dd className="mt-1 text-sm leading-6 text-muted-foreground">
          AHPRA-registered doctors review submitted clinical forms and decide what is clinically appropriate.
        </dd>
      </div>
    </dl>
  </div>
</section>
```

- [ ] **Step 2: Keep facts service-specific**

Include only facts relevant to each route:

- Homepage: entity, services, Australia-only, secure form, doctor review.
- Pricing: service fees, pharmacy cost boundary, Medicare/bulk billing boundary, refund boundary.
- Prescriptions: repeat medication review, eScript if approved, Medicare identity/prescribing records, pharmacy/PBS boundary.
- ED/hair loss: private assessment, safety screening, doctor may call, pharmacy cost boundary, no outcome/treatment guarantees.
- Compare page: dated comparison method, price/source date, verification method, refund boundary.

- [ ] **Step 3: Run compliance pass before committing ED/hair/compare copy**

Check against:

- `docs/ADVERTISING_COMPLIANCE.md`
- `docs/SEO_CONTENT_POLICY.md`
- `docs/BRAND.md`
- `docs/VOICE.md`

Block any drug names, treatment promises, no-call promises, or review/social-proof claims.

- [ ] **Step 4: Run checks**

```bash
pnpm lint
pnpm typecheck
pnpm content:audit:strict
```

Expected: PASS. If no blog files changed, `content:audit:strict` is still acceptable as a regression check.

- [ ] **Step 5: Commit**

```bash
git add app components content/blog
git commit -m "feat(seo): add source backed geo answer blocks"
```

Only stage files actually changed.

## Task 7: Off-Page GEO Citation Work

**Files:**
- Optional Modify: `docs/runbooks/NHSD_REGISTRATION.md` only if verification finds drift
- Optional Create: `docs/audits/YYYY-MM-DD-geo-citation-execution.md`
- Test: `pnpm doc:audit` if docs changed

**Interfaces:**
- Consumes: entity facts from `AGENTS.md`, `docs/runbooks/NHSD_REGISTRATION.md`, `docs/ADVERTISING_COMPLIANCE.md`.
- Produces: external profile hygiene and optional execution record.

- [ ] **Step 1: Verify NHSD listing**

Use browser with the logged-in work profile if needed. Confirm:

- InstantMed Telehealth listing exists.
- No doctor names are published.
- Service scope does not include gated/retired services.
- Description still matches launched services.

If drift exists, update the external listing manually and update `docs/runbooks/NHSD_REGISTRATION.md`.

- [ ] **Step 2: Prepare ProductReview and Trustpilot profile copy**

Use factual profile copy only:

```text
InstantMed is an Australian telehealth service for adults seeking online doctor review for selected one-off services, including medical certificates, repeat prescription requests, hair-loss assessment, erectile-dysfunction assessment, and women's health pathways. Requests start with a secure clinical form. An AHPRA-registered doctor reviews the information and may contact the patient if clinically needed. Approved documents or eScript tokens are delivered digitally. InstantMed Pty Ltd, ABN 64 694 559 334. LegitScript certified, ID 48400566.
```

Do not include review asks, star targets, patient outcomes, or doctor names.

- [ ] **Step 3: Prepare MediCompare/Finder outreach draft**

Use a factual short pitch:

```text
InstantMed is an Australian telehealth provider for selected one-off services: medical certificates, repeat prescription requests, hair-loss assessment, erectile-dysfunction assessment, and women's health pathways. We publish current pricing, refund policy, certificate verification details, and prescribing boundaries. If you maintain an Australian telehealth comparison resource, could you advise the evidence required for inclusion or correction?
```

- [ ] **Step 4: Record execution only if useful**

If the operator wants a record, create:

```bash
docs/audits/$(date +%Y-%m-%d)-geo-citation-execution.md
```

Include profiles checked, changes requested, and next follow-up dates. Do not store passwords, patient details, or review contents.

- [ ] **Step 5: Commit only if docs changed**

```bash
git add docs/runbooks/NHSD_REGISTRATION.md docs/audits
git commit -m "docs: record geo citation execution"
```

## Task 8: Verification And Release

**Files:**
- Modify: none unless previous tasks uncovered a small doc correction
- Test: all listed commands

**Interfaces:**
- Consumes: Tasks 2-7.
- Produces: a draft PR with proof scope clearly separated.

- [ ] **Step 1: Run full relevant checks**

```bash
pnpm doc:audit
pnpm content:audit:strict
pnpm content:audit:images
pnpm lint
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 2: Run browser checks**

Start dev server if needed:

```bash
pnpm dev
```

Check:

- `http://localhost:3060/medical-certificate`
- `http://localhost:3060/pricing`
- `http://localhost:3060/trust`
- `http://localhost:3060/compare/online-medical-certificate-options`
- `http://localhost:3060/conditions/cold-and-flu`
- `http://localhost:3060/hair-loss`
- `http://localhost:3060/erectile-dysfunction`

Use Chrome/CDP and Playwright. Confirm:

- No horizontal overflow.
- No text overlap.
- No console errors.
- Links are visible and not visually noisy.
- ED/hair/prescription copy avoids prohibited claims.
- Condition page reads as education-first.

- [ ] **Step 3: Run raw HTML proof**

Run the Task 1 raw HTML script again against production after deployment or preview URL, adjusted for the target origin if needed.

Expected:

- Contextual guide links appear in raw HTML.
- Canonicals are present.
- Indexed pages are not `noindex`.
- Iceboxed pages remain `noindex,follow` unless explicitly approved.

- [ ] **Step 4: Prepare draft PR**

PR description must include:

- Problem
- Changes
- Verification
- Risk/Rollback
- Compliance/Privacy impact
- Env/Migration changes

Compliance/Privacy impact must state:

```text
No PHI touched. No patient data touched. Public regulated-health copy changed only within approved service-level and education-only boundaries. No testimonials, review counts, star ratings, drug-specific acquisition copy, prescription-only medicine prices, or prescribing guarantees added.
```

- [ ] **Step 5: Post-deploy GSC indexing gate**

Only after merge and production deploy:

- Verify live production HTML shows the new content.
- Verify images return 200 if any guide visuals changed.
- Verify canonical and sitemap status.
- Run GSC URL inspection for changed canonical URLs.
- Request indexing only for pages that pass the "indexing-ready" definition in `docs/ARTICLE_TEMPLATE.md`.

## Success Metrics

These are targets, not promises:

- GSC 90d clicks: 237 -> 400+.
- AI referral events: 157 -> 250+.
- AI-paid orders: 22 -> 35+.
- At least five pages above 1,000 impressions.
- At least ten pages with meaningful GSC or AI traffic.
- `/compare/online-medical-certificate-options` has live GSC/Bing visibility or a documented blocker.
- Priority contextual guide links appear in raw HTML on money/trust pages.

## Hard No List

- No trailing-slash redirect work.
- No new broad programmatic page expansion.
- No city-page expansion inside this plan.
- No guide-body service CTAs.
- No testimonials, review counts, star ratings, or aggregate rating schema.
- No prescription-only drug names in service page metadata, FAQ, schema, navigation, public mockups, or paid destinations.
- No prescription-only medicine prices.
- No "guaranteed", "always accepted", "no call needed" for prescribing/specialty, or "doctor approves in X" claims.
- No fake external authority claims.
- No off-page review solicitation engine that encourages outcome/testimonial content.

## Implementation Order

1. Task 1 read-only evidence refresh.
2. Task 2 template contracts.
3. Task 3 contextual links.
4. Task 4 condition template hardening.
5. Task 5 CTR metadata fixes.
6. Task 6 GEO answer blocks.
7. Task 7 off-page citation work in parallel where operator time allows.
8. Task 8 verification and release.

Do not skip Task 2. The page-template contracts are what prevent later SEO changes from turning educational pages into regulated acquisition pages.
