# Service Launch Checklists

> Production gates for launching, keeping healthy, or materially scaling paid traffic for repeat scripts, ED, hair loss, women's health, and weight management.
> The launched services are live as bounded pilots. Paid acquisition applies only to service lines with separate approval. Use this before any material ramp and whenever pilot health drifts.

**Last updated:** 2026-09-10

## Launch Rule

Medical certificates, repeat scripts, ED, hair loss, narrowly scoped women's health, and (from 2026-08-10) the weight-management assessment may remain live as bounded pilots to gather data (operator decisions 2026-07-12 and 2026-08-07). Paid budget applies only where separately approved; weight-management advertising remains unapproved. A standing pilot approval is not approval to scale.

Do not materially increase spend for a prescribing or specialty service until every must-pass item is current, evidence is captured, the service passes the economic rule in `docs/REVENUE_MODEL.md`, and the owner-operator approves the exact Ads mutation. If a gate fails, hold scaling and present the required pause, rollback, or remediation for approval. Clinical/service kill switches remain governed by the incident and safety runbooks.

**September 9 owner decision:** confirmed positive first-order cash contribution qualifies profitable scale under `docs/REVENUE_MODEL.md`. Numeric refund, contact-rate, queue-time, sample-size and score thresholds are advisory; they cannot veto profitable acquisition. Actual refunds and fees remain costs. Explicit clinical incidents, service holds, failed fulfilment, untrustworthy financial evidence and concrete compliance failures remain blocking. A slow review or a high contact rate alone is not such an incident.

## Shared Must-Pass Gates

| Gate | Requirement | Evidence |
|------|-------------|----------|
| Production prescribing | `PARCHMENT_API_URL` points to `https://api.parchmenthealth.io/external`; no sandbox Parchment env vars remain in Vercel preview or production. | `vercel env ls` shows Parchment vars only in Production; `/admin/ops/parchment` shows production ready. |
| Daily smoke | Production Parchment smoke validates token and organisation daily with no patient or script created. | `parchment-smoke` heartbeat is green in monitoring and visible in `/admin/ops/parchment`. |
| Feature flag | `parchment_embedded_prescribing` is enabled only after production smoke passes. | `/admin/features` flag state plus a successful Parchment ops gate. |
| Prescriber identity | Every active admin or doctor who can prescribe has a production `parchment_user_id`. | `/admin/ops/parchment` shows linked prescribers and zero unlinked prescribing-capable users. |
| Webhook | `prescription.created` webhook is registered against `https://instantmed.com.au/api/webhooks/parchment`. | A real or controlled production event lands in recent webhook evidence. |
| Analytics | Google Ads, PostHog, and Stripe attribution agree on paid starts, paid conversions, refunds, and service. | Admin analytics excludes test patients and campaign URL suffix is present. |
| Compliance | Copy, metadata, schema, FAQ, screenshots, and ad assets avoid prescription medicine names, treatment guarantees, testimonials, review counts, and no-call promises. | Checklist review linked to `docs/ADVERTISING_COMPLIANCE.md`. |
| Clinical fallback | Decline, refund, request-more-info, and message templates exist for common unsafe or unclear cases. | Doctor can complete a safe decline and refund recovery without developer intervention. |
| Pilot watch | Early and newly changed paid cohorts are watched manually from payment through patient notification. | Owner notes outcome, issue, turnaround, and contribution inputs for the bounded cohort. |

## Repeat Scripts

| Gate | Requirement | Failure mode prevented |
|------|-------------|------------------------|
| Intake safety | Current medication, dose, reason, last review, allergies, pregnancy status where relevant, and red flags are required before checkout. | Doctor receives an under-specified medication request and must chase basic information. |
| Medicine boundary | One medication per request, entered as plain free text. There is no PBS/AMT lookup or patient-facing autocomplete. No UI copy implies MIMS, prescribing advice, medicine selection, or eligibility. | Patient believes the website selected or recommended a drug. |
| Controlled-substance block | Schedule 8 and blocked medicines fail before payment or route to manual rejection with clear refund language. | Paid requests for unsafe or unsupported scripts accumulate. |
| Identity completeness | DOB, sex, Medicare details, phone, and structured address are complete before Parchment launch. | Parchment sync fails after the doctor has approved the case. |
| Parchment completion | Doctor can approve to `awaiting_script`, open Parchment, write the eScript, receive webhook, and trigger patient email. | Script exists in Parchment but InstantMed stays stuck. |
| Paid landing page | Ads target repeat prescription review intent only. No prescription drug names in ad copy, URL params, hero copy, metadata, or schema. | Google disapproval, TGA risk, or high-intent drug-seeker traffic. |
| Acquisition review | Prefer exact or phrase match for demonstrated service intent. Any broader-match test needs an exact owner-approved spend bound and truthful contribution measurement; sample size describes uncertainty. | Budget is spent learning on unsupported or vague intent. |

