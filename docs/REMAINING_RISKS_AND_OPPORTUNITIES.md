# Remaining Risks, Blind Spots & Missed Opportunities

**Generated**: 2026-01-23  
**Updated**: 2026-01-23 (Post-implementation)  
**Scope**: Post UX/UI audit analysis

---

## ✅ RESOLVED CRITICAL RISKS

### 1. ✅ PHI Exposure in Error Logs — FIXED
**Status**: Implemented  
**Files Created/Modified**:
- `lib/observability/sanitize-phi.ts` — PHI sanitization utilities
- `app/error.tsx` — Now uses `sanitizeError()` and `sanitizeUrl()`

**Implementation**: Comprehensive regex-based sanitization for Medicare numbers, phone, email, DOB, addresses, IHI, DVA numbers. All error logging now passes through sanitization layer.

---

### 2. ✅ Session Timeout Without Warning — FIXED
**Status**: Implemented  
**Files Created**:
- `components/shared/session-timeout-warning.tsx` — Modal with countdown, extend button

**Implementation**: Shows warning 5 minutes before session expiry with visual countdown bar. Users can extend session with one click. Uses Supabase `refreshSession()`.

---

### 3. ✅ Offline Handling for Intake Forms — FIXED
**Status**: Infrastructure implemented  
**Files Created**:
- `hooks/use-form-persistence.ts` — localStorage-based form persistence

**Implementation**: Debounced autosave to localStorage with 24-hour expiration, restore prompt, and version migration support. Ready for integration into intake flows.

**Note**: Hook is ready; individual intake forms need to integrate `useFormPersistence()`.

---

## ✅ RESOLVED HIGH RISKS

### 4. ✅ Doctor Queue Stale Data Risk — FIXED
**Status**: Implemented  
**Files Modified**:
- `app/doctor/queue/queue-client.tsx` — Added stale data detection and warning banner

**Implementation**: Tracks `lastSyncTime`, shows warning banner when data >60s stale or connection drops. Includes "Refresh" button and clear messaging about sync status. Critical for clinical safety.

---

### 5. ✅ Accessible Loading Component — FIXED
**Status**: Implemented  
**Files Created**:
- `components/ui/accessible-loading.tsx` — WCAG-compliant loading states

**Implementation**: `AccessibleLoading`, `LoadingWrapper`, and `PageLoading` components with proper `aria-live`, `aria-busy`, and screen reader announcements. Ready for use in loading.tsx files.

---

## REMAINING HIGH RISKS (Address This Sprint)

### 6. 🟠 No Rate Limiting UI Feedback
**Impact**: Trust, Conversion  
**Location**: API routes, form submissions

**Issue**: If a user hits rate limits (spam protection), there's no user-friendly feedback. They likely see a generic error.

**Fix Required**: Add `RateLimitedState` component with "Please wait X seconds" message.

**Priority**: P1 — Frustrating UX for legitimate users

---

### 7. 🟠 Medicare Validation Client-Side Only
**Impact**: Conversion, Trust  
**Location**: `app/patient/onboarding/onboarding-flow.tsx`

**Issue**: Medicare number validation appears to be format-only. No server-side verification against Medicare's DVA/AIR systems. Invalid Medicare numbers could cause downstream issues with PBS claims.

**Note**: May be intentional (Medicare validation is optional for med certs). Verify business requirement.

**Priority**: P1 — Depends on service requirements

---

## MEDIUM RISKS (Address Next Sprint)

### 8. 🟡 No Form Analytics
**Impact**: Conversion  
**Location**: Intake forms

**Issue**: No tracking of form abandonment, field-level drop-off, or time-to-complete. Can't optimize conversion funnel without data.

**Fix Required**: Add PostHog form analytics:
- Track field focus/blur
- Track step progression
- Measure time per step
- Log abandonment point

**Priority**: P2 — Conversion optimization

---

### 9. 🟡 Inconsistent Error Message Tone
**Impact**: Trust, Brand  
**Location**: Various error states

**Issue**: Some errors are technical ("Request failed"), others are friendly ("Something went wrong"). Inconsistent with brand voice guidelines.

