# AI Intake Chatbot UX Design

> Version 2.0 — Optimized for minimal cognitive load, fast completion, and strict safety.

## Design Principles

1. **One question per turn** — Never ask multiple questions
2. **Buttons first** — Use buttons/chips for any question with <7 options
3. **Short confirmations** — "Got it." not verbose summaries
4. **Intent-first routing** — Classify in 1–2 turns, route immediately
5. **Hard safety gates** — Emergency/restricted scenarios halt flow server-side

---

## Intent Classification (Turns 1–2)

### Turn 1: Greeting + Intent Detection

```
Bot: Hi. What do you need today?

[Medical Certificate] [Repeat Prescription] [New Prescription] [GP Consult] [Not sure]
```

### Turn 2 (if "Not sure")

```
Bot: No problem. Which best describes your situation?

[I'm unwell and need time off work/school]
[I need a refill of my regular medication]
[I have a new health concern]
[Something else]
```

### Intent Mapping

| User Selection | Intent | Flow |
|----------------|--------|------|
| Medical Certificate / Unwell + time off | `medical_certificate` | medcert_flow |
| Repeat Prescription / Refill | `repeat_prescription` | repeat_rx_flow |
| New Prescription | `new_prescription` | new_rx_flow |
| GP Consult / New concern / Something else | `general_consult` | consult_flow |

---

## Medical Certificate Flow (5–7 turns)

### Turn 1: Purpose
```
Bot: What's the certificate for?

[Work] [Uni/School] [Carer's leave]
```

### Turn 2: Duration
```
Bot: How many days do you need?

[Today only] [2 days] [3 days] [4+ days]
```

**Safety Gate**: If 4+ days selected:
```
Bot: Certificates over 3 days may require more detail. A doctor will review your request and may follow up. Continue?

[Yes, continue] [Go back]
```

### Turn 3: Date
```
Bot: Starting from?

[Today] [Tomorrow] [Pick a date]
```

If "Pick a date" → single date picker input

### Turn 4: Symptoms
```
Bot: Main symptoms? Tap all that apply.

[Cold/Flu] [Gastro] [Migraine] [Fatigue] [Period pain] [Other]
```

### Turn 5 (if "Other"):
```
Bot: Briefly describe your symptoms.
```
→ Free text input (max 200 chars)

### Turn 6: Safety Check
```
Bot: Quick check — are any of these true?

• Symptoms started suddenly with severe pain
• You have chest tightness or shortness of breath
• You've fainted or feel faint

[None of these apply] [One of these applies]
```

**Safety Gate**: If "One of these applies":
```
Bot: These symptoms may need urgent attention. Please call 000 or visit your nearest emergency department.

InstantMed cannot help with medical emergencies.

[I understand — my symptoms are different]
```

### Turn 7: Confirm
```
Bot: Ready to submit:
• Work certificate, 2 days from today
• Symptoms: Cold/Flu

[Submit for review — $19.95] [Edit details]
```

---

## Repeat Prescription Flow (5–6 turns)

### Turn 1: Medication
```
Bot: What medication do you need refilled?
```
→ Text input with PBS autocomplete

**Safety Gate**: If controlled substance detected:
```
Bot: [Medication name] is a Schedule 8 medication and cannot be prescribed online.

Please see your regular GP for this medication.

[Try a different medication] [Exit]
```

### Turn 2: Duration
```
Bot: How long have you been on this medication?

[Under 3 months] [3–12 months] [Over 1 year]
```

**Safety Gate**: If "Under 3 months":
```
Bot: New medications typically need an in-person review. We recommend seeing your regular GP for this one.

[I've taken it longer than 3 months] [Exit]
```

### Turn 3: Control
```
Bot: How well is your condition controlled?

[Well controlled] [Could be better] [Not well]
```

### Turn 4: Changes
```
Bot: Any recent changes to your health or other medications?

[No changes] [Yes, some changes]
```

If "Yes, some changes":
```
Bot: Briefly describe what's changed.
```
→ Free text input (max 200 chars)

### Turn 5: Last Review
```
Bot: When did you last see a doctor about this?

[Within 6 months] [6–12 months ago] [Over 1 year ago]
```

**Soft redirect** if "Over 1 year ago":
```
Bot: It's been a while since your last review. A quick online consult can confirm everything's on track. Want to book one?

[Book a consult ($39)] [Continue with repeat request]
```

### Turn 6: Confirm
```
Bot: Ready to submit:
• [Medication name]
• Taking for: over 1 year
• Well controlled

[Submit for review — $24.95] [Edit details]
```

---

## General Consult Flow (3–4 turns)

### Turn 1: Concern
```
Bot: What would you like to discuss with a doctor?
```
→ Free text input (max 300 chars)

