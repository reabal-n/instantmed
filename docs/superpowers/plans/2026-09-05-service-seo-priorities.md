# Service SEO Priorities Work Package

> **For agentic workers:** Use `superpowers:executing-plans` to implement the selected task in bounded steps. Unchecked tasks and future measurement checkpoints are not completed work. The September 5 execution addendum records the selected first batch and its proof.

**Goal:** Grow qualified organic-search and AI-referred demand for medical certificates, repeat prescriptions, ED, hair loss, and women's health, then judge further investment by paid orders and retained revenue.

**Architecture:** Establish crawl and index evidence for nine existing URLs, give each a distinct search purpose, prepare five service briefs, release eligible improvements in measured batches, and defer external visibility under the latest operator direction. Use existing GSC and aggregate attribution/payment readers; build no new analytics product.

**Tech Stack:** Existing Next.js 15.5/React 18 pages, TypeScript, shared marketing components and FAQ data, read-only GSC tooling, aggregate PostHog/source attribution, and canonical payment truth. Keep all stack pins unchanged.

**Spec:** [ROADMAP](../../ROADMAP.md) ranks 1, 3, and 6; [business strategy](../../BUSINESS_PLAN.md); [revenue economics](../../REVENUE_MODEL.md); [SEO policy](../../SEO_CONTENT_POLICY.md); [advertising compliance](../../ADVERTISING_COMPLIANCE.md); operator direction on 2026-09-05 to prioritise actual services, including ED, hair loss, and women's health.

**Status:** Initial on-site execution batch prepared in PR #518. The nine-page query/link inventory and five service briefs are complete; the selected implementation clarifies only the UTI and new/switch pill child pages. Live crawl repair is independently verified, while authenticated Search Console Live Tests and request receipts remain outstanding. The coordinating task **Fix conversion friction gaps** owns merges, production deployment and final branch/worktree cleanup. External visibility, including prospect research and drafts, is deferred by the operator's latest instruction. Local changes are not production proof; see the execution ledger below.

## Global constraints and decisions

- Select work by service fit, relevant demand, and economic evidence. Raw blog clicks do not select the growth programme. Antibiotics-access content is not a priority; existing educational content is not automatically removed.
- External visibility is deferred in full for this batch: no publisher/directory research, outreach draft, submission, profile or paid placement.
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

- [x] Obtain the actual merged commit and successful production deployment receipt for #517 under the normal release workflow. A green branch build or skipped preview does not prove production changed.
- [x] Fetch live robots and representative JS/CSS assets. Confirm public assets are crawlable and private account/request/staff exclusions remain. Record HTTP status, canonical, robots and sitemap evidence for the nine URLs.
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

- [x] Export final GSC **page + query** rows for the baseline and equal prior period, filtered to these nine pages. Retain page-level totals separately: privacy filtering means query rows need not sum to page totals.
- [x] Classify visible queries into service-relevant commercial, service-relevant explanatory, brand, and irrelevant intents. Record country/device and rank bands where sample size permits; do not infer brand/non-brand from landing pathname alone.
- [x] For each candidate intent, record its current owner, evidence, clinical/business fit and proposed action: keep, clarify, link, or defer. Use current Australian search results to check intent; do not copy competitors' claims or manufacture search volume.
- [x] Crawl contextual links among the nine pages and supporting hubs. Record existing source → destination → anchor before proposing a delta. All main service pages already have navigation/footer exposure; they are not orphans. Certificate and prescription page pairs cross-link; the women's hub already links both subpaths and repeat prescriptions.
- [x] Check visible titles/H1, direct answer placement, duplicated purpose, robots, canonicals, factual dates and structured-data parity. Only add useful missing links; do not repeat navigation links in every section.

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

- [x] Write one brief per family containing the audience/question, current evidence, precise missing answer or navigation issue, proposed text/placement, canonical source, primary metric, release eligibility, and rollback scope.
- [x] Prioritise clear answers that people and search systems can read in HTML: assessment scope, suitability, fee inclusions, process, limitations and relevant next steps. Attribute authoritative factual claims and keep public clinical-governance language accurate. Do not promise AI citations or add a decorative “AI SEO” block.
- [x] Use `lib/marketing/approved-claims.ts` and `lib/constants/index.ts` rather than hardcoded high-risk claims/prices. Keep FAQs and structured data consistent with visible page content; no synthetic rating schema or FAQ-rich-result promise.
- [x] Prepare one material change per selected page/window. Include the exact intended diff before a release decision. Preserve route ownership and avoid simultaneous title, layout, pricing and intake experiments.

