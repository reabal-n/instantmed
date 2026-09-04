# CLINICAL.md -- InstantMed Clinical Rules & Compliance

> Canonical reference for clinical boundaries, prescribing rules, AI constraints, privacy, and data retention.
> Read this file when working on: clinical validation, intake flows, triage, prescriptions, AI features, consent, data handling.

---

## Platform Role

InstantMed is **not a broad online GP clinic** and **not a prescribing system**. It is a specialised-service intake, triage, and documentation platform that supports clinician decision-making. All prescribing decisions occur outside the platform.

**Active service scope (2026-08-10):**

- medical certificates
- repeat prescriptions
- hair loss
- erectile dysfunction
- women's health (UTI + new/switch contraceptive pill only) — launched 2026-06-15
- weight management — launched 2026-08-10

**Women's health scope (live 2026-06-15):** narrow and protocol-led. Only
`uti` and `ocp_new` are live (`LIVE_WOMENS_HEALTH_OPTIONS` in
`lib/request/consult-subtypes.ts`); morning-after and period-pain stay gated,
and "continue my current pill" is routed to the repeat-script flow rather than
a parallel consult. Server-enforced safety: UTI red flags and pregnancy or
possible pregnancy decline to in-person care. Possible pregnancy, migraine with aura, blood-clot history, and smoking block checkout before payment. Patients are
redirected to a GP or sexual health clinic without creating a paid intake. The
pathway does not promise doctor contact or recommend a replacement treatment.
See `lib/safety/rules.ts` and `validateSafetyFieldsPresent` in
`lib/safety/evaluate.ts`.

**Weight-management scope (live 2026-08-10):** narrow, one-off, and
doctor-reviewed. Every request uses the dedicated structured eligibility and
safety screen; it is never auto-approved. The doctor may request more
information or call before deciding. The service does not promise a
prescription, ongoing monitoring, or a subscription. Paid advertising remains
separately unapproved and is governed by `docs/ADVERTISING_COMPLIANCE.md` and
the exact approval workflow in `docs/OPERATIONS.md`.

**Retired/gated future scope:** general consult was retired on 2026-05-20
because it served as a back-channel for gated services with no structured
screener. Unlaunched consult subtypes remain blocked until their own launch
readiness is explicitly changed.

General Consult is retired publicly; the consult service type remains only as the parent category for active ED, hair-loss, narrow women's-health, and weight-management pathways.

**Audit narrative (must always remain true):**

- Patient self-identifies symptoms and history
- Platform supports intake, deterministic triage, and AI-assisted documentation drafting
- Prescribing decisions are always clinician-made; there is no protocol-based prescribing
- Standard one-to-three-day work, study, and carer certificates may issue under the Medical Director-approved clinical protocol
- Concerning or uncertain certificate requests, and every prescription request, require individual doctor review before issue
- AI does not prescribe; it cannot widen the deterministic protocol or override a safety route
- Prescribing (if any) occurs entirely in Parchment (external)
- The Medical Director owns the certificate protocol; the treating doctor remains accountable for individual review and prescribing decisions

**Canonical public clinical-model claim:** "AI never prescribes. Standard medical-certificate requests may be issued under a clinical protocol approved by the Medical Director. Anything concerning or uncertain, and every prescription request, requires review by an AHPRA-registered doctor before issue." Public surfaces must read this from `clinical_decision_model` in `lib/marketing/approved-claims.ts`, which also owns its risk classification, allowed contexts, and evidence receipts.

## Form-First Clinical Review Model

InstantMed's commercial moat is no booked appointment, no waiting room, and a secure form-first clinical intake. The moat is **not** "no doctor" and the product must not be framed that way.

**Approved patient-facing model:**

- Patient starts with a secure clinical form
- Deterministic safety redirects can stop an unsuitable pathway before payment, without doctor review or intake creation
- AI never prescribes and cannot override a deterministic safety route
- Clean one-to-three-day work, study, and carer certificate requests may issue under the active Medical Director-approved protocol
- Concerning or uncertain certificate requests, and every prescribing or specialty request, require a doctor-selected outcome before fulfilment
- A doctor may call or message when a key detail or synchronous assessment is clinically needed

**Regulatory risk posture:** Medical Board telehealth guidance states that prescribing or providing healthcare for a patient without a real-time direct consultation, where the practitioner has never spoken with the patient, is not good practice and is not supported. If a doctor prescribes after an asynchronous form-first assessment, the doctor must be able to explain why that assessment and management were appropriate and necessary in the circumstances.

**Engineering implication:** prescription and specialty pathways must support call/message escalation, complete audit trails, and doctor rationale capture. They must not hard-promise "no call needed."

---

## Service Eligibility & Constraints