## ED

| Gate | Requirement | Failure mode prevented |
|------|-------------|------------------------|
| Clinical screen | Current duration and the single severity item are captured, persisted, and visible to the doctor with consolidated safety and medical-history context. Historical IIEF-5 answers remain renderable for in-flight and prior intakes. | Doctor loses the current structured context or an older intake becomes unreadable. |
| Nitrate block | Nitrate use and high-risk cardiac answers hard-block or require GP/in-person care before payment. | High-risk contraindicated request reaches routine prescribing. |
| Cardiac escalation | Chest pain, unstable cardiac history, recent cardiac event, and unclear exercise tolerance create a clear doctor escalation path. | Unsafe ED case is treated as low-risk convenience care. |
| Drug-name discipline | Paid ED pages and ads use assessment language only. No sildenafil, tadalafil, Viagra, Cialis, or equivalent terms in paid destinations. | TGA and Google policy breach. |
| Privacy UX | Intake reassures privacy without promising anonymity or guaranteed medicine. | Patients overtrust the flow or misunderstand clinical accountability. |
| Parchment path | Approved ED case can be prescribed inside Parchment and patient notification completes. | Higher-AOV service launches before fulfilment is stable. |
| Acquisition review | Use service-assessment intent. Review decline reasons and doctor-contact patterns weekly to improve eligibility copy and targeting; profitable scale follows the revenue model. | Acquisition attracts unsupported requests or conceals a worsening cost of acquisition. |

## Hair Loss

| Gate | Requirement | Failure mode prevented |
|------|-------------|------------------------|
| Eligibility screen | Age, sex at birth where clinically relevant, pregnancy or fertility considerations, pattern, duration, scalp symptoms, prior treatment, and contraindications are captured. | Doctor cannot distinguish routine hair loss from red flags. |
| Red flags | Sudden patchy loss, scalp inflammation, systemic symptoms, pregnancy concerns, and paediatric cases route to GP or in-person review. | Inappropriate asynchronous assessment. |
| No outcome claims | Pages and ads avoid guaranteed regrowth, before-after framing, testimonials, and prescription medicine names. | Compliance breach and unrealistic expectation setting. |
| Photo policy | If photos are used, the page states why, storage handling, and what happens if the doctor cannot assess safely. If photos are not required, the flow must not imply visual diagnosis. | Ambiguous diagnostic promise. |
| Parchment path | Approved case can be prescribed inside Parchment and patient notification completes. | Launch depends on manual workaround. |
| Acquisition review | Use hair-loss assessment intent, not medicine intent. Review unsuitable requests and their search terms weekly; charge refunds and fees against contribution. | Spend attracts medicine shoppers instead of review intent. |

## Women's Health

Scope is live but deliberately narrow: UTI symptoms and new/switch contraceptive pill only. Continuing the same pill routes to repeat scripts; morning-after, period-pain, and other women's-health requests stay gated.

