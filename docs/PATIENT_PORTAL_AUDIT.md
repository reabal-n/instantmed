# Patient Portal End-to-End Audit

**Audited:** 2026-01-25  
**Scope:** `/patient` routes, documents, messages, prescriptions, settings, payments, onboarding  
**Status:** Complete

---

## 1. Route Inventory

| Route | Page File | APIs/Actions Used | Auth Method |
|-------|-----------|-------------------|-------------|
| `/patient` | `app/patient/page.tsx` | Direct Supabase query (intakes, prescriptions) | `requireRole(["patient"])` |
| `/patient/documents` | `app/patient/documents/page.tsx` | Direct Supabase query (intakes with certificate_url) | `getAuthenticatedUserWithProfile()` |
| `/patient/messages` | `app/patient/messages/page.tsx` | Direct Supabase query (patient_messages) | `getAuthenticatedUserWithProfile()` |
| `/patient/prescriptions` | `app/patient/prescriptions/page.tsx` | Direct Supabase query (intakes, intake_answers, prescriptions) | `getAuthenticatedUserWithProfile()` |
| `/patient/settings` | `app/patient/settings/page.tsx` | `getEmailPreferences()`, `/api/patient/profile` | `getAuthenticatedUserWithProfile()` |
| `/patient/payment-history` | `app/patient/payment-history/page.tsx` | `<PaymentHistoryContent>` → `/api/patient/get-invoices` | `getAuthenticatedUserWithProfile()` |
| `/patient/onboarding` | `app/patient/onboarding/page.tsx` | `completeOnboardingAction()` | `getOrCreateAuthenticatedUser()` |
| `/patient/intakes/[id]` | `app/patient/intakes/[id]/page.tsx` | `getIntakeForPatient()`, `getLatestDocumentForIntake()` | `getAuthenticatedUserWithProfile()` + ownership check |
| `/patient/notifications` | `app/patient/notifications/page.tsx` | Direct Supabase query | `getAuthenticatedUserWithProfile()` |
| `/patient/health-summary` | `app/patient/health-summary/page.tsx` | Direct Supabase query | `getAuthenticatedUserWithProfile()` |

---

## 2. API Route Inventory

| API Route | Method | Auth | Ownership Check | Failure Behavior |
|-----------|--------|------|-----------------|------------------|
| `/api/patient/profile` | PATCH | Clerk `auth()` | ✅ `clerk_user_id` match | Returns 401/500 |
| `/api/patient/messages` | GET/POST | `getAuthenticatedUserWithProfile()` | ✅ `patient_id` match on intake | Returns 401/404/500 |
| `/api/patient/documents/[id]` | GET | Clerk `auth()` | ✅ Intake ownership via join | Returns 401/403/404/500 |
| `/api/patient/documents/[id]/download` | GET | `getApiAuth()` | ✅ `patient_id === userId` | Returns 400/401/403/404/500 |
| `/api/patient/get-invoices` | GET | Clerk `auth()` | ✅ `patient_id` match | Returns 401/500 |
| `/api/patient/download-invoice` | GET | Clerk `auth()` | ✅ Invoice ownership | Returns 401/403/404/500 |
| `/api/patient/retry-payment` | POST | `getAuthenticatedUserWithProfile()` | ✅ Invoice ownership | Returns 401/400/500 |
| `/api/patient/last-prescription` | GET | Clerk `auth()` | ✅ Patient ID from profile | Returns 401/500 |
| `/api/patient/resend-confirmation` | POST | Clerk `auth()` | ✅ Intake ownership | Returns 401/404/500 |
| `/api/patient/update-profile` | PATCH | Clerk `auth()` | ✅ `clerk_user_id` match | Returns 401/500 |

---

## 3. Access Control & RLS Verification

### 3.1 RLS Policies — Verified ✅

| Table | Policy | Status |
|-------|--------|--------|
| `intakes` | `patient_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())` | ✅ |
| `intake_answers` | Intake ownership via subquery | ✅ |
| `intake_documents` | Intake ownership via subquery | ✅ |
| `patient_messages` | `patient_id` match | ✅ |
| `attachments` | Intake ownership via subquery | ✅ |
| `audit_log` | Intake ownership (limited SELECT) | ✅ |
| `documents` | Request ownership via subquery | ✅ |
| `payments` | Request ownership via subquery | ✅ |

### 3.2 Application-Level Ownership Checks — Verified ✅

