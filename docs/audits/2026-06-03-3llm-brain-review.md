# 3-LLM Brain Review — SEO Content Overhaul (2026-06-03)

Reviewers: **GPT-5.5** and **Gemini 3 Pro** (via Vercel AI Gateway, `scripts/brain-review.ts`) + **Opus 4.8** (orchestrator). Input brief: `/tmp/seo-review-input.md` (strategy, GSC data, every decision + change).

## Verdict: strong 3-way consensus

All three brains converge: **the current strategy is mis-prioritised.** The binding constraint is **indexation + domain authority + crawl budget**, NOT content depth. Deepening pages Google won't crawl ("Discovered – currently not indexed") is, in Gemini's words, "polishing a turd in the dark," and in GPT-5.5's, "quantity wearing a quality costume." Opus diagnosed this correctly but then executed the founder's "deepen everything" choice anyway — a real miss.

## Reconciled findings by theme

**A. Strategy — CHANGE COURSE (unanimous).** Stop deepening zero-impression pages. Highest-ROI in 90 days: (1) get `/medical-certificate` + `/prescriptions` indexed; (2) fix CTR on the 11 pages already ranking; (3) build external authority (backlinks/digital PR — a YMYL health site cannot rank without it). Founder preference should not override GSC evidence.

**B. Biggest risks.** (1) **Medico-legal/AHPRA + TGA** — see C, plus a TGA S4-advertising sweep is needed on ED/hair-loss/antibiotic surfaces (six-figure-fine territory if a guaranteed-script implication or S4 drug name appears pre-consult). (2) **Wasted runway** fixing facts on 0-impression pages. (3) **CTR hemorrhage** (antibiotics: 2,627 impressions, 0.27% CTR).

**C. E-E-A-T governance — both flag the Dr Najjar attribution as a serious risk (Opus agrees, this is a genuine error).** Putting one named Medical Director + AHPRA number on ~285 pages = (i) rubber-stamping liability — AHPRA holds *him* personally responsible for clinical accuracy on every page bearing his name; (ii) it contradicts the CLAUDE.md rule "Public surfaces must not disclose individual doctor names." **Fix:** corporate/clinical-team attribution ("InstantMed Clinical Team") for the bulk; reserve Dr Najjar's name + AHPRA + Person schema ONLY for the handful of pillar pages he has personally, verifiably reviewed and signed off in writing. This needs doing before proceeding.

**D. Consolidation.** 108→105 is "deck-chair rearrangement." Real lever = `noindex` the ~310 zero-impression programmatic pages (keep live for users if desired, remove from sitemap) to concentrate crawl budget on the ~20 pages that drive revenue.

**E. Execution.** Pause the one-article-at-a-time deepening playbook — it's Phase-3 optimisation on a site that hasn't passed Phase-1 indexation. Reallocate to indexation + CTR.

**F. Images — contested; reconciled to "deprioritise."** Gemini: kill the gpt2 generator (Google doesn't read in-image text for ranking; hallucination liability; page-speed bloat) and use native HTML/CSS for tables/flows. GPT-5.5: use sparingly with compliance review + HTML equivalent + AVIF/lazy-load. **Opus reconciliation:** my pipeline is partly defended — text is registry-controlled (not free hallucination) and the same labels render in HTML (so SEO value lives in the HTML, accessibility holds). But the core point stands: **the images are UX/brand polish, not an SEO lever, and not worth per-article priority.** Keep the ones generated; stop prioritising new gen; ensure AVIF + lazy-load; for SEO-critical structure (comparison tables, exclusion periods) the **MDX/HTML tables are what matters** (already doing this).

**G. Blind spots (unanimous).** Zero off-page authority/backlink strategy. Site architecture likely flat/broken (money pages orphaned → DCNI). Intent mismatch: "can you get antibiotics online" is informational/zero-click — wrong funnel stage for leads.

## Net for the founder
Both external brains say, bluntly: InstantMed does not need a bigger/deeper content base right now. It needs indexed commercial pages, cleaner clinical governance, fewer low-value indexed URLs, external authority, and CTR fixes on the pages already ranking. Most current content work is premature until `/medical-certificate` and `/prescriptions` are indexed.
