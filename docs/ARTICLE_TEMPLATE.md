# Article Template & Visual System

> Canonical authoring standard for every health guide build, deepen, or edit (`content/blog/*.mdx`).
> Use this doc every time a page is touched. Division of labour:
> **This doc** owns structure, components, visual system, workflow, and queue order.
> **`docs/SEO_CONTENT_POLICY.md`** owns compliance law: allowed/prohibited content, CTA rules, supported MDX tags, image acceptance floor, banned image archetypes.
> **Code** owns enforcement: `scripts/audit-health-guides.mjs`, `lib/blog/visuals.ts`, `scripts/generate-blog-visual-images.ts`.
> On conflict: SEO_CONTENT_POLICY wins on compliance, this doc wins on structure/workflow.

**Last updated:** 2026-07-05

**Status:** items marked **[PR-1]** are part of the template-foundation PR and do not exist on `main` yet. Until PR 1 lands, author with the four existing components and the existing audit flags.

---

## 1. Premise

- **Article = the teaching.** Nuance, evidence, caveats, eligibility, hedging — all in HTML.
- **Image = one clean mental model.** Never a mini-article inside a PNG.
- **Components = semantic jobs**, not decoration. Every fact appears exactly once, in the element that fits it best.
- Depth means answering more of the reader's real questions — never more words. The 1,200+ word baseline is a floor, not a stuffing target.

## 2. Page Archetypes

Classify the page before writing anything. The archetype fixes the section spine and the default visual set.

| Archetype | Examples | Section spine (H2s adapt wording, keep intent) | Default visuals (V1 / V2 / V3) |
|---|---|---|---|
| **Condition** | male pattern baldness, eczema, GORD | What is it → causes/mechanism → what it looks like → diagnosis → treatment options (table) → when to see a doctor | Mechanism/anatomy · pattern/progression · treatment journey/timeline |
| **Medication** | metformin guide, amoxicillin guide | What it's used for (approved first) → how it works → how it's usually taken → benefits + expected timeline → side effects (tiered) → who should avoid it → interactions → monitoring | Mechanism · response timeline · side-effect tiers (only if it teaches cleanly) |
| **Symptom** | dizziness, hair loss causes | What it could mean → common causes (ranked, non-diagnostic) → when to worry → what a doctor may ask → tests → treatment depends on cause | Cause map · traffic-light urgency · assessment pathway |
| **Policy / general** | Medicare billing, cert validity | The practical answer → the basic rule → what's needed → what may prevent eligibility → what happens next | Eligibility/decision boundary · process pathway · can/can't boundary |
| **Comparison** | sildenafil vs tadalafil | Direct answer → how each works → head-to-head (semantic table) → suitability → switching/combining | Simple visual contrast · decision factors · details stay in HTML table |
| **Treatment guide** | hair loss treatment online | Options overview → care pathway → what online review can/can't do → expectations | Care pathway · timeline · maintenance/follow-up |

Visual wording rules per archetype: symptom visuals use "a doctor may consider…", never "symptom + X = diagnosis Y"; policy visuals end in "doctor decides / assessment needed / may not be suitable", never "issued / approved / eligible"; medication visuals carry no dosing, brand promotion, efficacy rankings, or off-label claims (per SEO_CONTENT_POLICY §4).

## 3. Standard Body Structure

Every page follows this order:

```
1. Direct answer (first screen, no throat-clearing)
2. KeyTakeaway (exactly one)
3. Component-led H2 sections (6+ unless the topic is genuinely narrow)
4. 2-3 visuals, each anchored to the section it explains
5. Semantic Markdown tables for anything comparative or multi-dimensional
6. DecisionBox / EvidenceNote / PolicyNote / CareBoundary where earned
7. FAQ (only real search questions)
8. Sources + reviewer/date panel
```

### Component semantics and caps

| Component | Job | Cap |
|---|---|---|
| `KeyTakeaway` | The practical answer, once, 3-5 bullets | 1 |
| `DecisionBox` | Genuine triage/suitability decision (fixed headings per SEO_CONTENT_POLICY §4) | 0-1 |
| `EvidenceNote` | Evidence strength / source context | 0-2 |
| `PolicyNote` | External rules: TGA, Medicare, Fair Work, employer/uni policy | 0-2 |
| `CareBoundary` **[PR-1]** | Scope-of-care limits: what this guide / telehealth cannot do, no guaranteed outcomes | 0-1 |
| Markdown table | ≥3 rows × ≥2 real dimensions; otherwise write prose | as needed |

**Total callout-style components: max 5 per page** unless explicitly justified in the PR description. Variety comes from different section shapes (prose, table, visual, decision box) — not from wrapping every paragraph in a panel. Component wallpaper is the new AI slop.

### Premium feel

Typography, spacing, solid-depth surfaces, and well-art-directed visuals carry the premium feel — not motion. CSS-only, one-time, `prefers-reduced-motion`-gated reveals and hover border-brightening are the entire animation budget. No framer-motion in guide bodies, no scroll-linked effects, no parallax. Guide pages are an SEO surface: mobile LCP is a ranking input.

## 4. Anti-Slop Rules

- Banned filler: "It's important to note", "In conclusion", "In today's fast-paced world", "Let's dive in", "comprehensive guide" self-reference, rhetorical-question openers.
- No conclusion section that restates the KeyTakeaway. Say it once.
- Every H2 must answer a question a real reader has (check GSC queries for the page). If no query or clinical need maps to a section, cut it.
- FAQ entries must be genuinely asked questions, not restatements of H2s already answered.
- No hedging stacks ("may potentially be able to"). One qualifier per claim.
- Word count never pads: if the topic is done at 1,400 words, stop.