### Turn 2: Urgency
```
Bot: How urgent is this?

[I need help today] [Within a few days is fine] [Just a routine question]
```

### Turn 3: Type
```
Bot: Preference for your consult?

[Video call] [Phone call] [Async (doctor reviews + responds)]
```

### Turn 4: Confirm
```
Bot: Ready to book:
• Online consult
• [Urgency level]
• [Consult type]

[Book now — $39] [Edit details]
```

---

## Safety Exits (Server-Enforced)

### Emergency Keywords → Hard Block
Triggers: chest pain, can't breathe, stroke, seizure, overdose, etc.

```
Bot: This sounds like a medical emergency. Please call 000 now or go to your nearest emergency department.

InstantMed cannot help with emergencies.

[Call 000]
```
*No continue option. Flow terminates.*

### Crisis Keywords → Crisis Support
Triggers: suicide, self-harm, want to die, etc.

```
Bot: I hear you're going through something difficult. Please reach out now:

• Lifeline: 13 11 14 (24/7)
• Beyond Blue: 1300 22 4636

[Call Lifeline]
```
*No continue option. Flow terminates.*

### Controlled Substances → Soft Block
Triggers: S8 medications, benzodiazepines, cannabis, etc.

```
Bot: [Medication] cannot be prescribed online. Schedule 8 and controlled medications require an in-person GP visit.

[Try a different medication] [Exit]
```

### Certificate >3 Days → Soft Redirect
```
Bot: Longer certificates may need more clinical detail. Our doctors may follow up with questions. Want to continue or book a consult instead?

[Continue with certificate request] [Book a GP consult]
```

---

## Input Type Rules

| Scenario | Input Type | Rationale |
|----------|------------|-----------|
| <7 discrete options | Buttons | Fastest, lowest cognitive load |
| Yes/No question | 2 Buttons | Never use toggle in chat |
| Multi-select (<8 options) | Chips (multi-tap) | Clear visual state |
| Date selection | Buttons + fallback picker | Most users want today/tomorrow |
| Medication name | Text + autocomplete | PBS search required |
| Symptom description | Free text (short) | Cap at 200 chars |
| Open-ended concern | Free text (medium) | Cap at 300 chars |

### Free Text Rules
- Only use when buttons cannot capture the answer
- Always set a character limit
- Provide placeholder text
- Never require >1 free text field per flow section

---

## Confirmation Style

### ❌ Don't
```
Bot: Thank you so much for providing that information! I've noted that you're experiencing cold and flu symptoms and need a medical certificate for work purposes for 2 days starting from today. Does this all look correct to you?
```

### ✅ Do
```
Bot: Got it — work cert, 2 days from today, cold/flu.

[Continue] [Edit]
```

---

## Error Recovery

### Invalid Input
```
Bot: Didn't catch that. [Repeat question with buttons]
```

### API Failure
```
Bot: Something went wrong on our end. Let's try that again.

[Retry] [Start over]
```

### Session Timeout (>10 min inactive)
```
Bot: Still there? Your progress is saved.

[Continue where I left off] [Start over]
```

---

## State Management

### Collected Data Structure
```typescript
interface IntakeState {
  intent: 'medical_certificate' | 'repeat_prescription' | 'new_prescription' | 'general_consult' | null
  step: number
  data: {
    // Medical Certificate
    certType?: 'work' | 'uni' | 'carer'
    duration?: string
    dateFrom?: string
    symptoms?: string[]
    otherSymptom?: string
    
    // Prescription
    medication?: string
    pbsCode?: string
    medicationDuration?: string
    controlLevel?: string
    recentChanges?: string
    lastReview?: string
    
    // Consult
    concern?: string
    urgency?: string
    consultType?: string
    
    // Carer-specific
    carerName?: string
    carerRelation?: string
  }
  safetyFlags: string[]
  ready: boolean
}
```

### Server Validation
- Client collects incrementally
- `ready: true` indicates client thinks complete
- Server MUST revalidate all fields
- Server MUST re-check safety flags
- Never auto-submit based on AI saying "ready"

---

## Metrics to Track

1. **Completion rate** — % of started intakes that reach submission
2. **Time to complete** — Median time from first message to ready
3. **Turn count** — Average number of turns per flow
4. **Dropout points** — Where users abandon
5. **Safety gate triggers** — Emergency, controlled substance, long certificate
6. **Edit rate** — How often users go back to change answers

---

## Implementation Checklist

- [ ] Update system prompt with new personality and flow rules
- [ ] Implement intent detection in first 2 turns
- [ ] Add button parsing for all flows
- [ ] Implement safety gates (emergency, crisis, controlled, long cert)
- [ ] Add session state management
- [ ] Update frontend to render new button formats
- [ ] Add analytics events for metrics
- [ ] Server-side validation before submission
