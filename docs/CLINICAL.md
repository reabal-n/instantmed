# CLINICAL.md -- InstantMed Clinical Rules & Compliance

> Canonical reference for clinical boundaries, prescribing rules, AI constraints, privacy, and data retention.
> Read this file when working on: clinical validation, intake flows, triage, prescriptions, AI features, consent, data handling.

---

## Platform Role

InstantMed is **not a broad online GP clinic** and **not a prescribing system**. It is a specialised-service intake, triage, and documentation platform that supports clinician decision-making. All prescribing decisions occur outside the platform.

**Current service scope (2026-04-28):**

- medical certificates
- repeat prescriptions
- hair loss
- erectile dysfunction
- women's health
- weight loss

General consults are a fallback pathway, not the primary business positioning.

**Audit narrative (must always remain true):**

- Patient self-identifies symptoms and history
- Platform assists intake and triage only
- No automated clinical decisions are made
- A clinician reviews every request
- Prescribing (if any) occurs entirely in Parchment (external)
- The clinician remains fully responsible for clinical outcomes

## Form-First Doctor Review Model

InstantMed's commercial moat is no booked appointment, no waiting room, and a secure form-first clinical intake. The moat is **not** "no doctor" and the product must not be framed that way.

**Approved patient-facing model:**

- Patient starts with a secure clinical form
- Doctor reviews the submitted information
- Doctor contacts the patient only if more information is clinically needed
- Prescription, certificate, decline, refund, or redirection happens only after doctor review or approved med-cert protocol automation

**Regulatory risk posture:** Medical Board telehealth guidance states that prescribing or providing healthcare for a patient without a real-time direct consultation, where the practitioner has never spoken with the patient, is not good practice and is not supported. If a doctor prescribes after an asynchronous form-first assessment, the doctor must be able to explain why that assessment and management were appropriate and necessary in the circumstances.

**Engineering implication:** prescription and specialty pathways must support call/message escalation, complete audit trails, and doctor rationale capture. They must not hard-promise "no call needed."

---

## Service Eligibility & Constraints

| Constraint | Rule |
|-----------|------|
| **Geography** | Australia only. Postcode-state validation via `lib/validation/australian-address.ts` |
| **Age** | 18+ minimum. Parental/guardian consent for minors (Terms section 2) |
| **Medicare** | Optional for med certs. Required for prescriptions and consultations |
| **Identity** | Name + DOB + address. No photo ID verification. Medicare Luhn check when provided |
| **Hours** | Requests submit 24/7 for every pathway. Rx/consult review timing is 8am–10pm AEST, 7 days. Target 1-2h review, 24h max. No guaranteed response time. Never hard-block checkout by time of day |
| **Med cert duration** | Hard cap 3 days. Constant: `MAX_MED_CERT_DURATION_DAYS` in `lib/clinical/intake-validation.ts`. Auto-approval flags `duration_too_long` for anything above. No override |
| **Med cert validity** | Certificates do not expire. Once issued, they remain authentic indefinitely. Only `revoked` status invalidates a cert; DB trigger from migration `20260428000001_lock_cert_status.sql` rejects any other transition |
| **Med cert use cases — refused at intake** | Exam deferral, special consideration, court / tribunal / summons / jury, family law / custody / AVO, fitness-for-driving / firearm / aviation, workers comp / NDIS / TAC / insurance claims. `checkHighStakesUseCase` in `lib/clinical/intake-validation.ts` blocks these at submission; `HIGH_STAKES_USE_CASE_KEYWORDS` in `lib/clinical/auto-approval.ts` is the auto-approval fallback if anything bypasses the intake guard |
| **Med cert language** | Conservative consultation-statement only. PDF body says "consulted me on X and reported / indicated [reason] consistent with a need to be absent from [duties]". No "medically unfit", no fitness-for-X, no exam-deferral support, no modality disclosure on the cert body. Locked in `lib/pdf/template-renderer.ts` |
| **Refund on decline** | Med certs + prescriptions: **full auto-refund**. Consults: **50% partial auto-refund** via `decline-intake.ts` `PARTIAL_REFUND_PERCENT` = 0.5 (acknowledges doctor review time while honoring money-back guarantee). Updated 2026-04-08 — unit tested in `lib/__tests__/decline-intake.test.ts`. |
| **Follow-up** | `flagged_for_followup` field exists. Decline triggers refund + redirection. No automated follow-up |

---

## Clinical Decision Boundaries

### Mandatory Outcomes

Every request must end in exactly one clinician-selected outcome. No defaults. No silent automation.

| Outcome | Definition | Constraints |
|---------|-----------|-------------|
| **Approved** | Clinician satisfied request is clinically appropriate | No synchronous contact required; any prescribing occurs externally |
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
| Hair loss | One-off form-first doctor assessment. No subscription or outcome guarantee. Avoid drug names in acquisition copy. |
| Erectile dysfunction | One-off form-first doctor assessment with strict contraindication screening. Cardiac history, nitrate/alpha-blocker use, uncertain medication history, or clinical discomfort requires contact or decline. |
| Women's health | Narrow, protocol-led service only. Complex symptoms, pregnancy risk, STI risk, pelvic pain, heavy bleeding, or safety concerns require contact or in-person redirection. |
| Weight loss | Manual review only in the solo-doctor phase. No automated approval. No ongoing monitoring promise unless operational capacity exists. |

