# Health Guides Rehaul Plan

> **Verdict:** Rebuild the health guides as a content product, not as a batch of AI-written articles with stock images. The immediate failure mode is not just bad copy. The renderer is dropping supported-looking Markdown into plain paragraphs, the table of contents points at IDs that do not exist, and every article still uses Unsplash imagery. Fix the system first, then rewrite and replace assets page by page.

## Initial Evidence Before Implementation

- `content/blog` contains 108 MDX articles.
- 108 of 108 articles initially used Unsplash hero images.
- 41 articles contain Markdown tables, but the parser does not parse tables.
- 35 articles contain ordered lists, but the parser only parses `- ` bullet lists.
- 22 articles contain blockquotes, but the parser does not parse blockquotes.
- 50 articles contain bold-led label paragraphs such as `**Treatment:**`, which currently render as literal Markdown text.
- The desktop table of contents generates IDs like `heading-0-rome-iv-diagnostic-criteria`, while article headings render IDs like `rome-iv-diagnostic-criteria`.
- The template injects service CTAs inside guide content, which breaks the educational trust contract and makes guide pages feel like acquisition pages.

## Current State After First Pass

- Renderer now handles tables, ordered lists, blockquotes/callouts, bold-led labels, and inline links without leaking raw Markdown syntax.
- Desktop and mobile TOC links use the same heading slug helper as the rendered H2/H3 IDs.
- The article template is guide-only: no mid-article consultation CTA, service CTA card, related-service acquisition panel, or location SEO cross-link block.
- Rewritten articles use local GPT-generated WebP visuals, with a new baseline of at least two visuals per article and ideally three for high-intent or clinical topics.
- `pnpm content:audit` now produces the remaining backlog across all 108 articles instead of relying on screenshot-by-screenshot discovery.

## Outcome

Create a clean, trustworthy Australian health guide system where:

- Tables, ordered lists, blockquotes, callouts, bold labels, and links render correctly.
- The sidebar and mobile jump links scroll to the correct headings and track active sections.
- Each rewritten page has at least two specific GPT-generated visuals, with format diversity across infographics, explainers, posters, body maps, comparison graphics, process visuals, warning graphics, workflow graphics, and hero images.
- Text reads like a reviewed clinical explainer, not a generic AI article.
- Clinical safety boundaries are obvious: what telehealth can help with, what needs in-person care, what needs urgent care.
- Guide pages stay guide-only: no mid-article consultation CTA, no service CTA card, and no "How InstantMed can help" sales block.
- Free guides remain separate from any paid toolkit/workbook product line.

## Architecture

The rebuild should keep the existing MDX content model for now, but make the renderer honest and testable. Do not start by rewriting all 108 articles by hand. First, make unsupported syntax impossible to publish broken. Then use an inventory script to rank pages by traffic, clinical risk, conversion value, and visible rendering defects.

## Phase 1: Fix The Renderer

**Files:**

- Modify: `lib/blog/mdx.ts`
- Modify: `lib/blog/types.ts`
- Modify: `components/blog/article-template.tsx`
- Modify: `components/blog/table-of-contents.tsx`
- Add: `lib/__tests__/blog-mdx-rendering-contract.test.ts`

**Tasks:**

- Add parser support for GitHub-flavoured tables, ordered lists, blockquotes, and bold-led label paragraphs.
- Use one shared `slugifyHeading()` helper for article headings, mobile TOC, desktop TOC, observer targets, and scroll targets.
- Stop generating separate desktop TOC IDs that do not exist in the rendered document.
- Render tables as responsive, accessible tables with real `thead`, `tbody`, `scope`, and mobile overflow.
- Render ordered lists as numbered steps, not checkmark cards.
- Render blockquotes as styled medical notes or warnings, depending on content.
- Add a regression fixture using the IBS page table, conjunctivitis comparison table, shingles blockquote, and a numbered self-care list.

**Acceptance Criteria:**

- The IBS subtype table renders as a table, not pipe text.
- The conjunctivitis comparison table renders as a table.
- Desktop and mobile TOC links scroll to the correct heading.
- Active TOC state updates while scrolling.
- Markdown pipes, `**Label:**`, `1.`, and `>` syntax do not leak into visible article prose.