| Location | Pattern | Status |
|----------|---------|--------|
| `getIntakeForPatient()` | `.eq("patient_id", patientId)` | ✅ |
| `/api/patient/messages` POST | Verifies `intake.patient_id !== patientId` | ✅ |
| `/api/patient/documents/[id]/download` | `intakeData.patient_id !== userId` check | ✅ |
| `/api/patient/documents/[id]` | `intake.patient_id !== profile.id` check | ✅ |

### 3.3 Cross-Patient Access Risk — LOW

All routes use service role client with explicit ownership filters. No identified path where Patient A can access Patient B's data.

---

## 4. Failure Behavior Analysis

### 4.1 Dashboard (`/patient`)

| Failure | Behavior | UX Impact |
|---------|----------|-----------|
| Intakes fetch fails | Logs error, returns empty array | ⚠️ Silent — patient sees empty state with no explanation |
| Prescriptions fetch fails | Logs error, returns empty array | ⚠️ Silent — patient sees empty state |

**Gap:** No error indicator when data fails to load.

### 4.2 Documents (`/patient/documents`)

| Failure | Behavior | UX Impact |
|---------|----------|-----------|
| Auth fails | Redirects to `/sign-in` | ✅ Clear |
| Onboarding incomplete | Redirects to `/patient/onboarding` | ✅ Clear |
| Fetch fails | Silent empty state | ⚠️ No error message |
| Document URL missing | Shows "Processing" badge | ✅ Clear |

### 4.3 Intake Detail (`/patient/intakes/[id]`)

| Failure | Behavior | UX Impact |
|---------|----------|-----------|
| Intake not found | `notFound()` — 404 page | ✅ |
| Wrong patient | `notFound()` | ✅ Safe, doesn't leak info |
| Document fetch fails | `null` — no download button shown | ⚠️ No explanation why doc missing |
| Decline reason | Shows in red box with reason | ✅ Good |
| Payment retry fails | Shows error in red banner | ✅ Clear |

### 4.4 Messages (`/patient/messages`)

| Failure | Behavior | UX Impact |
|---------|----------|-----------|
| Fetch fails | Empty inbox | ⚠️ Silent failure |
| Send fails | Toast "Failed to send message" | ✅ Clear |
| No refresh after send | Comment says "Refresh would happen in production" | ⚠️ **BUG** — message doesn't appear immediately |

### 4.5 Onboarding (`/patient/onboarding`)

| Failure | Behavior | UX Impact |
|---------|----------|-----------|
| Validation error | Inline field errors | ✅ Clear |
| Server action fails | Shows global error banner | ✅ Clear |
| Medicare validation | Inline error + expiry warning | ✅ Good |

### 4.6 Settings (`/patient/settings`)

| Failure | Behavior | UX Impact |
|---------|----------|-----------|
| Profile update fails | Toast "Failed to update profile" | ✅ |
| Password change wrong | Detailed error from action | ✅ |
| Export data fails | Toast "Failed to export" | ✅ |
| Delete account fails | Toast with error | ✅ |

### 4.7 Payment History (`/patient/payment-history`)

| Failure | Behavior | UX Impact |
|---------|----------|-----------|
| Fetch fails | Toast "Failed to load payment history" | ✅ |
| Download fails | Toast "Failed to download invoice" | ✅ |
| Retry fails | Toast "Failed to retry payment" | ✅ |

---

## 5. UX Gaps That Will Generate Support Tickets

### 5.1 HIGH — Will definitely cause tickets

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **Missing document with no explanation** | `intake-detail-client.tsx:432` | Patient sees "approved" but no download button if `document.pdf_url` is null | Add "Document is being generated" message |
| **Messages don't refresh after send** | `messages-client.tsx:97-98` | Patient sends message, it doesn't appear | Add `router.refresh()` or optimistic update |
| **Silent data load failures** | `page.tsx` (dashboard, documents) | Empty state looks like "no data" not "error" | Add error state UI |
| **No ETA on pending requests** | `intake-detail-client.tsx:331-339` | Patient sees "waiting for review" with vague SLA message | Add real-time position in queue or estimated time |

### 5.2 MEDIUM — Likely to cause tickets

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **Declined with no reason** | `intake-detail-client.tsx:356-371` | If `decline_reason_note` is null, just says "declined" | Ensure all declines have reason, or add generic explanation |
| **No resend for scripts** | `intake-detail-client.tsx:474-485` | Resend only works if `intakeDocument` exists | Add resend for all approved documents |
| **Payment history empty despite paid intakes** | `payment-history-content.tsx` | Uses invoices table, not intakes | Consider showing intake payments too |
| **Stale payment intakes buried** | `panel-dashboard.tsx:122-127` | Detected but not prominently shown | Add "Complete payment" card at top |
| **Medicare update requires support contact** | `settings-client.tsx:497-506` | Patient can't self-update Medicare | Add edit flow or at least clearer instructions |

