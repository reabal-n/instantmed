# Full Codebase Audit: Duplicates, Redundancies & Go-Live Readiness

## PART 1 -- DUPLICATE / REDUNDANCY FINDINGS

---

### 1. DATABASE: Two `audit_log` tables (CRITICAL)

**`audit_log`** (singular) -- NO RLS, no policies, used by 1 file (`app/admin/compliance/page.tsx`)
**`audit_logs`** (plural) -- Has RLS + 2 policies, used by ~15 files (the canonical system)

The singular `audit_log` table has **RLS disabled** meaning any authenticated user can read/write it. It shares overlapping columns (`intake_id`, `profile_id`, `metadata`, `from_state`, `to_state`) with the plural version. The codebase almost exclusively uses `audit_logs` (plural). The singular table is a legacy remnant.

**Risk**: Data split across two tables; the singular one is a security gap (no RLS).
**Fix**: Migrate any remaining data from `audit_log` to `audit_logs`, update `compliance/page.tsx` to query `audit_logs`, then drop the old table.

---

### 2. DATABASE: Legacy `requests` table still exists

The DB has both `requests` and `intakes` tables with overlapping schemas (both have `status`, `patient_id`, `claimed_by`, `payment_status`, `doctor_notes`, `script_sent`, etc.). The codebase uses `intakes` (~100+ references across ~90 files) and `requests` has 0 `.from("requests")` references in app code -- but it still has 5 RLS policies active.

**Risk**: Legacy `requests` table consuming DB resources with active RLS policies but no reads/writes. Could confuse future developers.
**Fix**: After confirming no data needs migrating, remove the `requests` table and its RLS policies.

---

### 3. DATABASE: Two email tracking tables

- **`email_outbox`** -- The canonical outbox, used by ~22 files. Tracks send status, retry, provider message ID.
- **`email_delivery_log`** -- Zero code references. Has overlapping columns (`email_type`, `recipient_email`, `status`, `resend_message_id`, `retry_count`). Complete dead table.
- **`email_retry_queue`** -- Used by only 1 file (`lib/email/retry-queue.ts`), but `email_outbox` already has `retry_count` + `status` fields that handle retries.

**Risk**: Three tables for email tracking; only one is actually used. The retry queue is a separate mechanism from the outbox retry system.
**Fix**: Remove `email_delivery_log` (dead). Evaluate whether `email_retry_queue` can be consolidated into `email_outbox` retry logic.

---

### 4. DATABASE: Three document-related tables

- **`issued_certificates`** -- The canonical certificate table (used by ~20 files). Has storage_path, verification, audit trail.
- **`documents`** -- Used by ~14 files. Has `pdf_url`, `verification_code`. Overlaps heavily with `issued_certificates`.
- **`intake_documents`** -- Used by ~10 files. Has `storage_path`, `document_type`, `verification_code`. More of an attachment/upload table.

**Risk**: Certificate data potentially split across `issued_certificates` and `documents`. Download routes query different tables.
**Fix**: Clarify canonical ownership: `issued_certificates` for med certs, `intake_documents` for uploads/attachments, and evaluate whether `documents` can be deprecated.

---

### 5. API ROUTES: Three certificate download endpoints

1. **`/api/certificates/[id]/download`** -- Looks up by certificate ID from `issued_certificates`. Clean, proper auth.
2. **`/api/patient/documents/[requestId]/download`** -- Looks up by intake/request ID. Has legacy `requests` fallback logic.
3. **`/api/patient/download-document`** -- Looks up by query param `intakeId`. Older pattern.

**Risk**: Three different ways to download the same PDF. Different auth patterns, different error handling, potential for one to break without noticing.
**Fix**: Consolidate to a single canonical endpoint (`/api/certificates/[id]/download`). Have the other two redirect or be removed after updating all callers.

---

### 6. API ROUTES: Two approval endpoints

1. **`/api/intakes/[id]/approve`** -- Doctor-facing, used in the document builder flow. Has rate limiting.
2. **`/api/admin/approve`** -- Admin-facing with API key auth. Also calls `generateMedCertPdfAndApproveAction`.

These serve different auth models (doctor session vs API key) so having both is intentional, but they share no common approval logic -- each implements its own.

**Fix**: Extract shared approval logic into a single `lib/approval/approve-intake.ts` function that both routes call.

---

### 7. API ROUTES: Duplicate email dispatcher

- **`/api/cron/email-dispatcher`** (GET, Vercel cron, uses `verifyCronRequest`)
- **`/api/ops/email-dispatcher`** (POST, external cron, uses `OPS_CRON_SECRET`)

Both call the same `processEmailDispatch` function. The ops one is documented as an "alternative for external cron services."

**Risk**: Low -- intentionally different auth mechanisms for different callers.
**Fix**: Keep both if external cron is needed, otherwise remove `/api/ops/email-dispatcher`.

---

### 8. PAGE ROUTES: admin/ vs doctor/admin/ duplication

The following pages exist as **exact copies** under both `/admin/ops/` and `/doctor/admin/ops/`:

