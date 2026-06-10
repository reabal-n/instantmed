# Organic + GEO Growth Plan: Beat NextClinic, Win the LLM-Citation Layer

> **Date:** 2026-06-10 · **Status: AWAITING OPERATOR APPROVAL — nothing below is built/sent yet.**
> Produced from a 16-agent research workflow (3 verification agents against live GSC/Supabase/code, 7 competitor teardowns, 4 citation-surface maps, 2 GEO-mechanics researchers) plus operator constraints. Supersedes Phase 5 ("Organic, LLM, SEO, And Backlinks") of `docs/superpowers/plans/2026-06-06-customer-growth-phased-plan.md` for the organic/GEO lane. Companion execution kits that already exist and are folded in (not duplicated): `docs/audits/2026-06-04-citation-kit.md`, `docs/audits/2026-06-04-reactive-pr-kit.md`, `docs/audits/2026-06-06-authority-distribution-execution.md`.

---

## 1. Executive recommendation

**The 90-day game is NOT out-ranking NextClinic on Google. It is owning the third-party citation layer that both LLMs and humans check, while plumbing fixes + earned links get the money pages crawled.** Five moves, in priority order:

1. **Build the review/citation layer this week (operator clicks, ~4h total):** ProductReview.com.au listing + Trustpilot profile + Healthdirect NHSD (.gov.au) registration + Bing Webmaster Tools. InstantMed is currently absent from **every** third-party surface that AU telehealth recommendations are built from. NextClinic's real moat is 672 ProductReview reviews, not its city pages.
2. **Retarget the existing day-2 review email to ProductReview** (code, half a day) and let review volume compound. MediCompare's comparison rankings — the page class LLMs cite for "best X Australia" — are derived from ProductReview scores. Reviews are the input; listicle inclusion is the output; LLM citation share is the compounding result.
3. **Productize the employer verification loop** (/verify already exists, batch-capable, unauthenticated): QR on the cert PDF, an employer-facing landing page, and 20–30 pitches to HR/payroll/employment-law publishers. This is the one uncontested link lane (NextClinic has no marketed verify portal; the HR-publisher ecosystem links out to verification resources) and followed deep links are exactly what creates Google crawl demand on `/medical-certificate`.
4. **Fix the plumbing that verification exposed** (code, ~1 day): trailing-slash canonical conflict on the one money page Google DID index, missing `/consult` canonical, Bing absence of `/medical-certificate`, templated sitemap lastmod, FAQ accordions likely invisible to Bing's crawler, `heard_about_us` collecting zero answers.
5. **Selectively re-index the GEO assets the icebox accidentally pulled from Bing** (the cross-provider price-comparison page) and format the citable pages GEO-style (extractable answer-first blocks, dated stats, visible sources). Cap net-new content at ≤4 pages for the whole 90 days.

**City pages: defer behind an authority gate** (§6). **Ads: resume only at the §9 gate.** Honest ceiling: this plan realistically takes ~46 orders/30d to ~65–85/30d by day 90, with the real payoff compounding into H2 2026. It will not reach $1M alone; it builds the foundation that makes paid traffic and service expansion work from strength.

---

## 2. Where the brief was wrong (verified corrections)

The session brief's premises were mostly right. Six corrections from live verification, each load-bearing:

| # | Brief said | Verified reality | Consequence |
|---|---|---|---|
| 1 | "Crawl budget" is the binding constraint | At 103 sitemap URLs, crawl budget is a misdiagnosis (Google crawls small sites fine). The money pages were never crawled because **nothing authoritative links to them** — crawl *demand* follows links. Also: the Jun 4 Indexing API blast did nothing (Google only processes JobPosting/BroadcastEvent via that API). | Stop Indexing-API submissions. The fix is earned links aimed at the money pages + GSC manual Request Indexing + internal anchors. |
| 2 | On-page is 100% exhausted | 95% true (don't write content for Google), but verification found **plumbing defects, not content gaps**: Google indexed `/medical-certificate/` (trailing slash) and chose it as canonical over the declared non-slash canonical (signal split, ranking pos ~42); `/prescriptions` has NO indexed variant and regressed to "URL unknown"; `/consult` has no canonical tag at all; www vs non-www signals are split (www `/our-doctors` pos 8.3 vs non-www 20.4); sitemap lastmod is templated (2026-04-30 everywhere → ignored); Radix FAQ accordions are likely invisible to Bingbot (closed accordion content is typically not in the DOM). | A one-day plumbing pass is justified and is not "more content." |
| 3 | NextClinic's moat = programmatic city pages | The city pages are the visible 20%. The real moat: **672 ProductReview reviews at 4.9★** (claimed listing, management replies), a healthdirect NHSD .gov.au listing, ~2 years of compounding, and ~2,000 indexed URLs. Their price is $19.90 (not $16.90). They are a **solo doctor-founder operation** (sole-trader registrant) — proof this is solo-copyable. And they are **absent from Bing's national top-10**, where the SERP belongs to price-led titles (Doccy $12.90, MedCertify $12, Qoctor $14.99, MIDOC $18). | Copying city pages without the review mass does nothing. The LLM layer is NOT yet theirs — it's winnable. |
| 4 | Reddit + listicles are the same GEO channel | Split them. Reddit blocked non-Google crawlers in 2024, so **Bing-grounded ChatGPT structurally under-cites Reddit**; review platforms + comparison listicles are the ChatGPT surface. Reddit matters for Google AI Overviews (Google licenses Reddit) and humans. Also: ChatGPT reportedly strips its `utm_source=chatgpt.com` tagging on sensitive health topics — your ChatGPT channel is even more undercounted than assumed; never judge GEO from referrers alone. | Priority = review platforms + listicles. Reddit = monitor only (astroturfing = ban + AHPRA advertising risk; at $24.95 InstantMed loses "cheapest" threads anyway). |
| 5 | The icebox is correct | Correct for Google — but `noindex` applies to Bing too, and Bing's index (= ChatGPT grounding) currently contains iceboxed `/intent/*` and `/compare/*` pages while **`/medical-certificate` is absent from Bing** despite HTTP 200 + sitemap. The Google-motivated icebox is slowly deleting our only Bing presence. | Keep the icebox; use its designed escape hatch (keep-sets) to re-index the 1–3 pages that serve ChatGPT-grounding queries, and get the money pages INTO Bing via Webmaster Tools. |
| 6 | Survey will attribute the dark bucket | `heard_about_us` is live in prod but has **zero answers ever** (0/5 paid since Jun 9, 0 non-null table-wide). Possibly broken collection, possibly day-2 emails not yet fired. | Debug before relying on it as the GEO KPI. (Also: dark bucket re-verified at 62–66% of orders; ChatGPT-referred AOV $36.96 confirmed highest.) |

Also confirmed as-stated: llms.txt is dead weight for citations (no major assistant consumes it — keep it, spend nothing); robots.txt correctly allows the AI crawlers (one gap: no explicit ClaudeBot/Claude-SearchBot allow); the data-asset deferral stands; kits + 11 `/resources` link assets exist with **0% of outreach executed**.

---

## 3. Verified ground truth (numbers the plan is built on)

- **Revenue:** 117 paid orders all-time ($2,874 gross). Last 90d clean: 93 orders / $2,384. Last 30d: 46 / $1,343 (~1.5/day, trending up). Med certs = 81% of orders. Repeat patients 16–19%. Refunds 7.5%.
- **Channels (90d clean):** direct/unknown 58 orders (62%), Google Ads 21 (paused), chatgpt.com web-referrals 11 @ $36.96 AOV (highest), recovery email 3. Zero measured Google-organic conversions — consistent with money pages being unindexed.
- **Google:** of 28 URLs inspected (out of 103 in sitemaps), only 5 confirmed indexed (homepage, `/our-doctors`, `/erectile-dysfunction`, `/hair-loss`, `/medical-certificate/` slash-variant); 11 sit "Discovered – currently not indexed" (incl. the `/resources` assets); 7 are "URL unknown to Google". Uninspected URLs (incl. most keep-set metros/blog) are unknown-state, not confirmed either way. Brand owns ~all clicks ("instantmed" pos 2.2); non-brand is impressions-only.
- **Bing (ChatGPT grounding):** domain IS indexed (10+ URLs incl. iceboxed `/intent/*`, `/compare/*`) but `/medical-certificate` is NOT. Bing national med-cert SERP = price-led budget brands; Bing long-tail localization is weak (junk results for "sick certificate online same day") → cheap to win.
- **Citation layer:** InstantMed is absent from ProductReview, Trustpilot, MediCompare (34 providers listed, many smaller than us), Finder, OnCare's listicle, every Reddit thread, and NHSD. The entire "is X legit / best X" surface area for our category exists and we are on none of it.

---

## 4. Competitive teardown matrix

| Competitor | How they win organic | How LLMs find them | Steal | Skip |
|---|---|---|---|---|
| **NextClinic** ($19.90 certs) | 15 city/state med-cert pages (~1,800–2,200 words, price-led H1, 6 FAQs, full-mesh links) ranking #1–3 on city queries; ~2,000 URLs total (1,076 glossary, 497 blog posts, 400–900 medication pages); LocalBusiness schema with aggregateRating 4.8/651 | **672 ProductReview reviews 4.9★** (their whole social proof), healthdirect NHSD listing, MediCompare review page + #7 listicle slot, 1 Newsfile PR wire (CTO-quoted, no founder), QR-verify answered inside FAQ schema. Zero Reddit. Absent Bing national top-10 | NHSD listing; ProductReview accumulation; PR-wire with company quote; **Brisbane city page is a 404** (their gap); verification-anxiety FAQs | 20–25 posts/mo blog; glossary/medication catalog; aggregateRating schema (AHPRA-banned for us); named-doctor author pages |
| **InstantScripts** (Wesfarmers; certs $19/$49) | Brand authority, not programmatic: 280 URLs; homepage IS the prescriptions money page (#1 "repeat prescription online australia"); technical SEO weak (no FAQ schema, no meta descriptions, client-rendered blog) | healthdirect listing, ProductReview 4.6★/3,498 + award, mass acquisition news, OzBargain deals page, pharmacy-partner landing pages. Trustpilot soft underbelly: 2.9★/51% one-star | Employer page w/ Fair Work framing; healthdirect listing; clean schema they lack; multi-day cert price wedge ($29.95–39.95 vs their $49) | Pharmacy/retail distribution, app, loyalty, head terms their homepage owns |
| **Updoc** ($39.95 certs, subscription engine) | ~267 URLs + 182 thin condition pages + med-cert keyword-variant cluster (/sick-certificate, /carers-leave…); absent Bing top-10 (can't price-lead at $39.95) | **10,203 ProductReview reviews 4.7★**, ~5k Trustpilot, startup-press raise coverage, Deloitte Fast 50, Broadsheet native, Uber partnership; `/employer-verify` self-serve portal documented in a ranking help article | The `/employer-verify` loop (ours is better: batch + no email round-trip); keyword-variant cert cluster (only if Bing-gap-verified); "is it legit" answer page | Default-on subscription dark pattern (their #1 complaint), award-circuit PR, paid native press |
| **Qoctor** ($14.99 certs, since 2015) | ~1,330 URLs (WordPress): 327 FAQ pages each its own URL, ~400 brand-medication product pages, 6,500-word money page w/ 24 FAQs + price-led title; Bing #2 national | Trustpilot ~10k reviews 4.5★ (but ProductReview only 132 @ 3.4★ — last of 22); 10+ price-anchored Reddit threads ("Qoctor is $14.99"); heritage TV/news; own "best website for med certs" FAQ page ranks | Question-as-URL FAQ pages (from existing FAQ data, if Bing-gap-verified); employer `/check-validity` loop parity; price-led titles where honest | Medication product catalog (TGA exposure we've ruled out); video-consult roster; 10-year domain equity |
| **hub.health / Youly** ($24.95 certs; nib-owned) | Small footprints (~145/~300 URLs), money pages fresh but blogs dead 12–19mo; **zero top-10 positions observed on any tested query** — traffic is brand/PR/paid | ProductReview 914 + 1,068 (Youly's latest review 8 HOURS old = automated post-purchase ask), MediCompare review page, national lifestyle PR (morning-after-pill delivery hook). Trustpilot 1.6★ unmanaged. **No employer verification at all** (a ProductReview complaint says so) | The automated post-purchase review ask (Youly's exact play); their verification gap is our wedge | Multi-brand portfolio, nib money, compounding-pharmacy supply, big Ads program |
| **Mosh / Pilot** (ED+hair, subscription-only) | Condition-hub architecture (guides nested under money paths), conquest pages (pilot-vs-mosh), cost-query interception (#1 "hair transplant cost australia" via blog); checkout isolated off-domain | Trustpilot ~2.7k/~918, ProductReview Pilot 4.3★/1,992 (Mosh's listing 404s — gap), finvsfin + minoxidil.com.au + wellnessconversations affiliate reviews, r/tressless threads, Wikipedia (Eucalyptus), Hims & Hers US$1.15B acquisition news | Cost/process/eligibility long-tail pattern; the affiliate-review channel (pitch as "the no-subscription one-off alternative"); subscription-fatigue evidence (billing complaints) for third-party comparison framing | Celebrity-investor PR, before/after galleries + testimonials (AHPRA-banned for us), 50%-off subscription economics, 400+ article libraries |
| **Budget micro-sites** (Doccy $12.90, MedCertify $12, MIDOC $18, Dr Jimmy $11, Hola $14.90…) | **Own the Bing national SERP with price-in-title + minutes-to-issue**; most are <50-page sites — proof that this cluster ranks on title/price/review signals, not page count | Reddit price threads, MediCompare table (Prime Medic #1), Finder (Panraa), Healthdirect (MIDOC), TikTok (Dr Jimmy) | Price-led titles are table stakes on Bing; verification-as-differentiator framing (Doccy prints verify codes) | A $11–13 price war (margin suicide; we hold $24.95) |
| **The aggregator layer** (MediCompare, Finder, ProductReview, OnCare/TelehealthDr self-listicles) | They ARE the SERP for "best/compare/review" queries on Google AND Bing | This IS the LLM citation set: MediCompare rankings derive from ProductReview scores; Finder is affiliate-inclusion; competitor-owned listicles fill the vacuum left by mainstream media | Get listed everywhere (see §5); a compliant owned comparison page (the `/compare` surface already exists in code, iceboxed) | Buying undisclosed placements |

---

## 5. The GEO / LLM-citation strategy (ranked)

How assistants actually select citations (evidence: Seer 87% ChatGPT↔Bing citation match Feb 2025, now blending OpenAI's own index + rising Google alignment; Ahrefs 75k-brand study: brand mentions correlate 0.664 with AI visibility vs 0.218 for backlinks; Semrush/Profound: listicles ≈ 41% of citations for commercial "best X" queries; Princeton GEO paper: quotations +41%, stats +32%, cited sources +30%, biggest gains for low-ranked sites; Google: AI Overviews require normal Google indexation, no special markup exists).

| Rank | Surface / lever | What to do | Who | Effort | Citation impact |
|---|---|---|---|---|---|
| 1 | **ProductReview.com.au** | Create + claim free listing ("Online Doctor / Telehealth Services" category); retarget day-2 review email here; respond to every review (service-level replies ONLY — never confirm a reviewer is/was a patient, never reference their request; PHI discipline applies in public replies). Uniform non-incentivised ask (AHPRA bars inducements; ACCC bars gating). Never republish reviews on our surfaces. | Operator creates (30 min); Claude codes email change + drafts description | Low | **Highest.** The upstream node: MediCompare ranks from it, "is X legit" SERPs surface it, LLMs quote it |
| 2 | **Healthdirect NHSD** (+ Provider Connect Australia) | Register virtual service (free, validated, practitioner details used for validation only — public listings name no doctors, anonymity holds). PCA syndicates the record to PHNs/insurers. | Operator (form + possible validation call, ~1–2h); Claude drafts field values | Low-Med | **High.** A .gov.au entity citation on the most LLM-trusted AU health domain; only InstantScripts + Updoc + MIDOC hold one |
| 3 | **Bing Webmaster Tools** | Verify site, URL-inspect + submit money pages, review Index Coverage of all 103 URLs, then watch the free **AI Performance report** (actual Copilot/Bing-AI citation counts per URL). | Operator verifies (~30 min); Claude preps URL list + interprets weekly | Low | **High.** `/medical-certificate` absent from Bing = absent from the largest ChatGPT grounding path (Bing still powers Copilot and remains a major retrieval source even as OpenAI blends its own index) |
| 4 | **Trustpilot** | Claim free business profile, "Medical Certificate Service" category (needs 25+ reviews/12mo for category ranking). Pre-empts the future "is instantmed legit" SERP. NextClinic has 4 reviews here — cheapest out-rank available. | Operator (30 min) | Low | Medium-High |
| 5 | **MediCompare inclusion** | Email pitch (contact form; Bondi-based, lists 34 providers incl. tiny ones; rankings derive from ProductReview). Pitch the med-cert table (updated 2026-02-24), prescriptions table, hair-loss table (12 providers), + a per-brand review page. | Claude drafts; operator sends | Low | **High.** Top-3 Bing surface for "best online prescription service australia"; the most LLM-citable neutral AU comparison |
| 6 | **Employer-verification link lane** | See §6. HR/payroll/employment-law publishers (Sprintlaw/Employsure/Justitia class) link to verification resources; followed deep links at `/verify` + `/medical-certificate`. | Claude drafts guide + 20–30 pitches; operator sends ~20/mo | Med | **High for Google crawl** + brand mentions |
| 7 | **Finder.com.au online-doctor table** | Affiliate or editorial pitch (updated Apr 2026; tiny Panraa is included — the bar is commercial, not scale). Needs an operator decision on paying a referral commission. | Operator decision + email; Claude drafts | Med | Medium-High |
| 8 | **GEO-format owned pages** | Answer-first extractable blocks (2–3 sentences, price/turnaround/eligibility) in static HTML on money pages + top guides; dated ABS/AIHW stats with visible sources; "Last updated" dates; un-hide FAQ content from closed accordions; upgrade the iceboxed `/compare/online-medical-certificate-options` into THE dated cross-provider price table and re-index it (keep-set mechanism). | Claude (code/content) | Low-Med | **High once retrieved** — selection-stage gains compound every assistant at once |
| 9 | **FinvsFin / minoxidil.com.au / wellnessconversations** (ED/hair affiliates) | Pitch "the one-off, no-subscription alternative to Mosh/Pilot" with affiliate commission. Subscription-fatigue evidence exists (Pilot reviews: "350–400% the price of a chemist"). | Claude drafts; operator sends/decides commission | Med | Medium (high-intent niche) |
| 10 | **Reactive PR (SourceBottle/Qwoted) + /resources distribution** | Execute the existing kits: company-attributed source profile, 2–3 responses/wk in telehealth-access/workplace-evidence/privacy lanes; pitch the 11 `/resources` assets per the existing tracker (all "Not sent"). Honest limit: company-only attribution converts at a lower hit rate; clinical-opinion slots need a named doctor — decline those. | Claude drafts every response; operator sends | Med (1–2h/wk) | Medium — intermittent links + citable mentions |
| 11 | **PR wire milestone release** (~$400–800) | Optional: Newsfile-class company-attributed release (NextClinic + Hormn pattern), hook = employer verification portal launch or the "half of telehealth orders now arrive from untrackable AI apps" data angle. | Operator decision; Claude drafts | Low | Medium (syndicated brand mentions; LLM-retrievable) |
| 12 | **Entity hygiene** | Bing Places (verify the Jun 9 GBP sync took), Apple Business Connect, LinkedIn page completeness, `sameAs` in Organization schema, LegitScript cert number stated in every third-party profile description, byte-identical NAP everywhere (citation kit Tier 1–3). | Operator clicks (kit is written); Claude adds sameAs | Low | Low-Med (corroboration) |
| — | **Deprioritised:** Wikipedia (fails WP:NCORP, COI risk — even InstantScripts has no article), apps, HotDoc/HealthEngine (PMS-integration mismatch), Whitecoat (in maintenance), HealthShare (practitioner-named = anonymity conflict; revisit when a non-founder doctor consents), Claude/Brave-specific work, llms.txt investment, paid GEO tools (Profound $499/mo — use free BWT + manual panel; consider Otterly $29/mo only after the manual panel proves signal) | | | | |

**Reddit policy (explicit):** monitor only (free: F5Bot/Google Alerts on brand + category terms). No brand account posting, no pseudonymous seeding — ban risk, AHPRA advertising risk, and detection would be a trust-killing story. The compliant path to Reddit influence is being on the surfaces Redditors and LLMs verify against (ProductReview, MediCompare, NHSD).

---

## 6. Beat-NextClinic verdict: programmatic city pages + the /verify loop

**City pages: their moat is real for them, a trap for us right now — defer behind a gate.** Their city pages rank because the domain has ~2 years of compounding authority + review mass. We already have 42 cities of structured data built (~800–1,500 words each), 7 indexed. Adding indexed thin-ish city URLs to a domain Google won't even crawl the money pages of would repeat the exact mistake the icebox fixed.

- **Gate to un-defer:** `/medical-certificate` AND `/prescriptions` crawled + indexed by Google, AND ≥8–12 quality referring domains live, AND the keep-set metros showing any impressions growth. (Precision note: the 7 metros are in the index-policy keep-set; their individual indexation was NOT verified — only ~5 of 28 inspected URLs are confirmed indexed.)
- **City work is OUTSIDE this 90-day plan.** The gate is *reviewed* at day 90; if it passes, city deepening (7 metros toward ~2,000 words, then Brisbane — their 404 gap — then Gold Coast/Newcastle/Geelong) comes back as a **separate approval** with its own page budget. It does not count against, and must not erode, this plan's ≤4-page cap.

**The /verify loop: build NOW — it's the single cheapest differentiated asset we have.** The field check: Updoc has `/employer-verify` (email round-trip), Qoctor has `/check-validity-of-certificate`, Doccy prints codes, InstantScripts prints QR codes — but **nobody markets a self-serve, batch, no-signup employer portal**, and hub.health's lack of verification is a documented complaint. Ours already exists (`/verify`, public, batch-capable, IP-rate-limited). What's missing is packaging:

1. **QR code on the cert PDF** linking to `/verify/[ref]` (code; touches the locked cert template — adds a QR + short verify line only, no body-language change; **needs operator sign-off per the locked-template rule**).
2. **Employer landing page** (e.g. `/verify` hero copy + `/for/employers` un-iceboxed or a new section on `/employers` which already exists): "Verify any InstantMed certificate in seconds. Free, no signup, single or batch." Plus an honest "How to verify ANY online medical certificate" guide section (policies vary, Fair Work 'reasonable evidence' framing, no acceptance claims).
3. **Approval emails** mention the verify link (employer-forwarding moment).
4. **20–30 HR/payroll/legal publisher pitches** offering the free tool + guide as a reader resource (the link lane in §5 rank 6).

This is the NextClinic-beating move that fits a solo operator: they convert verification anxiety inside their own FAQ schema; we give the ecosystem a linkable tool.

---

## 7. 90-day sequenced roadmap

Owner key: **OP** = operator clicks/sends (Claude drafts everything sendable first); **CL-code** = Claude ships code; **CL-draft** = Claude writes copy/pitches. Effort is per-item total.

### Week 1 — Measurement + plumbing (foundation)
| # | Item | Owner | Effort | Impact |
|---|---|---|---|---|
| 1.1 | Debug `heard_about_us` zero-collection (PostHog shown vs answered; prod token POST; success-page render) | CL-code | 2–4h | Critical for measuring everything else |
| 1.2 | Bing Webmaster Tools: verify, inspect + submit money pages, Index Coverage review; enable AI Performance report | OP (30m) + CL-draft URL list | 1h | High |
| 1.3 | GSC manual Request Indexing on `/medical-certificate` + `/prescriptions` (UI, ~2/day) | OP | 10m | Medium (necessary, not sufficient) |
| 1.4 | Plumbing pass: trailing-slash 301/canonical consistency on `/medical-certificate(/)`; add `/consult` canonical; confirm www→non-www 301 everywhere; real per-URL sitemap lastmod; explicit ClaudeBot + Claude-SearchBot + Perplexity-User robots allows; descriptive-anchor internal links to money pages from indexed pages (homepage body, `/faq`, top blog guides) | CL-code | 1 day | High given authority scarcity |
| 1.5 | FAQ accordion audit: ensure money-page FAQ content is DOM-present when closed (Bing doesn't expand interactive elements) | CL-code | 2–4h | Medium-High |
| 1.6 | Stand up the measurement sheet: 12–15 fixed AU prompts run **fortnightly** logged-out across ChatGPT/Copilot/Perplexity/Gemini; log cited domains (citation share per prompt). PostHog insight for chatgpt.com/perplexity/copilot/gemini referrers (`is_e2e=false`) | CL-draft + OP (~40m/fortnight) | 2h setup | The KPI baseline |

### Weeks 1–2 — The citation layer (operator-click sprint, kits already written)
| # | Item | Owner | Effort | Impact |
|---|---|---|---|---|
| 2.1 | ProductReview listing: create, claim, complete (LegitScript cert # in description) | OP | 30m | **Keystone** |
| 2.2 | Review-ask routing: day-2 email rotates **monthly between ProductReview and Trustpilot** (so Trustpilot can reach its 25-review/12mo category threshold instead of rotting unmanaged like hub.health's 1.6★); the Google ask stays where it already lives (approval email). Compliant neutral ask copy | CL-code | 0.5 day | **Keystone input** |
| 2.3 | Trustpilot business profile + Medical Certificate Service category | OP | 30m | High |
| 2.4 | NHSD registration + PCA syndication (Claude drafts all field values) | OP | 1–2h | High (.gov.au) |
| 2.5 | Citation kit Tier 1–3 execution: Bing Places sync check, Apple Business Connect, LinkedIn completeness, AU directories (core ~18 only — diminishing returns past that) | OP | 2–3h | Medium |
| 2.6 | Organization schema `sameAs` → GBP/Bing Places/LinkedIn; LegitScript line everywhere | CL-code | 2h | Low-Med |

### Weeks 2–6 — Verification loop + inclusion outreach
| # | Item | Owner | Effort | Impact |
|---|---|---|---|---|
| 3.1 | QR on cert PDF + verify line (**operator sign-off required**: locked template) | CL-code + OP approve | 1 day | High (trust + parity) |
| 3.2 | Employer verify landing/packaging + approval-email verify mention; `/clarify` pass | CL-code/draft | 1–2 days | High |
| 3.3 | MediCompare pitches (med-cert + prescriptions + hair-loss tables + brand review page) | CL-draft, OP sends | 1h | High |
| 3.4 | HR/payroll/employment-law pitch batch #1 (20 personalised; targets pre-researched: Sprintlaw/Employsure/Justitia class + HR-software blogs + bookkeeping newsletters) | CL-draft, OP sends | 2h/wk | High (crawl demand) |
| 3.5 | Reactive PR live: SourceBottle + Qwoted signup, 2–3 responses/wk from existing templates; `/resources` tracker execution starts (Mondays per the existing operating loop) | OP + CL-draft | 1–2h/wk | Medium |
| 3.6 | FinvsFin + niche affiliate pitches (commission decision needed) | OP decide + send | 1h | Medium |
| 3.7 | Finder partnership inquiry (commission decision) | OP | 1h | Medium-High |
| 3.8 | Optional: PR wire release — hook is the **employer verification portal launch only**. (The dark-AI-traffic angle stays a reactive-PR quote lane; publishing it as a wire/report at n≈93 would resurrect the deferred data asset.) | OP decision (~$400–800) | 2h | Medium |

### Weeks 3–8 — GEO formatting + selective Bing re-index (code lane)
| # | Item | Owner | Effort | Impact |
|---|---|---|---|---|
| 4.1 | Upgrade `/compare/online-medical-certificate-options` into the dated cross-provider price/feature table (prices, refund policy, verification method, call vs form — facts only, no superiority claims, NO competitor star-ratings/review counts on our surface, "verified as at" dates + sources); move to keep-set (re-index); `/clarify` + compliance pass. **Monthly price re-verification is mandatory** — stale competitor prices on a regulated advertising surface = misleading-advertising exposure (our own research corrected NextClinic $16.90→$19.90) | CL-code/draft | 1–2 days + 30m/mo | High (the listicle LLMs want, on our domain) |
| 4.2 | Answer-first extractable blocks + dated stats + visible sources on `/medical-certificate`, `/prescriptions`, ED, hair-loss | CL-code | 1 day | High |
| 4.3 | ≤3 new pages ONLY against verified-empty Bing long-tail (e.g. "sick certificate online same day" returns junk; "repeat prescription online — how it works"; "one-off doctor review vs subscription platforms (ED/hair)"). Hard cap. Each must target an observed gap, education-first per SEO_CONTENT_POLICY | CL-draft | 2–3 days total | Medium-High (ChatGPT grounding) |
| 4.4 | Weekly: BWT AI Performance + GSC crawl-date checks on money pages; monthly: GSC Links report (target: 8–12 new quality referring domains/quarter) + compare-page competitor-price re-verify | CL + OP | 15m/wk + 30m/mo | Measurement |

### Weeks 6–12 — Compound + gates
| # | Item | Owner | Effort | Impact |
|---|---|---|---|---|
| 5.1 | Review-velocity checkpoint: target ≥10–15 ProductReview reviews by ~day 60 (at ~1.5–2 orders/day, a realistic 5–15% email→review rate); the listing *existing* clears most of MediCompare's bar — re-pitch for table inclusion + "Top 10" refresh at ≥10 reviews | OP | 30m | Compounding |
| 5.2 | HR pitch batch #2 (20 more) + follow-ups | CL-draft, OP | 2h/wk | High |
| 5.3 | City-pages gate review (§6 criteria) — review only; any build is a separate post-plan approval | Both | review only | — |
| 5.4 | Ads-resume gate review (§9) | OP | review only | — |
| 5.5 | Prompt-panel month-2 review: if InstantMed appears in any assistant answer, identify which surface drove it and double down | Both | 1h | Strategy steering |

**Total operator load, honestly stated: ~6–8h across weeks 1–2 (the citation-layer sprint is front-loaded), then ~3h/wk steady state.** To hold 3h/wk: the prompt panel runs fortnightly (not weekly) at ~40 min, reactive PR caps at 2 responses/wk, and if overloaded cut in this order: 3.6/3.7 (affiliates) → 3.8 (wire) → 3.5 frequency. Everything sendable is drafted by Claude first; nothing publishes without your send.

---

## 8. Measurement (what "working" looks like)

| KPI | Tool | Baseline (2026-06-10) | Day-90 target |
|---|---|---|---|
| ProductReview reviews | listing page | 0 (no listing) | ≥15–25 (no star-rating target — targeting a rating creates the gating pressure §10 bans) |
| Comparison-surface listings | manual | 0 | ≥2 (MediCompare + one of Finder/FinvsFin) |
| Money pages in Bing index | BWT | `/medical-certificate` absent | Both indexed; ≥1 AI Performance citation |
| Money pages Google state | GSC inspection | unknown/never-crawled | Both crawled; ≥1 indexed |
| Quality referring domains | GSC Links | ~0 meaningful | +8–12 |
| LLM prompt-panel citation share | manual sheet (12–15 prompts wkly) | 0 mentions | cited on ≥2–3 prompts (any assistant) |
| `heard_about_us` answers | /admin/ops strip | 0 (broken?) | fixed + ≥25% answer rate; "ai" share tracked |
| AI-referred orders (chatgpt/perplexity/copilot referrers) | PostHog/Supabase | 11/90d (ChatGPT web only) | 25–35/90d run-rate |
| Orders/30d | Supabase | 46 ($1,343) | 65–85 ($1,800–2,600) |

(Prompt panel runs fortnightly per §7 1.6.)

Trap reminder: ChatGPT strips referrer/tagging on sensitive health topics — judge the channel by the prompt panel + survey + BWT citations together, never referrers alone.

---

## 9. Honest revenue ceiling + the ads-resume gate

**Ceiling honesty.** This plan mostly (a) converts existing dark/LLM demand better by existing on the trust surfaces buyers and assistants check, and (b) opens the Bing/ChatGPT grounding channel to our money pages for the first time. Realistic day-90: **~65–85 orders/30d (~$1.8–2.6k gross/mo)** vs 46 today. The compounding case (reviews → listicle ranks → LLM share-of-voice → Google indexation → city pages) is a 6–12 month curve toward $4–8k/mo organic-led — consistent with the comprehensive audit's 12-month $8–20k/mo realistic band only when paid resumes on top. No version of organic-only reaches $1M/yr; that was never the claim.

**Resume Google Ads when ALL of these are true** (extends the no-google-ads-growth-plan gate):
1. Purchase conversion action verified firing, 0 failures/7d on `/admin/ops`.
2. ProductReview ≥25–30 reviews AND ≥1 comparison-surface listing live (so paid clicks that research the brand find third-party trust — this measurably lifts paid CVR).
3. `/medical-certificate` indexed by Google AND Bing (so paid + organic + AI surfaces reinforce).
4. ≥4 weeks of prompt-panel + referral baseline (so ads incrementality is separable from the organic ramp).
5. Floor-price test concluded (decision due ~Jun 23) and AOV nudges holding.

Then per the existing plan: hair-loss exact-match probe first ($2.70 CPC cap), $150 med-cert exact probe ($1.50 cap, kill at CPA>$25), Manual CPC, negatives loaded.

---

## 10. What we will NOT do (and why)

- **No content library / long-tail deepening / rewriting unindexed pages** — re-confirmed exhausted; the constraint is links, not words. Hard cap: ≤4 net-new pages in 90 days, each against a verified-empty Bing SERP.
- **No more Google Indexing API blasts** — verified no-op for ordinary pages.
- **No Reddit/forum seeding or astroturfing** — ban + AHPRA advertising exposure + detectable (a Whirlpool astroturf in this niche reads as obvious). Monitor only.
- **No Wikipedia attempt** — fails notability; COI risk. No app builds. No HotDoc/HealthEngine/Whitecoat. No HealthShare while the anonymity constraint binds.
- **No paid links/PBNs/guest-post networks; no incentivised or gated reviews** (ACCC + AHPRA s133, up to $120k corporate exposure); never republish reviews on our surfaces; stars-only badge rule stands.
- **No price war** — whatever the ~Jun 23 floor-test decision lands on ($24.95 vs revert to $19.95), we don't chase Doccy/Dr Jimmy to $11–13. Differentiation = verification + no-subscription + transparent doctor review. (Third-party listings quote current price; the price-change sweep debt — `PRICING_DISPLAY` centralisation — gets one more reason to exist.)
- **No named-founder/doctor PR** — privacy rule absolute. Accept the lower PR hit rate; decline clinical-opinion slots requiring a name.
- **No paid GEO tooling now** (Profound $499/mo etc.) — free BWT AI Performance + manual panel; revisit Otterly $29/mo only after the panel shows movement.
- **Data asset stays deferred** until ~1,000 paid requests (small-n credibility); the "dark AI traffic" angle may be used as a PR *quote*, never published as a "report."

---

## 11. Approval checklist (operator decisions needed before execution)

1. **Approve the plan overall** (or strike items).
2. **QR + verify line on cert PDF** — touches the locked template (no body-language change).
3. **Affiliate commissions**: willing to pay Finder / FinvsFin-class referral fees? (Y/N + ceiling %.)
4. **PR wire**: spend (~$400–800 one-off) AND hook — locked to the verification-portal launch, per §10's data-asset deferral. Yes/no/later.
5. **Review-ask routing**: day-2 email rotates monthly ProductReview ↔ Trustpilot; Google ask stays in the approval email — confirm.
6. **Selective re-index** of the upgraded compare page (and up to 2 intent pages with observed Bing presence) via keep-sets — confirm the icebox exception.
7. **Employer packaging surface**: new section on existing `/employers` vs un-iceboxing `/for/employers` — pick one (recommend: extend `/employers`, keep the icebox untouched).
8. **City-pages gate** (§6): acknowledge it as a *future, separate* approval — nothing city-related builds inside this plan.

## Appendix: key evidence URLs

- NextClinic: nextclinic.com.au/sitemap.xml · productreview.com.au/listings/nextclinic · their NHSD listing (healthdirect.gov.au) · medicompare.com.au/nextclinic/
- Inclusion targets: medicompare.com.au/online-medical-certificates/ (+ /online-prescriptions/, /hair-loss-telehealth/) · finder.com.au/health-insurance/online-doctor · finvsfin.com/pilot-reviews/ · productreview.com.au/c/online-doctor-telehealth-services · au.trustpilot.com/categories/medical_certificate_service
- Registration: healthdirect.gov.au/register-with-nhsd · digitalhealth.gov.au → Provider Connect Australia · bing.com/webmasters · business.trustpilot.com · support.productreview.com.au ("add a listing")
- Verification-loop comparables: updoc.com.au/employer-verify · qoctor.com.au/check-validity-of-certificate/ · HR-publisher class: sprintlaw.com.au "when can employers ask for medical certificates"
- GEO mechanics: developers.google.com/search/docs/appearance/ai-features · arxiv.org/abs/2311.09735 (Princeton GEO) · ahrefs.com/blog/ai-overview-brand-correlation/ · blogs.bing.com (AI Performance report, Feb 2026) · docs.perplexity.ai/guides/bots
- Internal: lib/seo/index-policy.ts (keep-sets) · /verify + lib/verify/certificate.ts · docs/audits/2026-06-04-citation-kit.md · docs/audits/2026-06-04-reactive-pr-kit.md · docs/audits/2026-06-06-authority-distribution-execution.md