| Gate | Requirement | Failure mode prevented |
|------|-------------|------------------------|
| Scope lock | `womens_health` remains active only through `LIVE_WOMENS_HEALTH_OPTIONS` (`uti`, `ocp_new`); `ocp_repeat` routes to repeat scripts; morning-after, period-pain, and "other" cannot reach checkout. | Broad "women's health clinic" demand enters an under-built pathway. |
| UTI safety | UTI red flags and pregnancy/possible-pregnancy are required before checkout and decline to in-person care when present. Missing `utiRedFlags` or `utiPregnant` returns `REQUEST_MORE_INFO`, not payment. | Red-flag UTI or pregnancy-risk cases are paid before being redirected. |
| New/switch pill safety | Pregnancy/possible-pregnancy blocks checkout; migraine with aura, clot history, and smoking risk create `REQUIRES_CALL` before any prescribing outcome. | Higher-risk contraception requests are treated as routine asynchronous repeats. |
| Doctor surface | The case summary shows women's-health option, key safety answers, and escalation rationale so the doctor can approve, call, or decline without reconstructing the screener. | Structured safety work is lost after payment. |
| Parchment path | Approved prescribing cases can be completed in Parchment and patient notification completes. | A live prescribing service depends on manual fulfilment. |
| Paid landing page | Ads and pages stay narrow: UTI assessment or contraception review only. No antibiotic guarantee, pill guarantee, broad women's-health positioning, prescription medicine names, or no-call promise. | AHPRA/TGA/Google risk and unsuitable patient intent increase. |
| Acquisition review | Report UTI and new/switch-pill outcomes separately. Report explicitly attributed repeat-pill handoffs separately where the marker exists; keep other cross-service orders visible. Use decline and contact patterns to repair targeting and copy. | Broad demand or unrecognised handoffs obscure service economics. |

## Weight Management (launched 2026-08-10)

Scope is deliberately narrow: a one-off, form-first, GLP-1-focused doctor assessment (operator decisions D-A..D-E, `docs/plans/2026-08-07-weight-loss-launch-plan.md`). Phentermine is excluded at launch; continuation is a new consult, never a subscription. **No paid advertising** — `docs/ADVERTISING_COMPLIANCE.md` requires its own approval for any weight campaign.

| Gate | Requirement | Failure mode prevented |
|------|-------------|------------------------|
| Eligibility floors | BMI DECLINE below 27, and below 30 without a weight-related comorbidity, enforced server-side from `lib/clinical/weight-loss-eligibility.ts` (single source shared with the intake hint and marketing copy). | Ineligible or cosmetic-intent patients pay and are refunded, or thresholds drift between copy and enforcement. |
| Absolute contraindications | Pregnancy/breastfeeding, MEN2/medullary thyroid cancer, and pancreatitis are required answers and DECLINE at checkout via the `weight-management` safety slug (`consult:weight_loss` in the checkout slugMap — the canonical slug, or every rule silently unfilters). | A contraindicated GLP-1 request takes payment. |
| Call-required histories | Eating-disorder and cardiac history soft-escalate (`requiresCall`) and the doctor surface plans `needs_call` — no asynchronous decision before phone contact. | Sensitive cases decided without the promised conversation. |
| Capability | Non-admin doctors need `can_review_weight_loss` (default FALSE) + Medical Director sign-off before reviewing this line. | An unverified doctor reviews weight cases. |
| Repeat-lane routing | Dual-indication GLP-1s ask the structured weight-vs-diabetes question; weight-only brands hard-route; phentermine/orlistat flag for decline-to-GP. Diabetic repeats are never walled out. | The $29.95 lane resumes serving unscreened weight requests, or diabetics lose access. |
| Kill switch | `disable_weight_loss` stops this line alone; `disable_consults` still stops every consult subtype. | The new line cannot be stopped without taking down ED/hair/WH. |
| Outcome review | Every prescribing request receives an individual doctor outcome. Review unsuitable requests, declines and doctor-call patterns to improve eligibility and copy. Any future paid proposal follows the revenue model and needs separate authorisation. | Unsupported demand is missed or an unapproved paid campaign starts. |

## Service-Specific Scorecard

This diagnostic scorecard helps prioritise repairs. Its aggregate score is advisory; assess concrete safety, fulfilment and compliance failures directly. It does not add a numeric graduation gate to the revenue model.

| Area | Weight |
|------|--------|
| Clinical safety and escalation | 25 |
| Parchment fulfilment | 20 |
| Advertising compliance | 20 |
| Conversion and attribution measurement | 15 |
| Support and refund readiness | 10 |
| Doctor capacity impact | 10 |

Record the affected area and evidence when a repair is needed. A profitable campaign can be proposed for an exact owner-approved scale change without waiting for a score threshold; a real failed must-pass requirement still needs repair.
