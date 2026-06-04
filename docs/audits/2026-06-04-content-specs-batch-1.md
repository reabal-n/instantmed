# Content Specs — Batch 1 (3 service-adjacent, original, info-gain pages) — 2026-06-04

The brain-review-approved content play: hyper-niche, original, conversion-adjacent, decision-content infographics. All three are **TGA-safe** (process/eligibility/legal — no prescription-drug promotion or claims), **guide-only** per `docs/SEO_CONTENT_POLICY.md` §4 (education-only body; the only service links are NEUTRAL contextual links because each page explains a service process — which is explicitly allowed and doubles as item-#2 internal linking to the money pages), and built to the campaign rubric (answer-first, 6+ H2s, 1,200–1,800 words, visible AU sources, red-flags/care-boundaries, 2–3 genuinely educational visuals). Home: `content/blog/*.mdx`. **Add the slug to `KEEP_INDEXED_BLOG` in `lib/seo/index-policy.ts` on ship** (built to the high bar → indexed, not iceboxed). Curate `relatedArticles` to interlink with the keep-set.

Shared compliance guardrails (all three):
- Med-cert language locks (CLAUDE.md): NO "accepted by all employers", "98% accepted", university special-consideration / deferred-exam / court / tribunal / workers-comp / insurance / NDIS / fitness-for-duty support claims, or SLA guarantees. Use "issued if clinically appropriate after doctor review; employer/institution policies vary."
- AHPRA: no outcome guarantees, no testimonials, no "no call needed" for prescribing.
- TGA: no consumer advertising of prescription-only medicines; no drug brand names as a draw; no before/after.
- Healthdirect = reference/fact-check only; cite + link, never copy structure or phrasing.
- Every visual: registry-sourced labels also rendered in HTML (`lib/blog/visuals.ts` + `components/blog/article-visuals.tsx`), generated via `pnpm blog:generate-visual-images -- --renderer=gpt-image-2 --slug=<slug> --force` (foreground, one slug), view the .webp before commit. Acceptance floor: 5+ content regions, 10+ labels, 3+ instructional devices, one reading path, nothing essential in the bottom-right wordmark zone.

---

## SPEC 1 (RECOMMENDED FIRST) — Backdated medical certificates in Australia
- **Slug:** `backdated-medical-certificate-australia`
- **Intent:** high — someone was unwell yesterday/last week and needs evidence now ("can I get a backdated medical certificate", "backdated sick certificate australia"). Genuine confusion + low-quality competitor answers. Trust-building: the honest answer positions InstantMed as legitimate, not a cert mill.
- **Info gain (vs Healthdirect/competitors):** the actual rules — a doctor can only certify what they can clinically justify; the difference between a *current* assessment that covers a stated recent period vs *fabricating* past illness; AHPRA's position; what InstantMed will / won't do (and that certs can be issued for a current period, with limited forward-dating per our policy). No general health site covers this.
- **Meta title (CTR):** "Can You Get a Backdated Medical Certificate in Australia? | InstantMed"
- **Meta description:** "What 'backdating' a medical certificate really means, what an Australian doctor can and can't do, and your options if you were unwell earlier. Honest, doctor-reviewed."
- **Outline (H2s):** answer up top (the honest 2-sentence answer) → "What 'backdated' actually means" → "What an AU doctor can and can't certify (and why)" → "Were you genuinely unwell? Your real options" → "What employers can ask for (single day vs longer)" → "How InstantMed handles dates" (neutral, process) → "Red flags: when this needs in-person care" → FAQ → Sources.
- **Hero visual (decision tree):** *"Can a doctor issue a certificate for a past date?"* flowchart — branches: still unwell now / no longer unwell / specific past day → outcomes (current assessment possible / honest limits / see your regular GP). 5+ nodes, labelled outcomes, one top-to-bottom path.
- **Neutral internal link:** `/medical-certificate` (process context). Related: `medical-certificate-online-australia`, `work-from-home-sick-certificate`.
- **Sources:** Fair Work Ombudsman (evidence/sick leave), AHPRA Code of Conduct, RACGP, Services Australia, Healthdirect (reference).

## SPEC 2 — Medical certificate vs statutory declaration
- **Slug:** `medical-certificate-vs-statutory-declaration`
- **Intent:** medium-high — "medical certificate or statutory declaration", "stat dec for sick leave", "what evidence can my employer ask for". Workplace-evidence confusion.
- **Info gain:** the legal distinction under the Fair Work Act / NES — when each is acceptable evidence, what a "reasonable" evidence request is, single-day absences, who can witness a stat dec, and when a med cert is the better/only option. AU-law-specific; Healthdirect doesn't cover employment law.
- **Meta title:** "Medical Certificate vs Statutory Declaration: What Your Employer Can Ask For"
- **Meta description:** "The difference between a medical certificate and a statutory declaration for sick leave in Australia, what counts as reasonable evidence under the Fair Work Act, and when you need each."
- **Outline (H2s):** quick answer → "What each document is" → "What the Fair Work Act says about evidence" → "When a stat dec is enough (and when it isn't)" → "Single-day and 'reasonable evidence' rules" → "How to get each" (neutral) → FAQ → Sources.
- **Hero visual (comparison matrix):** Medical certificate vs Statutory declaration across rows: who issues, what it proves, cost/effort, when employers accept, witnessing, best for. 2 columns × 6+ rows, labelled.
- **Neutral internal link:** `/medical-certificate`. Related: `medical-certificate-for-work`, `online-doctor-certificate-for-work`.
- **Sources:** Fair Work Ombudsman (evidence + NES), Attorney-General's Dept (statutory declarations), state JP/witness info, AHPRA.

## SPEC 3 — Which repeat prescriptions can (and can't) be renewed online?
- **Slug:** `repeat-prescription-renew-online-eligibility-australia`
- **Intent:** medium-high — "can I renew my prescription online", "repeat script telehealth", "which medications can't be prescribed online". Direct `/prescriptions` adjacency.
- **Info gain:** the *eligibility* decision — medicines generally suitable for telehealth renewal vs those needing in-person review; controlled-substance (S8) and high-risk exclusions; what information a doctor needs (current dose, last review, prior script); red flags that mean "see your GP". Genuinely InstantMed-process-specific; framed as eligibility, NOT drug promotion (TGA-safe).
- **Meta title:** "Which Repeat Prescriptions Can Be Renewed Online in Australia?"
- **Meta description:** "Which regular medications an online doctor can renew via telehealth, which need an in-person review, and what information you'll be asked for. Doctor-reviewed, no drug names hyped."
- **Outline (H2s):** quick answer → "How online repeat prescribing works" → "Generally suitable for telehealth renewal" (categories, not brand pushing) → "Usually needs an in-person review" (controlled/high-risk, new symptoms, overdue review) → "What the doctor needs from you" → "Red flags / when to see your GP or 000" → "What happens if it's not suitable" (neutral) → FAQ → Sources.
- **Hero visual (decision tree):** *"Can your repeat script be renewed online?"* — branches on: medication type (routine vs controlled/high-risk) / time since last review / new symptoms → outcomes (likely suitable / needs in-person / urgent care). Clear red-flag exit.
- **Neutral internal link:** `/prescriptions`. Related: `repeat-prescription-online-australia`, `online-prescription-australia`.
- **Sources:** TGA (scheduling/telehealth), RACGP telehealth + prescribing guidance, PBS, Medical Board of Australia telehealth guidelines, Healthdirect (reference).

---

## Sequencing
Ship one at a time (Spec 1 → 2 → 3), ~one per 1–2 weeks. Per page: draft MDX → reviewer = corporate "InstantMed Clinical Team" (NOT Dr Najjar's name unless he personally reviews + it's a pillar) → `/clarify` pass on copy → 2–3 visuals (foreground, view before commit) → `pnpm content:audit` → add slug to `KEEP_INDEXED_BLOG` → request-index via `pnpm seo:submit-indexing -- --urls=https://instantmed.com.au/blog/<slug>`. These also strengthen item-#2 internal linking to `/medical-certificate` + `/prescriptions`.
