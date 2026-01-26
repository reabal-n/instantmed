# InstantMed – Clinical Notes & AI Intake Capability Audit

**Generated**: January 2026  
**Scope**: Codebase audit for AI clinical notes, AI chat intake, and pipeline integration

---

## 1. AI Clinical Notes / EMR

### Status: **Exists and wired** (for med cert drafts)

The system has AI-generated clinical note drafts specifically for medical certificate requests. These are **not** full EMR clinical notes but rather structured drafts to assist doctor review.

### DB Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `document_drafts` | Stores AI-generated drafts (`clinical_note`, `med_cert` types) | ✅ Exists, wired |
| `ai_audit_log` | Immutable audit trail for AI draft generation/approval | ✅ Exists, wired |
| `patient_notes` | Longitudinal patient encounter notes (doctor-authored) | ✅ Exists, but NOT AI-generated |
| `intakes.doctor_notes` | Single-field doctor notes per intake | ✅ Exists, manual entry only |

### Server Actions

| File | Function | Purpose |
|------|----------|---------|
| `@/app/actions/generate-drafts.ts` | `generateDraftsForIntake()` | Generates clinical note + med cert drafts via GPT-4o-mini |
| `@/app/actions/draft-approval.ts` | `approveDraft()`, `rejectDraft()`, `regenerateDrafts()` | Doctor approval/rejection workflow |
| `@/app/doctor/queue/actions.ts` | `saveDoctorNotesAction()` | Save manual doctor notes to `intakes.doctor_notes` |

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/ai/review-summary/route.ts` | Generates 2-3 line clinical summary for doctor queue view |
| `/api/doctor/drafts/[intakeId]/route.ts` | Fetch AI drafts for an intake |

### Components

| Component | Purpose |
|-----------|---------|
| `@/components/doctor/draft-review-panel.tsx` | Doctor UI to review/approve/reject/edit AI drafts |
| `@/components/doctor/clinical-summary.tsx` | Renders structured clinical summary in doctor view |

### AI Prompts

| Location | Prompt Purpose |
|----------|----------------|
| `@/app/actions/generate-drafts.ts` | `CLINICAL_NOTE_JSON_PROMPT` - Generates structured clinical note JSON |
| `@/app/actions/generate-drafts.ts` | `MED_CERT_JSON_PROMPT` - Generates med cert draft JSON |
| `@/lib/ai/prompts/` | Contains `REVIEW_SUMMARY_PROMPT` for doctor queue summaries |

### Current Scope Limitation

- **AI clinical notes are only generated for `med_certs` service type**
- Repeat prescriptions and consults do **not** trigger AI draft generation
- Doctor notes (`intakes.doctor_notes`) are **manual only** - no AI drafting

---

## 2. AI Chat Intake

### Status: **Exists and wired**

### Implementation Location

| File | Purpose |
|------|---------|
| `@/app/api/ai/chat-intake/route.ts` | Main chat intake API endpoint (streaming) |
| `@/lib/chat/chat-validation.ts` | Server-side validation of AI-collected data |
| `@/lib/chat/audit-trail.ts` | Audit logging for all AI chat interactions |
| `@/lib/chat/form-prefill.ts` | Maps chat data to form fields for transition |
| `@/lib/chat/intake-analytics.ts` | Analytics tracking for chat intake |
| `@/lib/ai/prompt-safety.ts` | Prompt injection detection and sanitization |

### Questions Asked

The AI chat collects structured data based on service type:

**Medical Certificate**:
- purpose (work/education/carer)
- startDate, durationDays
- primarySymptoms, symptomOnset, symptomSeverity
- carerName, carerRelationship (if carer type)

**Repeat Prescription**:
- medicationName, medicationStrength
- treatmentDuration, conditionControl
- lastReviewDate, sideEffects
- recentChanges, takingAsDirected

**New Prescription**:
- conditionCategory, conditionDescription
- conditionDuration, triedBefore
- allergies, currentMedications, preferredMedication

**GP Consult**:
- concernSummary, concernCategory
- urgency, consultType
- symptomList, symptomSeverity

### Response Storage

| Storage Method | Data Type | Status |
|----------------|-----------|--------|
| Structured JSON in `intake_data` block | Normalized intake fields | ✅ Wired |
| `ai_chat_audit_log` table | Truncated input/output for compliance | ✅ Wired |
| `ai_safety_blocks` table | Emergency/crisis block events | ✅ Wired |
| `ai_intake_completions` table | Successful completion records | ✅ Wired |

### Output Normalization

- **YES** - Chat output is normalized via `@/lib/chat/chat-validation.ts`
- `validateIntakePayload()` sanitizes and normalizes all collected fields
- `@/lib/chat/form-prefill.ts` maps chat data to form structures
- **Full transcript is NOT stored** - only truncated previews for audit

### Chat as Intake Path vs Assistant

- **Chat is an ALTERNATE INTAKE PATH** - fully functional for collecting intake data
- Outputs structured `intake_data` JSON that can be submitted
- If validation fails, chat can redirect to traditional form (`requiresFormTransition: true`)
- Chat is NOT a general assistant - it has strict role boundaries

### Failure Handling

| Scenario | Behavior |
|----------|----------|
| Emergency keywords detected | Hard-block, return static emergency response |
| Crisis keywords detected | Hard-block, return crisis support resources |
| Controlled substance request | Block intake, explain cannot prescribe online |
| Prompt injection detected | Generic rejection, re-prompt user |
| Validation errors | Set `requiresFormTransition: true`, redirect to form |
| AI API failure | Return 500 with fallback error message |

---

## 3. Intake → Approval → Outcome Pipeline

### Flow Diagram

```
Patient submits intake
        ↓
