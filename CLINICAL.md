# CLINICAL.md -- InstantMed Clinical Rules & Compliance

> Canonical reference for clinical boundaries, prescribing rules, AI constraints, privacy, and data retention.
> Read this file when working on: clinical validation, intake flows, triage, prescriptions, AI features, consent, data handling.

---

## Platform Role

InstantMed is **not a prescribing system**. It is an intake, triage, and documentation platform that supports clinician decision-making. All prescribing decisions occur outside the platform.

**Audit narrative (must always remain true):**

- Patient self-identifies symptoms and history
- Platform assists intake and triage only
- No automated clinical decisions are made
- A clinician reviews every request
- Prescribing (if any) occurs entirely in Parchment (external)
- The clinician remains fully responsible for clinical outcomes

---

## Service Eligibility & Constraints

| Constraint | Rule |
|-----------|------|
| **Geography** | Australia only. Postcode-state validation via `lib/validation/australian-address.ts` |
| **Age** | 18+ minimum. Parental/guardian consent for minors (Terms section 2) |
| **Medicare** | Optional for med certs. Required for prescriptions and consultations |
| **Identity** | Name + DOB + address. No photo ID verification. Medicare Luhn check when provided |
| **Hours** | 8am–10pm AEST, 7 days. Target 1-2h review, 24h max. No guaranteed response time |
| **Med cert duration** | Max 3 days asynchronous. >3 days requires phone call — no override |
| **Refund on decline** | Med certs + prescriptions: auto-refund. Consults: not refunded |
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
- New long-term medications
- Symptom escalation
- Ambiguous or conflicting histories
- Any clinician discomfort

**May be asynchronous (clinician discretion):**

- Administrative documentation
- Repeat treatment requests with reported stability
- Low-risk, clearly defined presentations

**Rule: Efficiency never overrides safety. Speed is never a clinical justification.**

### Deterministic Rules Engine

The platform may apply deterministic (non-AI) rules to assist triage:

- High-risk category forces "Needs Call"
- Escalation markers disable async completion
- All rules are logic-based, server-side, fully logged, and explainable
- Rules assist but never replace clinician judgment

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

### Seven "Never Automate" Decisions (Human-Only)

These must remain human-only regardless of future AI capabilities:

1. **Approval of any clinical request** -- AHPRA requires human clinician responsibility
2. **Safety knockout overrides** -- life safety decisions cannot be delegated to AI
3. **Prescribing decisions** -- TGA/PBS require human prescriber
4. **Certificate duration determination** -- requires clinical judgment
5. **Call requirement decisions** -- requires clinical judgment
6. **Decline reason determination** -- requires clinical reasoning
7. **Emergency escalation decisions** -- life safety (handled by deterministic rules)

### Architecture Enforcement

| Boundary | Rule |
|----------|------|
| **File separation** | `lib/clinical/` = deterministic safety logic (no AI); `lib/ai/` = documentation assistance only |
| **Output status** | All AI outputs marked `pending_review`; doctors must explicitly approve before use |
| **Audit logging** | All AI content logged to `ai_audit_log` with action, actor_type, input_hash, output_hash |
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
- Full transcripts not stored; only truncated previews for audit compliance

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
| Access | RLS on all tables + role-based access via Clerk (see SECURITY.md) |
| Government IDs | Medicare number used only for eligibility; never internal ID (UUID primary keys) |
| PHI in logs | Production logs sanitized; no PHI in error/debug logs |
| AI data sharing | Clinical notes sent to OpenAI with no patient identifiers; BAA in place |

### Australian Privacy Principles (APP 1-13) Summary

| APP | Principle | Status |
|-----|-----------|--------|
| 1 | Open and transparent management | Privacy policy published; collection notice at intake; complaint handling via privacy@ |
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
| 12 | Access to personal info | Request via privacy@; 30-day SLA; PDF/JSON export |
| 13 | Correction | Request via privacy@; clinical corrections require clinician review; audit trail maintained |

### Third-Party Data Processors

| Processor | Data Shared | Location | DPA |
|-----------|------------|----------|-----|
| Supabase | All database records | Sydney, AU | Signed |
| Stripe | Email, payment amount | US (PCI compliant) | Standard |
| Clerk | Email, name | US | Standard |
| Resend | Email, patient name | US | Signed |
| Sentry | Error context (sanitized) | US | Signed |
| PostHog | Analytics (anonymized) | EU | Signed |
| OpenAI | Clinical notes (no identifiers) | US | DPA ("appropriate data protection agreements") |

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
| Session/auth tokens | 30 days (auto-purged by Clerk) | Security best practice |
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
| **AHPRA** | Telehealth Guidelines | Informed consent, identity verification, appropriate record keeping |
| **AHPRA** | Advertising Guidelines | No guarantees of outcomes |
| **TGA** | Poisons Standard | S8 exclusions; no therapeutic claims in platform |
| **TGA** | Therapeutic Goods Act | No therapeutic claims permitted |
| **PBS** | PBS reference data | Advisory only; no prescribing authority implied |
| **Fair Work Act** | Section 107 | Medical certificate must state employee is unfit for work |
| **Fair Work Act** | Regulation 3.01 | Certificate requirements |
| **Privacy Act 1988 (Cth)** | Australian Privacy Principles | Security, use/disclosure, access, correction |
| **My Health Records Act 2012** | Data handling | Health record obligations |
| **Health Records Act 2001 (Vic)** | State-level | Additional Victorian obligations where applicable |
