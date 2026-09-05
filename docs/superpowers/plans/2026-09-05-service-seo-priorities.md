# Service SEO Priorities Work Package

> **For agentic workers:** Use `superpowers:executing-plans` to implement the selected task in bounded steps. This document is a planning deliverable; unchecked tasks are not completed work.

**Goal:** Grow qualified organic-search and AI-referred demand for medical certificates, repeat prescriptions, ED, hair loss, and women's health, then judge further investment by paid orders and retained revenue.

**Architecture:** Establish crawl and index evidence for nine existing URLs, give each a distinct search purpose, prepare five service briefs, release eligible improvements in measured batches, and test relevant external distribution. Use existing GSC and aggregate attribution/payment readers; build no new analytics product.

**Tech Stack:** Existing Next.js 15.5/React 18 pages, TypeScript, shared marketing components and FAQ data, read-only GSC tooling, aggregate PostHog/source attribution, and canonical payment truth. Keep all stack pins unchanged.

**Spec:** [ROADMAP](../../ROADMAP.md) ranks 1, 3, and 6; [business strategy](../../BUSINESS_PLAN.md); [revenue economics](../../REVENUE_MODEL.md); [SEO policy](../../SEO_CONTENT_POLICY.md); [advertising compliance](../../ADVERTISING_COMPLIANCE.md); operator direction on 2026-09-05 to prioritise actual services, including ED, hair loss, and women's health.

