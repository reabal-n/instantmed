# AI Boundary Rules

## Critical Principle

**AI assists with documentation only. All triage and decline decisions are rule-based.**

This document defines the explicit boundary between AI-assisted functionality and deterministic safety systems. This boundary is non-negotiable and must be enforced at both code and operational levels.

---

## What AI CAN Do

### 1. Documentation Assistance
- Generate clinical note drafts from intake answers
- Suggest certificate wording based on patient-reported symptoms
- Pre-populate forms with structured data extraction
- Summarize patient history for doctor review

### 2. Content Formatting
- Structure free-text responses into clinical format
- Format medication names and dosages
- Generate PDF-ready document content

### 3. Quality Suggestions
- Flag potential spelling/grammar issues in notes
- Suggest completeness improvements
- Highlight missing required fields

---

## What AI CANNOT Do

### 1. Safety Decisions (CRITICAL)
AI prompts **MUST NOT** be able to:
- Override safety knockout rules
- Approve requests that fail eligibility checks
- Bypass emergency symptom detection
- Modify triage outcomes

**Enforcement**: Safety rules in `lib/rules/` use deterministic logic only. No LLM calls.

### 2. Prescribing Decisions
AI **MUST NOT**:
- Recommend specific medications
- Suggest dosage changes
- Indicate PBS eligibility
- Imply prescribing authority

**Enforcement**: PBS medication search is reference-only. All prescribing happens in external clinician systems.

### 3. Diagnosis
AI **MUST NOT**:
- Provide diagnostic conclusions
- Suggest conditions based on symptoms
- Recommend treatment paths

**Enforcement**: All AI-generated text includes "pending doctor review" framing.

---

## Architecture Enforcement

### File-Level Separation

```
lib/rules/           → Deterministic safety logic (NO AI)
lib/ai/              → AI-assisted documentation (DOCUMENTATION ONLY)
```

### Code-Level Guards

```typescript
// lib/rules/safety.ts - Example pattern
export function checkSafetyKnockouts(answers: IntakeAnswers): SafetyResult {
  // DETERMINISTIC RULES ONLY
  // No AI/LLM calls permitted in this file
  
  if (answers.has_emergency_symptoms) {
    return { blocked: true, reason: "emergency_symptoms" }
  }
  
  // ... more deterministic checks
}
```

```typescript
// lib/ai/drafts/clinical-note.ts - Example pattern
export async function generateClinicalNote(intake: Intake): Promise<Draft> {
  // AI generates DOCUMENTATION ONLY
  // Cannot modify safety outcomes
  
  const draft = await llm.generate({
    system: CLINICAL_NOTE_SYSTEM_PROMPT,
    // ...
  })
  
  // Draft is ALWAYS subject to doctor review
  return { ...draft, status: "pending_review" }
}
```

### Database-Level Audit

All AI-generated content is logged to `ai_audit_log` table with:
- `action`: "generate" | "approve" | "reject" | "edit"
- `actor_type`: "system" | "doctor"
- `input_hash`: Hash of input data
- `output_hash`: Hash of generated content

Doctors must explicitly approve all AI drafts before use.

---

## Prompt Safety Rules

### System Prompt Requirements

All AI system prompts MUST include:

```
You are a documentation assistant only.
You DO NOT make clinical decisions.
You DO NOT approve or deny requests.
You DO NOT recommend treatments or medications.
All output requires doctor review before use.
```

### Input Sanitization

Patient input is sanitized before AI processing:
- Emergency keywords trigger immediate routing (not AI)
- Safety-related answers are not included in AI context
- Medication names are reference-only, not prescribing suggestions

### Output Validation

All AI outputs are validated:
- Ground truth validation against intake data
- Schema validation for required fields
- Prohibited phrase detection (no diagnostic language)

---

## Operational Enforcement

### Code Review Checklist

PRs touching AI or safety code must verify:
- [ ] No LLM calls in `lib/rules/` directory
- [ ] AI outputs marked as "pending_review"
- [ ] Safety decisions use deterministic logic
- [ ] No AI prompt can bypass knockouts

### Runtime Monitoring

- Alert on any safety rule modification
- Track AI draft approval/rejection rates
- Monitor for prompt injection attempts

---

## Summary

| Decision Type | Handler | AI Involvement |
|--------------|---------|----------------|
| Safety knockout | `lib/rules/safety.ts` | ❌ None |
| Eligibility check | `lib/rules/eligibility.ts` | ❌ None |
| Triage routing | `lib/rules/triage.ts` | ❌ None |
| Clinical note draft | `lib/ai/drafts/` | ✅ Generates draft |
| Certificate content | `lib/ai/drafts/` | ✅ Suggests content |
| Final approval | Doctor UI | ❌ None (human only) |

**The boundary is simple: AI writes, rules decide, doctors approve.**