## Phase 2: Add Content QA Gates

**Files:**

- Add: `scripts/audit-health-guides.mjs`
- Add: `lib/__tests__/health-guide-content-contract.test.ts`
- Modify: `package.json`

**Tasks:**

- Create a guide audit script that reports unsupported Markdown, missing alt text, remote stock images, missing red-flag sections, broken internal links, duplicate titles, and empty reviewer metadata.
- Add a contract test that fails when an article contains Markdown patterns the renderer does not support.
- Add an output report grouped by severity: rendering defect, clinical risk, SEO issue, image issue, copy-quality issue.
- Add a `pnpm content:audit` script.

**Acceptance Criteria:**

- A future article cannot silently ship raw Markdown artifacts.
- The audit gives a ranked list of pages needing rewrite or asset replacement.
- The report can be used as the editorial backlog.

## Phase 3: Rebuild The Article Template

**Files:**

- Modify: `components/blog/article-template.tsx`
- Add: `components/blog/article-visuals.tsx`
- Add/extend as needed later: `components/blog/clinical-red-flags.tsx`, `components/blog/guide-comparison-table.tsx`, `components/blog/guide-decision-tree.tsx`, `components/blog/guide-timeline.tsx`

**Tasks:**

- Create reusable article primitives for comparison tables, timelines, red-flag panels, decision trees, source notes, and inline visuals.
- Keep the article surface calm and clinical. Avoid nested cards, oversized marketing sections, and decorative blobs.
- Remove guide-body CTA logic. Keep related reading, FAQs, author/reviewer information, and source notes, but do not interrupt the article with consultation or service acquisition blocks.
- Make sidebar navigation scan-friendly, sticky, and keyboard-accessible.
- Keep body line length between 65 and 75 characters.

**Acceptance Criteria:**

- Pages feel like premium clinical explainers, not blog templates.
- No guide page renders a mid-article consultation CTA, bottom service CTA, or related-service acquisition panel.
- Mobile article navigation is usable without taking over the page.

## Phase 4: Editorial Rehaul

**Priority Order:**

1. `ibs-digestive-issues`
2. `medical-certificate-mental-health-day`
3. `eczema-dermatitis`
4. `telehealth-after-hours`
5. `medical-certificate-food-poisoning`
6. `sinusitis`
7. `hay-fever-allergies`
8. `medical-certificate-period-pain`
9. `university-medical-certificates`
10. `vertigo-dizziness`
11. `medical-certificate-centrelink`
12. `gout`
13. `medical-certificate-surgery-recovery`
14. `pbs-pharmaceutical-benefits-scheme`
15. `medical-certificate-pregnancy-related-absence`

**Rewrite Standard:**

- Open with the practical answer, not a generic definition.
- Use at least six H2 sections unless the topic is genuinely narrow.
- Target a comprehensive article length, generally 1,200+ words.
- Include a visible sources or references section.
- Add a clear "what telehealth can help with" section only when clinically true.
- Add "when this is not suitable for telehealth" and urgent red flags on condition pages.
- Replace filler with concrete Australian context: Fair Work, AHPRA, Healthdirect, RACGP, Therapeutic Guidelines, ASCIA, Monash FODMAP where relevant.
- Keep medication content within advertising and TGA-safe boundaries.
- Add source notes without turning the page into an academic paper.
- Avoid fake certainty. If a claim is generic or unsupported, remove it or source it.

**Acceptance Criteria:**

- No page reads like generic AI output.
- The article answers the patient intent in the first screen.
- The clinical safety boundary is visible before related reading, author details, or sharing controls.
- Each revised article has a clear reviewer/date/source trail.

## Phase 5: Article-Specific Images And Infographics

**Asset Rules:**