| Constraint | Rule |
|-----------|------|
| **Geography** | Australia only. Postcode-state validation via `lib/validation/australian-address.ts` |
| **Age** | Strictly 18+ for every paid service. Minors are not accepted, including with parental/guardian consent. Direct an under-18 patient to a GP with a parent or guardian. Authenticated and guest checkout enforce the same boundary before payment. |
| **Medicare** | Optional for medical certificates. Prescribing pathways accept either a valid Medicare number plus IRN or a valid IHI |
| **Prescribing Identity** | Date of birth, sex, phone, structured Australian address, and either a valid Medicare number plus IRN or a valid IHI. No photo ID verification. This is an existing identity rule, not an added intake requirement |
| **Hours** | The service operates 24/7. Canonical public copy: "Requests can be submitted and reviewed 24/7. Review timing varies with clinical complexity, follow-up questions, and queue volume." Active clinical queues run 7 days with variable timing. Public copy never states a review-hours window or a guaranteed response time. Internal target 1-2h review, 24h max. Never hard-block checkout by time of day |
| **Med cert duration** | Hard cap 3 days. Constant: `MAX_MED_CERT_DURATION_DAYS` in `lib/clinical/intake-validation.ts`. The active protocol evaluator also flags `duration_too_long` for anything above. No override |
| **Med cert start date** | Start date can be today, past-dated within the backdate cap, or up to 14 days in the future for planned absence/recovery requests. Shared policy lives in `lib/medical-certificates/date-policy.ts` (`CERTIFICATE_MAX_FORWARD_DAYS_DEFAULT`) and is enforced across checkout validation, approval, in-place reissue/date correction, the staff preview action, and the DB constraint from `supabase/migrations/20260524090000_allow_forward_dated_med_certs.sql`. |
| **Med cert validity** | Certificates do not expire. Once issued, they remain authentic indefinitely. Only `revoked` status invalidates a cert; DB trigger from migration `20260428000001_lock_cert_status.sql` rejects any other transition. The retired expiry cron must not exist in Vercel cron config, heartbeat monitoring, routes, or tests. |
| **Med cert use cases — refused at intake** | Exam deferral, special consideration, court / tribunal / summons / jury, family law / custody / AVO, fitness-for-driving / firearm / aviation, workers comp / NDIS / TAC / insurance claims. `checkHighStakesUseCase` in `lib/clinical/intake-validation.ts` blocks these at submission; `HIGH_STAKES_USE_CASE_KEYWORDS` in `lib/clinical/auto-approval.ts` is the auto-approval fallback if anything bypasses the intake guard |
| **Med cert language** | Conservative but doctor-owned consultation statement only. PDF body has two locked paragraphs: (1) certification — "I certify that [patient] consulted me on X. Based on my assessment, they were unable to attend [work/study] duties" or, for carer's leave, "required to provide care and support to an immediate family or household member who was unwell"; (2) closing — the absence-scope line and a warm support line as one paragraph: "This certificate relates to the absence date(s) stated above. Please get in touch with us if you have any questions." (no support email in the body — the footer carries the contact channel). No "medically unfit", no fitness-for-X, no exam-deferral support, no workplace-restriction/capacity-assessment disclaimer, no diagnosis, and no modality disclosure on the cert body. All sentences (`getBodyText`/`getReturnText`/`getSupportText`) are locked in `lib/pdf/template-renderer.ts` and pinned by `lib/__tests__/med-cert-medicolegal-scope.test.ts` |
| **Refund on decline** | Med certs + prescriptions + consults: **full auto-refund on decline** (`payment_status = refunded`). Source of truth is `REFUND_ON_DECLINE_CATEGORIES` in `app/actions/decline-refund.ts`. A prescription with durable `script_sent = true` evidence is already fulfilled and cannot enter the ordinary decline/refund path; it must be completed or reconciled. The canonical action enforces this before and atomically during the status write. The 50%-partial-on-consult rule was retired 2026-05-20 after operator feedback (commit `e5ecf2451`). The standalone `issueRefundAction` can still top up a `partially_refunded` intake to full by refunding only the remaining `amount_cents - refund_amount_cents` against the original Stripe payment intent. Unit tested in `lib/__tests__/decline-intake.test.ts`. |
| **Follow-up** | `flagged_for_followup` field exists. Decline triggers refund + redirection. No automated follow-up |

---

## Clinical Decision Boundaries

### Mandatory Outcomes

Every paid request must end in one accountable, clinician-selected outcome before fulfilment. There are no unlogged or default clinical outcomes.

| Outcome | Definition | Constraints |
|---------|-----------|-------------|
| **Approved** | Clinician selects approval after reviewing the request | No protocol-based prescribing; any prescribing decision is clinician-made and occurs externally |
| **Needs Call** | Unclear, escalating, conflicting, or incomplete presentation | No prescribing until call occurs; this is the default when clinician is unsure |
| **Declined** | Outside scope, unsafe, red-flag, or repeated misuse | Requires brief internal rationale; patient receives redirection advice |

### Async vs Sync Boundaries

**Never asynchronous (always require synchronous contact):**

- New diagnoses
- Symptom escalation
- Ambiguous or conflicting histories
- Any clinician discomfort
- Any red flag or safety uncertainty
- Any request where identity, medication history, contraindication screening, or patient understanding is incomplete

**May be asynchronous (clinician discretion):**

- Administrative documentation
- Repeat treatment requests with reported stability
- Low-risk, clearly defined presentations
- Protocol-supported specialist requests where the doctor records why form-first assessment was clinically adequate

**Rule: Efficiency never overrides safety. Speed is never a clinical justification.**

**Prescribing-specific rule:** If there has been no prior real-time consultation with the patient, asynchronous prescribing is a higher-risk exception. It requires complete intake answers, service-specific safety screening, no red flags, no contradictory history, and a documented doctor rationale for why no call was clinically needed.

### Deterministic Rules Engine

The platform may apply deterministic (non-AI) rules to assist triage:

- High-risk category forces "Needs Call"
- Escalation markers disable async completion
- All rules are logic-based, server-side, fully logged, and explainable
- Rules assist but never replace clinician judgment
- Checkout and retry-payment paths must reject missing safety-critical answers before payment. Missing-answer outcomes are `REQUEST_MORE_INFO`, not clinician declines.
- **Duplicate-profile safety:** every patient-scoped guard (repeat-within-7d, prior-approval trust) keys on `patient_id`, so a patient re-entering under a new email (fresh profile) reads as a first-time patient. `findDuplicatePatientProfile` (`lib/clinical/duplicate-patient-detection.ts`) matches on normalized name + exact DOB; a hit raises the `duplicate_patient_name_dob` attention flag, which routes the med cert to a doctor (deterministic `needs_doctor`) instead of auto-issuing a possible second cert. Attention signal only — it never declines or approves; the doctor sees the matched profile and decides. Fail-soft (a lookup error is treated as "no duplicate").

---

## Auto-Reject Rules