| admin/ path | doctor/admin/ path | Same code? |
|---|---|---|
| `/admin/ops/intakes-stuck` | `/doctor/admin/ops/intakes-stuck` | YES, identical |
| `/admin/ops/doctors` | `/doctor/admin/ops/doctors` | YES, identical (different client file name) |
| `/admin/ops/reconciliation` | `/doctor/admin/ops/reconciliation` | YES, identical |
| `/admin/ops` | `/doctor/admin/ops` | Different (admin=full ops dashboard, doctor=link hub) |
| `/admin/email-outbox` | `/doctor/admin/email-outbox` | admin redirects to /admin/email-hub |

The `doctor/admin` routes exist so doctors with admin privileges can access ops tools from the doctor sidebar. But the pages are full copies, not redirects.

**Fix**: Make `doctor/admin/ops/*` pages simple redirects to `admin/ops/*` (like `doctor/admin/emails` already does). The `requireRole(["doctor", "admin"])` auth check works the same either way.

---

### 9. EMAIL SYSTEM: 6+ send functions, unclear canonical path

| Function | File | Purpose |
|---|---|---|
| `sendViaResend` | `lib/email/resend.ts` | Low-level Resend API call |
| `sendCriticalEmail` | `lib/email/resend.ts` | Bypass outbox for critical emails |
| `sendEmail` | `lib/email/send-email.ts` | Outbox-based send (queues to email_outbox) |
| `sendFromOutboxRow` | `lib/email/send-email.ts` | Process a queued outbox row |
| `sendTemplateEmail` | `lib/email/template-sender.ts` | Template-based send with DB-stored templates |
| `sendStatusEmail` | `lib/email/send-status.ts` | Status transition emails |

Some callers use `sendViaResend` directly (bypassing the outbox), others use `sendEmail` (outbox-based). There's no clear hierarchy or documented "which to use when" guide.

**Risk**: Emails sent via `sendViaResend` directly skip the outbox audit trail. The retry-payment route, notifications route, contact form, and test emails all bypass the outbox.
**Fix**: Document the canonical flow: `sendEmail` (outbox) for all patient-facing emails, `sendViaResend` only for internal/admin/test emails. Consider wrapping `sendViaResend` callers.

---

### 10. ADMIN PAGES: Email management fragmentation

There are **5 separate admin email pages**:

| Page | Purpose |
|---|---|
| `/admin/email-hub` | Unified email dashboard (stats + recent activity) |
| `/admin/email-outbox` | Redirect to /admin/email-hub |
| `/admin/email-queue` | Failed email delivery queue (uses `email_delivery_log` -- the dead table!) |
| `/admin/email-test` | Send test emails |
| `/admin/emails` | Email template editor |
| `/admin/emails/preview` | Email template preview |
| `/admin/emails/analytics` | Email send analytics |

**Risk**: `/admin/email-queue` queries `email_delivery_log` which has zero writes -- this page will always be empty. Five pages for email management is fragmented.
**Fix**: Remove `/admin/email-queue` (dead data source). Consolidate email-test into email-hub. Templates + preview can stay separate.

---

### 11. ADMIN PAGES: Performance monitoring duplication

- `/admin/performance` -- "Performance Monitoring" (client-side polling)
- `/admin/performance-dashboard` -- "Performance Dashboard" (different component)
- `/admin/performance/database` -- Database-specific performance

**Fix**: Consolidate into a single `/admin/performance` page with tabs.

---

### 12. REDIRECT-ONLY PAGES (Low risk but cluttered)

These pages exist solely as redirects:
- `/dashboard` → `/patient`
- `/login` → external Clerk URL
- `/home` → `/`
- `/onboarding` → `/patient/onboarding`
- `/account` → `/patient/settings`
- `/doctor/dashboard` → `/doctor/queue` → `/doctor` (chain!)
- `/doctor/queue` → `/doctor`
- `/admin/email-outbox` → `/admin/email-hub`
- `/doctor/admin/emails` → `/admin/emails`

**Risk**: Redirect chains waste server round-trips. But most are harmless SEO catch-alls.
**Fix**: Make `/doctor/dashboard` redirect directly to `/doctor` (skip the chain). Keep others as-is.

---

## PART 2 -- GO-LIVE REFINEMENTS

---

### INFRASTRUCTURE / OPS

1. **`audit_log` table has RLS disabled** -- Any authenticated user can read it. Must enable RLS or drop it.

2. **No `CRON_SECRET` rotation mechanism** -- All cron routes use the same shared secret. Document rotation procedure.

3. **`/api/test/*` routes exposed in production** -- `boom`, `boom-500`, `edge-canary`, `login` test routes all check `PLAYWRIGHT !== "1"` but still add to the API surface. Consider middleware to block `/api/test/*` entirely in production.

4. **`(dev)/email-preview` route** -- Checks `NODE_ENV === "production"` to redirect, but the route still exists in the build. Use `next.config` route groups or middleware instead.