Subscriptions, monthly prescribing, pharmacy fulfilment, and ongoing check-in programs are not part of the current operating model.

---

## AI Boundary Rules

**Core principle: AI assists with documentation only. All triage and decline decisions are rule-based.**

### What AI CAN Do

| Category | Permitted Actions |
|----------|------------------|
| **Documentation** | Generate clinical note drafts from intake answers; suggest certificate wording; pre-populate forms with structured data; summarize patient history for doctor review |
| **Formatting** | Structure free-text into clinical format; format medication names/dosages; generate PDF-ready content |
| **Quality** | Flag spelling/grammar issues; suggest completeness improvements; highlight missing fields |

### What AI MUST NEVER Do

| Category | Prohibited Actions |
|----------|-------------------|
| **Safety decisions** | Override safety knockout rules; approve requests failing eligibility; bypass emergency detection; modify triage outcomes |
| **Prescribing** | Recommend medications; suggest dosages; indicate PBS eligibility; imply prescribing authority |
| **Diagnosis** | Provide diagnostic conclusions; suggest conditions from symptoms; recommend treatment paths |

### "Never Automate" Decisions (Human-Only)

These must remain human-only regardless of future AI capabilities:

1. **Safety knockout overrides** -- life safety decisions cannot be delegated to AI
2. **Prescribing decisions** -- TGA/PBS require human prescriber
3. **Call requirement decisions** -- requires clinical judgment
4. **Decline reason determination** -- requires clinical reasoning
5. **Emergency escalation decisions** -- life safety (handled by deterministic rules)

**Exception -- doctor-owned med cert protocol automation:** Simple med cert requests (1-3 day, no red flags, all deterministic checks pass) can be auto-approved via `lib/clinical/auto-approval-pipeline.ts`. This is feature-flagged (`ai_auto_approve_enabled`), rate-limited, logged to `ai_audit_log`, and subject to doctor batch review. Only med certs. Prescriptions and consults always require human doctor review. See ARCHITECTURE.md -> Auto-Approval Pipeline.

### Architecture Enforcement

| Boundary | Rule |
|----------|------|
| **File separation** | `lib/clinical/` = deterministic safety logic (no AI); `lib/ai/` = documentation assistance only |
| **Output status** | All AI outputs marked `pending_review`; doctors must explicitly approve before use |
| **Audit logging** | Two tables: `ai_audit_log` (auto-approval pipeline, with `input_hash`/`output_hash` for content integrity) and `ai_chat_audit_log` (chat interactions, with `user_input_preview`/`ai_output_preview` truncated previews). Full chat transcripts stored in `ai_chat_transcripts` (JSONB). |
| **System prompts** | Must include: "You are a documentation assistant only. You DO NOT make clinical decisions. You DO NOT approve or deny requests. You DO NOT recommend treatments or medications. All output requires doctor review before use." |

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

## Medication Search Rules

### Purpose

Medication search exists solely to help patients recall and reference a medication name they already know. It is not a recommendation, prescribing, clinical decision, or eligibility tool.

### Data Source

PBS (Pharmaceutical Benefits Scheme) public API. Fields are reference metadata only: PBS code, drug name, strength, form, manufacturer. The dataset intentionally excludes dosing instructions, indications, contraindications, warnings, and therapeutic equivalence.

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
- Controlled substances blocked at the medication search level
- Messaging must use "controlled substance" (not "S8") for non-S8 controlled drugs

### Patient-Facing Rules

- Label: "Medication name (optional)"
- Helper text: "If you know the name, start typing to help us locate it."
- Results show: product name (primary), active ingredient (secondary, muted), dosage form (tertiary)
- No result may be highlighted as "recommended", "suitable", "eligible", or "approved"

### Forbidden Language

Never use: "Recommended", "Eligible", "Approved", "Correct medication", "Renewal guaranteed"

Allowed: "Reference only", "Helps with accuracy", "Doctor will review"

### Audit Position

"Patients may optionally self-identify a medication name using a public reference list. The system does not recommend, select, or approve medications. All prescribing decisions occur independently within the clinician's prescribing platform."

### Prescribing Boundary Evidence (compliance_audit_log)

Every script handoff to Parchment (the external eScript system) is evidenced in `compliance_audit_log` via the `external_prescribing_indicated` event type. This creates an audit trail that InstantMed itself did not prescribe — the medication was handed off to a separately-licensed prescribing system.

**Emission points:**

