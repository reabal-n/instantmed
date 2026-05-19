# Service Launch Checklists

> Production gates for advertising repeat scripts, ED, and hair loss.
> Use this before turning on any non-med-cert paid traffic.

**Last updated:** 2026-05-19

## Launch Rule

Do not turn on paid traffic for a prescribing or specialty service until every must-pass item for that service is complete, evidence is captured, and the owner-operator signs off. These gates are intentionally boring. They stop refund loops, compliance complaints, and clinical handoff failures before spend scales them.

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
| First-case watch | First 10 paid cases are watched manually from payment through patient notification. | Owner notes outcome, issue, and turnaround for each case. |

## Repeat Scripts

| Gate | Requirement | Failure mode prevented |
|------|-------------|------------------------|
| Intake safety | Current medication, dose, reason, last review, allergies, pregnancy status where relevant, and red flags are required before checkout. | Doctor receives an under-specified medication request and must chase basic information. |
| Medicine boundary | Patient search remains PBS/AMT recall only. No UI copy implies MIMS, prescribing advice, or medicine recommendation. | Patient believes the website selected or recommended a drug. |
| Controlled-substance block | Schedule 8 and blocked medicines fail before payment or route to manual rejection with clear refund language. | Paid requests for unsafe or unsupported scripts accumulate. |
| Identity completeness | DOB, sex, Medicare details, phone, and structured address are complete before Parchment launch. | Parchment sync fails after the doctor has approved the case. |
| Parchment completion | Doctor can approve to `awaiting_script`, open Parchment, write the eScript, receive webhook, and trigger patient email. | Script exists in Parchment but InstantMed stays stuck. |
| Paid landing page | Ads target repeat prescription review intent only. No prescription drug names in ad copy, URL params, hero copy, metadata, or schema. | Google disapproval, TGA risk, or high-intent drug-seeker traffic. |
| Launch threshold | Turn on only exact or phrase match high-intent search first. Broad match waits until at least 30 clean paid conversions. | Budget is spent learning on unsafe or vague intent. |

## ED

| Gate | Requirement | Failure mode prevented |
|------|-------------|------------------------|
| Clinical screen | IIEF-5 is captured, persisted, and visible to the doctor with contraindication context. | Doctor loses the structured severity signal. |
| Nitrate block | Nitrate use and high-risk cardiac answers hard-block or require GP/in-person care before payment. | High-risk contraindicated request reaches routine prescribing. |
| Cardiac escalation | Chest pain, unstable cardiac history, recent cardiac event, and unclear exercise tolerance create a clear doctor escalation path. | Unsafe ED case is treated as low-risk convenience care. |
| Drug-name discipline | Paid ED pages and ads use assessment language only. No sildenafil, tadalafil, Viagra, Cialis, or equivalent terms in paid destinations. | TGA and Google policy breach. |
| Privacy UX | Intake reassures privacy without promising anonymity or guaranteed medicine. | Patients overtrust the flow or misunderstand clinical accountability. |
| Parchment path | Approved ED case can be prescribed inside Parchment and patient notification completes. | Higher-AOV service launches before fulfilment is stable. |
| Launch threshold | Start with exact service intent terms. Pause if refund rate exceeds 10% or doctor-contact rate exceeds 35% in the first 30 cases. | Paid channel scales into high-friction clinical review. |

## Hair Loss

| Gate | Requirement | Failure mode prevented |
|------|-------------|------------------------|
| Eligibility screen | Age, sex at birth where clinically relevant, pregnancy or fertility considerations, pattern, duration, scalp symptoms, prior treatment, and contraindications are captured. | Doctor cannot distinguish routine hair loss from red flags. |
| Red flags | Sudden patchy loss, scalp inflammation, systemic symptoms, pregnancy concerns, and paediatric cases route to GP or in-person review. | Inappropriate asynchronous assessment. |
| No outcome claims | Pages and ads avoid guaranteed regrowth, before-after framing, testimonials, and prescription medicine names. | Compliance breach and unrealistic expectation setting. |
| Photo policy | If photos are used, the page states why, storage handling, and what happens if the doctor cannot assess safely. If photos are not required, the flow must not imply visual diagnosis. | Ambiguous diagnostic promise. |
| Parchment path | Approved case can be prescribed inside Parchment and patient notification completes. | Launch depends on manual workaround. |
| Launch threshold | Start with hair-loss assessment intent, not medicine intent. Pause if more than 20% of paid cases are clinically unsuitable in the first 30 cases. | Spend attracts medicine shoppers instead of review intent. |

## Service-Specific Scorecard

Each service must reach at least 90/100 before paid launch.

| Area | Weight |
|------|--------|
| Clinical safety and escalation | 25 |
| Parchment fulfilment | 20 |
| Advertising compliance | 20 |
| Conversion and attribution measurement | 15 |
| Support and refund readiness | 10 |
| Doctor capacity impact | 10 |

Block launch below 90. Between 90 and 94, run a capped pilot only. At 95 or above, launch with daily review for the first week.
