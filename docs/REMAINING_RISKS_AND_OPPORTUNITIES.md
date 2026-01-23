# Remaining Risks, Blind Spots & Missed Opportunities

**Generated**: 2026-01-23  
**Scope**: Post UX/UI audit analysis

---

## CRITICAL RISKS (Address Immediately)

### 1. 🔴 PHI Exposure in Error Logs
**Impact**: Safety, Trust, Compliance  
**Location**: `app/error.tsx`, logging throughout

**Issue**: Error boundaries log to console/server which may include PHI in stack traces or error context. The `createLogger` utility logs error messages that could contain patient names, Medicare numbers, or health information.

**Evidence**: Line 24-30 in `app/error.tsx` logs full error context including URL which may contain patient identifiers in query params.

**Fix Required**:
```tsx
// Sanitize before logging
const sanitizedError = {
  message: error.message.replace(/\d{10,}/g, '[REDACTED]'), // Medicare numbers
  name: error.name,
  digest: error.digest,
  // DO NOT log: url, user data, form values
}
```

**Priority**: P0 — Regulatory risk (Privacy Act 1988, AHPRA)

---

### 2. 🔴 Session Timeout Without Warning
**Impact**: Conversion, Safety  
**Location**: Auth/session management

**Issue**: No visible session timeout warning. Users filling long intake forms may lose data if session expires. For clinical safety, a doctor mid-review could lose decision state.

**Missing**: 
- Session countdown warning (5 min before expiry)
- Form autosave before session drop
- "Your session is expiring" modal

**Fix Required**: Add `SessionTimeoutWarning` component to patient/doctor shells.

**Priority**: P0 — Data loss risk, conversion killer

---

### 3. 🔴 No Offline Handling for Intake Forms
**Impact**: Conversion, Trust  
**Location**: Intake flow components

**Issue**: `NetworkStatus` component exists but intake forms don't gracefully handle offline state. Users on mobile (target demographic) may lose partially completed forms if connection drops.

**Evidence**: `components/ui/error-recovery.tsx` has retry logic but intake forms don't persist to localStorage.

**Fix Required**:
- Auto-save intake answers to localStorage every 30 seconds
- Show "Saved offline" indicator
- Sync when connection restored

**Priority**: P0 — Mobile users are core demographic

---

## HIGH RISKS (Address This Sprint)

### 4. 🟠 No Rate Limiting UI Feedback
**Impact**: Trust, Conversion  
**Location**: API routes, form submissions

**Issue**: If a user hits rate limits (spam protection), there's no user-friendly feedback. They likely see a generic error.

**Fix Required**: Add `RateLimitedState` component with "Please wait X seconds" message.

**Priority**: P1 — Frustrating UX for legitimate users

---

### 5. 🟠 Doctor Queue Stale Data Risk
**Impact**: Safety, Efficiency  
**Location**: `app/doctor/queue/queue-client.tsx`

**Issue**: Real-time subscriptions exist but if connection drops, the queue may show stale data. A doctor could pick up a case already being reviewed.

**Evidence**: Supabase realtime subscription in queue, but no "last updated" indicator or stale data warning.

**Fix Required**:
- Add "Last synced: X seconds ago" indicator
- Show warning if >30 seconds stale
- Auto-refresh on reconnection

**Priority**: P1 — Clinical safety (double-handling risk)

---

### 6. 🟠 Medicare Validation Client-Side Only
**Impact**: Conversion, Trust  
**Location**: `app/patient/onboarding/onboarding-flow.tsx`

**Issue**: Medicare number validation appears to be format-only. No server-side verification against Medicare's DVA/AIR systems. Invalid Medicare numbers could cause downstream issues with PBS claims.

**Note**: May be intentional (Medicare validation is optional for med certs). Verify business requirement.

**Priority**: P1 — Depends on service requirements

---

### 7. 🟠 No Accessible Loading Announcements
**Impact**: Accessibility  
**Location**: 27 `loading.tsx` files

**Issue**: Loading states exist but don't announce to screen readers. The `LiveRegion` component exists but isn't used in loading states.

**Fix Required**: Add `aria-busy="true"` to loading containers and announce "Loading" via LiveRegion.

**Priority**: P1 — WCAG 2.1 Level AA requirement

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