| Emission point | When fired | Event type |
|---|---|---|
| `app/doctor/queue/actions.ts` (`updateStatusAction`, `declineIntakeAction`) | Doctor approves/declines an intake | `triage_approved` or `triage_declined` |
| `app/doctor/queue/actions.ts` (`markScriptSentAction`) | Doctor completes a claimed paid prescribing intake after Parchment handoff | `external_prescribing_indicated` (reference = parchment ID or "parchment") |
| `app/api/doctor/scripts/[id]/route.ts` | Doctor transitions a script task to "sent" | `external_prescribing_indicated` (reference = "parchment") |
| `app/api/webhooks/parchment/route.ts` | Parchment confirms `prescription.created` and completes the linked intake | `external_prescribing_indicated` (reference = SCID) |

Previously these mutations only updated the `intakes` row and logged to the observability logger — an AHPRA defensibility gap. The decline path via `app/actions/decline-intake.ts` emits `triage_declined` via `logTriageDeclined()`; doctor mutation surfaces are now aligned around the canonical queue actions.

Every triage outcome and external prescribing handoff is now reconstructable from `compliance_audit_log` alone, per the core requirement: *"if an action affects clinical care or access to care, it must be reconstructable after the fact."*

---

## Consent Requirements

### Per-Episode Consent

- Explicit consent checkbox required at each intake submission (not implied by signup)
- Consent timestamp must be recorded in compliance audit log per intake
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
| Prescriptions | Additional: medication adherence attestation |
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
| AI data sharing | Clinical notes sent to Anthropic (Claude) with no patient identifiers; DPA in place |

### Australian Privacy Principles (APP 1-13) Summary

| APP | Principle | Status |
|-----|-----------|--------|
| 1 | Open and transparent management | Privacy policy published; collection notice at intake; complaint handling via complaints@instantmed.com.au |
| 2 | Anonymity/pseudonymity | N/A -- healthcare requires identification (documented justification) |
| 3 | Collection of solicited info | Only necessary data collected; consent obtained; lawful collection direct from patient |
| 4 | Unsolicited information | Support team procedures in place |
| 5 | Notification of collection | Purpose stated at intake; third parties identified in privacy policy; access rights explained |
| 6 | Use or disclosure | Clinical care only; marketing opt-in separate; subpoena process documented |
| 7 | Direct marketing | Unsubscribe mechanism; health data not used for marketing |
| 8 | Cross-border disclosure | Overseas recipients (US, EU) identified; DPAs with all processors |
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
| PostHog | Analytics (anonymized) | EU | Signed |
| Anthropic | Clinical notes (no identifiers) | US | DPA (data processing agreement) |

---

## Data Retention Schedule

| Data Category | Retention Period | Legal Basis |
|---------------|------------------|-------------|
| Patient medical records | 7 years minimum from last service (10 years for minors, from age 18) | Medical Board guidelines |
| Clinical intakes | 7 years from creation | Medical records obligation |
| Compliance audit logs | 7 years (immutable, append-only) | Compliance requirement |
| AI interaction logs | 7 years (truncated content, metadata only) | Clinical safety audit |
| Payment records | 7 years | Tax Act (ATO requirement) |
| Profile data | Indefinite while active; deleted 1 year after account closure | Service delivery |
| Session/auth tokens | 30 days (auto-purged by Supabase Auth) | Security best practice |
| Analytics events | 2 years (anonymized after 90 days) | Business analytics |
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
| **PBS** | PBS reference data | Advisory only; no prescribing authority implied |
| **Fair Work Ombudsman** | Notice and evidence rules | Employers can ask for evidence that would satisfy a reasonable person; do not overclaim universal acceptance |
| **Privacy Act 1988 (Cth)** | Australian Privacy Principles | Security, use/disclosure, access, correction |
| **My Health Records Act 2012** | Data handling | Health record obligations |
| **Health Records Act 2001 (Vic)** | State-level | Additional Victorian obligations where applicable |

---

## Complaint Handling

Canonical complaints policy lives at [`/complaints`](../app/complaints/page.tsx). Referenced from Terms §13 and the marketing footer.

| Stage | SLA | Owner |
|-------|-----|-------|
| Acknowledgement of complaint | Within 24 business hours | Medical Director |
| Service complaints (billing, refunds, response time) | Substantive response within 48 hours | Operations |
| Clinical complaints (decision, decline, Rx, cert) | Substantive response within 14 calendar days | Medical Director |
| Privacy complaints (APP 1-13) | Reviewed against Privacy Act 1988; escalation to OAIC | `complaints@instantmed.com.au` + `privacy@instantmed.com.au` |

**Escalation pathways** disclosed on `/complaints`: AHPRA notifications + 8 state/territory HCCC bodies (NSW HCCC, VIC HCC, QLD Office of the Health Ombudsman, WA HADSCO, SA HCSCC, TAS HCC, ACT HRC, NT HCSCC) + OAIC for privacy.

**Governance framing** (same language in Terms §5, `/clinical-governance`, `/complaints` §4): InstantMed currently operates with a single AHPRA-registered Australian GP as both treating practitioner and Medical Director. Frame this as an honest disclosure of scale, not a limitation. **Do NOT advertise** FRACGP fellowship, peer review across a cohort, or team training on marketing surfaces — these claims were stripped in the 2026-04-21 solo-director pass.
