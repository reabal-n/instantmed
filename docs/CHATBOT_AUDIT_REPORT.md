# AI Chatbot Audit Report

**Date**: 19 Jan 2026  
**Scope**: Full audit of AI intake chatbot system  
**Files Reviewed**: 8 files across components, API routes, and lib modules

---

## Executive Summary

The chatbot implementation is **functional but has several inconsistencies and gaps** that should be addressed before production scaling. Key issues include schema mismatches between files, missing error boundaries, and incomplete integration between the new structured intake system and existing validation.

| Category | Critical | High | Medium | Low |
|----------|----------|------|--------|-----|
| **Bugs** | 1 | 2 | 3 | 2 |
| **Security** | 0 | 1 | 2 | 1 |
| **UX** | 0 | 1 | 4 | 3 |
| **Code Quality** | 0 | 2 | 3 | 4 |

---

## 🔴 Critical Issues

### 1. Schema Mismatch: System Prompt vs Validation

**Location**: `app/api/ai/chat-intake/route.ts` vs `lib/intake/chat-validation.ts`

The system prompt uses new field names but validation expects old field names:

| System Prompt Field | Validation Expects |
|---------------------|-------------------|
| `service_type: "medical_certificate"` | `service_type: "med_cert"` |
| `service_type: "repeat_prescription"` | `service_type: "repeat_rx"` |
| `service_type: "general_consult"` | `service_type: "consult"` |
| `primarySymptoms` | `symptoms` |
| `startDate` | `dateFrom` |
| `durationDays` | `duration` |
| `purpose` | `certType` |

**Impact**: Validation will fail for all AI-collected intakes.

**Fix Required**: Align field names OR add mapping layer in validation.

---

## 🟠 High Priority Issues

### 2. Unused Router Import

**Location**: `@/Users/rey/Desktop/instantmed/components/chat/chat-intake.tsx:259`

```typescript
const _router = useRouter()
```

Router is imported but never used (prefixed with `_` to suppress lint). Either remove or implement navigation.

### 3. Missing `new_prescription` Validation

**Location**: `lib/intake/chat-validation.ts:93`

```typescript
if (!service_type || !['med_cert', 'repeat_rx', 'consult'].includes(service_type))
```

The system prompt now supports `new_prescription` but validation doesn't handle it.

### 4. No Timeout on AI Streaming

**Location**: `components/chat/chat-intake.tsx:361-392`

The streaming fetch has no timeout. If AI hangs, user waits indefinitely.

**Recommendation**: Add AbortController with 30s timeout.

---

## 🟡 Medium Priority Issues

### 5. intake_data Regex May Miss Variations

**Location**: `components/chat/chat-intake.tsx:395`

```typescript
const intakeDataMatch = assistantMessage.content.match(/```intake_data\s*([\s\S]*?)\s*```/)
```

This regex is fragile:
- Won't match ```` ```intake_data ```` with extra backticks
- Won't match if AI adds language identifier: `` ```json intake_data ``

**Recommendation**: Make regex more flexible or use dedicated JSON extraction.

### 6. No Escape Key Handler to Close Chat

**Location**: `components/chat/chat-intake.tsx`

Chat can be closed via X button but not via Escape key, which is standard UX.

### 7. Message ID Collision Risk

**Location**: `components/chat/chat-intake.tsx:317-319, 377-378`

```typescript
id: Date.now().toString(),
// ...
id: (Date.now() + 1).toString(),
```

Using `Date.now()` risks collision in fast interactions. Use UUID or crypto.randomUUID().

### 8. No Rate Limit Feedback to User

**Location**: `app/api/ai/chat-intake/route.ts:267-270`

Rate limiting returns a response but the frontend doesn't distinguish it from other errors.

### 9. Bubble Dismiss State Lost on Refresh

**Location**: `components/chat/chat-intake.tsx:586`

`bubbleDismissed` is in React state only. If user refreshes, bubble reappears. Should persist to localStorage.

### 10. Double Schema: structured-intake-schema vs chat-validation

**Location**: Two different type systems exist:
- `lib/intake/structured-intake-schema.ts` - New comprehensive types
- `lib/intake/chat-validation.ts` - Old validation types

These need to be unified to avoid drift.

---

## 🔵 Low Priority Issues

### 11. Hardcoded Model Version

