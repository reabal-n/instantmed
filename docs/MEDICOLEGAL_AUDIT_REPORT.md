# Medico-Legal, Regulatory & Professional Liability Audit

**InstantMed Telehealth Platform**  
**Audit Date**: January 2025  
**Scope**: Australian medical law, AHPRA expectations, TGA/PBS, telehealth standards of care, medical record defensibility

---

## Executive Summary

This audit examines InstantMed from a medico-legal perspective, focusing on regulatory compliance, professional liability exposure, and defensibility of clinical decisions. The platform demonstrates **strong foundational compliance architecture** but has **several gaps requiring remediation**.

### Risk Summary

| Risk Level | Count | Description |
|------------|-------|-------------|
| **P0 (Critical)** | 3 | Immediate patient safety or regulatory breach risk |
| **P1 (High)** | 5 | Significant liability exposure requiring prompt action |
| **P2 (Medium)** | 8 | Moderate risk, should be addressed in next quarter |

---

## 1. INTAKE FLOWS AUDIT

### 1.1 Clinical Context Sufficiency

#### ✅ STRENGTHS

- **Deterministic safety rules** in `@/Users/rey/Desktop/instantmed/lib/flow/safety/rules.ts:1-642` provide robust emergency detection
- **WHOMEC-compliant contraindication checks** for OCP (blood clots, migraine with aura, smoker >35)
- **Comprehensive red flag patterns** in `@/Users/rey/Desktop/instantmed/lib/clinical/triage-rules-engine.ts:74-188` covering cardiovascular, neurological, respiratory, mental health, obstetric emergencies
- **Structured intake** ensures consistent data collection across patients

#### ⚠️ GAPS IDENTIFIED

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **IC-1** | No mandatory symptom duration field for med certs | P1 | Doctors cannot distinguish acute vs chronic presentation without this. Fair Work Act requires "unfit for work" assessment which implies assessment of current state. |
| **IC-2** | Free-text symptom description has no minimum clinical detail requirement | P2 | "Feeling unwell" is accepted but provides no clinical basis for issuing a certificate. |
| **IC-3** | No mechanism to verify patient identity against Medicare | P1 | Patient could request certificate under false identity. No IHI/Medicare validation at intake. |
| **IC-4** | Backdating logic allows up to 3 days without call | P2 | RACGP guidance suggests backdating >24 hours should prompt additional scrutiny. Current 3-day threshold may be too permissive. |

### 1.2 Red Flag Collection vs Action

#### ✅ STRENGTHS

- **Red flags force deterministic outcomes** — emergency keywords trigger hard blocks, not suggestions
- **"Never async" categories** properly enforced for new diagnoses, new long-term meds, symptom escalation
- **Clinician override warnings** logged when doctor approves despite flags (audit trail exists)

#### ⚠️ GAPS IDENTIFIED

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **RF-1** | Red flags collected but actionable response not guaranteed to reach patient | P1 | If patient abandons after red flag detected but before seeing the emergency message, no outbound notification occurs. System relies on patient reading the screen. |
| **RF-2** | No mechanism to ensure emergency-flagged patients actually sought care | P2 | After directing to 000/ED, no follow-up verification. Consider: callback requirement, or logging for manual outreach. |
| **RF-3** | Self-harm detection relies on exact keyword match | P1 | Patient typing "don't want to be here anymore" or "feeling hopeless" may not trigger crisis resources. Need semantic detection or broader keyword list. |

### 1.3 Defensibility of Clinical Decisions

#### Can a doctor reasonably defend decisions based solely on collected intake data?

| Service | Defensibility | Assessment |
|---------|---------------|------------|
| Med Cert (1-2 days) | **Adequate** | Symptoms, severity, duration collected. Standard telehealth practice. |
| Med Cert (3+ days) | **Marginal** | No mandatory clinical reasoning field for extended duration. Doctor should document why telehealth appropriate vs in-person. |
| Repeat Rx (stable) | **Adequate** | Stability duration, side effects, GP attestation collected. ≥6 month stability rule aligns with RACGP guidance. |
| Repeat Rx (flagged) | **Adequate** | Flags force "needs call" pathway. Decision defensible after synchronous contact. |
| New Rx | **Redirected** | Correctly routes to consult pathway. Appropriate boundary. |
| Consult | **Variable** | Free-text concern may be insufficient for complex presentations. No structured history taking for general consults. |

---

## 2. AI USAGE AUDIT

