# InstantMed Profitability Audit - 3-Brain Reconciliation

Date: 2026-06-05

Status: read-only business audit. No product code was changed.

## Executive Verdict

InstantMed is not losing money because the product is incapable of taking orders. It is losing money because the business is still operating like a polished product build rather than a tightly metered healthcare acquisition engine.

The repo's own numbers make the problem blunt:

- `docs/ROADMAP.md` records revenue at about `$688 / 30d`, annualised around `$8k`, against the `$1M` annual gross target. That is a `121x` revenue gap.
- `docs/REVENUE_MODEL.md` says the target requires `$83,333/month` or `$2,740/day`.
- At a blended AOV of `$24-$55`, the business needs about `50-114` paid orders per day.
- The committed 2026-06-02 funnel audit found `$1,668.80` Google Ads spend against `$419.15` local Google-attributed net revenue, with local CAC of `$92.71`.

Profitability readiness: **46/100**.

The clinical/product infrastructure is far more mature than the demand engine. The business should stop treating "more traffic" as the next step until CAC, recovery, attribution, and queue/capacity gates are visible in the operator dashboard and enforced as spend gates.

## Method

This reconciles:

1. A GPT-5.5 systems/product profitability review.
2. An Opus-style healthcare operator/compliance review.
3. A Gemini-style funnel/customer-acquisition review.
4. The committed 2026-06-02 conversion audit, which already recorded a three-model panel: Gemini, Opus, and GPT.
5. The committed 2026-06-03 SEO three-model review and 2026-06-04 backlink/data-asset plans.
6. Current external source checks against Medical Board/Ahpra, TGA, Google Ads policy, OAIC guidance, and competitor price snapshots.

Limitation: I attempted the repo's `scripts/brain-review.ts` AI Gateway harness in this session. It returned unrelated SystemVerilog and LangChain outputs, so those live gateway responses were excluded from this audit. This document uses the three independent reviewer-agent outputs from this turn plus the committed prior three-model reports where the repo has reliable artifacts.

I did not query live Stripe, Supabase, PostHog, Google Ads, or GSC in this pass. Live metric claims below are therefore either from committed repo audit artifacts or explicitly marked as requiring refresh.

## Three-Brain Summary

### GPT-5.5 Lens: Operating System Gap

The app has the building blocks for profitability reporting, but the operator view does not yet force the right decision. `lib/analytics/google-ads-report.ts` can calculate spend, local orders, cost per local order, CPA, purchase CPA, ROAS, local gross revenue, and local net revenue. The visible `/admin/analytics` page shows Google Ads upload health: captured, uploaded, skipped, failed. That is useful for instrumentation, but it is not a profit guardrail.

Main concern: build the actual daily profit cockpit by service and source, then let that cockpit govern paid spend.

### Opus Lens: Healthcare Operator Risk

Do not scale a regulated health service while public claims, queue state, and operating metrics are drifting. The business has sensitive claims around response time, employer acceptance, refunds, doctor identity, and no-call convenience. Those claims may convert, but they also create AHPRA/TGA/consumer-law exposure if they are stale, interpolated, or overbroad.

Main concern: profitable healthcare growth depends on trust and defensibility. Every acquisition claim needs proof, especially before paid traffic.

### Gemini Lens: Acquisition/Funnel Economics

The biggest immediate leak is not top-of-funnel volume. It is paid spend and warm-lead recovery. The committed funnel audit found zero recovered partial intakes despite 119 partials and 21 captured emails. That is warmer, cheaper money than new clicks.

Main concern: pause or cap unprofitable campaigns, fix recovery/resume flows, then relaunch with small exact-match campaigns only after local purchase CAC is visible by campaign, service, landing page, network, and device.

## Reconciled Consensus

All three reviews agree on the following:

1. **Do not ramp Google Ads yet.** The last committed paid audit showed spend well above local revenue.
2. **CAC and ROAS need to be operator-visible, not buried in an internal report.**
3. **Recovery is a first-order revenue lever.** Recovering existing partials is cheaper than buying more traffic.
4. **AOV is too low if the business remains med-cert-led.** Med certs are the demand wedge, not the whole business model.
5. **ED and hair loss are useful AOV tests, not broad paid-scale channels yet.**
6. **SEO needs authority/indexation, not more page count.**
7. **Compliance-safe growth is narrower than normal SaaS growth.** No prescription-drug promotion, no sensitive remarketing, no testimonials, no unsubstantiated speed or acceptance claims.
8. **Operational decision data has drift.** The roadmap still shows a 2026-06-02 queue blocker; AGENTS notes a newer 2026-06-04 snapshot where med certs improved. The business should not make spend/staffing decisions from stale docs.

