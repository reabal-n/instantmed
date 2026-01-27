# API Route Consolidation Audit

**Total Routes:** 65
**Date:** January 2026

## Current Route Categories

### 1. Admin Routes (4 routes)
```
/api/admin/approve
/api/admin/decline
/api/admin/make-doctor
/api/admin/webhook-dlq
```
**Recommendation:** ✅ Keep separate - different permissions and purposes

### 2. AI Routes (5 routes)
```
/api/ai/chat-intake
/api/ai/chat-intake/validate
/api/ai/form-validation
/api/ai/review-summary
/api/ai/symptom-suggestions
```
**Recommendation:** 🔄 Consider consolidating into single `/api/ai` with action parameter
- `POST /api/ai { action: "chat" | "validate" | "form-validation" | "review-summary" | "symptom-suggestions" }`

### 3. Cron Routes (10 routes)
```
/api/cron/abandoned-checkouts
/api/cron/cleanup-orphaned-storage
/api/cron/dlq-monitor
/api/cron/emergency-flags
/api/cron/expire-certificates
/api/cron/health-check
/api/cron/process-email-retries
/api/cron/release-stale-claims
/api/cron/retry-drafts
/api/cron/stale-queue
```
**Recommendation:** ✅ Keep separate - each cron job needs distinct Vercel cron config

### 4. Doctor Routes (9 routes)
```
/api/doctor/assign-request
/api/doctor/bulk-action
/api/doctor/drafts/[intakeId]
/api/doctor/export
/api/doctor/log-view-duration
/api/doctor/monitoring-stats
/api/doctor/personal-stats
/api/doctor/script-sent
/api/doctor/update-request
```
**Recommendation:** 🔄 Consolidation opportunities:
- Merge `monitoring-stats` + `personal-stats` → `/api/doctor/stats?type=monitoring|personal`
- Merge `assign-request` + `update-request` → `/api/doctor/request { action: "assign" | "update" }`

### 5. Patient Routes (10 routes)
```
/api/patient/documents/[requestId]
/api/patient/documents/[requestId]/download
/api/patient/download-invoice
/api/patient/get-invoices
/api/patient/last-prescription
/api/patient/messages
/api/patient/profile
/api/patient/resend-confirmation
/api/patient/retry-payment
/api/patient/update-profile
```
**Recommendation:** 🔄 Consolidation opportunities:
- Merge `profile` + `update-profile` → single route with GET/PATCH methods
- Merge `download-invoice` + `get-invoices` → `/api/patient/invoices` with GET (list) and GET with id (download)

### 6. Med Cert Routes (3 routes)
```
/api/med-cert/preview
/api/med-cert/render
/api/med-cert/submit
```
**Recommendation:** ✅ Keep separate - different response types (PDF vs JSON)

### 7. Flow/Drafts Routes (2 routes)
```
/api/flow/drafts
/api/flow/drafts/[draftId]
```
**Recommendation:** ✅ Already consolidated with dynamic route

### 8. Repeat Rx Routes (3 routes)
```
/api/repeat-rx/[id]/decision
/api/repeat-rx/eligibility
/api/repeat-rx/submit
```
**Recommendation:** ✅ Keep separate - distinct operations

### 9. Test Routes (4 routes)
```
/api/test/boom
/api/test/boom-500
/api/test/edge-canary
/api/test/login
```
**Recommendation:** 🗑️ Remove in production or gate behind dev environment

### 10. Webhook Routes (3 routes)
```
/api/stripe/webhook
/api/webhooks/clerk
/api/webhooks/resend
```
**Recommendation:** ✅ Keep separate - different providers, different signatures

### 11. Misc Routes (12 routes)
```
/api/certificates/[id]/download
/api/health
/api/health/dashboard
/api/internal/send-status-email
/api/medications
/api/medications/search
/api/notifications/send
/api/profile/ensure
/api/search
/api/terminology/amt/search
/api/unsubscribe
/api/verify
```
**Recommendation:** 🔄 Consolidation opportunities:
- Merge `medications` + `medications/search` → single route
- Merge `health` + `health/dashboard` → single route with optional `?detailed=true`

---

## Summary of Recommendations

### High Priority Consolidations (Save ~8 routes)
| Current | Proposed | Savings |
|---------|----------|---------|
| `profile` + `update-profile` | Single route with GET/PATCH | 1 route |
| `download-invoice` + `get-invoices` | `/api/patient/invoices` | 1 route |
| `monitoring-stats` + `personal-stats` | `/api/doctor/stats` | 1 route |
| `assign-request` + `update-request` | `/api/doctor/request` | 1 route |
| `medications` + `medications/search` | Single route | 1 route |
| `health` + `health/dashboard` | Single route | 1 route |
| 4 test routes | Remove or single debug route | 3 routes |

### Low Priority (Complex changes)
- AI routes consolidation (5 → 1) - would require significant refactoring
- Cron routes - must stay separate for Vercel cron config

### Routes to Keep Separate
- All webhook routes (different providers)
- Certificate routes (different auth, response types)
- Admin routes (different permissions)

---

## Action Items

1. **Immediate:** Remove or disable test routes in production
2. **Short-term:** Consolidate patient profile routes (GET/PATCH pattern)
3. **Medium-term:** Consolidate stats routes with query parameters
4. **Long-term:** Consider AI route consolidation if patterns stabilize

---

## Route Count After Consolidation
- Current: 65 routes
- After high-priority: ~57 routes
- Potential minimum: ~50 routes