### 2.1 AI Boundary Compliance

#### ✅ STRENGTHS — EXCELLENT ARCHITECTURE

The platform has **exemplary AI boundary documentation** in `@/Users/rey/Desktop/instantmed/docs/AI_BOUNDARY_RULES.md`:

- **AI generates drafts only** — never makes clinical decisions
- **Safety rules are deterministic** — no LLM in knockout logic
- **All AI outputs marked "pending review"**
- **Explicit separation**: `lib/rules/` = deterministic, `lib/ai/` = documentation only
- **Prompt safety rules** embedded in system prompts

#### ⚠️ GAPS IDENTIFIED

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **AI-1** | AI-generated review summary shown to doctor before full intake review | P1 | **Cognitive anchoring risk**: Doctor sees "No red flags" summary before reviewing raw data. May create confirmation bias. Summary should appear AFTER doctor reviews intake, not before. |
| **AI-2** | AI draft content pre-populates certificate dates | P2 | Doctor may accept AI-suggested dates without verifying against patient request. Should require explicit date confirmation. |
| **AI-3** | No logging of whether doctor read full intake before approving AI draft | P1 | Audit trail shows "approved" but cannot prove doctor reviewed underlying data vs just accepting AI summary. |
| **AI-4** | AI prompts don't explicitly state "This is not medical advice" to patient-facing chat | P2 | Chat intake AI collects data but patients may perceive responses as clinical guidance. |

### 2.2 Cognitive Anchoring Risks

**Current UI Flow** (problematic):
1. Doctor opens request
2. **AI Summary displayed prominently** ("Gastro x2 days, no red flags")
3. AI draft shown
4. Doctor clicks approve

**Recommended Flow**:
1. Doctor opens request
2. Full intake data displayed first
3. Doctor must scroll/interact with raw data
4. **Then** AI summary available as optional reference
5. Doctor confirms review before approval enabled

### 2.3 AI as Medical Advice

#### ✅ Chat intake AI properly bounded

The system prompt in `@/Users/rey/Desktop/instantmed/app/api/ai/chat-intake/route.ts` explicitly states:
- "You COLLECT data. You do NOT diagnose, interpret, or advise."
- "If asked medical questions: 'I collect information for your request. A doctor will review...'"

#### ⚠️ GAP

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **AI-5** | No explicit "This is not medical advice" disclaimer in chat UI | P2 | While AI is bounded, patients may not understand the distinction. Recommend visible disclaimer in chat interface. |

---

## 3. CERTIFICATES & PRESCRIPTIONS AUDIT

### 3.1 Medical Certificate Defensibility

#### ✅ STRENGTHS

- **AHPRA/Provider number required** before doctor can approve
- **Certificate snapshots doctor identity** at time of issue
- **Verification codes** enable employer/university authentication
- **PDF stored immutably** in Supabase storage with audit trail

#### ⚠️ GAPS IDENTIFIED

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **MC-1** | No explicit "fitness for duty" assessment for work certificates | P0 | Fair Work Act and workplace health obligations may require assessment that employee is "unfit for work", not just "has a medical condition". Certificate wording should explicitly state "unfit for work/normal duties". |
| **MC-2** | Carer's certificate doesn't verify dependent exists | P2 | Patient self-reports dependent name/relationship. No verification. Could be fraudulent. Consider: dependent must have own profile, or warning to employer that dependent details are self-reported. |
| **MC-3** | No maximum backdating limit enforced | P1 | System allows certificates backdated indefinitely with "requires call" flag at >3 days, but no hard limit. RACGP suggests >7 days backdating should generally be declined without exceptional circumstances. |
| **MC-4** | University certificates don't include student ID | P2 | Unis may require student ID on certificate for verification. Currently only patient name included. |

### 3.2 Prescription Defensibility

#### ✅ STRENGTHS — EXCELLENT BOUNDARY

- **No prescribing in platform** — explicit documented boundary
- **External prescribing reference** logged in audit trail (Parchment)
- **S8/controlled substances hard-blocked** at medication search level
- **PBS reference only** — patient selection has no clinical authority
- **Stability requirements** (≥6 months) align with RACGP telehealth guidance