## Top Profit Blockers

| Rank | Blocker | Why It Hurts Profit | Evidence | Fix |
|---:|---|---|---|---|
| 1 | Paid acquisition is underwater | A `$92.71` local CAC cannot work on `$19.95-$49.95` first-order prices | `docs/reviews/2026-06-02-conversion-funnel-audit/report.md` | Pause/cap broad spend; relaunch only when local CAC is visible and below first-order margin |
| 2 | Operator dashboard lacks actual CAC/ROAS | Upload health can look green while campaigns lose money | `app/admin/analytics/analytics-client.tsx`, `lib/analytics/google-ads-report.ts` | Put spend, local orders, local net, CAC, CPA, ROAS, refunds, campaign/source/device into `/admin/analytics` |
| 3 | Demand is 121x below the target model | The current business does not have enough order flow to approach the revenue target | `docs/ROADMAP.md`, `docs/REVENUE_MODEL.md` | Run a 30-day revenue rescue plan, not another product expansion |
| 4 | Warm-lead recovery is broken or ineffective | 119 partials, 0 recovered means existing demand is being wasted | `docs/reviews/2026-06-02-conversion-funnel-audit/report.md` | Capture email earlier, verify recovery links, report recovery sent/open/click/paid/revenue |
| 5 | Attribution and funnel events are not service-complete | Repeat Rx can under-report because the flow pays through `review`, while `intake_complete` only fires on `checkout` | `lib/request/step-registry.ts`, `components/request/hooks/use-flow-analytics.ts` | Treat final payable steps as completion per service, then reconcile Ads/PostHog/Supabase |
| 6 | Med certs carry demand but not enough AOV | `$19.95` certs cannot absorb paid CAC or support a `$1M` target alone | `docs/REVENUE_MODEL.md`, `lib/constants/index.ts` | Lift AOV through 2-3 day attach, priority, repeat Rx cross-sell, and tightly gated higher-AOV services |
| 7 | Commercial money pages were not indexed in the GSC audit | Organic cannot offset paid CAC if `/medical-certificate` and `/prescriptions` are invisible | `docs/audits/2026-06-03-gsc-seo-content-audit.md` | Indexation sprint plus AU authority links, not more thin content |
| 8 | Public claims may outrun proof | Speed, acceptance, rating, refund, and doctor identity claims can create regulatory and trust risk | `lib/social-proof/index.ts`, `app/pricing/pricing-content.tsx`, `app/our-doctors/our-doctors-client.tsx` | Build a claim ledger: live source, owner, expiry, allowed surfaces, paid-safe variant |
| 9 | Too many acquisition surfaces dilute focus | Broad pages, programmatic pages, request hub, and audience pages can distract from the four service lines | SEO audits and route inventory | Keep paid traffic to service landers; use noindex/icebox policy aggressively |
| 10 | Data-led PR is promising but not yet viable | Publishing N~101 aggregate data would expose low traction and fail privacy suppression | `docs/audits/2026-06-04-data-asset-spec.md` | Do citations and reactive PR now; defer data report until about 1,000+ paid requests |
| 11 | Expansion ideas fight current business canon | Subscriptions, pharmacy, weight loss, women health, broad GP consults add support/compliance load before unit economics work | `docs/BUSINESS_PLAN.md`, `docs/REVENUE_MODEL.md` | Stay one-off and specialised until gates are met |
| 12 | Operational docs disagree on queue state | Bad queue data leads to bad ad and staffing decisions | `docs/ROADMAP.md`, `AGENTS.md`, `docs/OPERATIONS.md` | Make one live "growth readiness" source of truth from current production metrics |

## Unit Economics Reality

The current first-order pricing leaves very little room for paid CAC:

| Service | Current Price | Practical CAC Implication |
|---|---:|---|
| 1-day med cert | `$19.95` | Paid CAC likely needs to be single digits after fees and labour |
| 2-day med cert | `$29.95` | Still too low for broad paid search |
| 3-day med cert | `$39.95` | Better, but not enough to absorb `$90+` CAC |
| Repeat prescription | `$29.95` | Useful cross-sell, dangerous as cold paid traffic unless measurement is fixed |
| ED / hair loss | `$49.95` | Better AOV, but higher clinical and advertising risk |
| Priority fee | `$9.95` | Useful attach lever if it does not create unsafe timing promises |

