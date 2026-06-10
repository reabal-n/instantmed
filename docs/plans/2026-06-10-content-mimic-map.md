# Content Mimic Map — NextClinic → InstantMed

> **Date:** 2026-06-10 · **Status: AWAITING OPERATOR APPROVAL of buckets + sequence.** Companion to `docs/plans/2026-06-10-organic-geo-beat-nextclinic-plan.md`. Built from a full enumeration of NextClinic's 500-post blog + 8-state/7-city pages + ~1,057-page glossary + 13 condition pages (crawled 2026-06-10) cross-mapped against InstantMed's 105 blog articles, 53 conditions, 16 guides, 28 intent pages, 26 symptoms, 11 resources, 42 city datasets.

---

## 1. The headline (read this first)

**You already own ~80% of NextClinic's worthwhile catalog.** NextClinic publishes 500 blog posts; once you strip their filler (seasonal/wellness fluff, stale 2024 news hooks), their drug-product pages (TGA-barred for us), their ~1,057-page Healthdirect-style glossary (the icebox mistake at 1,000× scale), and the lines we don't offer (weight-loss/GLP-1, contraception/women's health), the **genuinely strategic editorial set is ~120 posts across four clusters — and InstantMed already has a same-or-better page for most of them.**

So "the same articles they have + more, in more depth" is mostly a **deepen-and-re-index** job, not a write-500-articles job. Writing fresh versions of pages we already have iceboxed would just rebuild the 310-zero-impression pile the icebox was created to fix.

**The two real content gaps where NextClinic genuinely out-covers us, and where we have near-zero pages, are ED and hair loss** — our two highest-AOV lines ($49.95). That's where net-new writing earns its keep.

## 2. The quality bar (what "more depth" means)

NextClinic's cornerstone money pages run **3,200–7,000 words, 8–11 H2s, inline FAQ schema, 10+ government/college-grade citations (Fair Work, AHPRA, TGA, Australian Prescriber, RACGP, college bodies) with a visible references block, 12–22 internal links.** Their cornerstone med-cert article is ~6,500 words.

Our existing articles sit at **1,700–3,100 words** — under the bar. To beat them, the deepen recipe is: hit ≥3,000 words on money topics, ≥10 topic-matched AU references in a visible sources block, FAQ schema, answer-first first screen, 12+ internal links, freshness date.

**Two differentiators we have and they don't — lean into both:**
- **Instructional visuals.** Their articles are text-only. Our `pnpm blog:generate-visual-images` pipeline produces labelled educational infographics. This is a genuine quality + GEO edge.
- **The `/verify` employer loop.** They bury verification inside FAQ schema; we have a live, batch-capable, no-signup tool to build an employer cluster around.

**One differentiator we CANNOT copy:** NextClinic has named doctor-author pages (`/authors/dr-khin-thu`). The founder-anonymity rule forbids this. Confirmed safe in code: `lib/blog/medical-reviewer.ts` renders the corporate "InstantMed Clinical Team" on every page (`pillarReviewedSlugs` is empty). **Keep it empty — do not add the Medical Director's name to any slug.** Our E-E-A-T is company-attributed + visuals + references, full stop.

---

## 3. Bucket A — DEEPEN + RE-INDEX (we already have it; the dominant bucket)

These exist. Work = deepen to the §2 bar, add visuals, then move the slug into the `lib/seo/index-policy.ts` keep-set **in batches of ~10**, submit to Bing + GSC, and watch indexation for 2–3 weeks before the next batch. No net-new URLs = lowest risk. **Status key:** ●=indexed (in keep-set) · ○=iceboxed (live, noindex).

### A1 — Medical certificate cluster (our strongest existing surface — mostly just needs depth)
| NextClinic angle | Our existing article(s) | Status | Action |
|---|---|---|---|
| Cornerstone "med cert rules AU" (6.5k words) | `medical-certificate-for-work`, `medical-certificate-online-australia` | ● ● | Deepen the cornerstone toward 3.5–4k; it's the anchor |
| Validity / legality / "is it legit" | `are-online-medical-certificates-valid-australia`, `is-telehealth-legal-australia` | ● ○ | Deepen + reindex the legality one |
| Backdating | `medical-certificate-backdating` | ● | At bar — light touch |
| Employer acceptance / rejection | `employer-accept-online-medical-certificate`, `can-employer-reject-medical-certificate` | ○ ○ | Deepen + reindex (ties to verify cluster, C1) |
| Carer's leave | `medical-certificate-carers-leave` + guide | ● | At bar |
| Sick-leave rights / accrual / payouts | `sick-leave-rights-australia` | ○ | Deepen + reindex |
| Mental-health day | `mental-health-certificate-work`, `mental-health-certificate-online`, `medical-certificate-mental-health-day` | ● ○ ○ | Rich already; reindex the best one, don't keep all three |
| University / special consideration | `university-medical-certificates`, `doctors-certificate-university-extension` | ○ ○ | Deepen + reindex one |
| Specific reasons (period pain, food poisoning, pregnancy, bereavement, jury duty, surgery, shift workers, teachers, parents/sick child, same-day, without-Medicare, WFH) | 12+ dedicated articles | mixed | Already complete — reindex the highest-impression ones only |

### A2 — Repeat prescription / eScript cluster
| NextClinic angle | Our existing | Status | Action |
|---|---|---|---|
| eScripts explained | `how-escripts-work` | ○ | Deepen + reindex |
| Repeat / renewal | `repeat-prescription-online-australia`, `prescription-renewal-online`, `repeat-prescriptions-australia`, `repeat-prescription-online` | ● ○ ○ ○ | **Cannibalisation cluster** — pick ONE canonical, reindex it, leave the rest iceboxed (memory-flagged dup risk) |
| PBS costs | `pbs-pharmaceutical-benefits-scheme` | ● | At bar |
| What can't be prescribed online | `medications-not-prescribed-online` | ● | At bar |

### A3 — Telehealth-general / trust / Medicare (already strong — 15+ articles)
`is-telehealth-bulk-billed-australia` ●, `is-telehealth-safe` ●, `telehealth-safety-screening` ●, `ahpra-registered-doctor-meaning` ●, `how-to-verify-online-doctor` ○, `is-telehealth-legal-australia` ○, `telehealth-vs-gp-australia` ○, `when-telehealth-cant-help` ○, `how-doctors-review-online-requests` ○. **Action:** reindex the trust/"is it legit" ones (highest GEO value for "is InstantMed legit" prompts); the rest are at or near bar.

### A4 — Conditions (53 ours vs their 13 — we already out-cover them)
15 conditions are in the keep-set. **Do NOT expand the condition encyclopedia** (that's the rejected content-volume play, and conditions aren't a money line). Selectively deepen only the keep-set conditions with GSC impressions (cold-and-flu, etc.).

**Bucket A total: ~30–35 articles worth deepening, sequenced by impression value, re-indexed in batches.**

---

## 4. Bucket B — WRITE NEW (real gaps worth filling)

Genuine holes where NextClinic out-covers us AND the topic drives revenue. All education-first per `docs/SEO_CONTENT_POLICY.md` (no "buy/get [drug]", no checkout CTAs in guide bodies, medicine names allowed only as education). Ranked.

### B1 — ED cluster ⭐ HIGHEST PRIORITY (we have 1 article; they have ~25; $49.95 AOV; Mosh/Pilot own it via subscription — our one-off angle differentiates)
- **Pillar:** "Erectile dysfunction in Australia: causes, treatment options, and how online assessment works" (3,000+ words, the anchor)
- "Is it ED or performance anxiety? How to tell the difference" (eligibility/triage, shame-reduction — these rank and get shared)
- "Does alcohol / stress / porn cause ED? What the evidence says" (evidence explainer — high-volume, low-authority-winnable, AHPRA-safe)
- "Daily vs on-demand ED treatment: how the options differ" (process education — frames treatment *types*, no drug-name push)
- (Existing `sildenafil-vs-tadalafil` → fold in + reindex as the comparison node)
- *Optional:* premature ejaculation pillar — confirm it's in clinical scope for the ED consult line first (we have zero PE content; NextClinic has a sub-cluster)

### B2 — Hair loss cluster ⭐ HIGH PRIORITY (we have 1 article; they have ~12; $49.95 AOV)
- **Pillar:** "Male pattern hair loss: causes, treatment options, and what telehealth can do" (3,000+ words)
- "Finasteride results timeline: what to realistically expect" (process/expectations — we have the comparison but not the timeline)
- "Hair loss myths vs facts" + "Is it normal to lose this much hair?" (evidence/triage — shareable, winnable)
- (Existing `finasteride-vs-minoxidil-hair-loss` → reindex as the comparison node)

### B3 — Prescription gaps (Bing-winnable, research-flagged)
- "Can you get a script without a video call in Australia?" (newdoc/NextClinic win this on Bing today — directly conversion-relevant)
- "How long is a prescription valid in Australia? (and can you reuse an old script)" (evergreen, high-volume, we lack it)

### B4 — One controlled med-cert addition (NOT NextClinic's 13 thin pages)
- **Pillar:** "What counts as a valid reason for a sick day in Australia?" — fold their entire "is [hangover/stress/sore throat/migraine/toothache/UTI] a valid reason" long-tail SERIES into ONE comprehensive guide with each as an H2. **We will NOT mimic their 13 separate thin pages** — a young domain can't carry thin dupes; one strong pillar captures the cluster without rebuilding the icebox.

**Bucket B total: ~10–12 net-new articles, ED + hair first.**

---

## 5. Bucket C — NET-NEW ELEVATE (beyond NextClinic; our structural advantages)

Topics NextClinic doesn't own as standalone pages, built on differentiators they can't easily copy. This is where we don't just match them — we get a wedge.

### C1 — Employer / verification B2B cluster ⭐ (our `/verify` tool + an uncontested link lane)
- "How to verify an online medical certificate (a guide for employers)" — built around the live `/verify` tool; the link-magnet for HR/payroll/employment-law publishers (plan §6)
- "Are online medical certificates valid under the Fair Work Act?" (employer-facing, "reasonable evidence" framing, no acceptance claims)
- Deepen existing `what-employers-can-ask-medical-certificate` guide into the employer hub
- "Fake medical certificates: the real legal risks — and how employers can spot a genuine one" (trust + verification tie-in; NextClinic covers the risk angle, nobody pairs it with a real verify tool)

### C2 — One-off vs subscription comparison (the Mosh/Pilot wedge)
- "One-off online doctor review vs subscription men's-health platforms: how the models differ" — pricing-model facts only, no competitor bashing, no drug names. Research shows brand-owned comparison pages own these SERPs; our no-subscription/fill-anywhere-eScript model is the genuine differentiator subscription players structurally can't claim.

### C3 — Cost transparency (long-tail winnable; transparent pricing is our brand)
- "How much does an online medical certificate cost in Australia?" / "What does online ED / hair-loss treatment cost?" — cost queries are long-tail winnable (Pilot wins "hair transplant cost AU" with one blog), and price transparency is on-brand.

**Bucket C total: ~6–7 net-new articles; C1 (employer/verify) first — it doubles as the off-page link lever.**

---

## 6. Bucket D — SKIP (do NOT mimic)

- **The ~1,057-page glossary.** Thin per-term definitions, Healthdirect-paraphrase risk, and the exact zero-impression bloat the icebox exists to prevent — at 1,000× scale. Hard no.
- **The ~104+ drug-product pages** (`sildenafil-100mg/Viagra` etc.). TGA/AHPRA-barred drug-name acquisition pages. Hard no.
- **Seasonal/wellness filler** (apple cider vinegar, coffee benefits, "video games & health", "healing power of rest"). No revenue intent, no authority value.
- **Stale news hooks** (Joe Biden 2024 exit, 2024 Olympics, 2024 COVID wave). Already dead.
- **Gimmick timing-hook posts** ("woke up sick on a Sunday", "sore throat on Saturday"). Intent already covered by our same-day cert pages; thin and gimmicky.
- **Mass condition-encyclopedia expansion.** We have 53 vs their 13 — already ahead. Don't add more.

---

## 7. Bucket E — PARK / GATED (right idea, wrong time)

- **Weight loss / GLP-1** — operator decision: stay OFF (per `comprehensive-audit-2026-06-10`). No content.
- **Women's health / contraception** — launching ~3 months (OCP resupply + period delay, per operator decision). **Pre-stage** this content cluster ~2–3 weeks before that launch, not now. NextClinic has a strong contraception/women's set to mirror then.
- **Specialist referral cluster** (~9 NextClinic posts) — referral letter is display-only / not a launched paid service. Build when/if the $29.95 referral service goes live.
- **City pages incl. Brisbane** — gated behind the authority gate in the GEO plan §6 (money pages crawled + ≥8–12 referring domains). **Brisbane is NextClinic's confirmed 404 gap** and our first build when the gate opens; we already have the `deep-city-content` data for 42 cities. Not now.

---

## 8. Reconciling with the GEO plan's page cap

The GEO plan capped net-new pages at ≤4 because writing into an index that won't crawl us is busywork. Your direction to build the content base is right **as long as the build is metered by indexation evidence, not blasted out.** Proposed refinement to the plan (needs your nod):

- **Bucket A (deepen + re-index existing):** no net-new URLs — safest lane. Throttle = batches of ~10, watch Bing/GSC indexation 2–3 weeks per batch, continue while it sticks.
- **Bucket B + C (net-new):** start with the **two highest-value pillars only — the ED pillar and the hair-loss pillar** — publish, get them crawled/indexed, measure. Scale the rest of B/C only after those two prove the domain will absorb new URLs. This replaces the flat "≤4" with "metered by proof," which serves your goal without rebuilding the icebox.

So the first 30 days touch **zero risky net-new volume**: deepen-and-reindex Bucket A batch 1 + the ED and hair pillars. Everything else unlocks on indexation evidence.

---

## 9. Recommended next steps + division of labour

**What I do (no clicks needed):**
- Deepen Bucket A batch 1 (~10 articles, impression-ranked) to the §2 bar + generate visuals (gpt-image-2, foreground one-at-a-time per the known stall gotcha).
- Write the ED pillar + hair-loss pillar (Bucket B1/B2 anchors) — education-first, AU-referenced, `content:audit` + `/clarify` clean.
- Move deepened slugs into the keep-set, submit to Bing + GSC via existing tooling, monitor indexation weekly.
- Draft the C1 employer/verify pages (they double as the off-page link lever).
- Report indexation deltas per batch so we scale on evidence.

**What I need you to do:**
1. **Approve the buckets + the §8 metered sequence** (or strike items).
2. **Confirm two scope questions:** (a) is **premature ejaculation** in clinical scope for the ED consult line? (b) keep `pillarReviewedSlugs` empty / corporate attribution only — confirm (this is the anonymity rule; just confirming nothing names you).
3. **The indexation prerequisite (same 5 clicks as the GEO plan, ~4h once):** ProductReview + Trustpilot listings, Healthdirect NHSD registration, Bing Webmaster Tools verify, GSC Request-Indexing on the money pages. **Without these, even perfectly-deepened content sits uncrawled** — they're not a separate track, they're what makes the content build pay off.

Say go on the buckets and I start Bucket A batch 1 + the ED and hair pillars immediately; the indexation clicks can happen in parallel whenever suits you this fortnight.

## Appendix: cross-map source data
- NextClinic enumeration (2026-06-10): 500 blog posts, 8 states + 7 cities (Brisbane 404), 13 conditions, ~1,057 glossary, ~104 drug-product pages; cornerstone depth 3,200–7,000 words / 10+ AU citations / FAQ schema / no per-article byline.
- InstantMed inventory: 105 blog (21 indexed), 53 conditions (15 indexed), 16 guides (iceboxed), 28 intent (13–15 indexed), 26 symptoms (1 indexed), 11 resources (uncrawled), 42 city datasets (7 indexed). Keep-sets: `lib/seo/index-policy.ts`.
- Reviewer attribution: `lib/blog/medical-reviewer.ts` — corporate default, `pillarReviewedSlugs` empty (no founder name rendered).