Requests are immediately declined (system-level) if they involve:

- Emergency or urgent symptoms (keyword-detected)
- Red-flag presentations (cardiovascular, neurological, respiratory, mental health, obstetric)
- Controlled or restricted substances (Schedule 8 hard block)
- First-time requests for high-risk treatments
- Requests clearly outside GP scope

**Outcome:** Declined + redirection advice to appropriate care (000/ED/GP).

### Emergency & Crisis Detection

- Emergency keywords trigger hard blocks via deterministic rules, not AI
- Free-text medical-certificate symptoms are mapped into canonical server-side safety rules before checkout; client warnings are not sufficient
- Crisis/self-harm keywords trigger hard blocks with crisis support resources
- Safety-related answers are excluded from AI context
- Red flags force deterministic outcomes, not suggestions

---

## Prescribing Workflow Boundary

### What the Platform CAN Do

- Collect patient-reported information
- Present intake data to clinicians
- Support triage decisions
- Record clinician outcomes
- Indicate that prescribing may occur externally
- Allow export or copy of information for external use

### What the Platform MUST NEVER Do

- Generate a prescription, prescription artefact, or dosage instructions
- Imply prescription approval
- Auto-populate, auto-initiate, auto-suggest, or auto-complete any prescribing workflow
- Create outputs that resemble a prescription

**All automation must stop before prescribing begins.**

### Copy & UX Boundary

User-facing language must:

- Reflect clinician-led assessment
- Avoid implying prescriptions are issued by the platform
- Avoid guarantees or outcomes related to prescribing

Prescribing is framed as: "a possible outcome of clinician review, occurring separately."

### Service-Specific Prescribing Risk

| Service | Current posture |
|---------|-----------------|
| Repeat prescriptions | One-off eScript review for existing, stable medication only. Call/message if stability, medication history, monitoring, contraindications, or usual-prescriber context is unclear. |
| Hair loss | One-off form-first doctor assessment. No subscription or outcome guarantee. Avoid drug names in acquisition copy. The existing reproductive exclusion is enforced by the visible intake terminal block and again by server safety before initial, recovered-guest, or retry payment; a missing or invalid persisted answer enters the recoverable `REQUEST_MORE_INFO` hold instead of being treated as safe or declined. |
| Erectile dysfunction | One-off form-first doctor assessment with strict contraindication screening. Cardiac history, nitrate/alpha-blocker use, uncertain medication history, or clinical discomfort requires contact or decline. |
| Women's health | Live for UTI + new/switch contraceptive pill only. Keep it narrow and protocol-led; pregnancy risk, UTI red flags, STI risk, pelvic pain, heavy bleeding, complex symptoms, or safety uncertainty require contact, decline, or in-person redirection. |
| Weight management | LIVE 2026-08-10. Doctor-reviewed only — never auto-approved. GLP-1-focused (phentermine excluded at launch, D-B). One-off review: continuation requires a new consult (D-E); no ongoing-monitoring promise. Eating-disorder or cardiac history requires a doctor call before any decision. `can_review_weight_loss` capability + Medical Director sign-off required for non-admin doctors. |

Subscriptions, monthly prescribing, pharmacy fulfilment, and ongoing check-in programs are not part of the current operating model.

Repeat-prescription intake is server-enforced as prior-prescription only. If the patient indicates the medicine has never been prescribed before, checkout must be blocked or routed to a consult/regular GP pathway; it must not be normalized into a repeat request. The patient must also explicitly confirm that both the dose and directions are unchanged since the last prescription. Missing confirmation fails closed, and any reported change routes the patient to their regular GP or specialist. New checkout submissions must never infer an unchanged regimen from an unanswered question. Pre-cutover unpaid rows may retry their existing payment flow with the historical canonical value, but that payment-recovery exception does not satisfy the prescribing gate: if paid without the raw patient attestation, decline with a full refund and ask the patient to submit a new repeat request. A failed automated refund remains visible in Ops and must be retried; it never re-opens prescribing. Already-recorded script evidence remains completable so historical prescribing is not stranded, but a saved reconciliation note is required before final approval.

### Dedicated-Service Routing Out Of Repeat Prescriptions

A medicine that belongs to a dedicated service must not be prescribed through the generic repeat lane just because the patient typed it there. Routing is tiered and server-enforced (`lib/clinical/medication-service-routing.ts`, blocked in `validateRepeatScriptPayload`):

- **PDE5 inhibitors and hair-loss medicines route to their own services and are refused at checkout.** The ED pathway owns the nitrate absolute-contraindication and cardiac screening; the generic repeat history step asks none of it, so allowing these through was a screening bypass as well as a pricing one.
- **A stated BPH/PAH indication keeps the repeat** (low-dose daily tadalafil for prostate symptoms; Revatio / sildenafil 20 mg for pulmonary hypertension) and raises a doctor flag instead. The context is patient-reported, so the reviewer is told rather than the request being waved through silently. Dose alone never exempts.
- **Continuing an existing contraceptive pill stays a repeat** by design and keeps an explicit patient escape.
- **RESOLVED 2026-08-07, production go-live 2026-08-10 — the weight-management service launched (D2 closed).** Weight-class medicines in the repeat lane now route through the dedicated detector: dual-indication GLP-1s ask the structured weight-vs-diabetes question (a `type_2_diabetes` selection keeps the repeat, always doctor-flagged); weight-only brands hard-route to the $89.95 assessment; phentermine/orlistat stay flag-only for a decline-to-GP (outside the GLP-1-focused launch scope, D-B). The interim flag-only posture and its disproved diabetes rationale are historical — see the launch plan for the record.

### Repeat Quantity & Supply Standard

Default: **original script + 2 repeats** (≈ 3 months for a daily medicine, from 28-30 day packs) across repeat prescriptions, hair loss, and ED. This is the standard the prescribing doctor follows in Parchment so supply is consistent and the reactivation reminder can be timed against it.