**Status:** Proposed execution package. Baseline collection and planning are complete. Public-page implementation, indexing requests, external submissions, and release of this package have not occurred. Crawl repair is separately tracked in [PR #517](https://github.com/reabal-n/instantmed/pull/517); it was unmerged and live robots still blocked `/_next/` at baseline collection.

## Global constraints and decisions

- Select work by service fit, relevant demand, and economic evidence. Raw blog clicks do not select the growth programme. Antibiotics-access content is not a priority; existing educational content is not automatically removed.
- All five service families receive discovery and intent research now. Zero historical specialty orders does not exclude a service from that investigation; it does mean revenue upside is unproven.
- Preserve the open [repeat-Rx and certificate experiments](../../plans/2026-08-24-free-channel-compounding-and-repeat-rx-conversion.md) and [specialty experiment contract](2026-08-28-specialty-profitability-rebuild.md). Research may proceed while material changes to measured surfaces wait for their checkpoints.
- This plan refines the service selection and external-prospect assumptions in the [August authority plan](2026-08-28-organic-authority-revenue-compounding.md). It does not inherit that plan's stale publisher, budget, support-hold, or CLI assumptions. Current canonical operating policy and explicit operator decisions prevail.
- Weight management remains live and keeps its existing ROADMAP checkpoint; it is outside this requested five-family build package. General consultations remain retired.
- Preserve the form-first service model, individual doctor decisions for prescribing, approved certificate protocol wording, and canonical eligibility. No new intake questions, service launches, subscriptions, pharmacy promises, doctor names/counts, guaranteed outcomes, reviews/ratings claims, or medicine-acquisition pages.
- Use [BRAND](../../BRAND.md), [VOICE](../../VOICE.md), approved claims, and pricing constants when writing. Load the marketing compliance skill before public-copy sign-off; clinical safety before changes to clinical meaning; design/UI verification skills for actual surface changes. Guide work additionally requires the article template and SEO policy.
- Collect aggregate evidence only. Never persist patient text, identifiers, medication requests, credentials, raw click IDs, or sensitive query strings in receipts.
- Planning does not send outreach, create profiles, mutate Ads, submit indexing, merge a PR, or promote production. Those actions retain their existing authorisation boundaries. Existing authorisation in the session should be checked before requesting it again.

## 1. Baseline and indexing list

Source: [nine-page baseline receipt](../receipts/2026-09-05-service-seo-baseline.json), checked **2026-09-05 12:41 AEST**. GSC performance covers **2026-08-04 through 2026-09-02**, final data in `America/Los_Angeles`. Inspection reports Google's stored index state, not a rendered Live Test.

All nine URLs returned HTTP 200, self-referencing canonicals, `index, follow`, no X-Robots-Tag, and appeared in the root sitemap. This confirms basic eligibility, not a guarantee of indexing. Six are indexed; three are not.

| URL on instantmed.com.au | Stored Google status | Last crawl, UTC | Clicks / impressions | Action |
|---|---|---|---:|---|
| `/medical-certificate` | Indexed | Aug 28 | 10 / 7,652 | Optional one-off recrawl after asset fix |
| `/medical-certificate-online` | Indexed | Aug 16 | 1 / 25 | Recrawl after asset fix; stored crawl predates verification changes |
| `/prescriptions` | Discovered, not indexed | None | 0 / 0 | Operator already requested indexing; observe |
| `/online-prescriptions` | Discovered, not indexed | None | 0 / 0 | Operator already requested indexing; observe |
| `/erectile-dysfunction` | Indexed | Aug 25 | 0 / 305 | Recrawl after asset fix; stored crawl predates current experience |
| `/hair-loss` | Indexed | Aug 21 | 0 / 36 | Recrawl after asset fix; stored crawl predates current experience |
| `/womens-health` | Indexed | Aug 1 | 0 / 62 | Recrawl after asset fix |
| `/uti-assessment-online` | Not indexed; latest result says URL unknown | None | 0 / 0 | Remaining first-time indexing request |
| `/contraceptive-pill-assessment-online` | Indexed | Jun 21 | 0 / 3 | Recrawl after asset fix |

Operator-reported submissions for the two prescription pages are not API-confirmed request receipts. A previous UTI inspection said discovered/not indexed; the latest says unknown. Both show no indexed result or recorded crawl, so do not infer a new regression from that label change alone.

The main certificate page's average position is **52.9**. Its low CTR alone does not justify a headline experiment: ranking distribution and relevant query coverage must be examined first. Women's health's average position of **7.0** comes from only **62 impressions**; it is not evidence that the service already ranks broadly.

### Task 1 — Release crawl repair and record requests

**Scope/files:** existing PR #517, `app/robots.ts`, `app/sitemap.ts`, `lib/seo/sitemap-lastmod.ts`, `tools/gsc-mcp-server/gsc-index-audit.mjs`. Do not bundle page copy into that release.

- [ ] Obtain the actual merged commit and successful production deployment receipt for #517 under the normal release workflow. A green branch build or skipped preview does not prove production changed.
- [ ] Fetch live robots and representative JS/CSS assets. Confirm public assets are crawlable and private account/request/staff exclusions remain. Record HTTP status, canonical, robots and sitemap evidence for the nine URLs.
- [ ] In authenticated Search Console, run **URL Inspection → Test Live URL** and inspect crawl/render eligibility. Request indexing once for `https://instantmed.com.au/uti-assessment-online` after successful live validation.
- [ ] Request a one-off recrawl of the six indexed URLs in the table after the repair is live. Keep the two prescription requests already made pending; do not re-submit them daily.
- [ ] Record request dates and results without account screenshots containing private data. Reinspect at 7 and 14 days; investigate persisted exclusion reasons instead of repeating submission.

**Complete when:** the deployed repair and each performed request have separate evidence. Index inclusion is an outcome to monitor, not a task that can be guaranteed by a deadline. Google's guidance says requests can take days or weeks and repetition does not accelerate them ([recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)).

## 2. Page ownership and order of work

These themes are research candidates, not verified search-volume estimates. Keep the nine current URLs and their distinct purposes. Do not merge a service page with its explanatory page merely because their titles share words.

| Service / SEO order | Primary destination and purpose | Supporting destination and purpose | Brief focus |
|---|---|---|---|
| 1. Medical certificates | `/medical-certificate`: choose and start the certificate service | `/medical-certificate-online`: costs, rules, suitability and verification | Work, study and carer intent; certificate scope; transparent price; employer verification; decision and delivery process |
| 2. Repeat prescriptions | `/prescriptions`: assessment for eligible repeats | `/online-prescriptions`: explain how online prescriptions work | Existing treatment eligibility; identity; what happens after assessment; price and refund terms; boundaries with dedicated services |
| 3. ED | `/erectile-dysfunction`: private ED assessment | Existing `/mens-health` and suitable trust/process pages | One-off assessment, what is reviewed, next steps, privacy and cost; no medication or outcome guarantee |
| 4. Hair loss | `/hair-loss`: private hair-loss assessment | Existing `/mens-health` and suitable trust/process pages | Suitability, assessment scope, what the fee covers and what happens next; no guaranteed regrowth or subscription framing |
| 5. Women's health | `/womens-health`: choose UTI or new/switch pill assessment | `/uti-assessment-online` and `/contraceptive-pill-assessment-online`: distinct assessment intents | Distinguish pathways, scope and when in-person care is needed; unchanged eligible pill repeats route to repeat prescriptions |

The numbering is the default order for selecting eligible page work, not permission to wait on specialties indefinitely. Women's-health discovery and all specialty briefs run in the first tranche. Where a higher page is under measurement, prepare its brief and move to the next eligible service.

### Task 2 — Build a query-to-page and link inventory

**Read:** the nine `app/<pathname>/page.tsx` files; corresponding components listed below; `app/sitemap.ts`; existing `/pricing`, `/how-it-works`, `/mens-health`, `/employers`, `/trust`, `/clinical-governance`, and `/verify` routes.

- [ ] Export final GSC **page + query** rows for the baseline and equal prior period, filtered to these nine pages. Retain page-level totals separately: privacy filtering means query rows need not sum to page totals.
- [ ] Classify visible queries into service-relevant commercial, service-relevant explanatory, brand, and irrelevant intents. Record country/device and rank bands where sample size permits; do not infer brand/non-brand from landing pathname alone.
- [ ] For each candidate intent, record its current owner, evidence, clinical/business fit and proposed action: keep, clarify, link, or defer. Use current Australian search results to check intent; do not copy competitors' claims or manufacture search volume.
- [ ] Crawl contextual links among the nine pages and supporting hubs. Record existing source → destination → anchor before proposing a delta. All main service pages already have navigation/footer exposure; they are not orphans. Certificate and prescription page pairs cross-link; the women's hub already links both subpaths and repeat prescriptions.
- [ ] Check visible titles/H1, direct answer placement, duplicated purpose, robots, canonicals, factual dates and structured-data parity. Only add useful missing links; do not repeat navigation links in every section.

**Output:** extend the aggregate receipt with an intent map and a before/proposed link inventory. Every proposed change must cite an observed gap; “add FAQs/schema/internal links” is insufficient when those features already exist. No public files change in this task.

### Task 3 — Prepare five service briefs and select eligible changes

**Candidate implementation files — edit only those selected by the evidence:**

| Family | Files |
|---|---|
| Certificates | `app/medical-certificate/page.tsx`; `components/marketing/med-cert-landing.tsx`; `lib/data/med-cert-faq.ts`; `app/medical-certificate-online/page.tsx`; `components/marketing/medical-certificate-online-landing.tsx`; `lib/data/medical-certificate-online-faq.ts` |
| Prescriptions | `app/prescriptions/page.tsx`; `components/marketing/prescriptions-landing.tsx`; `app/online-prescriptions/page.tsx`; `components/marketing/online-prescriptions-landing.tsx`; `lib/data/online-prescriptions-faq.ts` |
| ED | `app/erectile-dysfunction/page.tsx`; `components/marketing/erectile-dysfunction-landing.tsx`; `lib/data/ed-faq.ts` |
| Hair loss | `app/hair-loss/page.tsx`; `components/marketing/hair-loss-landing.tsx`; `lib/data/hair-loss-faq.ts` |
| Women's health | `app/womens-health/page.tsx`; `components/marketing/womens-health-landing.tsx`; `app/uti-assessment-online/page.tsx`; `components/marketing/uti-assessment-landing.tsx`; `app/contraceptive-pill-assessment-online/page.tsx`; `components/marketing/contraceptive-pill-assessment-landing.tsx`; `lib/data/womens-health-faq.ts` |

- [ ] Write one brief per family containing the audience/question, current evidence, precise missing answer or navigation issue, proposed text/placement, canonical source, primary metric, release eligibility, and rollback scope.
- [ ] Prioritise clear answers that people and search systems can read in HTML: assessment scope, suitability, fee inclusions, process, limitations and relevant next steps. Attribute authoritative factual claims and keep public clinical-governance language accurate. Do not promise AI citations or add a decorative “AI SEO” block.
- [ ] Use `lib/marketing/approved-claims.ts` and `lib/constants/index.ts` rather than hardcoded high-risk claims/prices. Keep FAQs and structured data consistent with visible page content; no synthetic rating schema or FAQ-rich-result promise.
- [ ] Prepare one material change per selected page/window. Include the exact intended diff before a release decision. Preserve route ownership and avoid simultaneous title, layout, pricing and intake experiments.

**Experiment dependencies:**

- `/prescriptions`: the August 25 answer-density session gets **two closed 30-day post-ship windows** before another copy session. The existing plan's continue **≥8**, hold **6–7**, stop **≤5** free-channel paid-order rule remains unchanged. Indexing repair and research can proceed meanwhile.
- `/medical-certificate-online`: verification work is recorded as shipped August 24 in the plan addendum. Preserve its two-window paid-order readout; obtain actual production timestamps before constructing cohorts. Other summaries saying August 25 must not shift that boundary silently.
- ED/Hair: preserve `spx_e1_20260828` and `spx_h1_20260828`, active from `2026-08-28T05:13:53.870Z` in `lib/growth/specialty-experiences.ts`. Do not activate E2/H2 or change their measured landing/intake presentation under an SEO label. Their existing commercial thresholds and exact-arm harm rules stay in the specialty plan.
- Cross-page link changes that materially affect a measured page, and concurrent conversion fixes, are confounders too. Record actual releases. Compliance/safety/payment fixes proceed; do not relabel a mixed before/after observation as causal proof.

**Complete when:** all five briefs exist and every proposed implementation is marked eligible now, held to an exact existing checkpoint, or unsupported by evidence. New supporting articles/URLs require a separately justified gap; the first tranche does not need a content factory.

## 3. External visibility and AI referrals

### Task 4 — Qualify credible distribution opportunities

**Read:** `lib/authority-assets.ts`, `app/resources/[slug]/page.tsx`, existing `/resources/online-medical-certificate-verification` and `/resources/medical-certificate-employer-policy`; prior submission kits as historical research only.

- [ ] Produce **3–5 qualified prospect records**, covering certificate verification/employer audiences and comparison/editorial audiences relevant to repeat prescriptions and specialties.
- [ ] For each record verify the exact public page/contact route, audience, supported service categories, existing InstantMed presence, editorial vs commercial terms, link eligibility, fees, and any required public clinician attribution. Date the evidence and assign proceed/hold/reject.
- [ ] Consider [MediCompare](https://medicompare.com.au/online-medical-certificates/) and [Finder's online-doctor comparison](https://www.finder.com.au/health-insurance/online-doctor) as research leads, not approved submissions. Qualify factual listing options via their [contact](https://medicompare.com.au/contact-us/) and [partnership](https://www.finder.com.au/partner-with-us) routes. Do not assume inclusion, a free listing, follow links, acceptable rating claims, or permission to reproduce their medical claims.
- [ ] Correct the older HRM-first backlink assumption: the currently published [2021 contributor guidelines](https://www.hrmonline.com.au/wp-content/uploads/2021/01/HRM-contributor-guidelines-2021.pdf) prohibit links to a contributor's own website/products/services. Treat HRM as unsuitable for a promised backlink; current editorial confirmation would be needed to reconsider the format. [AHRI resources](https://www.ahri.com.au/resources) alone do not establish submission or link rights.
- [ ] Refresh all InstantMed facts from canonical sources. Historical kits contain stale service/phone assumptions and must not be copied verbatim.
- [ ] Select one qualified recipient and prepare a complete, short, factual submission/pitch and destination URL. Send only with authorisation for that payload; log actual acceptance/link/traffic outcomes, never a drafted pitch as a placement.

**Complete when:** 3–5 defensible prospect decisions and one reviewable payload exist. A rejected prospect is a useful result. No bulk directory submissions, bought ranking links, incentivised clinical reviews, or unsupported “trusted by” claims.

### Task 5 — Verify AI visibility without inventing another optimisation system

**Read:** `app/robots.ts`, `lib/analytics/ai-source.ts`, `lib/analytics/source-classification.ts`, the existing aggregate source report.

- [ ] Verify Google/Bing and search-oriented AI crawler access to public content and assets after release. OAI-SearchBot search access and GPTBot training controls are separate decisions; do not change training policy as an SEO fix.
- [ ] Audit consistency of service scope, canonical URLs, pricing, process and governance across the service pages and selected external surfaces. Use the five briefs to close evidenced factual/answer gaps when eligible.
- [ ] Check current Search Console AI inclusion settings/report availability when authorised access exists. Record observed settings rather than assuming account configuration or separate AI reporting is available.
- [ ] Use existing provider attribution to report observed AI referrals. If manually sampling assistant answers, record date, engine, exact service question and cited URLs; label this a small observational sample, not a market-share or ranking measure.

**Complete when:** crawler access, factual consistency issues and observed referral sources are documented. No `llms.txt` project, special AI schema, fabricated mentions or new telemetry is required by this work package. Google describes ordinary crawl/index eligibility and useful content as the foundation for [AI search visibility](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide); [OpenAI's publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) explains search access and referral attribution.

## 4. Measurement, release and next decisions

### Task 6 — Maintain one service scorecard

**Existing readers:** `lib/data/customer-growth-revenue-read.ts`, `lib/data/customer-growth-baseline.ts`, `lib/admin/recorded-attribution-breakdown.ts`, and the GSC audit tool. Keep cash-event accounting owned by the canonical readers; do not create a competing revenue formula.

- [ ] Report each service by acquisition source, entry pathname and purchased service where supported. A certificate landing that produces another service's order is not automatically certificate-service revenue.
- [ ] Show Google/Bing organic and observed AI providers separately, alongside unknown attribution coverage. GSC clicks do not measure ChatGPT referral traffic. Landing-page-based “brand/non-brand” estimates must not be labelled observed search-query intent.
- [ ] Record relevant impressions/clicks, indexed status/crawl age, aggregate sessions → starts → paid orders, retained orders, net-retained cash and attributable fees/refunds where exact lineage permits. Where joining sessions to orders is unsupported, present separate counts rather than an invented funnel rate.
- [ ] Use closed Sydney calendar periods for financial comparisons and final Pacific-time GSC periods with both date ranges stated. Supply equal prior periods; annotate experiment, crawl and deployment dates and small samples.
- [ ] Use existing data for dated 7/14-day discovery checks and closed 30-day service readouts. Preserve the longer existing prescription/certificate windows. Do not schedule an automation unless requested.

**Decisions:**

| Evidence | Decision |
|---|---|
| Index exclusion or crawl/render failure persists | Diagnose the recorded reason; resolve technical/discovery evidence before another copy session |
| Relevant impressions grow, but few qualified visits/orders exist | Treat demand/conversion as unproven; inspect intent and the existing funnel before commissioning more pages |
| Orders and retained cash improve in comparable mature windows | Consider one further eligible improvement, subject to its existing experiment/economic checkpoint |
| Low volume, incomplete fees/attribution, or overlapping releases | Hold the performance conclusion; name missing evidence rather than declaring success/failure |
| Clinical, payment or fulfilment harm | Follow current canonical operating policy and investigate; SEO does not override it |

### Task 7 — Verify and release only the selected page batch

**Existing checks to select by touched surface:** `lib/__tests__/seo-indexing-contract.test.ts`, `commercial-seo-contract.test.ts`, `womens-health-intent-pages-contract.test.ts`, `authority-assets-contract.test.ts`, `specialty-experience-invariants.test.ts`, and `specialty-experience-registry.test.ts`.

- [ ] Check rendered mobile/desktop pages, canonical/robots, structured-data parity, links and correct service CTA routing. Verify reduced-motion/accessibility requirements if layout changes. Do not change clinical gates for conversion.
- [ ] Run lint/typecheck and relevant existing contract tests for public-code changes, plus the repository's required CI. Add a test only for a meaningful behaviour or regression boundary; do not add tests that merely mirror reversible copy edits.
- [ ] Commit each coherent batch and open a draft PR with the required project sections. Coordinate file ownership with the conversion-fix task before edits. Separate local, CI, deployment, browser and GSC evidence.
- [ ] After an authorised release, record production SHA/time, eligible indexing requests and observation windows. Revert the specific changed surface if a material regression appears; do not roll back unrelated fixes.

Useful existing commands (the GSC command reads data; it does not submit URLs):

```bash
corepack pnpm seo:gsc-index-audit -- --start-date=2026-08-04 --end-date=2026-09-02 --inspect-limit=9
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm exec vitest run lib/__tests__/seo-indexing-contract.test.ts lib/__tests__/commercial-seo-contract.test.ts
corepack pnpm doc:audit
git diff --check
```

Advance the GSC date arguments to an explicitly closed final-data period for subsequent receipts. Do not describe a trailing-`now` customer-growth CLI run as a reproducible closed-window audit; use readers with explicit boundaries and known side effects.

## 5. Delivery tranches

| Tranche | Concrete output | Dependency |
|---|---|---|
| First execution week | Production crawl receipt; seven-request operator checklist; nine-page query/link inventory; five service briefs; 3–5 qualified prospects; one complete external payload; baseline service scorecard | Crawl release for requests; read access for research; no rewrite needed to prepare held briefs |
| First eligible page batch | One bounded evidence-backed change on the highest-priority unlocked page, plus focused proof | Its measurement lock cleared and exact brief ready; women's-health/UTI discovery proceeds immediately |
| 7 and 14 days after requests | Updated index/crawl ledger and specific unresolved causes | Actual request dates; no promise Google finishes by these dates |
| Closed 30-day and inherited longer checkpoints | Per-service advance/hold/stop decision and one next eligible action | Comparable mature data; existing experiment gates preserved |

The first week is a delivery target for our work, not an indexing or revenue guarantee. Programme success is more qualified paid demand and retained cash from the selected services with accurate attribution and unchanged clinical boundaries. Publishing more words, acquiring irrelevant clicks, or submitting a sitemap is not by itself that result.

## Planning verification

- Baseline contains nine public URLs, six indexed and three not indexed, with both operator-reported prescription requests preserved.
- All proposed source-file paths and the read-only GSC command are checked against this branch before committing.
- The planning PR changes documentation and an aggregate public/search receipt only. Run `corepack pnpm doc:audit` and `git diff --check`; UI and production proof belong to the later implementation tasks.

**Verified 2026-09-05:** all 40 explicit source-file references exist; the nine-row receipt passes HTTP/canonical/robots/sitemap and operator-request consistency checks; `corepack pnpm doc:audit` passes 124 tests across 10 files and the 127-document count/reference checks; `git diff --check` passes. No public code was changed or deployed by this planning task.