### 5.3 LOW — May cause tickets

| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| **No notification badge on shell** | `patient-shell.tsx` | Unread messages not visible from nav | Add unread count badge |
| **Prescription renewal link 404s** | `prescriptions/client.tsx:122,148` | Links to `/repeat-prescription/request` | Verify route exists |
| **Receipt link goes to Stripe dashboard** | `documents-client.tsx:176-183` | Patient may not have Stripe access | Generate PDF receipt instead |

---

## 6. Payment State Clarity

### Current States Displayed

| Intake Status | Payment Status | What Patient Sees | Clarity |
|---------------|----------------|-------------------|---------|
| `pending_payment` | `pending` | "Payment Required" card with CTA | ✅ Clear |
| `paid` | `paid` | "Waiting for doctor review" | ✅ Clear |
| `in_review` | `paid` | "Doctor is reviewing" | ✅ Clear |
| `approved` | `paid` | "Approved" + download | ✅ Clear |
| `approved` | `refunded` | Refund badge shown | ✅ Clear |
| `declined` | `paid` | "Declined" + reason | ✅ Clear |
| `cancelled` | `pending` | "Cancelled" | ⚠️ No refund info |

### Gap: Refund Eligibility Not Shown

When a request is declined, patient doesn't know if they're eligible for refund. Need to add:
- "You may be eligible for a refund" message
- Or automatic refund status

---

## 7. Data Loading Patterns

| Page | Pattern | Pagination | Risk |
|------|---------|------------|------|
| Dashboard | Direct query | `.limit(20)` intakes, `.limit(10)` prescriptions | ✅ |
| Documents | Direct query | No limit on certificates | ⚠️ Could grow unbounded |
| Messages | Direct query | `.limit(50)` | ✅ |
| Prescriptions | Direct query | No limit | ⚠️ Could grow unbounded |
| Payment History | Client fetch | No limit specified | ⚠️ Could grow unbounded |

---

## 8. Recommendations (Max 10)

### HIGH Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 1 | **Messages don't refresh after send** | `app/patient/messages/messages-client.tsx:97` | Add `router.refresh()` after successful send |
| 2 | **Silent dashboard data failures** | `app/patient/page.tsx:42-47` | Add error state props to `PanelDashboard` and show error UI |
| 3 | **Missing document with no explanation** | `app/patient/intakes/[id]/client.tsx:432` | Add "Document is being generated, please wait" when `pdf_url` is null but status is approved |

### MEDIUM Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 4 | **Declined with no reason shown** | `app/patient/intakes/[id]/client.tsx:356-371` | Add fallback: "The doctor was unable to approve this request. Contact support for details." |
| 5 | **Stale pending_payment not prominent** | `components/patient/panel-dashboard.tsx:122-127` | Add prominent "Complete Payment" card above all other content |
| 6 | **No ETA on pending requests** | `app/patient/intakes/[id]/client.tsx:331-339` | Add queue position or "Most requests reviewed within 1 hour" |
| 7 | **Unbounded documents query** | `app/patient/documents/page.tsx:23-38` | Add `.limit(100)` and pagination UI |

### LOW Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 8 | **Receipt links to Stripe** | `app/patient/documents/documents-client.tsx:176` | Generate downloadable PDF receipt |
| 9 | **No unread badge in nav** | `app/patient/patient-shell.tsx` | Add unread messages count to Messages nav item |
| 10 | **Medicare requires support contact** | `app/patient/settings/settings-client.tsx:497` | Add "Update Medicare" form or clearer self-service instructions |

---

## 9. Summary

| Area | Status | Risk Level |
|------|--------|------------|
| Route protection | ✅ All routes check auth | Low |
| RLS policies | ✅ Patient isolation enforced | Low |
| Ownership checks | ✅ App-level checks present | Low |
| Failure communication | ⚠️ Silent failures common | Medium |
| Payment state clarity | ⚠️ Refund eligibility unclear | Medium |
| Data pagination | ⚠️ Some unbounded queries | Medium |
| Real-time updates | ⚠️ Messages don't refresh | High |

**Overall Assessment:** The patient portal has strong access control and ownership verification. The main risks are UX gaps that will generate support tickets: silent failures, missing document explanations, and messages not refreshing after send. Addressing the top 3 recommendations will significantly reduce support load.