**Experiment dependencies:**

- `/prescriptions`: the August 25 answer-density session gets **two closed 30-day post-ship windows** before another copy session. The existing plan's continue **≥8**, hold **6–7**, stop **≤5** free-channel paid-order rule remains unchanged. Indexing repair and research can proceed meanwhile.
- `/medical-certificate-online`: verification work is recorded as shipped August 24 in the plan addendum. Preserve its two-window paid-order readout; obtain actual production timestamps before constructing cohorts. Other summaries saying August 25 must not shift that boundary silently.
- ED/Hair: preserve `spx_e1_20260828` and `spx_h1_20260828`, active from `2026-08-28T05:13:53.870Z` in `lib/growth/specialty-experiences.ts`. Do not activate E2/H2 or change their measured landing/intake presentation under an SEO label. Their existing commercial thresholds and exact-arm harm rules stay in the specialty plan. The September 5 ROADMAP gate pins ED E1's earliest settled close to `2026-09-19T05:13:53.870Z`; no E2 change precedes its required receipt. Hair keeps the existing directional floor/21-day and settlement rule plus the September 11 pilot readout; that readout is not permission for H2.
- Cross-page link changes that materially affect a measured page, and concurrent conversion fixes, are confounders too. Record actual releases. Compliance/safety/payment fixes proceed; do not relabel a mixed before/after observation as causal proof.

**Complete when:** all five briefs exist and every proposed implementation is marked eligible now, held to an exact existing checkpoint, or unsupported by evidence. New supporting articles/URLs require a separately justified gap; the first tranche does not need a content factory.

## 3. External visibility and AI referrals

### Task 4 — External visibility deferred

**Operator decision, 2026-09-05:** ignore external visibility for now. Prospect qualification, external consistency checks, outreach drafts, submissions and placements are outside the active execution batch. None is a completion gate for this release. The historical authority plan remains available if the operator later resumes that work; its publisher and commercial assumptions will need fresh evidence then.

### Task 5 — Verify AI visibility without inventing another optimisation system

**Read:** `app/robots.ts`, `lib/analytics/ai-source.ts`, `lib/analytics/source-classification.ts`, the existing aggregate source report.

- [x] Verify Google/Bing and search-oriented AI crawler access to public content and assets after release. OAI-SearchBot search access and GPTBot training controls are separate decisions; do not change training policy as an SEO fix.
- [x] Audit consistency of service scope, canonical URLs, pricing, process and governance across the service pages. External surfaces are deferred. Use the five briefs to close evidenced factual/answer gaps when eligible.
- [ ] Check current Search Console AI inclusion settings/report availability when authorised access exists. Record observed settings rather than assuming account configuration or separate AI reporting is available.
- [x] Use existing provider attribution to report observed AI referrals. If manually sampling assistant answers, record date, engine, exact service question and cited URLs; label this a small observational sample, not a market-share or ranking measure.