## 5. Visual System

### Hard rules (enforced by audit; canonical list in SEO_CONTENT_POLICY §4)

- One image = one concept. 2-3 images per rewritten article.
- 3-7 labels per image, 1-4 words per label, hard fail over 5 words.
- No paragraphs, tables, dosage schedules, fake documents/products/app UI, brand promotion, CTAs, before/after framing, or eligibility promises inside image pixels.
- Nothing essential in the bottom-right wordmark badge zone.
- Dense explanation belongs in HTML first (KeyTakeaway, table, DecisionBox, CareBoundary); the image gets the map, not the teaching.

### Renderer selection

| Renderer | Use when | Text handling |
|---|---|---|
| `gpt-image-2-composite` | **Default for any visual with labels** [PR-1 makes this the default path] | GPT paints a text-free underlay; script overlays approved `textItems` deterministically — labels cannot be misspelled |
| `gpt-image-2` (direct) | Text-free or near-text-free illustration/anatomy only | Model-rendered; regenerate on any garbled text |
| `deterministic` | Topology-critical diagrams: decision trees, flows, staged timelines | Pure code (SVG → sharp); arrows and order are exact by construction |

Advanced (optional): for diagrams needing both accuracy and painterly finish, render the deterministic skeleton first, feed it to gpt-image-2 as an image-edit reference ("repaint in style, preserve geometry, leave label zones blank"), then composite labels on top.

### Style direction (single source of truth: the prompt builder [PR-1], `lib/blog/article-visual-system.ts`)

Premium medical atlas: warm off-white canvas, deep navy structure, coral/teal accents, thin rule lines, generous negative space, soft clinical illustration, numbered pathway chips only when genuinely sequential. Anatomy is always "simplified schematic, not anatomically detailed."

### Registry entry contract (`lib/blog/visuals.ts`)

Authors fill: `articleType` **[PR-1]**, `visualRole` **[PR-1]**, `concept` **[PR-1]** (one sentence: what the reader should understand at a glance), `kind`, `accent`, `items[]` (label + detail), `textItems` (the only copy allowed in pixels), `textMode: "labels"`. The same distinctions must render in HTML via `components/blog/article-visuals.tsx`.

Worked example (condition/mechanism):

```
concept: "Why follicles shrink in male pattern baldness"
textItems: ["Testosterone", "DHT", "Sensitive follicle", "Miniaturisation", "Thinner hair"]
```

The article section above it does the actual teaching; the image gives the reader the map.

## 6. Per-Page Workflow

One page per PR. Worktree off current `main` (sibling dir, per CLAUDE.md worktree rule).

1. **Classify** the archetype (§2).
2. **Pull current state**: GSC queries/impressions for the URL, rendered live page, existing registry visuals.
3. **Write the page brief**: target query + intent, missing sections, visual roles, sources needed, compliance risks.
4. **Storyboard before writing**: component map (which H2s, which components, where each visual anchors).
5. **Write copy** against official AU sources (Healthdirect, TGA, Australian Prescriber, NPS MedicineWise, RACGP, Fair Work).
6. **Author visuals** as registry entries (§5) before generating.
7. **Generate and inspect** the actual images. Reject anything cluttered, cropped, garbled, or slop-archetype (policy §4 list).
8. **Run audits + tests** (§7).
9. **Browser-verify** desktop/mobile/light/dark at `http://localhost:3060`.
10. **Open draft PR**; indexing steps only after the gate in §8.

## 7. Verification

Commands per page PR:

```
pnpm content:audit:report   # archetype/visual/label report
pnpm content:audit          # baseline QA
pnpm content:audit:images   # image presence/quality flags
pnpm content:audit:strict   # P1 gate: unsupported tags, CTA leaks, label budgets [PR-1 extends]
pnpm lint && pnpm typecheck && pnpm test
```

Browser proof: no raw component tags, real `<table>` elements, no horizontal overflow, visuals load (200) and are readable at article + mobile width, no cropped labels, source/review panel visible, no guide-body service CTA, console clean.

Skill gates before sign-off: `instantmed-marketing-compliance-review` (always), `instantmed-ui-browser-verification` (always), `/clarify` when the PR is copy-heavy.

## 8. Queue Strategy & Indexing Gate

Work backwards from pages Google already trusts:

1. Indexed pages with impressions — highest impressions / weakest CTR / most commercially adjacent first.
2. Indexed pages with shallow structure or weak visuals.
3. Crawled, currently not indexed (quality/depth repair).
4. Discovered, not indexed — only after checking crawl demand and internal links.
5. Brand-new pages last, after cannibalisation + internal-link checks.

Refresh the queue from GSC (`pnpm seo:gsc-index-audit`) before each batch. Never plan from stale pasted numbers.

**Indexing-ready means all of:** PR merged · deploy complete · live production HTML shows the new content · live images return 200 · canonical correct · sitemap lists the URL · no noindex/robots/redirect issue. Only then request indexing in GSC.

## 9. Rollout

| Step | Scope |
|---|---|
| **PR 1 — foundation** | Extract primitives from `components/blog/article-template.tsx` into `components/blog/article-primitives/`; add `CareBoundary` (parser + renderer + audit); registry fields + central prompt builder; composite-default for labelled visuals; audit extensions (label budget, banned phrases, component budget, changed-slug mode); SEO_CONTENT_POLICY archetype cross-ref |
| **PR 2 — pilot** | Rebase PR #273 (finasteride vs minoxidil): keep the copy/table work, regenerate its 3 visuals through the new system, add CareBoundary, full §7 proof set |
| **PR 3+** | One page per PR down the §8 queue, starting `ahpra-registered-doctor-meaning`. Legacy pages are held to this standard only when touched |