5. **Missing error monitoring on email_retry_queue** -- The `email_retry_queue` table is processed by `lib/email/retry-queue.ts` but there's no cron job to actually process it. The only cron is `email-dispatcher` which processes `email_outbox`.

6. **Orphaned storage cleanup** -- `/api/cron/cleanup-orphaned-storage` exists but verify it's in `vercel.json` cron schedule.

---

### VISUAL / UX

7. **Patient mobile nav missing key pages** -- Mobile users can't reach Documents or Health Summary. These are critical pages (cert download, health data).

8. **Patient panel-dashboard download button does nothing** -- The "Download certificate" button in the intake drawer has no `onClick` or `href`. Patients see a clickable button that does nothing.

9. **Payment history page has standalone styling** -- Uses `min-h-screen bg-slate-50` which fights the shell layout. Should use shell-consistent styling.

10. **Notifications unreachable** -- `/patient/notifications` exists with proper content but no nav link points to it. Add a bell icon in the shell header.

11. **Messages unreachable** -- `/patient/messages` has a messaging UI but no navigation entry. Either link it or remove it.

12. **Doctor mobile nav links to non-existent pages** -- `DoctorMobileNav` component links to `/doctor/pending`, `/doctor/calendar`, `/doctor/profile` -- none exist. Component is exported but never imported.

---

### EMAIL

13. **Med cert approval email works correctly** -- The `approveAndSendCert` function properly: generates PDF, uploads to storage, creates `issued_certificates` record, sends email via outbox, creates in-app notification. The email contains a "View Dashboard" link to `/patient/intakes/{id}` where the download card renders.

14. **Bypassed outbox in several routes** -- These callers use `sendViaResend` directly, meaning no audit trail in `email_outbox`:
    - `/api/patient/retry-payment` 
    - `/api/notifications/send`
    - `/api/admin/test-email`
    - `actions/send-test-email`
    - `actions/contact-form`
    - `actions/export-data`
    - `actions/admin-email-preview`
    - `actions/email-retry`

15. **`sendStatusEmail` sends directly too** -- Status transition emails use `sendViaResend` rather than the outbox. These are patient-facing and should be tracked.

---

### FUNCTIONS / LOGIC

16. **Two separate "send email" codepaths for cert approval** -- `approve-cert.ts` uses `sendEmail` (outbox-based) while `email-retry.ts` for resending uses `sendViaResend` (direct). A retry of a failed cert email would bypass the outbox.

17. **`lib/data/documents.ts` vs `lib/data/issued-certificates.ts`** -- Both provide cert/document lookup functions. `issued-certificates.ts` is the canonical source for med certs. `documents.ts` still queries the `documents` table. Some routes use one, some the other.

18. **Idempotency key generation** -- `approve-cert.ts` generates idempotency keys for `issued_certificates` but the `/api/intakes/[id]/approve` route generates its own. Should use the same utility.

---

## PART 3 -- RECOMMENDED PRIORITY ORDER

### P0 (Must fix before go-live)
- [x] Fix compliance page to use `audit_logs` (plural) instead of dead `audit_log` (singular)
- [x] Fix patient download button in panel-dashboard (now links to intake detail)
- [x] Block `/api/test/*` routes in production (middleware guard added)
- [ ] Verify med cert email is sent on approval (already confirmed working)

### P1 (Should fix before go-live)  
- [ ] Drop `email_delivery_log` table (dead, causes `/admin/email-queue` to show empty)
- [ ] Remove `/admin/email-queue` page (queries dead table)
- [x] Convert `doctor/admin/ops/*` duplicate pages to redirects + delete dead client components
- [x] Fix patient mobile nav (add Documents, fix Settings link to /patient/settings)
- [x] Add notifications bell icon in LeftRail header
- [x] Fix doctor redirect chain (`/doctor/dashboard` → `/doctor` directly)
- [x] Remove dead `DoctorMobileNav` component + dead `/doctor/dashboard/doctor-shell.tsx`
- [x] Fix sidebar ops links to use canonical `/admin/ops/*` paths (avoids middleware hops)
- [x] Fix email-outbox infinite redirect loop (removed middleware entry, kept canonical at /doctor/admin/email-outbox)
- [x] Fix payment-history page standalone styling (removed duplicate chrome, uses shell layout)
- [x] Remove dead patientNavItems from DashboardSidebar (only used for doctor)
- [x] Fix LeftRail to only render patient nav (doctor uses DashboardSidebar)

### P2 (Clean up post-launch)
- [ ] Consolidate 3 cert download endpoints → 1 canonical
- [ ] Consolidate email send functions with clear "when to use which" docs
- [ ] Drop legacy `requests` table + RLS policies
- [ ] Consolidate `documents` table into `issued_certificates` + `intake_documents`
- [ ] Merge `/admin/performance` + `/admin/performance-dashboard`
- [ ] Consolidate admin email pages (5 pages → 2-3)
- [ ] Route `sendViaResend` direct callers through outbox where appropriate
- [ ] Remove `email_retry_queue` table if fully replaced by `email_outbox` retry logic