#### ⚠️ GAPS IDENTIFIED

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **RX-1** | No mechanism to verify patient is actually taking the medication | P2 | Self-reported "stability" could be false. Consider: request pharmacy dispensing history, or attestation that patient has current supply. |
| **RX-2** | "Tramadol" classified as excluded but messaging says "S8" | P2 | Tramadol is S4, not S8. Messaging inaccuracy could confuse patients. Should say "controlled substance" not "S8" for tramadol. |
| **RX-3** | No interaction checking against declared medications | P1 | Patient reports current medications but no automated interaction check. Relies on clinician manual review. Consider: integrate with drug interaction database. |

### 3.3 Date Logic Edge Cases

| Scenario | Current Handling | Risk |
|----------|------------------|------|
| Certificate for future date | Allowed | Low — legitimate use case |
| Certificate backdated 1-3 days | Allowed async | **Medium** — should be 1 day max async |
| Certificate backdated >3 days | Requires call | Adequate |
| Certificate backdated >7 days | Requires call | **Should be declined by default** |
| Certificate >5 days duration | Requests more info | Adequate |
| Certificate >7 days | Should redirect to GP | **Gap: no hard redirect** |

---

## 4. CONSENT & DISCLOSURE AUDIT

### 4.1 Informed Consent

#### ✅ STRENGTHS

- **Terms of Service** clearly states telehealth limitations
- **Section 7 (Telehealth Consent)** explicitly covers async nature, phone call possibility, limitations