The revenue model says CAC should stay below 30% of first-order gross profit for low-AOV services. With these prices, that means the current paid audit CAC is not a bit high. It is a business-model failure if repeated live.

## 30-Day Rescue Plan

### Week 1: Stop The Bleed And Make Profit Visible

1. Cap or pause all campaigns that do not have verified local purchase CAC below first-order margin.
2. Do not use Smart Bidding decisions until Ads, Supabase, Stripe, and PostHog purchase counts reconcile by service.
3. Promote `getGoogleAdsSpendAuditReport` into `/admin/analytics` as a profit panel:
   - spend
   - clicks
   - local paid orders
   - local gross revenue
   - local net revenue after refunds
   - cost per local order
   - purchase CPA
   - ROAS
   - search network vs partners
   - campaign, service, landing page, device
4. Refresh current production truth:
   - paid orders by service
   - refunds and chargebacks
   - queue P50/P95/max by service
   - support tickets per 100 orders
   - doctor minutes per order
5. Reconcile `docs/ROADMAP.md` queue blocker with the newer operational note in `AGENTS.md`.

Exit criteria: the operator can answer "did we make or lose money yesterday by service and channel?" in under 30 seconds.

### Week 2: Recover Warm Leads Before Buying More

1. Move email capture earlier for high-intent starts, especially medical certificates.
2. End-to-end test recovery links from email to resumed draft to paid checkout.
3. Add recovery metrics:
   - partial captured
   - email present
   - recovery sent
   - recovery opened
   - recovery clicked
   - resumed
   - paid
   - recovered revenue
4. Fix repeat Rx funnel completion:
   - `repeat-script` and `prescription` use `review` as the final payable step.
   - `use-flow-analytics` currently fires `intake_complete` only on `checkout`.
   - Add service-aware completion logic.
5. Correct consult checkout refund copy and stale comment:
   - policy is now full refund on decline
   - checkout currently says weaker "Refund if we can't help" for consults
   - comment still says partial consult refunds

Exit criteria: recovery flow has a measurable rescue rate, and repeat Rx paid events reconcile across analytics.

### Week 3: Relaunch Paid As Controlled Experiments

1. Run only high-intent Search campaigns. No Performance Max, Demand Gen, display, YouTube, remarketing, Customer Match, lookalikes, or health-condition custom audiences.
2. Send paid traffic to service landers, not `/request`:
   - `/medical-certificate`
   - `/prescriptions`
   - `/erectile-dysfunction`
   - `/hair-loss`
3. Start with exact/phrase med-cert terms only, with a hard daily cap.
4. Separately test tiny ED/hair-loss exact-match campaigns only if launch gates are satisfied.
5. Disable Search Partners unless local purchase CAC proves it is profitable.
6. Use no prescription medicine names in ads, landing-page metadata, schema, URLs, or paid hero copy.
7. Track gross and net revenue by campaign. Refund-adjusted ROAS is the metric, not Ads-reported soft conversions.

Exit criteria: every active campaign has local purchase CAC and refund-adjusted ROAS visible.

### Week 4: Organic And AOV Lift

1. Indexation sprint for `/medical-certificate`, `/prescriptions`, `/pricing`, and the strongest indexed support pages.
2. Add neutral internal links from already-indexed/ranking pages to the two money pages.
3. Execute the free AU citation plan:
   - Google Business Profile attempt with caution
   - Bing Places
   - core AU directories with exact NAP
4. Start reactive PR under company attribution:
   - InstantMed
   - InstantMed Clinical Team
   - no operator name
   - no individual doctor name
5. AOV experiments:
   - improve 2-day/3-day med-cert selection clarity
   - priority fee attach, with careful timing language
   - repeat Rx cross-sell to existing patients with generic medication-review language
6. Do not publish the Sick Day Report yet. The data asset gate failed at 101 paid requests and should wait until about 1,000+ paid requests.

Exit criteria: money pages are submitted/rechecked for indexation, and first AOV lift experiments are measured without compliance drift.

## 90-Day Plan

### Days 1-30: Profit Instrumentation And Leakage Repair

Primary metric: daily net revenue by service and acquisition source.

Ship:

- paid P&L dashboard
- recovery dashboard
- service-aware funnel milestones
- claim ledger
- current growth-readiness source of truth
- paid campaign caps

