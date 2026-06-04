# SEO Campaign — Session Handoff (2026-06-04)

Paste this as the first message of a new session, or just point the session at it. AU telehealth, instantmed.com.au. Multi-session SEO campaign.

## READ FIRST
1. Auto-memory `seo-content-campaign.md` (loads automatically — the running campaign log).
2. `docs/audits/2026-06-*` — the strategy records (GSC audit, 2× 3-LLM reviews, backlink plan, content specs, data-asset spec, this handoff).
3. `CLAUDE.md` + `docs/SEO_CONTENT_POLICY.md`.

## STATE (main @ `b15fc2069`, all deployed/READY)
- **Icebox COMPLETE** (the core strategy): small indexed footprint, noindex the zero-traffic long tail. Single source of truth = `lib/seo/index-policy.ts`. Kept: blog **21**, conditions 15, symptoms 1 (neck-pain), locations 7 metros; compare/for/guides/intent wholesale noindexed. Verified live (noindex,follow @ 200; sitemaps trimmed).
- **200 URLs pushed to the Google Indexing API** today (86 keep-set + 114 iceboxed re-crawl). Reusable tool: `pnpm seo:submit-indexing`.
- **5 guides deepened + re-indexed** this session: backdating, doctor's-note, medications-not-prescribed-online, are-online-medical-certificates-valid, carer's-leave.
- **Money-page internal links:** footer (raw-HTML, site-wide) + conditions in-content (RSC) are live. Homepage hero/cards reverted (client-rendered = weak SEO).
- **2 strategy ideas rejected via 3-LLM review:** no Healthdirect paraphrase (copyright + helpful-content penalty), no "comprehensive library" (repeats the icebox mistake).

## STRATEGY (binding — don't relitigate)
Binding constraint = **domain authority + crawl budget, NOT content volume.** Keep a small high-quality indexed footprint. The dominant remaining lever is **off-page AU authority** (backlinks / the data asset), not more content. **Run the 3-LLM brain review (`npx tsx scripts/brain-review.ts <prompt-file>`) before any MAJOR decision** and reconcile all three. **Operator's name stays OFF everything — website AND media (privacy/safety).** Reviewer = corporate "InstantMed Clinical Team" only.

## NEXT ACTIONS (priority)
1. **DATA ASSET — "Australian Sick Day Report"** (#1 free backlink lever). Spec: `docs/audits/2026-06-04-data-asset-spec.md`. **BLOCKED on operator privacy sign-off** — APP 6 secondary-use HARD STOP: do NOT pull/publish patient-derived data (even aggregate) until they confirm (a) privacy policy permits aggregate/de-identified reporting, (b) de-identification (suppress cells <30, state-level only, no PHI/free-text). After sign-off: write read-only aggregate SQL (created_at day/hour/season + service_type/subtype + is_priority + profiles.state) → build report MDX + 3-4 charts → content:audit + build → keep-set + Indexing API → media pitch list.
2. **Reactive PR (free, company-attributed):** HARO/Featured + Qwoted + JournoFinder + #journorequest + SourceBottle. Plan: `docs/audits/2026-06-04-au-backlink-plan.md`.
3. **AU directory citations** (footer NAP, quick, do-once).
4. **CTR rewrites** on the ~11 GSC-ranking pages (pull query-level data with a temp script in `tools/gsc-mcp-server/`, delete after). Start: `/blog/can-you-get-antibiotics-online-australia` (pos ~6, 0.27% CTR).
5. (Optional) more distinct guide deepens — but **mind the cannibalization clusters** (repeat-Rx 6+ dupes, same-day 3, validity/acceptance 3): only re-index genuinely distinct queries.

## KEY GOTCHAS (save rework)
- **DEEPEN RECIPE** for any iceboxed guide: **(1) check the article already exists** (most topics do — never create a dup slug); (2) replace mismatched generic Sources (PBS/Services-Australia/Healthdirect-medicines/TGA-advertising) with topic-matched AU authorities (Fair Work, Medical Board, RACGP, TGA scheduling, AG stat-decs, Ahpra); (3) strip off-topic boilerplate ("How To Use This Guide Safely" / "What To Check Before You Act" / PBS-pricing para); (4) add `relatedArticles` (keep-set interlinks) + **1 neutral money-page link**; (5) freshness `updatedAt`; (6) fix factual errors (e.g. **NPS MedicineWise is defunct since end-2022 → Healthdirect/TGA/Safety-&-Quality-Commission**); (7) add slug to `KEEP_INDEXED_BLOG`. Visuals usually already exist + auto-render.
- **APP ROUTER RENDERING:** prerendered `.html` is a streaming SHELL. In-content links live in the RSC payload (`self.__next_f`, `"href":"/x"`) — Google renders them (crawlable) but they're WEAKER than raw HTML. The **footer** is the one reliable raw-HTML money-page link. Dynamic-imported homepage sections (ServiceCards) + the hero CTA region are client-rendered (weak SEO). **Verify any "SSR link" against the LIVE `next start` response, not the `.html` file.**
- **Indexing API:** 200/day. `pnpm seo:submit-indexing -- --sitemaps` (keep-set) | `--from-file=path` | `--urls=a,b` | `--type=URL_DELETED` | `--dry-run`. Deploying a re-indexed (index:true) page completes a re-index after the re-crawl ping.
- **Compliance:** med-cert language locks (no "accepted by all employers"/court/exam/uni-special-consideration/workers-comp); TGA (no prescription-drug promotion — ED/hair-loss drug content restricted); guide bodies education-only (neutral money-page links OK only in service-process context). Run `/clarify` mindset on copy.
- **Verify before deploy:** `pnpm content:audit` + `pnpm typecheck` + `pnpm lint` + `pnpm build` (8GB heap). Deploy = commit + push to `main` (Vercel auto-deploys; owner bypasses the `build` branch-protection check). Work on a feature branch, ff-merge to main.

## TOOLING
- GSC read-only audit: `node tools/gsc-mcp-server/gsc-index-audit.mjs` (ADC auth). Custom GSC queries = temp script in that dir, foreground, delete after.
- Indexing submit: `pnpm seo:submit-indexing` (write; separate from the contract-locked read-only audit).
- 3-LLM review: `npx tsx scripts/brain-review.ts <prompt-file>` (GPT-5.5 + Gemini; reconcile as Opus).
- Content QA: `pnpm content:audit`.
- Image gen: `pnpm blog:generate-visual-images -- --renderer=gpt-image-2 --slug=<slug> --force` (FOREGROUND, one slug, view the .webp before commit) — but most med-cert/condition visuals already exist.

## FIRST ACTIONS for the new session
Read the memory + the `docs/audits/2026-06-*` records. Confirm `main @ b15fc2069` is deployed READY. Then ask the operator to sign off the **data-asset privacy gate** (the #1 lever), or follow their direction. Use AskUserQuestion for real forks; run the 3-LLM review before major moves.