**Examples**:
- ✅ Good: "We hit an unexpected bump. Don't worry — your data is safe."
- ❌ Bad: "Error: VALIDATION_FAILED" (if exposed)

**Fix Required**: Audit all error messages against brand voice rules.

**Priority**: P2 — Brand consistency

---

### 10. 🟡 No Keyboard Shortcut Discoverability
**Impact**: Efficiency  
**Location**: Doctor dashboard

**Issue**: `use-doctor-shortcuts.ts` exists but no UI shows available shortcuts. Doctors may not know they can use keyboard navigation.

**Fix Required**: Add "Keyboard shortcuts" (?) button showing available commands.

**Priority**: P2 — Doctor productivity

---

### 11. 🟡 Missing Tablet Breakpoint
**Impact**: Conversion  
**Location**: Tailwind config, responsive styles

**Issue**: Tailwind only has `sm`, `md`, `lg`, `xl` breakpoints. No dedicated tablet breakpoint (768-1024px). iPad users may get suboptimal layout.

**Evidence**: Many components jump from mobile to desktop without tablet-specific styling.

**Fix Required**: Add `tablet` breakpoint at 834px (iPad Air).

**Priority**: P2 — iPad usage in Australia is high

---

## MISSED OPPORTUNITIES (Consider for Roadmap)

### 12. 💡 Smart Form Prefill
**Impact**: Conversion (est. +15%)  
**Opportunity**: Return patients have to re-enter information they've previously provided.

**Implementation**: 
- Prefill from profile (name, DOB, Medicare)
- Remember last medication for repeat Rx
- Store common symptom descriptions

---

### 13. 💡 Progress Persistence URL
**Impact**: Conversion  
**Opportunity**: Allow users to save progress via shareable URL (like typeform).

**Implementation**: Encode form state in URL hash, allow "continue later" link.

---

### 14. 💡 Doctor Voice Notes
**Impact**: Efficiency  
**Opportunity**: Doctors typing clinical notes is slow. Allow voice-to-text for decision reasons.

**Implementation**: Use Web Speech API for voice input on decision textarea.

---

### 15. 💡 Proactive Queue Alerts
**Impact**: SLA Compliance  
**Opportunity**: Doctors only see urgency when looking at queue. Should get push/SMS if SLA breach imminent.

**Implementation**: Add notification preference for "Alert me when cases breach SLA".

---

### 16. 💡 Patient Communication Preferences
**Impact**: Trust, Conversion  
**Opportunity**: Some patients prefer SMS, others email. Currently no preference setting.

**Implementation**: Add notification preferences to patient settings.

---

## SCALABILITY CONCERNS

### 17. ⚡ Component Bundle Size
**Current State**: 33+ redundant UI components  
**Impact**: Page load time, Core Web Vitals

**Measurement Needed**: Run `npx @next/bundle-analyzer` to identify largest chunks.

**Target**: Reduce UI component bundle by 30% via consolidation.

---

### 18. ⚡ Real-time Subscription Limits
**Current State**: Multiple Supabase realtime subscriptions per page  
**Impact**: Cost, connection limits at scale

**Recommendation**: Audit subscription usage, implement subscription pooling for doctor queue.

---

## ACTION SUMMARY

| Priority | Count | Examples |
|----------|-------|----------|
| **P0 (Immediate)** | 3 | PHI logging, session timeout, offline handling |
| **P1 (This Sprint)** | 4 | Rate limit UI, stale data, loading a11y |
| **P2 (Next Sprint)** | 4 | Form analytics, keyboard shortcuts |
| **Roadmap** | 5 | Smart prefill, voice notes, proactive alerts |

---

## MONITORING RECOMMENDATIONS

1. **Add Sentry for client errors** — catch JS errors before users report
2. **Track Core Web Vitals** — LCP, FID, CLS for conversion correlation
3. **Form funnel in PostHog** — identify drop-off points
4. **Doctor efficiency metrics** — time to decision, cases per hour
5. **Accessibility audit schedule** — quarterly axe-core scans