### Days 31-60: Profitable Acquisition Sprints

Primary metric: refund-adjusted CAC and ROAS by service.

Run:

- med-cert exact Search
- ED/hair tiny exact Search only if gates hold
- repeat Rx existing-patient cross-sell
- service-lander vs direct-request A/B test from homepage cards
- landing-page CTA/link-order cleanup

Kill:

- any campaign with CAC above first-order margin after enough clicks
- any network/device/keyword cluster with high spend and no local paid orders
- any service line where refund/support/queue metrics breach gates

### Days 61-90: Authority And Scale Preparation

Primary metric: organic clicks and indexed commercial pages.

Do:

- AU citations
- 2-3 reactive PR responses per week
- link outreach to HR/payroll/student/workplace evidence sites
- deepen only pages already earning impressions
- keep noindexed programmatic sets out of the index until they are genuinely useful

Prepare:

- Sick Day Report only once the sample clears de-identification and credibility thresholds
- second-doctor/support plan only if orders and queue metrics justify it
- higher-AOV service expansion only after launch gates are met

## Service Strategy

### Medical Certificates

Role: demand wedge.

Do:

- keep this as the simplest paid and organic acquisition path
- make price, refund, timing, and decline outcomes obvious before payment
- increase legitimate 2-day/3-day attach
- use priority fee carefully
- clean any "accepted by all employers", "98% accepted", or stale speed claims

Do not:

- rely on med certs alone for the `$1M` model
- buy broad traffic with CAC above single digits to low teens
- promise impossible review timing when queue state is not live-verified

### Repeat Prescriptions

Role: trust expansion and AOV lift.

Do:

- fix final-step analytics
- sell as "repeat medication review", not drug access
- cross-sell after med-cert trust where clinically appropriate
- keep identity/Parchment gates tight

Do not:

- scale cold paid scripts until tracking and fulfilment are proven
- use drug names in paid paths
- imply prescribing is automatic or no-call guaranteed

### ED And Hair Loss

Role: higher-AOV controlled experiments.

Do:

- keep as one-off form-first doctor assessments
- test small exact-match campaigns only
- emphasise privacy, doctor review, contraindication safety, and pharmacy choice
- stop if refund rate, doctor-contact rate, chargebacks, or queue P95 breach launch thresholds

Do not:

- use medication names or obvious substitutes
- promise outcomes
- promise no call
- build subscription operations in this phase

### Weight Loss, Women's Health, Subscriptions, Pharmacy

Role: not now.

These may be commercially attractive later, but they are not the fastest route out of current losses. They add monitoring, staffing, advertising, and clinical-governance load. The current docs explicitly gate them off.

## Acquisition Surface Recommendations

Use these for paid traffic:

- `/medical-certificate`
- `/prescriptions`
- `/erectile-dysfunction`
- `/hair-loss`

Avoid as paid destinations:

- `/request` generic hub
- homepage
- broad online-doctor pages
- guides/articles
- condition/symptom pages
- compare pages
- audience pages
- any page containing prescription-only medicine terms

The request hub is good product UI for self-selection. It is not a paid-traffic-grade landing page because it adds a choice step and generic proof instead of service-specific objection handling.

## Compliance And Claim Sweep

Priority checks before any paid ramp:

1. **Social proof.** `lib/social-proof/index.ts` includes interpolated patient count fallback, 44-minute response, 20-minute cert turnaround, 98% employer acceptance, 5.0 rating, and other outcome stats. Each needs live proof or should be softened.
2. **Refund copy.** `app/pricing/pricing-content.tsx` says "Full refund, no questions asked." In healthcare, "no questions asked" is unnecessary and can sound like clinical approval is not being taken seriously. Prefer "Full refund if the doctor declines your request."
3. **Consult checkout copy.** `components/request/steps/checkout-step.tsx` has stale partial-refund comment and weaker consult copy.
4. **Doctor identity.** `docs/BRAND.md` says no individual doctor name on marketing pages. `/our-doctors` copy repeatedly promotes named doctor/AHPRA details on documents and public trust messaging. That may be appropriate for issued documents, but the marketing-page rule needs reconciliation.
5. **Employer acceptance.** Avoid "accepted by all employers", "98% accepted", or logo-based implied endorsement unless substantiated and tightly caveated.
6. **Speed claims.** Avoid "20 minutes", "44 minutes", "under an hour", or similar paid-facing claims unless generated from current live data and scoped correctly.
7. **Prescribing language.** No "no call needed" for repeat Rx, ED, hair loss, women health, or weight loss.
8. **Medicine terms.** No prescription drug names/classes/substitutes in paid ads, paid landing pages, metadata, schema, URLs, mockups, or FAQ schema.
9. **Testimonials and reviews.** Do not use patient testimonials, review snippets, aggregate rating schema, or review counts on regulated-health advertising surfaces.
10. **Data PR.** Public data must be aggregate, de-identified, suppress small cells, and avoid broadcasting weak traction.

