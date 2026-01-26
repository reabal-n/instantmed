# InstantMed Intake System Audit

> **Date:** January 2026  
> **Scope:** Form-based and AI chat intake flows, validation, normalization, DB storage, failure modes

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Form-Based Intake Flow](#2-form-based-intake-flow)
3. [AI Chat Intake Flow](#3-ai-chat-intake-flow)
4. [Validation & Normalization](#4-validation--normalization)
5. [Database Storage Map](#5-database-storage-map)
6. [Failure Fallbacks](#6-failure-fallbacks)
7. [Service Type Selection & Routing](#7-service-type-selection--routing)
8. [Missing Capture Analysis](#8-missing-capture-analysis)
9. [User-Facing Failure Modes](#9-user-facing-failure-modes)
10. [Recommendations](#10-recommendations)

---

## 1. Executive Summary

The InstantMed intake system supports **two parallel intake paths**:
- **Form-based flow** via `/request` — Multi-step wizard with Zustand state persistence
- **AI chat flow** via floating `ChatIntakeButton` — Conversational intake with server-side validation

Both paths converge at `createIntakeAndCheckoutAction` → Stripe checkout → webhook → DB insert.

### Key Findings

| Area | Status | Risk Level |
|------|--------|------------|
| Form → DB flow | ✅ Complete | Low |
| Chat → DB flow | ✅ Complete | Medium |
| Transcript linkage | ⚠️ Gaps | Medium |
| Draft generation trigger | ✅ Complete | Low |
| Audit logging | ⚠️ Gaps | Medium |
| Chat → Form fallback | ⚠️ Partial | High |

---

## 2. Form-Based Intake Flow

### Flow Diagram

```
User clicks CTA (landing page)
         ↓
    /request?service={type}
         ↓
┌─────────────────────────────────────┐
│  RequestFlow (components/request/)  │
│  ├── step-router.tsx                │
│  ├── store.ts (Zustand + persist)   │
│  └── steps/*.tsx                    │
└─────────────────────────────────────┘
         ↓
   User completes all steps
         ↓
┌─────────────────────────────────────┐
│  checkout-step.tsx                  │
│  └── createCheckoutFromUnifiedFlow  │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  unified-checkout.ts                │
│  └── createIntakeAndCheckoutAction  │
│      or createGuestCheckoutAction   │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│  lib/stripe/checkout.ts             │
│  1. Service availability check      │
│  2. Schema validation               │
│  3. Safety rule evaluation          │
│  4. Fraud detection                 │
│  5. INSERT intakes                  │
│  6. INSERT intake_answers           │
│  7. Create Stripe session           │
└─────────────────────────────────────┘
         ↓
   Stripe Checkout (redirect)
         ↓
   Payment completed
         ↓
┌─────────────────────────────────────┐
│  /api/stripe/webhook                │
│  1. Atomic event claim              │
│  2. UPDATE intakes (paid)           │
│  3. Notify patient                  │
│  4. generateDraftsForIntake()       │
└─────────────────────────────────────┘
```

### Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Entry point | `app/request/page.tsx` | Route handler, auth check |
| Orchestrator | `components/request/request-flow.tsx` | Multi-step wizard |
| State store | `components/request/store.ts` | Zustand with localStorage persist |
| Step registry | `lib/request/step-registry.ts` | Step definitions per service |
| Checkout action | `app/actions/unified-checkout.ts` | Bridge to Stripe |
| Stripe checkout | `lib/stripe/checkout.ts` | DB insert + Stripe session |
| Webhook | `app/api/stripe/webhook/route.ts` | Payment confirmation |

### State Persistence

```typescript
// store.ts:232-247
persist(
  (set, get) => ({ ... }),
  {
    name: 'instantmed-request-draft',
    partialize: (state) => ({
      serviceType, currentStepId, safetyConfirmed, safetyTimestamp,
      answers, firstName, lastName, email, phone, dob, lastSavedAt
    }),
  }
)
```

**Storage:** `localStorage` key `instantmed-request-draft`  
**Expiry:** 24 hours (checked in `RequestFlow`)

---

## 3. AI Chat Intake Flow

### Flow Diagram

```
User clicks floating chat bubble
         ↓
┌─────────────────────────────────────┐
│  ChatIntake (components/chat/)      │
│  ├── Chat messages state            │
│  ├── Draft auto-save to localStorage│
│  └── Service type detection         │
└─────────────────────────────────────┘
         ↓
   User sends message
         ↓
┌─────────────────────────────────────┐
│  POST /api/ai/chat-intake           │
│  1. Rate limiting                   │
│  2. Emergency keyword check         │
│  3. Prompt injection check          │
│  4. Upsert transcript (BEFORE AI)   │
│  5. Stream AI response              │
│  6. Upsert transcript (AFTER AI)    │
│  7. Log AI interaction              │
└─────────────────────────────────────┘
         ↓
   AI returns intake_data JSON block
         ↓
┌─────────────────────────────────────┐
│  Client-side validation             │
│  POST /api/ai/chat-intake/validate  │
│  └── validateIntakePayload()        │
└─────────────────────────────────────┘
         ↓
   [If valid] onComplete callback
         ↓
┌─────────────────────────────────────┐
│  savePrefillData() to localStorage  │
│  clearDraft()                       │
│  Redirect to /request?prefill=true  │  ← FORM TRANSITION
└─────────────────────────────────────┘
         ↓
   Form-based flow (with prefill)
         ↓
   [Same as Form flow from checkout]
```

### Key Files

| Component | File | Purpose |
|-----------|------|---------|
| Chat UI | `components/chat/chat-intake.tsx` | Chat interface |
| Chat API | `app/api/ai/chat-intake/route.ts` | AI streaming |
| Validation | `lib/chat/chat-validation.ts` | Server-side validation |
| Audit trail | `lib/chat/audit-trail.ts` | Transcript storage |
| Form prefill | `lib/chat/form-prefill.ts` | Chat → Form data mapping |
| Draft storage | `lib/chat/draft-intake.ts` | Chat draft persistence |

### Transcript Storage

```typescript
// audit-trail.ts:366-462
upsertChatTranscript({
  sessionId,
  patientId,
  messages,
  serviceType,
  modelVersion,
  promptVersion,
  safetyFlags,
  wasBlocked,
  intakeId  // Linked after checkout
})
```

**DB Table:** `ai_chat_transcripts`  
**Linked to intake:** Via `completeTranscript(sessionId, intakeId, 'submitted')`

---

## 4. Validation & Normalization

### Form-Based Validation

| Layer | File | Checks |
|-------|------|--------|
| Client | `components/request/steps/*.tsx` | Field-level validation |
| Server | `lib/validation/med-cert-schema.ts` | `validateMedCertPayload` |
| Server | `lib/validation/repeat-script-schema.ts` | `validateRepeatScriptPayload` |
| Server | `lib/validation/schemas.ts` | `validateConsultPayload` |
| Server | `lib/stripe/checkout.ts:93-136` | Pre-checkout validation |
| Server | `lib/flow/safety/evaluate.ts` | Safety rule evaluation |

### Chat Validation

| Layer | File | Checks |
|-------|------|--------|
| Client | `chat-intake.tsx:600-637` | Parse intake_data JSON |
| Server | `/api/ai/chat-intake/validate` | `validateIntakePayload()` |
| Server | `lib/chat/chat-validation.ts` | Required fields, controlled substances |

### Normalization

**Form flow:** `unified-checkout.ts:50-93`
```typescript
function transformAnswers(serviceType, answers) {
  // Maps frontend field names → backend field names
  // e.g., certType → certificate_type
  // e.g., medicationName → medication_name
}
```

**Chat flow:** `chat-validation.ts:179-251`
```typescript
function normalizeCollectedFields(collected) {
  // Maps AI schema → backend schema
  // e.g., purpose → certType
  // e.g., durationDays → duration
}
```

⚠️ **Gap:** Two separate normalization functions with **partially overlapping mappings**. Risk of divergence.

---

## 5. Database Storage Map

### Primary Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `intakes` | Main request record | `id`, `patient_id`, `service_id`, `status`, `payment_status`, `category`, `subtype` |
| `intake_answers` | Questionnaire data | `intake_id`, `answers` (JSONB) |
| `ai_chat_transcripts` | Chat conversation | `session_id`, `intake_id`, `messages` (JSONB), `service_type` |
| `ai_chat_audit_log` | AI interaction log | `session_id`, `user_input_preview`, `ai_output_preview` |
| `ai_safety_blocks` | Safety events | `session_id`, `block_type`, `trigger_preview` |

### Insert Sequence (Form)

```sql
1. INSERT INTO intakes (patient_id, service_id, status='pending_payment', ...)
2. INSERT INTO intake_answers (intake_id, answers)
3. [Payment]
4. UPDATE intakes SET status='paid', payment_status='paid', paid_at=NOW()
5. INSERT INTO intake_drafts (intake_id, ...) -- via generateDraftsForIntake
```

### Insert Sequence (Chat)

```sql
1. UPSERT ai_chat_transcripts (session_id, messages, ...) -- per turn
2. [Form transition with prefill]
3. INSERT INTO intakes (patient_id, service_id, status='pending_payment', ...)
4. INSERT INTO intake_answers (intake_id, answers)
5. UPDATE ai_chat_transcripts SET intake_id=$1 -- link transcript
6. [Payment]
7. UPDATE intakes SET status='paid', ...
8. INSERT INTO intake_drafts (intake_id, ...)
```

---

## 6. Failure Fallbacks

### Chat → Form Fallback

**Trigger conditions:**
1. AI sets `requiresFormTransition: true` in output
2. AI sets `status: 'requires_form'`
3. Complex cases (7+ day cert, mental health Rx, multi-condition)

**Implementation:** `chat-intake.tsx:599-637`
```typescript
if ((intakeData.ready || intakeData.status === 'ready_for_review') && onComplete) {
  const validation = await fetch("/api/ai/chat-intake/validate", {...})
  if (validation.valid) {
    savePrefillData({ service_type, ...collected })
    clearDraft()
    onComplete({ ...validation.data, _validated: true })
  }
}
```

**⚠️ Gap:** The `onComplete` callback is optional and may not be wired to redirect. The chat component doesn't force redirect.

### Form Draft Recovery

**Trigger:** User abandons form mid-flow  
**Storage:** `localStorage['instantmed-request-draft']`  
**Recovery UI:** `DraftRestorationBanner` in `request-flow.tsx:214-241`

### Chat Draft Recovery

**Trigger:** User abandons chat mid-conversation  
**Storage:** `localStorage['instantmed_draft_intake']`  
**Recovery UI:** `DraftResume` component in `chat-intake.tsx:759-775`

---

## 7. Service Type Selection & Routing

### URL Parameter Mapping

```typescript
// step-registry.ts:334-349
function mapServiceParam(param): UnifiedServiceType {
  const mapping = {
    'med-cert': 'med-cert',
    'medcert': 'med-cert',
    'medical-certificate': 'med-cert',
    'prescription': 'prescription',
    'repeat-script': 'repeat-script',
    'repeat-rx': 'repeat-script',
    'consult': 'consult',
    'consultation': 'consult',
  }
  return mapping[param.toLowerCase()] || 'med-cert'
}
```

### Legacy Redirects

| Old Route | New Route |
|-----------|-----------|
| `/start?service=medcert` | `/request?service=med-cert` |
| `/medical-certificate/request` | `/request?service=med-cert` |
| `/prescriptions/request` | `/request?service=prescription` |

### Step Registry Per Service

| Service | Steps |
|---------|-------|
| `med-cert` | certificate → symptoms → details → safety → review → checkout |
| `prescription` | medication → medication-history → medical-history → details → safety → review → checkout |
| `repeat-script` | (same as prescription) |
| `consult` | consult-reason → medical-history → details → safety → review → checkout |

---

## 8. Missing Capture Analysis

### Transcript Linkage Coverage

| Scenario | Transcript Created | Linked to Intake |
|----------|-------------------|------------------|
| Chat completed → form → paid | ✅ | ⚠️ Depends on `chatSessionId` passed |
| Chat abandoned | ✅ | ❌ No intake exists |
| Form only (no chat) | N/A | N/A |

**Gap:** `chatSessionId` is not reliably passed from chat UI through to `createIntakeAndCheckoutAction`.

```typescript
// unified-checkout.ts - NO chatSessionId parameter
export async function createCheckoutFromUnifiedFlow(input: UnifiedCheckoutInput) {
  // ...
  return createIntakeAndCheckoutAction({
    category, subtype, type: serviceType, answers: transformedAnswers,
    idempotencyKey: crypto.randomUUID(),
    // chatSessionId: ??? -- NOT PASSED
  })
}
```

### Draft Generation Trigger Coverage

| Scenario | Drafts Generated |
|----------|-----------------|
| Payment completed (webhook) | ✅ `generateDraftsForIntake()` called |
| Payment failed | ❌ No drafts |
| Payment retried | ✅ When eventually paid |

**Location:** `app/api/stripe/webhook/route.ts` calls `generateDraftsForIntake(intakeId)` after status update.

### Audit Log Coverage

| Event | Logged | Table |
|-------|--------|-------|
| AI chat turn | ✅ | `ai_chat_audit_log` |
| Safety block | ✅ | `ai_safety_blocks` |
| Form submission | ⚠️ Partial | `audit_logs` (if enabled) |
| Checkout started | ⚠️ | Logger only |
| Payment completed | ✅ | `stripe_webhook_events` |

**Gap:** Form-side interactions (step views, field edits) are not audit-logged to DB.

---

## 9. User-Facing Failure Modes

### Broken Redirects

| Scenario | File | Issue | Severity |
|----------|------|-------|----------|
| Invalid service param | `step-registry.ts:348` | Defaults to `med-cert` silently | Low |
| Missing service param | `request/page.tsx` | Defaults to `med-cert` | Low |
| Chat `onComplete` not wired | `chat-intake.tsx` | User stuck in chat | **High** |

### Missing State Guards

| Scenario | File | Issue | Severity |
|----------|------|-------|----------|
| Forward step jump w/o safety | `store.ts:176-188` | Blocked by `goToStep` guard | ✅ Fixed |
| Checkout w/o required fields | `checkout-step.tsx:69` | `canCheckout` guard | ✅ Fixed |
| Payment retry after paid | `checkout.ts:561-563` | Status check guard | ✅ Fixed |

### Partial Submissions

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| Network failure during intake insert | No intake created | User retries |
| Network failure during answers insert | Intake exists, no answers | Rollback in `checkout.ts:382-387` |
| Stripe session creation fails | Intake marked `checkout_failed` | Soft-delete, retry possible |
| Webhook delivery fails | Intake stays `pending_payment` | Stripe retry + DLQ |
| AI draft generation fails | No drafts for doctor | `ai_draft_retry_queue` + cron |

---

## 10. Recommendations

### 1. Pass `chatSessionId` Through Checkout Flow
**Location:** `components/request/store.ts`, `unified-checkout.ts`  
**Issue:** Chat transcript is not linked to intake when user transitions chat → form → payment.  
**Fix:**
```typescript
// store.ts - Add chatSessionId to state
chatSessionId: string | null

// checkout-step.tsx - Pass through
const { chatSessionId } = useRequestStore()
await createCheckoutFromUnifiedFlow({
  serviceType, answers, identity, chatSessionId
})

// unified-checkout.ts - Forward to checkout action
return createIntakeAndCheckoutAction({
  ...input, chatSessionId: input.chatSessionId
})
```

### 2. Consolidate Normalization Functions
**Location:** `unified-checkout.ts:50-93`, `chat-validation.ts:179-251`  
**Issue:** Two separate field mapping functions risk divergence.  
**Fix:** Extract shared `lib/intake/field-normalizer.ts` with single source of truth.

### 3. Add Explicit Chat → Form Redirect
**Location:** `components/chat/chat-intake.tsx:606`  
**Issue:** `onComplete` callback is optional; user may be stuck if not wired.  
**Fix:**
```typescript
// After validation passes, force redirect if onComplete not provided
if (!onComplete) {
  savePrefillData({ service_type, ...collected })
  window.location.href = `/request?service=${mapServiceType(service_type)}&prefill=true`
}
```

### 4. Add Form Interaction Audit Logging
**Location:** `components/request/request-flow.tsx`  
**Issue:** Form step views and completions are tracked in PostHog but not in DB audit log.  
**Fix:** Add server action to log form events to `audit_logs` table for compliance.

### 5. Add Intake Creation Audit Event
**Location:** `lib/stripe/checkout.ts:319-358`  
**Issue:** Intake creation is logged only to observability; not to `audit_logs` table.  
**Fix:**
```typescript
// After successful intake insert
await supabase.from('audit_logs').insert({
  action: 'intake_created',
  resource_type: 'intake',
  resource_id: intake.id,
  patient_id: patientId,
  metadata: { category, subtype, serviceSlug }
})
```

### 6. Add Prefill Load Indicator
**Location:** `components/request/request-flow.tsx`  
**Issue:** When chat prefills form, user has no visual indication data was pre-loaded.  
**Fix:** Add `ChatDataLoadedBanner` showing which fields were pre-filled from conversation.

### 7. Handle Chat Validation Failure Gracefully
**Location:** `components/chat/chat-intake.tsx:608-633`  
**Issue:** If server validation fails, user continues chatting but may hit same issue.  
**Fix:** Show inline error message indicating which fields need correction before retry.

### 8. Add Transcript Cleanup Cron
**Location:** New: `app/api/cron/cleanup-orphaned-transcripts/route.ts`  
**Issue:** Abandoned chat transcripts with no linked intake accumulate.  
**Fix:** Cron to mark transcripts as `abandoned` after 48h with no linked intake.

---

## Summary

| Category | Issues Found | Critical | Recommendations |
|----------|--------------|----------|-----------------|
| Flow completeness | 0 | 0 | - |
| Data linkage | 2 | 1 | #1, #8 |
| Validation | 1 | 0 | #2 |
| Failure handling | 2 | 1 | #3, #7 |
| Audit coverage | 2 | 0 | #4, #5 |
| UX | 1 | 0 | #6 |

**Overall Assessment:** The intake system is well-architected with proper validation, idempotency, and retry mechanisms. The main gaps are around **transcript linkage** when transitioning from chat to form, and **explicit fallback behavior** when chat completion fails to trigger form redirect.
