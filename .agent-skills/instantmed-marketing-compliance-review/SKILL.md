---
name: instantmed-marketing-compliance-review
description: InstantMed marketing, advertising, SEO, and regulated-health copy review workflow. Use when a task in /Users/rey/Developer/instantmed touches public landing pages, homepage, service pages, paid ads, Google Ads, metadata, schema, SEO guides, blog content, pricing copy, testimonials, reviews, social proof, CTAs, email marketing copy, lib/marketing, lib/seo, content/blog, docs/ADVERTISING_COMPLIANCE.md, docs/SEO_CONTENT_POLICY.md, docs/BRAND.md, or docs/VOICE.md.
---

# InstantMed Marketing Compliance Review

Use this before writing or approving public-facing health copy. The goal is to improve conversion without creating advertising, AHPRA, TGA, privacy, or proof-scope risk.

## Load Order

Read only what the task needs:

1. `AGENTS.md`, then `wiki/index.md`
2. `docs/BRAND.md` and `docs/VOICE.md`
3. `docs/ADVERTISING_COMPLIANCE.md` for paid, acquisition, claims, metadata, schema, testimonials, reviews, or service pages
4. `docs/SEO_CONTENT_POLICY.md` for guides, condition pages, symptom pages, medicine pages, or organic content
5. `docs/PRIMITIVES.md` for reusable marketing primitives, pricing, badges, stats, FAQ data, or wait times
6. `docs/PHOTOGRAPHY_BRIEF.md` for imagery
7. Target code/content files

If the task is primarily copy, also apply the repo's `/clarify` expectation when available.

## Review Path

Check:

1. Service scope: active, retired, gated, or coming soon.
2. Claim type: operational fact, clinical claim, comparative claim, price, timing, refund, review/social proof, or testimonial.
3. Evidence source: code constant, primitive, verified doc, policy, source ledger, or unsupported claim.
4. Regulatory risk: no outcome guarantees, no broad online-GP drift, no drug-name acquisition copy where prohibited, no unverified doctor/team claims.
5. Conversion clarity: anxiety-reducing, specific, simple, and honest.
6. Implementation source: prefer service catalog, voice constants, primitives, and shared components over inline duplication.

## Hard Boundaries

- Do not advertise doctor count, individual doctor names, FRACGP, peer review, or team training unless verified.
- Do not render review counts, numeric star ratings, testimonials, or aggregate-rating schema on regulated-health advertising surfaces unless current policy explicitly changes.
- Do not promise "no call needed" for prescribing or specialty services.
- Do not turn InstantMed into a broad "speak with a doctor about anything" brand promise.
- Do not route paid ads to prescription drug pages.
- Do not use stale pricing or service availability from memory.

## Output Shape

Lead with:

- Keep, revise, or block.
- Exact risky lines and safer replacements.
- Source of truth for each factual claim.
- Any code primitive or constant that should own the text.
- Verification: `pnpm content:audit` for guide/SEO changes, focused copy/schema tests where available, and browser checks when rendered public surfaces changed.