- Store assets under `public/images/blog/<slug>/`.
- Use local `webp` for page assets and `jpg` fallback for OG where needed.
- Every rewritten article needs at least two GPT-generated local visuals, ideally three for high-intent or clinical topics.
- Add the deterministic `InstantMed` wordmark in post-processing, not in the model prompt, so the mark stays spelled correctly and consistent.
- Controlled short text may appear inside GPT-generated visuals only when sourced from `lib/blog/visuals.ts`; never let the image model invent claims, prices, diagnoses, drug names, legal rules, or service CTAs.
- Keep the same labels and clinical distinctions in React/HTML via `components/blog/article-visuals.tsx` so they remain accessible, reviewable, and indexable.
- Do not generate fake doctor faces.
- Disclose AI-generated human imagery in metadata if published.
- Avoid graphic medical imagery. The brand should feel calm, practical, and Australian.

**Accepted Visual Formats:**

- Medical infographics
- Anatomical explainers
- Patient education posters
- Mechanism-of-action diagrams
- Comparison graphics
- Step-by-step process visuals
- Red flag warning graphics
- Lifestyle and prevention illustrations
- Symptom-location body maps
- Lab result explainers
- Telehealth workflow graphics
- Blog hero images

**Current Visual Registry Shape:**

Top-priority article visuals are registered in `lib/blog/visuals.ts`, rendered by `components/blog/article-visuals.tsx`, and backed by local assets under `public/images/blog/<slug>/`.

**Future Frontmatter Shape If Visuals Need Per-Article Editorial Control:**

```yaml
heroImage: "/images/blog/ibs-digestive-issues/hero.webp"
heroImageAlt: "A calm Australian kitchen scene with a symptom diary and tea beside a phone"
visuals:
  - type: "infographic"
    src: "/images/blog/ibs-digestive-issues/gut-brain-axis.webp"
    alt: "Simplified gut brain axis diagram showing stress, gut sensitivity, and bowel symptoms"
    caption: "IBS symptoms often involve a bidirectional gut-brain pathway."
```

**First Batch Visual Concepts:**

- IBS: gut-brain axis diagram, Low FODMAP three-phase flow, IBS subtype comparison.
- Conjunctivitis: viral vs bacterial vs allergic comparison, red-eye triage decision tree, contact lens warning panel.
- Eczema: flare cycle, moisturiser and topical treatment sequence, trigger tracker.
- Mental health day: sick leave pathway, employer evidence boundary, support escalation ladder.
- Food poisoning: hydration and return-to-work timeline, food-handler 48-hour rule.
- Sinusitis: viral vs bacterial timeline, red flags for urgent review.
- Hay fever: correct nasal spray angle, pollen exposure reduction checklist.
- Telehealth after-hours: urgency ladder from self-care to 000.
- Vertigo: BPPV vs vestibular neuritis comparison and "when dizziness is urgent" panel.
- Gout: acute flare timeline and long-term prevention levers.

## Phase 6: Route And Product Architecture Cleanup

**Requires Product Decision:** Do not silently change public canonical routing. Decide whether `/blog` remains the public health guide route or whether `/guides` becomes canonical before changing redirects, schema, breadcrumbs, sitemap, or nav labels.

**Tasks:**

- Decide whether `/blog/[slug]` redirects to `/guides/[slug]` or remains as a technical route with canonical `/guides/[slug]`.
- Keep paid workbooks/toolkits separate under `/toolkits`, not mixed into the free guide index.
- Update schema, breadcrumbs, nav labels, sitemap, and internal links to match the canonical decision.

## Phase 7: Verification

**Commands:**

- `pnpm content:audit`
- `pnpm test run lib/__tests__/blog-mdx-rendering-contract.test.ts lib/__tests__/blog-visuals-contract.test.ts lib/__tests__/guide-only-template-contract.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`

**Browser QA:**

- Check desktop and mobile for IBS, conjunctivitis, mental-health-day, eczema, and telehealth-after-hours.
- Verify tables, TOC clicks, sticky sidebar, mobile jump links, CTA spacing, image loading, alt text, and no horizontal overflow.
- Check Lighthouse for article pages after image replacement.

## Recommended Execution

1. Fix renderer and TOC first.
2. Add content audit gate.
3. Rebuild article visual primitives.
4. Keep the article template guide-only, with no consultation or service CTAs.
5. Rework pages one by one with at least two GPT-generated article-specific visuals and source-backed comprehensive copy.
6. Expand category by category across the remaining 93 pages.
7. Clean `/blog` vs `/guides` routing once the page quality is no longer embarrassing.