- **Doctor discretion is retained — this is a default, not a rule.** Prescribe fewer (or none) for a new or just-stabilised medicine, an unclear history, or where a repeat is clinically inappropriate. The doctor sets the actual repeats per patient; AHPRA/TGA require individualised prescribing, so the standard must never become a fixed promise or a clinical straitjacket.
- **ED:** the 2-repeat default applies even to on-demand medicines (e.g. sildenafil); the dispensed quantity is the doctor's call (a "months of supply" framing does not map to on-demand use).
- **Patient-facing copy is expectation-setting only** — the intake "what to expect" line (review step) says the doctor *usually* provides ~3 months / up to 2 repeats *if approved*. Never a guarantee, inducement, or subscription/monthly-prescribing implication.
- **Reactivation:** the one-off refill reminder fires at ~week 10-11 (`/api/cron/refill-reminders`), before a script + 2 repeats runs out. The repeats count, supply months, and reminder window share one source of truth: `lib/clinical/repeats-policy.ts`.

---

## AI Boundary Rules

**Core principle: AI assists with documentation and narrowly bounded administrative support only. All triage and decline decisions are rule-based.**

### What AI CAN Do

| Category | Permitted Actions |
|----------|------------------|
| **Documentation** | Generate clinical note drafts from intake answers; suggest certificate wording; pre-populate forms with structured data; summarize patient history for doctor review |
| **Administrative support** | Take one caller-confirmed patient message for Medical Director review; request a callback number only when the patient asks for a return call |
| **Formatting** | Structure free-text into clinical format; format medication names/dosages; generate PDF-ready content |
| **Quality** | Flag spelling/grammar issues; suggest completeness improvements; highlight missing fields |

### What AI MUST NEVER Do

| Category | Prohibited Actions |
|----------|-------------------|
| **Safety decisions** | Override safety knockout rules; approve requests failing eligibility; bypass emergency detection; modify triage outcomes |
| **Prescribing** | Recommend medications; suggest dosages; indicate PBS eligibility; imply prescribing authority |
| **Diagnosis** | Provide diagnostic conclusions; suggest conditions from symptoms; recommend treatment paths |
| **Patient record actions** | Change or promise to change a prescription, certificate, consultation outcome, document, charge, account, or clinical record |
| **Unauthenticated disclosure** | Disclose patient-specific status or information to an unauthenticated phone caller |

### AI Voice Administrative Support Boundary

The staged Lena service is an **administrative message-taking channel**, not a consultation, clinical intake, triage service, or substitute for a doctor call.

- Lena opens with the code-owned greeting `Hi, this is Lena from InstantMed support. How can I help?` and does not use a separate keypad or spoken disclosure preamble. The published privacy and collection notice must explain the automated processing before production activation.
- Lena only takes a message from the patient about themselves. She does not answer service questions, authenticate a patient, disclose patient-specific status, diagnose, assess clinical urgency, recommend treatment, approve an adjustment, change a record, or promise a refund, prescription, certificate, correction, outcome, callback time, or resolution.
- Emergency handling is one fixed instruction to hang up and call triple zero. Lena does not triage or decide whether the caller is safe.
- Lena listens to the issue, collects the patient's full name and date of birth when possible, asks at most two short clarifying questions, reads back one concise summary, and saves it only after caller confirmation.
- A callback number is requested and retained only when the patient explicitly wants a return call; caller ID is never silently used as the callback number.
- The application says `Thanks, I've sent your message securely to our Medical Director.` only after the encrypted database write succeeds. If persistence cannot be confirmed, Lena directs the caller to `instantmed.com.au/contact` and must not imply that a message was saved.
- InstantMed stores no raw audio or full call transcript. The confirmed name, date of birth, concise summary, and optional requested callback number are field-level encrypted. Operational alerts contain only category, received time, and an authenticated admin link.
- The Medical Director reviews the message and owns every clinical, prescribing, certificate, correction, complaint, payment, and return-call decision. Lena never converts a phone message into an outcome.
- Production activation remains blocked until the public collection/privacy notice, APP 5 and APP 8 assessment, Twilio/OpenAI processor agreements and retention settings are approved; the migration and admin-only inbox are live; and the adversarial, failure, preview, and controlled end-to-end call checks pass.

### Human Clinical Decisions and the Protocol Boundary

AI does not make clinical decisions. The following decisions require clinician judgment:

1. **Safety-rule overrides** -- a clinician must decide whether an exception is appropriate; AI cannot bypass a knockout
2. **Prescribing decisions** -- prescribing requires a human prescriber
3. **Call requirement decisions** -- the doctor decides when synchronous contact is clinically necessary
4. **Decline rationale** -- a clinician records the clinical reasoning for a paid-request decline

Deterministic safety rules may stop or redirect a clearly unsuitable pathway without AI or clinician inference. Medical-certificate protocol issuance is **active** under the reviewed code-owned gate in `lib/clinical/auto-approval-governance.ts`, recorded 2026-08-12 by the operator / Medical Director. It is limited to clean one-to-three-day work, study, and carer certificates after a minimum 15-minute delay, with ceilings of 3 approvals per five minutes and 10 per day. The database feature flag (`ai_auto_approve_enabled`) is an operational kill switch: it can narrow or stop issuance but cannot widen or authorise a different protocol. Prescriptions and specialty requests never use this pathway.

Risk remains gated **before** issuance, not after. Any concerning or uncertain request routes to a doctor before issue. This includes return-to-work or return-to-duties evidence, Centrelink or Services Australia documents, capacity or fitness evidence, exam deferral, driving or machinery fitness, court, workers compensation, NDIS or TAC requests, emergency or red-flag presentations, mental-health, injury, chronic-disease or pregnancy signals, under-18 or unusable DOB, duration above three days, overlapping dates, duplicate-profile attention, AI-draft `requiresReview`, any engine soft flag, or any other doctor-attention intake flag. These reasons short-circuit to `needs_doctor` via `DETERMINISTIC_FAILURE_PREFIXES` in `lib/clinical/auto-approval-state.ts`. Legacy or imported unsupported-purpose records also receive a durable `high_stakes_med_cert_request` attention flag.