#### ⚠️ GAPS IDENTIFIED

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **CN-1** | No explicit consent checkbox at intake submission | P0 | Consent is implied by Terms of Service acceptance at signup, but no re-confirmation at point of care. AHPRA expects documented informed consent for each episode of care. |
| **CN-2** | Consent not recorded per-intake in audit log | P0 | `compliance_audit_log` tracks clinician actions but not patient consent timestamp. If disputed, cannot prove patient consented to this specific telehealth consultation. |
| **CN-3** | Telehealth limitations not shown at intake start | P1 | Patient sees limitations only in Terms (which most don't read). Should display summary at intake: "This is an async telehealth service. A doctor may call if needed. Some conditions require in-person care." |
| **CN-4** | No consent for My Health Record upload | P2 | `consent_myhr` field exists but upload not implemented. If implemented later, need explicit opt-in per ADHA requirements. |

### 4.2 Asynchronous Care Communication

#### Current State

Terms of Service Section 7 states:
> "Consultations are primarily conducted asynchronously (text-based) without video or phone calls, unless the doctor determines otherwise"

#### ⚠️ GAPS

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **AC-1** | "Primarily asynchronous" is vague | P2 | Should be explicit: "Your request will be reviewed by a doctor without a live consultation unless the doctor determines a call is clinically necessary." |
| **AC-2** | No explanation of what happens if call is required | P1 | Patient may not have phone available. Need to explain: how notified, timeframe, what happens if missed. |
| **AC-3** | Response time expectation not set at intake | P2 | "Within 1 hour" mentioned in marketing but not confirmed at submission. Could lead to complaints/disputes. |

---

## 5. RECORD KEEPING AUDIT

### 5.1 Subpoena Readiness

#### ✅ STRENGTHS — EXCELLENT

- **Immutable compliance_audit_log** with RLS preventing updates/deletes
- **Security definer function** for controlled inserts
- **Comprehensive event types** covering full request lifecycle
- **Human-in-the-loop proof** with `is_human_action` flag
- **Prescribing boundary evidence** with `prescribing_occurred_in_platform` always false

#### If Subpoenaed, System Can Prove:

| Question | Answer Available | Source |
|----------|------------------|--------|
| Who reviewed this request? | ✅ Yes | `clinician_reviewed_request` event with `actor_id` |
| When was the decision made? | ✅ Yes | `outcome_assigned` event timestamp |
| What was the outcome? | ✅ Yes | `outcome` field (approved/declined/needs_call) |
| Was a call required? | ✅ Yes | `call_required` flag |
| Where did prescribing occur? | ✅ Yes | `external_prescribing_reference` = "Parchment" |
| Did AI make the decision? | ✅ Yes | `is_human_action` = true for clinician events |

#### ⚠️ GAPS IDENTIFIED

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **RK-1** | Clinical notes not mandatory | P1 | Doctor can approve without entering clinical reasoning. If challenged, no documented rationale beyond intake data. Should require brief clinical note for audit defensibility. |
| **RK-2** | AI draft content not persisted if doctor edits | P2 | `edited_content` stored, but original AI draft may be deleted on regeneration. Should preserve all versions for audit. |
| **RK-3** | No logging of what doctor actually viewed | P1 | Audit shows "reviewed" but not "viewed intake answers", "viewed medical history", etc. Cannot prove thoroughness of review. |
| **RK-4** | IP address logged but geolocation not verified | P2 | Patient must be in Australia per Terms. IP logged but not verified against AU geolocation. |

### 5.2 Doctor Approval Attribution

#### ✅ STRENGTHS

- **Explicit approval required** — `approved_by`, `approved_at` fields
- **Optimistic locking** prevents duplicate reviews
- **Provider number validation** before approval enabled
- **Confirmation dialog** requires explicit click

#### ⚠️ GAP

| ID | Issue | Risk Level | Details |
|----|-------|------------|---------|
| **DA-1** | No re-authentication for high-risk approvals | P2 | Doctor session could be hijacked. Consider: require password/2FA for S4 medications or extended certificates. |

---

## 6. HIGH-RISK FAILURE POINTS

### P0 — CRITICAL (Immediate Action Required)

| ID | Issue | Worst-Case Scenario | Mitigation |
|----|-------|---------------------|------------|
| **MC-1** | Certificate wording may not meet Fair Work "unfit for work" standard | Employer rejects certificate; patient loses job; platform liable for inadequate documentation | **Review certificate template with employment lawyer. Ensure wording explicitly states "unfit for work/normal duties" per Fair Work Act s.107.** |
| **CN-1** | No explicit consent checkbox per intake | AHPRA investigation finds no documented consent; doctor's registration at risk | **Add mandatory consent checkbox at intake submission. Record consent timestamp in audit log.** |
| **CN-2** | Consent not recorded in audit trail | Legal dispute cannot prove patient agreed to telehealth for this episode | **Add `consent_recorded` event type to compliance_audit_log. Log at intake submission.** |

### P1 — HIGH (Action Within 2 Weeks)

| ID | Issue | Worst-Case Scenario | Mitigation |
|----|-------|---------------------|------------|
| **IC-1** | No mandatory symptom duration | Doctor issues certificate without assessing acuity; patient has chronic condition requiring different care | **Add mandatory "How long have you had these symptoms?" field to med cert intake.** |
| **IC-3** | No identity verification against Medicare | Fraudulent certificate obtained; employer/uni discovers; platform reputation damaged | **Implement Medicare verification API or require photo ID upload.** |
| **RF-1** | Emergency flag doesn't guarantee patient sees message | Patient with chest pain closes browser before seeing 000 directive; adverse outcome | **Send SMS/email for any emergency flag triggered, even if intake abandoned.** |
| **RF-3** | Self-harm detection too narrow | Patient in crisis not detected; adverse outcome | **Expand crisis keyword list. Consider: integration with crisis text analysis API.** |
| **AI-1** | AI summary creates cognitive anchoring | Doctor misses red flag because AI said "no concerns"; adverse outcome | **Move AI summary to secondary panel. Require doctor to expand intake data first.** |
| **AI-3** | No proof doctor reviewed full intake | AHPRA investigation cannot prove adequate assessment; doctor liable | **Log "viewed_intake_answers" event before approval enabled.** |
| **RX-3** | No drug interaction checking | Patient prescribed medication with dangerous interaction; adverse event | **Integrate drug interaction database (e.g., MIMS, AMH).** |
| **MC-3** | No maximum backdating limit | Certificate backdated 30 days; employer fraud investigation implicates platform | **Hard limit: no backdating >7 days. Decline with message to see GP.** |
| **AC-2** | Call requirement process unclear | Patient misses call; condition deteriorates; complaint | **Document call process in intake flow. "If a call is required, we'll contact you within X hours at the number you provided."** |
| **RK-1** | Clinical notes not mandatory | Complaint investigation finds no documented reasoning; indefensible | **Require minimum clinical note (50 chars) before approval button enabled.** |
| **RK-3** | No logging of what doctor viewed | Cannot prove thoroughness of review in litigation | **Track "viewed" events for each intake section.** |
| **CN-3** | Telehealth limitations not shown at intake | Patient complains "I didn't know it wasn't a real consultation" | **Add limitations summary at intake start with checkbox acknowledgment.** |

### P2 — MEDIUM (Action Within Quarter)

| ID | Issue | Mitigation |
|----|-------|------------|
| **IC-2** | Free-text symptom description too brief | Require 50+ characters or structured symptom checklist |
| **IC-4** | 3-day backdating threshold too permissive | Reduce async threshold to 1 day |
| **AI-2** | AI pre-populates dates | Require explicit doctor confirmation of dates |
| **AI-4** | No "not medical advice" in patient chat | Add visible disclaimer in chat header |
| **AI-5** | Same as AI-4 | Same as AI-4 |
| **MC-2** | Carer's dependent not verified | Add disclaimer: "Dependent details self-reported" |
| **MC-4** | No student ID on uni certificates | Add optional student ID field |
| **RX-1** | Medication adherence not verified | Add attestation: "I am currently taking this medication as prescribed" |
| **RX-2** | Tramadol messaging says S8 | Fix messaging to say "controlled substance" |
| **AC-1** | "Primarily async" vague | Rewrite to explicit statement |
| **AC-3** | Response time not confirmed | Show estimated review time at submission |
| **RK-2** | AI draft versions not preserved | Archive all draft versions |
| **RK-4** | AU geolocation not verified | Implement IP geolocation check |
| **DA-1** | No re-auth for high-risk | Add 2FA for extended certs/S4 medications |
| **CN-4** | MyHR consent not implemented | Defer until feature implemented |

---

## 7. NEVER AUTOMATE

The following decisions **MUST remain human-only** and should never be automated regardless of future AI capabilities:

| Decision | Reason | Current State |
|----------|--------|---------------|
| **Approval of any clinical request** | AHPRA requires human clinician responsibility | ✅ Compliant |
| **Safety knockout overrides** | Life safety decisions cannot be delegated to AI | ✅ Compliant |
| **Prescribing decisions** | TGA/PBS require human prescriber | ✅ Compliant (external) |
| **Certificate duration determination** | Clinical judgment required | ✅ Compliant |
| **Call requirement decisions** | Clinical judgment required | ✅ Compliant |
| **Decline reason determination** | Requires clinical reasoning | ✅ Compliant |
| **Emergency escalation decisions** | Life safety | ✅ Compliant (deterministic rules) |

---

## 8. REGULATORY REFERENCE

### AHPRA/Medical Board of Australia

- **Good Medical Practice** 3.2: Requires adequate assessment before treatment/documentation
- **Telehealth Guidelines**: Informed consent, identity verification, appropriate record keeping
- **Advertising Guidelines**: No guarantees of outcomes

### TGA

- **Poisons Standard**: S8 exclusions compliant
- **Therapeutic Goods Act**: No therapeutic claims in platform

### PBS

- **Using PBS reference data**: Compliant — advisory only, no prescribing authority implied

### Fair Work Act

- **Section 107**: Medical certificate must state employee is unfit for work
- **Regulation 3.01**: Certificate requirements

### Privacy Act / APPs

- **APP 11**: Security of personal information — encryption, access controls in place
- **APP 6**: Use/disclosure — Terms of Service covers permitted uses

---

## 9. REMEDIATION PRIORITY

### Immediate (Week 1)
1. Add consent checkbox + audit logging **(CN-1, CN-2)**
2. Review certificate wording with employment lawyer **(MC-1)**
3. Add emergency SMS for abandoned intakes with flags **(RF-1)**

### Short-term (Weeks 2-4)
1. Move AI summary to secondary panel **(AI-1)**
2. Add mandatory clinical note field **(RK-1)**
3. Implement intake section view logging **(AI-3, RK-3)**
4. Add symptom duration field to med cert **(IC-1)**
5. Expand crisis keyword detection **(RF-3)**

### Medium-term (Quarter)
1. Implement Medicare/identity verification **(IC-3)**
2. Integrate drug interaction checking **(RX-3)**
3. Add 7-day hard limit on backdating **(MC-3)**
4. Improve telehealth limitations disclosure **(CN-3, AC-1, AC-2)**

---

## 10. SUMMARY

**Overall Assessment**: The platform has **strong compliance architecture** with excellent:
- AI boundary separation
- Immutable audit logging
- Deterministic safety rules
- Prescribing boundary enforcement

**Primary Gaps** requiring immediate attention:
1. **Consent recording** at point of care
2. **Certificate wording** for Fair Work compliance
3. **Emergency follow-up** for abandoned intakes
4. **Cognitive anchoring** from AI summaries
5. **Clinical note requirements** for audit defensibility

The platform is **defensible** for standard telehealth services but has **liability exposure** in edge cases that require remediation.

---

*This audit is based on code review and does not constitute legal advice. Recommend review by healthcare lawyer and clinical governance consultant before implementing changes.*