**Complete when:** crawler access, factual consistency issues and observed referral sources are documented. No `llms.txt` project, special AI schema, fabricated mentions or new telemetry is required by this work package. Google describes ordinary crawl/index eligibility and useful content as the foundation for [AI search visibility](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide); [OpenAI's publisher FAQ](https://help.openai.com/en/articles/12627856-publishers-and-developers-faq) explains search access and referral attribution.

## 4. Measurement, release and next decisions

### Task 6 — Maintain one service scorecard

**Existing readers:** `lib/data/customer-growth-revenue-read.ts`, `lib/data/customer-growth-baseline.ts`, `lib/admin/recorded-attribution-breakdown.ts`, and the GSC audit tool. Keep cash-event accounting owned by the canonical readers; do not create a competing revenue formula.

- [x] Report each service by acquisition source, entry pathname and purchased service where supported. A certificate landing that produces another service's order is not automatically certificate-service revenue.
- [x] Show Google/Bing organic and observed AI providers separately, alongside unknown attribution coverage. GSC clicks do not measure ChatGPT referral traffic. Landing-page-based “brand/non-brand” estimates must not be labelled observed search-query intent.
- [x] Record relevant impressions/clicks, indexed status/crawl age, aggregate sessions → starts → paid orders, retained orders, net-retained cash and attributable fees/refunds where exact lineage permits. Where joining sessions to orders is unsupported, present separate counts rather than an invented funnel rate.
- [x] Use closed Sydney calendar periods for financial comparisons and final Pacific-time GSC periods with both date ranges stated. Supply equal prior periods; annotate experiment, crawl and deployment dates and small samples.
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

- [x] Check rendered mobile/desktop pages, canonical/robots, structured-data parity, links and correct service CTA routing. Verify reduced-motion/accessibility requirements if layout changes. Do not change clinical gates for conversion.
- [ ] Run lint/typecheck and relevant existing contract tests for public-code changes, plus the repository's required CI. Add a test only for a meaningful behaviour or regression boundary; do not add tests that merely mirror reversible copy edits.
- [x] Commit each coherent batch and open a draft PR with the required project sections. Coordinate file ownership with the conversion-fix task before edits. Separate local, CI, deployment, browser and GSC evidence.
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
| First execution week | Production crawl receipt; seven-request operator checklist; nine-page query/link inventory; five service briefs; baseline service scorecard; external visibility deferred | Crawl release for requests; read access for research; no rewrite needed to prepare held briefs |
| First eligible page batch | One bounded evidence-backed change on the highest-priority unlocked page, plus focused proof | Its measurement lock cleared and exact brief ready; women's-health/UTI discovery proceeds immediately |
| 7 and 14 days after requests | Updated index/crawl ledger and specific unresolved causes | Actual request dates; no promise Google finishes by these dates |
| Closed 30-day and inherited longer checkpoints | Per-service advance/hold/stop decision and one next eligible action | Comparable mature data; existing experiment gates preserved |

The first week is a delivery target for our work, not an indexing or revenue guarantee. Programme success is more qualified paid demand and retained cash from the selected services with accurate attribution and unchanged clinical boundaries. Publishing more words, acquiring irrelevant clicks, or submitting a sitemap is not by itself that result.

## Planning verification — historical planning commit

- Baseline contains nine public URLs, six indexed and three not indexed, with both operator-reported prescription requests preserved.
- All proposed source-file paths and the read-only GSC command are checked against this branch before committing.
- The planning PR changes documentation and an aggregate public/search receipt only. Run `corepack pnpm doc:audit` and `git diff --check`; UI and production proof belong to the later implementation tasks.

**Verified 2026-09-05:** all 40 explicit source-file references exist; the nine-row receipt passes HTTP/canonical/robots/sitemap and operator-request consistency checks; `corepack pnpm doc:audit` passes 124 tests across 10 files and the 127-document count/reference checks; `git diff --check` passes. No public code was changed or deployed by this planning task.


## September 5 execution addendum

### Five service briefs

These decisions use the [fresh intent/link receipt](../receipts/2026-09-05-service-seo-intent-research.json). Current GSC data is August 4–September 2; prior is July 5–August 3, both final Pacific-time periods. Query visibility is privacy-filtered and is kept separate from page totals. The current certificate total of 7,654 includes trailing-slash variants; the earlier baseline's 7,652 was canonical-only. No search volume or causal lift is inferred.

**1. Medical certificates — hold public changes.** Audience: adults seeking a work, study or carer certificate, or checking its cost, suitability and verification. The service page has 10 clicks/7,654 impressions versus 8/4,058, with average position worsening from 41.57 to 52.85; the explainer has 1/25 versus 0/12. Existing HTML answers the practical questions and the pair already cross-links. No precise missing answer or navigation gap is demonstrated; a CTR-only headline rewrite is unsupported. Proposed text/placement: retain the existing service lead and explainer verification section, with no new copy or link delta now. Canonical sources: approved claims, pricing constants, certificate policy and the August 24 verification addendum. Primary decision metric: free-channel paid orders and net-retained cash under that plan's two closed 30-day windows, with relevant query/rank coverage as diagnostic evidence. Obtain the actual production boundary before building those cohorts. Release eligibility: held under the current certificate product/organic window. Rollback scope: none in this batch, because neither certificate route changes.

**2. Repeat prescriptions — observe indexing and the existing experiment.** Audience: an adult continuing an established treatment, with the explanatory page answering how assessment, identity, eScripts and pharmacy charges work. Both pages have zero current/prior GSC clicks and impressions; the stored index snapshot says discovered/not indexed. The two purposes are already distinct and cross-linked. The demonstrated issue is crawl/index discovery, not an evidenced missing paragraph. Proposed text/placement: retain the August 25 assessment lead and current explainer; add no title, FAQ or link. Canonical sources: repeat-prescription eligibility, approved claims, pricing constants and the August 25 answer-density receipt. Primary metric: free-channel paid orders and net-retained cash; the inherited continue ≥8 / hold 6–7 / stop ≤5 rule applies after two closed 30-day post-ship windows. Release eligibility: indexing checks now, another material copy session held. Rollback scope: none in this batch; retain the two operator-reported indexing requests without daily resubmission.

**3. ED — prepare the next intent decision, preserve E1.** Audience: adults seeking confidential help for ED who need to understand whether assessment is suitable and what the fee buys. Current 0 clicks/305 impressions versus 1/96 shows a small treatment-seeking opportunity, without demonstrated organic conversion. The current landing already explains private one-off assessment, cost, process and boundaries; no additional contextual link is missing. A possible later hypothesis is to bridge treatment-seeking language to doctor assessment in the supporting lead, but current evidence does not establish a missing answer. Proposed text/placement now: retain the E1 lead verbatim; no replacement is selected or authorised by this SEO brief. Canonical sources: clinical scope, approved claims, ED FAQ and `spx_e1_20260828`. Primary metric: the existing versioned retained-order, contribution and harm receipt; organic qualified queries/orders are separate diagnostics. Eligibility: no change before the ROADMAP's earliest settled close, September 19 at 05:13:53.870 UTC, and the required clinical/fulfilment/settlement receipt. Rollback scope: none; the registry, landing and intake remain unchanged.

**4. Hair loss — preserve H1 while measuring service intent.** Audience: adults seeking help with hair loss who need to understand suitability, assessment, one-off cost and possible next steps. Current 0 clicks/36 impressions versus 0/11 is too small to justify a new page or promise of demand. The current landing and men's-health hub already cover assessment and link correctly; no precise missing answer is established. Proposed text/placement now: retain H1's supporting lead; do not add regrowth promises, medicine names, subscription framing or repeated links. A treatment-seeking-to-assessment clarification remains a future hypothesis to assess only after H1 closes. Canonical sources: clinical scope, approved claims, hair-loss FAQ and `spx_h1_20260828`. Primary metric: the existing versioned retained orders, fee-aware contribution and fulfilment evidence. Eligibility: preserve the directional floor/21-day window plus 24-hour settlement and the September 11 paid-pilot readout; that readout alone does not activate H2. Rollback scope: none in this batch.

**5. Women's health — implement child-page assessment clarity.** Audience: adults choosing between UTI assessment and starting/switching the pill; unchanged established pill repeats retain the prescriptions route. The hub's 62 current impressions/average position 6.97 includes irrelevant visible queries and is not a broad ranking win. UTI has zero current impressions; pill has three. Existing hub/child/repeat links are sufficient. The observed gap is process clarity: buttons said to choose a service that the URL already selects, the pill page exposed implementation terms such as “terminal”, and fee/possible doctor contact needed to appear in the mobile lead. The selected single hypothesis is that a clear assessment summary helps people understand what they are starting. Exact placement: the existing hero paragraphs, CTA labels and process/safety explanations in the two child landing components. UTI lead states adult Australian eligibility, possible uncomplicated symptoms, the constant-backed review fee and separate pharmacy costs; pill lead states starting/switching, adult Australian eligibility and the same cost boundaries. Both follow with the canonical `FORM_FIRST_WEDGE`. Buttons become “Start UTI assessment” and “Start pill assessment”; the form confirmation step remains visible. The pill body uses “safety questions/checks” and explains in-person exits in patient language. Canonical sources: `FORM_FIRST_WEDGE`, `GUARANTEE`, `PRICING_DISPLAY.WOMENS_HEALTH`, existing women's-health scope/FAQ and the unchanged safety rules. Primary metric: observed child-entry paid orders/net-retained cash, with starts shown separately if an exact join is unavailable; GSC discovery is diagnostic, not a ranking claim. Eligibility: this bounded batch is eligible now; no women's-hub, metadata, H1, FAQ/schema, CTA destination, clinical-review date, intake or safety-rule change. Only the two sitemap modification dates advance to September 5. Rollback: revert those two component diffs and their sitemap dates, preserving unrelated release fixes.

### Evidence and delivery ledger

| Work | Evidence / status |
|---|---|
| Coordination | PR #518 uses `codex/seo-service-priorities` in its own worktree. Current main `8b869ac54` is merged into the branch. **Fix conversion friction gaps** owns merge, deploy and cleanup; this task owns the two public component changes and SEO evidence/docs. |
| Crawl repair | [Production HTTP/robots receipt](../receipts/2026-09-05-service-seo-crawl-verification.json): nine 200 responses with self-canonicals and sitemap entries, representative JS/CSS 200, public search-crawler policy allows assets, and patient/doctor/admin/API exclusions remain. Simulated user agents are not proof of real crawler-IP access. Separate provider receipt: SHA `8183ae5799864551ea0a74ab28caec44cc21a649`, deployment `dpl_EEd1bkkyB9q2fBJZ9BZrd8f5gWTy`, ready `2026-09-05T03:08:42.101Z`. The later docs-only main commit did not redeploy. |
| Intent and linking | Nine routes plus seven supporting hubs crawled; final current/prior GSC query, page, country and device data captured. No orphan or useful missing-link issue found; proposed link delta is empty. Personal clinical free-text queries are suppressed and not retained. |
| Local public batch | UTI and pill assessment summaries/process wording clarified; all five briefs above are complete. No change to measured certificate/Rx/ED/Hair surfaces. |
| Browser | Local 375×812 and 1440×1000 views checked in light/dark themes; one H1, correct canonicals, no horizontal overflow. Each primary CTA selects the correct women's-health intent and retains confirmation. Pill cost FAQ opens; keyboard focus is visible; browser error list is empty. No clinical answers or payment were submitted. |
| Local checks | Lint, typecheck and content audit (107 articles, zero issues) passed. The final focused suite passes 62 tests across seven files after updating two pre-existing narrative contracts that still expected the retired wording; all safety and routing assertions remain. [Local verification receipt](../receipts/2026-09-05-service-seo-local-verification.json) also records documentation audit (124 tests, 129 docs) and screenshot paths. Exact-head CI/deployment remain separate handoff evidence. |
| Service scorecard | [Closed-window aggregate receipt](../receipts/2026-09-05-service-seo-scorecard.json): Aug 6–Sep 4 Sydney versus Jul 7–Aug 5. 292 paid orders / A$9,154.00 net-retained cash versus 115 / A$3,339.00. Recorded source coverage 261/292 (89.4%). Exact fees/contribution, retained-order count, joined sessions funnel and purchased UTI/pill split remain unavailable; no substitute rates were invented. |
| Indexing/settings | Authenticated Search Console Live Test/request receipts and AI inclusion settings were not observed in this task. Remaining operator sequence: UTI first-time request after live validation; one-off recrawl for the six indexed priority pages, preferably after this copy release; observe the two already-requested prescription URLs. This is an outstanding operator step, not a code-release blocker. |
| External visibility | Deferred in full, including research and drafts. No external placements, outreach, AI-answer sampling or new telemetry was performed. |

The first batch is assessment clarity plus an evidence baseline, not a demonstrated search or revenue uplift. The September 5 crawler release and concurrent conversion fixes overlap future traffic windows and must be recorded as confounders. Follow-up index checks are due 7/14 days after actual request dates; service performance uses the existing closed windows. No automation was created.

### Baseline service economics

These are purchased-service results across **all recorded acquisition channels**, not SEO-attributed revenue or evidence that the new copy worked. Net-retained cash is before unreported payment fees and acquisition cost. The [scorecard](../receipts/2026-09-05-service-seo-scorecard.json) separately groups channel × allowlisted entry pathname × purchased service and keeps payment and created-intake cohorts distinct.

| Purchased family | Aug 6–Sep 4 paid orders | Net-retained cash | Jul 7–Aug 5 paid orders | Net-retained cash |
|---|---:|---:|---:|---:|
| Medical certificates | 115 | A$3,224.00 | 60 | A$1,701.90 |
| Repeat prescriptions | 148 | A$4,411.80 | 50 | A$1,437.30 |
| ED | 17 | A$908.85 | 4 | A$149.85 |
| Hair loss | 1 | A$49.95 | 1 | A$49.95 |
| Women's health | 11 | A$559.40 | 0 | A$0.00 |

Observed current Google organic contributes 39 paid orders/A$1,197.85, Bing organic 5/A$119.80 and ChatGPT referrals 53/A$1,482.25. These recorded-source figures cover all eligible entry paths, so they must not be compared as a conversion rate against the nine-page GSC click total. Direct/unknown remains 31 orders; missing source is not evidence of an AI or organic visit. Hold causal performance conclusions while the inherited experiments and overlapping releases mature.