**Location**: `app/api/ai/chat-intake/route.ts:345`

```typescript
model: "openai/gpt-4o-mini",
```

Should be environment variable for easier model switching.

### 12. No Analytics/Telemetry on Chat Completion

Intake completion isn't tracked for conversion analytics.

### 13. Emergency Response Buttons Not Functional

**Location**: `app/api/ai/chat-intake/route.ts:64-65`

```typescript
buttons: ["[Call 000]", "[Find nearest ED]"],
```

These render as quick replies but don't actually trigger calls or maps.

### 14. LocalStorage Quota Check Missing

**Location**: `components/chat/chat-intake.tsx:221-223`

`saveChat` writes to localStorage without checking quota. Could fail silently.

---

## 🔐 Security Observations

### S1. Good: Server-side Emergency Blocking ✅

Emergency/crisis keywords are checked server-side before AI call, not just in prompt.

### S2. Good: Prompt Injection Detection ✅

`checkAndSanitize` provides robust protection against injection attacks.

### S3. Improvement: AI Output Not Validated

**Location**: `components/chat/chat-intake.tsx:395-422`

AI output is parsed but not validated against `validateAIOutput()` from `prompt-safety.ts`. Could leak system prompt patterns.

### S4. Improvement: No CSRF Protection on Chat Endpoint

Chat endpoint doesn't verify origin. Consider adding CSRF token for sensitive operations.

---

## 📊 UX Recommendations

### U1. Add Retry Button on Error

When message fails, show inline retry button instead of just error text.

### U2. Show Typing Duration

After 5+ seconds of typing indicator, show "Still thinking..." to reassure user.

### U3. Add Message Timestamps

Messages lack timestamps, making it hard to reference in support tickets.

### U4. Keyboard Shortcut for Submit

Ctrl+Enter or Cmd+Enter should submit (some users expect this).

### U5. Sound/Haptic on Message Receive

Consider subtle notification for new assistant messages (optional, default off).

### U6. Progress Indicator for Multi-Step

Show "Step 3 of 7" type indicator so users know how much is left.

### U7. Save Draft Input

If user closes chat mid-typing, preserve their draft input.

---

## 🛠 Code Quality Recommendations

### C1. Extract Chat Logic to Custom Hook

`ChatIntake` component is 320+ lines. Extract to `useChatIntake()` hook.

### C2. Add Unit Tests for Validation

`chat-validation.ts` has no test coverage. Add tests for each service type.

### C3. Type the API Response

```typescript
// Current
const response = await fetch("/api/ai/chat-intake", {...})

// Should have typed response handling
interface ChatAPIResponse { ... }
```

### C4. Consolidate Symptom/Duration Options

Options are duplicated across files with slight variations:
- `SYMPTOM_OPTIONS` in validation
- Button options in system prompt
- `SymptomCategory` type in schema

Create single source of truth.

### C5. Add JSDoc to Public Functions

Key functions like `validateIntakePayload`, `generateDoctorSummary` lack JSDoc.

---

## Recommended Priority Order

1. **Fix schema mismatch** (Critical - blocks all intake)
2. **Add `new_prescription` to validation** (High - new feature broken)
3. **Add streaming timeout** (High - UX blocker)
4. **Unify type systems** (Medium - prevents future bugs)
5. **Persist bubble dismiss** (Low - minor UX)
6. **Add Escape key handler** (Low - a11y improvement)

---

## Files to Modify

| File | Changes Needed |
|------|----------------|
| `lib/intake/chat-validation.ts` | Update field names, add new_prescription |
| `components/chat/chat-intake.tsx` | Add timeout, Escape handler, persist bubble |
| `app/api/ai/chat-intake/route.ts` | Extract model to env var |
| `lib/intake/structured-intake-schema.ts` | Consolidate with chat-validation types |

---

## Testing Checklist

- [ ] Complete med cert flow end-to-end
- [ ] Complete repeat rx flow end-to-end  
- [ ] Complete new prescription flow
- [ ] Complete consult flow
- [ ] Trigger emergency keyword block
- [ ] Trigger crisis keyword block
- [ ] Trigger controlled substance block
- [ ] Test rate limiting
- [ ] Test prompt injection defense
- [ ] Test mobile viewport
- [ ] Test keyboard-only navigation
- [ ] Test with slow network (throttled)
