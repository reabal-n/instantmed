# Structured Intake System

> AI-collected intake data that feeds the doctor review queue.

## Overview

The intake bot collects clinically relevant data without interpretation. Output is structured for 10-second doctor scan.

---

## Files Created

| File | Purpose |
|------|---------|
| `lib/intake/structured-intake-schema.ts` | TypeScript types for all intake data models |
| `lib/intake/doctor-summary-format.ts` | Transforms intake → doctor-readable summary |
| `lib/intake/ai-collection-boundaries.ts` | What AI can/cannot do, handoff protocols |
| `lib/intake/form-transition.ts` | When to transition from chat to full form |

---

## Structured Intake Schema

### Service Types
- `medical_certificate` — Time off work/school/carer
- `repeat_prescription` — Refill existing medication
- `new_prescription` — New medication request
- `general_consult` — GP consult booking

### Data Structure

```typescript
interface StructuredIntake {
  id: string
  status: 'in_progress' | 'ready_for_review' | 'requires_form' | 'safety_exit'
  serviceType: ServiceType
  patientId: string
  data: MedCertIntake | RepeatRxIntake | NewRxIntake | ConsultIntake
  flags: IntakeFlag[]
  exclusions: string[]
  requiresFormTransition: boolean
  aiMetadata: { turnCount, collectionDurationMs, modelVersion, promptVersion }
}
```

### Required Fields by Service

| Service | Required Fields |
|---------|-----------------|
| Medical Certificate | purpose, startDate, endDate, primarySymptoms, symptomOnset, symptomSeverity |
| Repeat Prescription | medication.name, treatmentDuration, lastReviewDate, conditionControl |
| New Prescription | condition.category, condition.description, allergies, currentMedications |
| GP Consult | concern.summary, concern.category, consultType |

---

## Doctor Summary Format

### Design Principles
- **10-second scan** — Doctor grasps case immediately
- **No interpretation** — Facts only, no AI conclusions
- **Flags prominent** — Red flags immediately visible
- **Actionable** — Clear what decision is needed

### Output Structure

```typescript
interface DoctorSummary {
  caseId: string
  serviceType: string
  status: { readyForReview, flagCount, highestSeverity, requiresAction[] }
  sections: SummarySection[]
  flags: FlagDisplay[]
  exclusions: string[]
  metadata: { turns, durationSeconds, formTransitionRecommended }
}
```

### Example Output (Medical Certificate)

```
=== Medical Certificate ===
Case: intake_1705678912_abc123
Submitted: 19 Jan 2026

FLAGS:
  ⚠️ [CAUTION] Certificate duration >3 days

Certificate Request:
  • Purpose: Work
  • Period: 19 Jan 2026 → 22 Jan 2026 (4 days)
  • Backdated: No

Presenting Symptoms:
  • Primary: Upper respiratory (cold/flu/sore throat)
  • Onset: Yesterday
  • Severity: Moderate

---
AI intake: 6 turns, 45s
```

---

## AI Collection Boundaries

### AI CAN Do (Administrative)
- Collect symptoms using structured categories
- Ask duration, severity (patient-reported)
- Present multiple-choice options
- Flag patterns (emergency keywords, controlled substances)
- Explain process and limitations

### AI CANNOT Do (Clinical)
- Diagnose or interpret symptoms
- Recommend medications or dosages
- Predict if request will be approved
- Answer general medical questions
- Provide health advice

### Boundary Response Templates

**Medical question asked:**
> "I collect information for your request. A doctor will review and can answer medical questions."

**Recommendation requested:**
> "I can't recommend treatments — that's for the doctor to decide. I can note your preferences for them to consider."

---

## Safety Exits

| Trigger | Action | Message |
|---------|--------|---------|
| Emergency keywords | Terminate | Direct to 000/ED |
| Crisis keywords | Terminate | Direct to Lifeline/Beyond Blue |
| Controlled substance | Block | Explain requires in-person GP |
| Out of scope | Terminate | Advise in-person care |

---

## Form Transition Rules

Chat → Form when:

| Condition | Target Form |
|-----------|-------------|
| Medical certificate >7 days | `/intake/extended-certificate` |
| Mental health new prescription | `/intake/mental-health` |
| Poor control + severe side effects | `/intake/medication-review` |
| Urgent + severe symptoms | `/intake/urgent-triage` |
| Multiple allergies (≥3) | `/intake/allergy-review` |
| Polypharmacy (≥5 meds) | `/intake/medication-interaction` |

State is preserved and passed as `?prefill=` parameter.

---

## Flags

### Severity Levels

| Level | Icon | Meaning |
|-------|------|---------|
| `info` | ℹ️ | Informational, no action needed |
| `caution` | ⚠️ | Doctor should note |
| `urgent` | 🔴 | Requires attention |
| `blocker` | 🚫 | Cannot proceed without resolution |

### Auto-Generated Flags

| Flag | Trigger |
|------|---------|
| `duration_concern` | Certificate ≥4 days |
| `backdated_request` | Start date before today |
| `severity_concern` | Patient reports severe symptoms |
| `new_medication_concern` | On medication <3 months |
| `overdue_review` | Last review >1 year ago |
| `poor_control` | Poorly controlled condition |
| `side_effect_concern` | Moderate/severe side effects |
| `requires_detailed_form` | Mental health new prescription |
| `urgent_severe` | Urgent + severe symptoms |

---

## System Prompt Summary

The updated prompt (`app/api/ai/chat-intake/route.ts`) includes:

1. **Role boundaries** — Explicit can/cannot statements
2. **Field-by-field collection** — Exact field names for each service type
3. **Flag triggers** — When to set each flag type
4. **Safety exits** — Emergency, crisis, controlled substance handling
5. **Form transition triggers** — When to redirect to full form
6. **Structured output format** — JSON block after each response

---

## Integration Points

### Validation Endpoint
`POST /api/ai/chat-intake/validate`
- Validates AI output before submission
- Returns `{ valid, errors, warnings, safetyBlocks, data }`

### Doctor Queue
Intake with `status: "ready_for_review"` enters review queue with:
- Structured summary
- Flags highlighted
- Required actions listed

### Form Prefill
When transitioning to form:
```typescript
const transitionUrl = buildTransitionUrl(checkFormTransition(intake))
// → /intake/mental-health?from=chat&prefill=base64data&reason=mental_health_new_rx
```

---

## Audit Trail

All AI actions logged with:
- Timestamp
- Action type
- Boundary checked
- Input/output (truncated)
- Permitted/blocked status

Position for compliance:
> "AI intake assistant collects administrative data using structured categories. All clinical decisions made by registered medical practitioners. AI output is advisory/informational only."