[intakes] table created (status: draft → pending_payment → paid)
        ↓
Stripe webhook confirms payment
        ↓
generateDraftsForIntake() called [only for med_certs]
        ↓
[document_drafts] table: clinical_note + med_cert drafts created
        ↓
Doctor reviews in /doctor/intakes/[id]
        ↓
Doctor sees AI drafts in DraftReviewPanel (collapsed by default)
        ↓
Doctor approves/rejects draft via draft-approval.ts
        ↓
For med_certs: Doctor goes to /doctor/intakes/[id]/document
        ↓
approveAndSendCert() generates PDF, stores in Supabase Storage
        ↓
atomicApproveCertificate() creates [issued_certificates] record
        ↓
Email sent to patient with download link
        ↓
[intakes] status → approved → completed
```

### Injection Points for AI Notes

| Point | Location | How to Inject |
|-------|----------|---------------|
| **Draft generation** | `generateDraftsForIntake()` | Already generates `clinical_note` type draft |
| **Doctor review** | `intake-detail-client.tsx` | AI drafts shown in `DraftReviewPanel` |
| **Pre-approval** | `approveDraft()` | Doctor can edit content before approving |
| **Certificate generation** | `approveAndSendCert()` | Could include approved notes in PDF |

### AI Output Save Points

| Table | What's Saved | When |
|-------|--------------|------|
| `document_drafts.content` | AI-generated draft JSON | Post-payment webhook |
| `document_drafts.edited_content` | Doctor's edited version | On approval with edits |
| `ai_audit_log` | Generation/approval events | All AI actions |
| `intakes.doctor_notes` | Manual doctor notes | Before approval (required) |

### Doctor Confirmation Enforcement

| Check | Location | Enforcement |
|-------|----------|-------------|
| Min clinical notes length (20 chars) | `intake-detail-client.tsx` | Blocks approval if not met |
| Red flag acknowledgment | `intake-detail-client.tsx` | Checkbox required before approval |
| Draft staleness check | `draft-review-panel.tsx` | Warning if answers changed since draft |
| Approval vs rejection tracking | `document_drafts` | `approved_by`, `approved_at`, `rejected_by`, `rejected_at` columns |

---

## 4. Storage & Audit

### Intake Data Storage

| Location | Contents | Retention |
|----------|----------|-----------|
| `intakes` table | Core case record, status, timestamps | Permanent |
| `intake_answers` table | Patient answers as JSONB | Permanent |
| `intake_drafts` table | In-progress flow state (pre-submission) | 90 days (abandoned cleanup) |

### Generated Certificates Storage

| Location | Contents | Status |
|----------|----------|--------|
| `issued_certificates` table | Immutable certificate record with snapshots | ✅ Wired |
| Supabase Storage (`documents` bucket) | PDF files at `med-certs/{patient_id}/{cert_number}.pdf` | ✅ Wired |
| `certificate_audit_log` table | Certificate lifecycle events | ✅ Wired |

### Audit Logs

| Table | Purpose | Status |
|-------|---------|--------|
| `ai_audit_log` | AI draft generation/approval/rejection | ✅ Wired |
| `ai_chat_audit_log` | AI chat interactions (TGA compliance) | ✅ Wired |
| `ai_safety_blocks` | Emergency/crisis blocks | ✅ Wired |
| `safety_audit_log` | Safety rule evaluations | ✅ Wired |
| `certificate_audit_log` | Certificate issuance/download/verification | ✅ Wired |
| `email_delivery_log` | Email send attempts and retries | ✅ Wired |

### Suitable Places to Attach AI Notes

| Attachment Point | Table | Column/Method |
|------------------|-------|---------------|
| **Draft AI notes** | `document_drafts` | Already exists - `content` JSONB for `clinical_note` type |
| **Confirmed notes** | `document_drafts.edited_content` | Doctor's edited version stored here |
| **Final notes on intake** | `intakes.doctor_notes` | Currently manual, could be pre-filled from approved draft |
| **Longitudinal notes** | `patient_notes` | Per-patient notes, could link to AI sources |

---

## 5. Gaps

### Missing for AI Clinical Note Drafts

| Gap | Description | Effort |
|-----|-------------|--------|
| **Service type expansion** | AI drafts only generated for `med_certs`, not `repeat_rx` or `consults` | Medium |
| **Draft → doctor_notes sync** | Approved AI draft content not automatically copied to `intakes.doctor_notes` | Low |
| **New Rx clinical notes** | No clinical note generation for new prescription intakes | Medium |
| **Consult notes template** | No AI templating for GP consult documentation | Medium |

### Missing for Doctor Editing/Confirmation

| Gap | Description | Effort |
|-----|-------------|--------|
| **Rich text editor** | Current edit UI is raw JSON textarea, not clinical-friendly | Medium |
| **Version diff view** | No visual comparison between original draft and edits | Medium |
| **Mandatory review step** | Doctor can skip AI drafts entirely (collapsed by default) | Low - design decision |
| **Multi-draft workflow** | If both clinical_note and med_cert drafts exist, approval is independent | Low |

### Missing for Medico-Legal Auditability

| Gap | Description | Effort |
|-----|-------------|--------|
| **Full transcript storage** | Chat audit only stores truncated previews (200/500 chars) | Low - expand limits |
| **Doctor view time tracking** | Partial - uses `sendBeacon` on unload but may not capture all | Low |
| **Note amendment trail** | If `doctor_notes` is edited post-approval, no diff history | Medium |
| **Signature binding** | AI note draft not cryptographically bound to final certificate | Medium |
| **Retention policy** | No explicit 7-year retention enforcement for clinical records | Medium |

### Missing Infrastructure

| Gap | Description | Effort |
|-----|-------------|--------|
| **AI notes for all service types** | Only med_certs trigger draft generation | Medium |
| **Clinical note schema** | Current clinical_note schema is minimal (presentingComplaint, historyOfPresentIllness, relevantInformation, certificateDetails, flags) | Medium |
| **SNOMED/ICD coding** | No structured diagnosis coding in AI output | High |
| **External EMR export** | No FHIR/HL7 export capability | High |

---

## Summary

| Capability | Status | Notes |
|------------|--------|-------|
| AI Clinical Notes (med_cert) | ✅ Exists, wired | `document_drafts` with approval workflow |
| AI Clinical Notes (other services) | ❌ Does not exist | Only med_certs trigger generation |
| AI Chat Intake | ✅ Exists, wired | Full alternate intake path with validation |
| Chat → Normalized Data | ✅ Exists, wired | Via chat-validation.ts |
| Chat Transcript Storage | ⚠️ Partial | Only truncated previews stored |
| Doctor Approval Workflow | ✅ Exists, wired | Approve/reject/edit/regenerate |
| Audit Trail | ✅ Exists, wired | Multiple audit tables for compliance |
| Draft → Final Notes Sync | ❌ Does not exist | Manual only |
| Rich Note Editing UI | ❌ Does not exist | Raw JSON textarea |
| Version/Edit History | ⚠️ Partial | `edited_content` stored but no diff view |

---

## Recommendations for Implementation

### Phase 1: Foundation (Low effort)
1. Sync approved AI draft to `intakes.doctor_notes` automatically
2. Expand audit trail character limits for full transcript storage
3. Add service type filter to generate drafts for repeat_rx

### Phase 2: UX (Medium effort)
1. Replace JSON editor with structured form fields for clinical notes
2. Add visual diff between AI draft and doctor edits
3. Force draft review expansion for high-risk cases

### Phase 3: Compliance (Medium-High effort)
1. Add amendment tracking to `doctor_notes` (immutable append-only)
2. Implement 7-year retention policy with archival
3. Add cryptographic binding between AI draft and final certificate

### Phase 4: Integration (High effort)
1. FHIR/HL7 export for EMR integration
2. SNOMED/ICD-10 coding in AI output
3. External EMR push capability