There is **no post-approval attestation control relied upon for current issuance**. The former 24-hour batch/cohort review window was retired on 2026-08-04. The active protocol instead uses pre-issuance gates, durable audit records, rate limits, and an individual revocation path. The repo records the operator / Medical Director decision; it does not represent separate outside legal advice as completed.

Historical auto-issued certificates remain visible in the staff dashboard's daily approved list, labelled `auto_issued` so a protocol issuance is never presented as a clinician's own decision and never counted in a doctor's own review totals. Revocation remains the individual correction path.

The **AI-draft `requiresReview` signal blocks protocol issuance** (operator decision 2026-08-07; enforced in #442 on 2026-08-10): an uncertain clinical draft routes the request to `needs_doctor` deterministically, never the retry queue. The decision-time snapshot found 8 of 109 historical auto-approvals with this flag. One additional case issued on 2026-08-09 before #442 landed, making the complete bounded retrospective set 9 of 116 eligible auto-approvals in the fixed 90-day window ending at enforcement; all were from the draft lane and the keyword gates fired on none of them. #439 made the signal visible and durable but did not change eligibility. AI uncertainty can only narrow the automated lane; it cannot approve a request or widen the protocol.

Those nine cases remain a fixed human retrospective, not a revived post-approval attestation workflow. The admin-only lane at `/admin/ops/historical-auto-issued-review` exposes one case at a time to the Medical Director. A no-correction receipt is permitted only after the same actor opens the complete clinical record, and is bound to the exact current certificate storage version in the append-only compliance log. If correction is required, the existing typed revoke path invalidates the certificate and reopens the intake atomically. The system provides no bulk completion and never infers or records either outcome for the clinician.

The engine's remaining **soft flags** — co-symptom mental-health / injury / chronic keyword mentions — fired zero times in the same 90-day period. The active protocol treats every one as a pre-issuance manual-review route while persisting it on `intakes.risk_flags` as an `info` signal for the doctor through the normal `IntakeFlagsBadge` / `IntakeFlagsPanel` path. `merge_intake_risk_flags()` performs that persistence under a row lock, deduplicates by flag code, and preserves the highest severity so concurrent clinical signals cannot erase each other. Allowing a soft-flagged request to issue requires another reviewed code-policy change; the database cannot widen this boundary. **Revocation remains the standing correction path** for auto-issued certificates and is always individual, requires a recorded clinical reason, invalidates the certificate, and returns the intake to `in_review`. Both the revoke and the 30-second approval undo return the intake to `in_review` through a database-trigger-guarded reversal that requires the certificate to be revoked first (migration `20260711193000`). The `batch_reviewed_at` / `batch_reviewed_by` columns remain only as historical audit fields; nothing writes them now.

### Architecture Enforcement

| Boundary | Rule |
|----------|------|
| **File separation** | `lib/clinical/` = deterministic safety logic (no AI); `lib/ai/` = documentation assistance only |
| **Output status** | AI-generated content remains a draft and is never copied into the final clinical record without doctor review. The certificate protocol may read an AI `requiresReview` signal only to narrow the lane and route to a doctor; it cannot use draft prose to authorise issuance |
| **Audit logging** | `ai_audit_log` owns the auto-approval pipeline, while `ai_chat_audit_log` and `ai_chat_transcripts` own the separate chat-intake feature. Lena stores no raw audio or full transcript; `medical_director_voice_messages` stores only one encrypted, caller-confirmed message plus delivery and operator-workflow metadata. |
| **System prompts** | Documentation prompts must include the documentation-only/doctor-review boundary. The voice prompt must include the narrower administrative boundary, no unauthenticated patient disclosure, no record changes or promises, fixed triple-zero direction, caller confirmation before the write, and durable-write evidence before the success acknowledgement. |

### AI Input/Output Rules

- Patient input sanitized before AI processing; emergency keywords route to deterministic rules (not AI)
- Safety-related answers excluded from AI context; medication names are reference-only
- All outputs validated: ground truth check vs intake data, schema validation, prohibited phrase detection (no diagnostic language)
- AI-generated text must include "pending doctor review" framing
- Patient-facing AI chat must not be perceived as clinical guidance

### AI Chat Intake Boundaries

> Implementation details: ARCHITECTURE.md → AI Chat Intake

- Chat is an alternate intake path, not a general assistant (strict role boundaries)
- Emergency/crisis keywords trigger hard blocks with static responses
- Controlled substance requests blocked with explanation
- Prompt injection attempts detected and rejected; validation failures redirect to traditional form
- Full transcripts stored in `ai_chat_transcripts` (with size limits); truncated previews in `ai_chat_audit_log` for quick querying

### Doctor Confirmation Enforcement

- Minimum clinical notes length required before approval is enabled
- Red flag acknowledgment checkbox required before approval
- Draft staleness warning if intake answers changed since draft generation
- Approval/rejection tracked with `approved_by`, `approved_at`, `rejected_by`, `rejected_at`

---

## Medication Entry Rules

### Purpose

The medication step lets a patient type the name of a medicine they already take so the doctor knows what they are requesting. It is not a recommendation, prescribing, clinical decision, or eligibility tool. The former patient-facing PBS reference-search combobox was retired 2026-06-28 (#211); patients enter free text and the doctor confirms the exact medicine in Parchment/MIMS at prescribing time.

### Data Source

The patient entry has no lookup or autocomplete. The patient types the name themselves (`components/request/steps/medication-step.tsx`), and no patient medication text is sent to PBS, AMT, or another external reference service.

For the authenticated doctor handoff only, `lib/clinical/generic-medication-resolver.ts` first exact-matches patient wording against InstantMed's curated first-party `medications` table. Only the table's generic `name` and `brand_names` fields participate. If that lookup is unresolved, `lib/clinical/prior-medication-match.ts` may compare the entry with up to 20 non-cancelled prescriptions belonging to the same patient, but only after the doctor is verified as the current or prior reviewer of that intake (admins retain their full clinical role). A unique, narrowly bounded typo candidate must then exact-resolve through the curated table before it becomes copyable; this is not fuzzy search across the medication catalog. The panel labels the source and requires confirmation in Parchment. The narrow result is a clipboard action containing the verified generic medicine name alone; it never returns strength, form, dose, directions, PBS eligibility, substitution advice, or therapeutic equivalence. Unknown, ambiguous, unsafe-looking, unrelated, or unauthorised entries fail closed with no copy action. The reference cannot affect intake eligibility, safety routing, request status, prescribing, or the medicine selected in Parchment/MIMS.

### Allowed vs Prohibited Use

| Allowed | Prohibited |
|---------|-----------|
| Assist patient recall during intake | Suggest medications |
| Improve record accuracy | Imply appropriateness |
| Support clinician context | Auto-fill prescriptions |
| | Influence eligibility or triage |
| | Generate recommendations (human or AI) |

### Controlled Substance Blocking

- **Schedule 8: Hard block** -- no override possible (`lib/clinical/intake-validation.ts`)
- Controlled substances are blocked on typed medication text. Medication-name seams use `isControlledMedicationName()` so a bare `CBD` entry is caught; general prose uses `isControlledSubstance()` so a location such as `Sydney CBD` is not mistaken for cannabidiol.
- Messaging must use "controlled substance" (not "S8") for non-S8 controlled drugs
- **Defense in depth — three independent layers**, using the same shared controlled-term source with context-aware medication matching:
  1. **Medication step UI** — client-side block on the selected medication.
  2. **Checkout clinical validation** — `lib/stripe/checkout/clinical-validation.ts` and `lib/stripe/guest-checkout.ts` keep medication fields separate from `consult_details` while scanning, so bare `CBD` is hard-blocked only where it unambiguously names a medicine. Consult is not a back-channel around the block.
  3. **Safety rules engine** — the `rx_controlled_substance` rule (`lib/safety/rules.ts`) uses the `is_controlled` derivation (`lib/safety/evaluate.ts`) to DECLINE prescription requests naming a controlled substance. (Previously mis-typed as a `duration_days` derivation that always returned null, leaving the rule dead — fixed 2026-06-07.)

### Patient-Facing Rules

- Labels: "Medication name" and mandatory "Strength"; form remains optional. A reliably parsed inline strength such as "Sertraline 100mg" fulfils the strength requirement without duplicate entry.
- One repeat-prescription request covers one medication. Patients with multiple repeats submit separate requests so the dose, indication, and side-effect answers stay tied to the right medicine.
- Prescription recency uses three patient choices: "Within 12 months", "Over 12 months", or "Never". "Never" remains a terminal not-a-repeat branch; historical requests keep their older, more specific recency labels on patient and doctor summaries.
- Helper text: "Request one regular medicine at a time. Enter the name and the strength shown on the label — the doctor confirms the medicine before prescribing."
- The box is plain free text — no results list, no autocomplete, and nothing highlighted as "recommended", "suitable", "eligible", or "approved"
- Codeine-combination brands that remain eligible for human review can show a pre-payment likely-decline note. The acknowledgement is a fixed brand token persisted in the draft and revalidated at checkout; it never overrides the doctor's decision, and changing the matched brand invalidates it.
- Every active repeat request must state both how much the patient takes and how often. Keep this as one plain-language directions field rather than separate amount/unit/frequency controls. Concise answers such as "1 daily" are sufficient because the medicine and strength are collected separately; a frequency-only answer such as "Once daily", or "Same as before" without the actual current regimen, is not sufficient.
- The shared medical-history screen may offer one explicit "None of these apply" action. That action must persist a separate negative answer for every visible safety question, clear any dependent free text, and remain reversible. It must never be a default. Saved positive history may be prefilled only in flows that render this screen and with a visible prompt to check that it is still current; unanswered negatives remain unanswered until the patient acts. Saved allergy detail must not silently answer the combined allergy/medicine-reaction question, and saved current medicines must not be reclassified as "other medicines" in a renewal.
- Medication form remains optional. If it is omitted, preserve it as quiet review context; it must not create a red clinical-risk badge or elevate an otherwise routine request in the queue.
- Doctor copy controls may copy only a locally verified generic medicine name. They must never copy the patient-entered strength, form, dose, directions, or a whole prescribing-context paragraph.

### Forbidden Language

Never use: "Recommended", "Eligible", "Approved", "Correct medication", "Renewal guaranteed"

Allowed: "Reference only", "Helps with accuracy", "Doctor will review"

### Audit Position

"Patients self-identify a medication name, label strength, and current dose/frequency. A doctor-only, first-party curated reference may resolve an exact generic name for clipboard convenience; it does not recommend, select, approve, or prescribe medication. All prescribing decisions occur independently within the clinician's prescribing platform."

### Prescribing Boundary Evidence (compliance_audit_log)

Every script handoff to Parchment (the external eScript system) is evidenced in `compliance_audit_log` via the `external_prescribing_indicated` event type. This creates an audit trail that InstantMed itself did not prescribe — the medication was handed off to a separately-licensed prescribing system.

**Emission points:**

| Emission point | When fired | Event type |
|---|---|---|
| `app/doctor/queue/actions.ts` (`updateStatusAction`, `declineIntakeAction`) | Doctor approves/declines an intake | `triage_approved` or `triage_declined` |
| `app/doctor/queue/actions.ts` (`markScriptSentAction`) | Doctor records durable external fulfilment evidence after Parchment or another named channel; the request remains open for explicit completion | `external_prescribing_indicated` (reference = Parchment ID or named external channel) |
| `app/api/doctor/scripts/[id]/route.ts` | Doctor transitions a script task to "sent" | `external_prescribing_indicated` (reference = "parchment") |
| `app/api/webhooks/parchment/route.ts` | Parchment confirms `prescription.created`; the intake-linked path records durable `script_sent` evidence for separate doctor completion, while explicit patient-profile prescribing syncs an intake-less history row without manufacturing request fulfilment | `external_prescribing_indicated` (reference = SCID) on the intake-linked path; system audit only when no intake exists |

Previously these mutations only updated the `intakes` row and logged to the observability logger — an AHPRA defensibility gap. The decline path via `app/actions/decline-intake.ts` emits `triage_declined` via `logTriageDeclined()`; doctor mutation surfaces are now aligned around the canonical queue actions.

Recording fulfilment evidence and completing the request are deliberately separate. `approvePrescribedScriptAction` refuses completion until `script_sent === true`; it never manufactures fulfilment evidence. Every triage outcome and external prescribing handoff is reconstructable from `compliance_audit_log`, per the core requirement: *"if an action affects clinical care or access to care, it must be reconstructable after the fact."*

---

## Consent Requirements

### Per-Episode Consent

- Explicit consent checkbox required at each intake submission (not implied by signup)
- Consent timestamp must be recorded in compliance audit log per intake
- Any material answer or identity change invalidates the prior confirmation and timestamp, requiring the patient to confirm again before submission
- AHPRA expects documented informed consent for each episode of care

### Required Disclosures (Before Service)

Patients must be informed at intake of:

- Async telehealth nature: "Your request will be reviewed by a doctor without a live consultation unless the doctor determines a call is clinically necessary"
- Possibility of phone call and what happens if required
- Limitations of telehealth (some conditions require in-person care)
- Estimated review timeframe
- That AI is used for documentation only, not clinical decisions

### Consent Scope by Service

| Service | Required Consent Elements |
|---------|--------------------------|
| All services | Telehealth consent, terms acceptance, privacy collection notice |
| Repeat prescriptions | Additional: explicit confirmation that the requested dose and directions are unchanged |
| Consultations | Additional: limitations of async assessment |
| My Health Record | Explicit opt-in per ADHA requirements (if/when implemented) |

---

## Privacy & Data Handling

### Data Inventory

**Personal Information (PII):** Full name, email, phone, date of birth, address, Medicare number, Medicare IRN

**Health Information (PHI):** Symptoms, medical history, current medications, allergies, presenting condition

**Financial:** Stripe customer ID, payment status (full card details never stored -- handled by Stripe PCI-DSS)

### Security Controls

> Full implementation details: SECURITY.md → PHI Encryption, RLS, Audit Logging

| Control | Compliance Note |
|---------|----------------|
| Encryption | TLS 1.2+ in transit; AES-256-GCM field-level at rest (see SECURITY.md) |
| Access | RLS on all tables + role-based access via Supabase Auth (see SECURITY.md) |
| Government IDs | Medicare number used only for eligibility; never internal ID (UUID primary keys) |
| PHI in logs | Production logs sanitized; no PHI in error/debug logs |
| Telegram | Operational alerts only. Never include patient identity, medicine names, presenting complaints, symptoms, consultation subtype, intake answers, or clinical notes. |
| AI data sharing | Clinical notes sent to Anthropic (Claude) with no patient identifiers; DPA in place |
| Staged AI voice processing | Live call audio is streamed through Twilio and OpenAI Realtime only while the call is active. InstantMed stores no raw audio or full transcript. The published notice discloses the automated service and processors; production remains disabled until processor, retention, APP 5, APP 8, and public-disclosure gates are approved. |

### Australian Privacy Principles (APP 1-13) Summary

| APP | Principle | Status |
|-----|-----------|--------|
| 1 | Open and transparent management | Privacy policy published; collection notice at intake; complaint handling via complaints@instantmed.com.au |
| 2 | Anonymity/pseudonymity | N/A -- healthcare requires identification (documented justification) |
| 3 | Collection of solicited info | Only necessary data collected; consent obtained; lawful collection direct from patient |
| 4 | Unsolicited information | Support team procedures in place |
| 5 | Notification of collection | Purpose stated at intake; third parties identified in privacy policy; access rights explained. Lena cannot activate until the public collection notice and processor disclosure are current and approved; there is no separate DTMF consent gate. |
| 6 | Use or disclosure | Clinical care only; marketing opt-in separate; subpoena process documented |
| 7 | Direct marketing | Unsubscribe mechanism; health data not used for marketing |
| 8 | Cross-border disclosure | Overseas recipients (US, EU) identified; DPAs with active processors. The staged Twilio/OpenAI voice path remains disabled until its overseas-processing assessment and agreements are approved. |
| 9 | Government identifiers | Medicare number use limited to eligibility; not used as internal ID |
| 10 | Quality of personal info | Patient can update profile; Medicare validation |
| 11 | Security | TLS + AES-256-GCM + RLS + retention policy |
| 12 | Access to personal info | Request via complaints@instantmed.com.au; 30-day SLA; PDF/JSON export |
| 13 | Correction | Request via complaints@instantmed.com.au; clinical corrections require clinician review; audit trail maintained |

### Third-Party Data Processors

| Processor | Data Shared | Location | DPA |
|-----------|------------|----------|-----|
| Supabase | All database records | Sydney, AU | Signed |
| Stripe | Email, payment amount | US (PCI compliant) | Standard |
| Supabase Auth | Email, name | Sydney, AU | Signed |
| Resend | Email, patient name | US | Signed |
| Sentry | Error context (sanitized) | US | Signed |
| PostHog | Pseudonymous product events only; no direct identity, clinical answers, raw search terms, click identifiers, or production request IDs | US | Signed |
| Anthropic | Clinical notes (no identifiers) | US | DPA (data processing agreement) |
| Twilio | Live phone audio and call-routing metadata for the staged voice-message service | AU1 regional voice service; subprocessors may be overseas | **Activation blocked pending approval** |
| OpenAI Realtime | Live phone audio and transient model context for the staged voice-message service | Overseas processing | **Activation blocked pending approval and retention configuration** |

---

## Data Retention Schedule

| Data Category | Retention Period | Legal Basis |
|---------------|------------------|-------------|
| Patient medical records | 7 years minimum from last service (10 years for minors, from age 18) | Medical Board guidelines |
| Clinical intakes | 7 years from creation | Medical records obligation |
| Compliance audit logs | 7 years (immutable, append-only) | Compliance requirement |
| AI interaction logs | 7 years (truncated content, metadata only) | Clinical safety audit |
| Medical Director voice messages | Resolved queue payload deleted after 30 days unless the resulting clinical action must be recorded in the canonical patient record; no raw audio or full transcript | Administrative message handling and clinical continuity |
| Payment records | 7 years | Tax Act (ATO requirement) |
| Profile data | Indefinite while active; deleted 1 year after account closure | Service delivery |
| Session/auth tokens | 30 days (auto-purged by Supabase Auth) | Security best practice |
| Analytics events | Provider-controlled; 24-month production target must be enforced in PostHog before it is stated as a public maximum. Person profiles and replay are disabled in code. | Business analytics |
| Email logs | 2 years | Communication audit |
| Error/debug logs | 90 days (no PHI) | Operational needs |

### Soft Delete vs Hard Delete

- **Soft delete (default):** Records marked with `deleted_at` timestamp; retained for retention period; not visible in app queries; restorable
- **Hard delete:** Applied after retention period expires; permanent; logged in compliance audit; cannot be recovered

### Legal Holds

When litigation or investigation is anticipated: legal places hold on specific records; retention jobs skip held records; hold removed only by legal authorization.

### Data Subject Rights

| Right | Rules |
|-------|-------|
| **Access** | Patients can request all data held; provided within 30 days; export as PDF or JSON |
| **Correction** | Patients can request corrections; clinical data corrections require clinician review; audit trail maintained |
| **Deletion (limited)** | Account data: deletable on request. Clinical records: retained per medical records law. Audit logs: cannot be deleted (legal requirement). Financial records: retained per Tax Act |

### Compliance Verification

- **Quarterly:** Review retention job logs; verify no data beyond retention period; check third-party compliance
- **Annual:** Review retention periods against current law; update policy if legislation changes; staff training; external audit if required

---

## Regulatory References

| Authority | Reference | Relevance |
|-----------|-----------|-----------|
| **AHPRA / Medical Board** | Good Medical Practice 3.2 | Adequate assessment required before treatment/documentation |
| **AHPRA / Medical Board** | Telehealth consultations with patients | Informed consent, identity verification, appropriate record keeping, and defensible form-first care |
| **AHPRA / Medical Board** | Advertising regulated health services | No misleading claims, testimonials, unreasonable expectations, or encouragement of unnecessary use |
| **TGA** | Poisons Standard | S8 exclusions; no therapeutic claims in platform |
| **TGA** | Health service advertising guidance | Health-service ads must not directly or indirectly promote prescription-only medicines |
| **PBS** | PBS/private status (confirmed by the doctor in Parchment) | Advisory only; the platform implies no prescribing authority and no longer surfaces PBS reference data to patients (search retired 2026-06-28) |
| **Fair Work Ombudsman** | Notice and evidence rules | Employers can ask for evidence that would satisfy a reasonable person; do not overclaim universal acceptance |
| **Privacy Act 1988 (Cth)** | Australian Privacy Principles | Security, use/disclosure, access, correction |
| **My Health Records Act 2012** | Data handling | Health record obligations |
| **Health Records Act 2001 (Vic)** | State-level | Additional Victorian obligations where applicable |

---

## Complaint Handling

Canonical complaints policy lives at [`/complaints`](../app/complaints/page.tsx). Referenced from Terms §13 and the marketing footer.

Canonical public copy: "We acknowledge complaints within 24 hours. Clinical complaints target resolution within 14 days." Public surfaces must read this from `complaints_timing` in `lib/marketing/approved-claims.ts`. The clinical timeframe is a target, not a guaranteed outcome.

| Stage | SLA | Owner |
|-------|-----|-------|
| Acknowledgement of complaint | Within 24 hours | Medical Director |
| Service complaints (billing, refunds, response time) | Triaged according to scope and complexity; no fixed public resolution promise | Operations |
| Clinical complaints (decision, decline, Rx, cert) | Target resolution within 14 calendar days | Medical Director |
| Privacy complaints (APP 1-13) | Reviewed against Privacy Act 1988; escalation to OAIC | `complaints@instantmed.com.au` + `privacy@instantmed.com.au` |

**Escalation pathways** disclosed on `/complaints`: AHPRA notifications + 8 state/territory HCCC bodies (NSW HCCC, VIC HCC, QLD Office of the Health Ombudsman, WA HADSCO, SA HCSCC, TAS HCC, ACT HRC, NT HCSCC) + OAIC for privacy.

**Governance framing:** InstantMed supports multiple AHPRA-registered doctors with service-line capability flags. Public surfaces use "AHPRA-registered doctors" without disclosing doctor count or individual names. Use "AHPRA-registered Medical Director" only where the governance role is necessary. Do not advertise FRACGP fellowship, peer review across a cohort, team training, insurance coverage, or monitoring claims unless each claim has a current evidence receipt in `lib/marketing/approved-claims.ts`.