## External Policy Anchors Checked

- Medical Board of Australia, Telehealth consultations with patients: telehealth can include one-off care, but prescribing or providing healthcare without a real-time direct consultation where the doctor has never spoken with the patient is not good practice and not supported by the Board. Source: https://www.ahpra.gov.au/documents/default.aspx?chksum=7zFFTXILG9uVdu8aPuOC%2B5kdXLtl1NCmE9YxeHwlDcw%3D&dbid=AP&record=WD23%2F32933%5Bv2%5D
- Ahpra advertising guidance: regulated-health advertising must not be misleading, use testimonials, create unreasonable expectations, or encourage unnecessary use. Source: https://www.ahpra.gov.au/Resources/Advertising-hub/Advertising-guidelines-and-other-guidance/Advertising-guidelines.aspx
- TGA health-service advertising: service advertising must not directly or indirectly promote prescription-only medicines; services involving prescription-only medicines should focus on consultations, not medicine access. Source: https://www.tga.gov.au/resources/guidance/advertising-health-service
- Google Ads healthcare policy: telemedicine promotion in Australia requires certification, and ads targeting Australia cannot use prescription drug terms in ad or destination. Source: https://support.google.com/adspolicy/answer/176031?hl=en-AU
- Google personalized advertising policy: health is a sensitive-interest category; advertiser-curated audiences, Customer Match, data segments, audience expansion, and lookalikes are restricted. Source: https://support.google.com/adspolicy/answer/143465
- OAIC de-identification guidance: de-identification requires very low re-identification risk in context and more than removing direct identifiers. Source: https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/handling-personal-information/de-identification-and-the-privacy-act

## Competitor Price Snapshot

Prices change. This is a 2026-06-05 directional scan, not a durable pricing database.

| Provider | Observed Positioning / Price |
|---|---|
| Qoctor | medical certificates from `$14.99` |
| Doccy | medical certificate consults from `$12.90` |
| MIDOC | `$18` one-day, `$36` up to 7 days |
| InstantScripts | `$19` single-day certificate, `$49` multi-day, `$19` online prescriptions |
| hub.health | medical certificates `$24.95`, ED consult `$49` |
| Health Beacon | medical certificates from `$23.95` |
| Candor Medical | ED consultation `$19` |
| Clinic365 | ED consultation `$59`, follow-ups `$39` |

Takeaway: InstantMed is not obviously overpriced on med certs. The problem is not primarily price. The problem is paid CAC, trust proof, recovery, and service mix.

## What Not To Do

- Do not increase ad spend to "get more data" while local CAC/ROAS is not operator-visible.
- Do not optimize Ads against browser or soft conversions when local purchase truth is inconsistent.
- Do not launch subscriptions, pharmacy fulfilment, memberships, weight loss, or broad GP consults as a panic response.
- Do not publish the data asset at N~101.
- Do not create hundreds more articles while money pages are not indexed.
- Do not send paid traffic to guides, medicine content, condition pages, or generic `/request`.
- Do not use public testimonials, review snippets, aggregate review schema, or public review counts.
- Do not use prescription medicine names or obvious substitutes in paid paths.
- Do not solve CAC by pressuring clinical approval rates.
- Do not upgrade the stack or rebuild the design system as a business fix.

## Fastest Path To Profitability

The fastest path is:

1. **Stop loss-making paid spend.**
2. **Make daily CAC/ROAS/net revenue impossible to miss.**
3. **Recover abandoned warm leads.**
4. **Fix service-level analytics, especially repeat Rx.**
5. **Lift AOV through legitimate current-service levers.**
6. **Run tiny compliant paid experiments only after measurement is clean.**
7. **Win organic by indexation and AU authority, not content volume.**
8. **Keep expansion parked until the current one-off model proves profit.**

If InstantMed does those eight things, it has a plausible route out of current losses. If it simply buys more traffic or adds more service lines, it will likely keep losing money with a more complicated product.

