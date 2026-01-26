# Security & Privacy Posture Audit

**Audited:** 2026-01-25  
**Scope:** RLS policies, API auth, secrets, storage buckets, PHI storage  
**Status:** Complete

---

## 1. Tables Containing PHI

### 1.1 PHI Data Inventory

| Table | PHI Fields | Encryption | RLS Enabled |
|-------|------------|------------|-------------|
| `profiles` | `medicare_number`, `date_of_birth`, `phone`, `full_name`, `address_*` | ✅ Encrypted columns exist | ✅ Yes |
| `intakes` | `client_ip`, `doctor_notes`, `decline_reason` | ❌ Plaintext | ✅ Yes |
| `intake_answers` | `answers` (JSONB), `allergy_details`, `medical_conditions`, symptom fields | ❌ Plaintext | ✅ Yes |
| `ai_chat_transcripts` | `messages` (JSONB) - full conversation | ❌ Plaintext | ✅ Yes |
| `ai_chat_audit_log` | `user_input_preview`, `ai_output_preview` | ❌ Truncated (privacy measure) | ✅ Yes |
| `patient_notes` | `content`, `title` | ❌ Plaintext | ✅ Yes |
| `documents` | `storage_path` (references PDF with PHI) | N/A (storage) | ✅ Yes |
| `issued_certificates` | `generated_data` (JSONB), `patient_name`, `pdf_storage_path` | ❌ Plaintext | ✅ Yes |
| `health_summary` | Clinical summary content | ❌ Plaintext | ✅ Yes |
| `document_drafts` | `content` (AI-generated clinical content) | ❌ Plaintext | ✅ Yes |

### 1.2 Encryption Status

**Encrypted Fields (AES-256-GCM):**
```
@/Users/rey/Desktop/instantmed/supabase/migrations/20250122000001_add_encrypted_phi_columns.sql:16-19
```
- `profiles.medicare_number_encrypted`
- `profiles.date_of_birth_encrypted`
- `profiles.phone_encrypted`

**Gap:** Original plaintext columns still exist alongside encrypted columns (migration in progress).

**Encryption Implementation:**
```
@/Users/rey/Desktop/instantmed/lib/security/encryption.ts:63-82
```
- AES-256-GCM with unique IV per encryption
- Base64 encoding for storage
- Verified at startup via `verifyEncryptionSetup()`

---

## 2. RLS Policy Analysis

### 2.1 Patient Data Isolation

| Table | Patient Access Pattern | Cross-Patient Risk |
|-------|------------------------|-------------------|
| `profiles` | `auth_user_id = auth.uid()` | ✅ Safe - tied to auth user |
| `intakes` | Via `patient_id → profiles.auth_user_id` | ✅ Safe - proper join |
| `intake_answers` | Via `intake_id → intakes → patient_id` | ✅ Safe - chained join |
| `documents` | Via `request_id → intakes → patient_id` | ✅ Safe - chained join |
| `ai_chat_transcripts` | `patient_id = auth.uid()` | ✅ Safe - direct match |
| `patient_notes` | Via `patient_id → profiles.auth_user_id` | ✅ Safe - proper join |
| `audit_log` | Via `intake_id → intakes → patient_id` | ✅ Safe - limited event types |

### 2.2 Doctor/Admin Access

| Table | Doctor Policy | Admin Policy |
|-------|---------------|--------------|
| `profiles` | SELECT all (for patient lookup) | SELECT all |
| `intakes` | SELECT/UPDATE all | SELECT/UPDATE all |
| `intake_answers` | SELECT all | SELECT/UPDATE all |
| `documents` | SELECT/INSERT all | SELECT/INSERT all |
| `audit_logs` | SELECT all | SELECT all |
| `ai_chat_transcripts` | SELECT all | SELECT all |
| `patient_notes` | SELECT/INSERT all, UPDATE own | SELECT/INSERT all, UPDATE own |

### 2.3 RLS Performance Optimization

All policies use optimized pattern:
```sql
(select auth.uid())  -- Evaluated once per query
```
Instead of:
```sql
auth.uid()  -- Evaluated per row
```

### 2.4 RLS Policy Gaps

| Issue | Table | Risk |
|-------|-------|------|
| **`intake_drafts` session access** | `intake_drafts` | LOW - `session_id IS NOT NULL` allows unauthenticated read if session known |
| **`documents` bucket public** | `storage.objects` | MEDIUM - Documents bucket is PUBLIC read (see §4) |
| **No DELETE policy** | Multiple tables | ✅ Intentional - audit trail preservation |

---

## 3. API Auth Consistency

### 3.1 Auth Pattern Usage

| Pattern | Count | Files |
|---------|-------|-------|
| `auth()` from `@/lib/auth` | 20+ | Most API routes |
| `getApiAuth()` | 5 | Document download, med-cert routes |
| `requireRole()` | 10+ | Admin/doctor layouts, actions |
| Direct `clerkAuth()` | 3 | Low-level auth helpers |

### 3.2 Auth Check Locations

**Page/Layout Level:**
```
@/Users/rey/Desktop/instantmed/app/admin/layout.tsx
```
- Uses `requireRole(["admin"])` - all admin routes protected

**API Route Level:**
```typescript
// Pattern used in most routes:
const { userId } = await auth()
if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

### 3.3 Auth Gaps Identified

| Route | Issue | Risk |
|-------|-------|------|
| `/api/health` | No auth required | ✅ Intentional - health check |
| `/api/cron/*` | Uses `verifyCronRequest()` | ✅ Vercel cron auth |
| `/api/webhooks/*` | Signature verification | ✅ Proper webhook auth |
| `/api/ai/chat-intake` | Auth optional (rate limited) | ⚠️ MEDIUM - Unauthenticated AI access |

### 3.4 E2E Test Auth Bypass

```
@/Users/rey/Desktop/instantmed/lib/auth.ts:23-25
```
```typescript
function isE2ETestModeEnabled(): boolean {
  return process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT === "1"
}
```

**Risk Assessment:** LOW - Only enabled when `NODE_ENV=test` or `PLAYWRIGHT=1`. Production uses neither.

---

## 4. Storage Buckets & Signed URLs

### 4.1 Bucket Configuration

| Bucket | Public | File Limit | Allowed Types | Purpose |
|--------|--------|------------|---------------|---------|
| `attachments` | ❌ Private | 10MB | Images, PDF, DOC | Patient uploads |
| `documents` | ⚠️ **PUBLIC** | 5MB | PDF only | Generated certificates |

### 4.2 Documents Bucket Security Issue

```
@/Users/rey/Desktop/instantmed/supabase/migrations/20241215000005_documents_storage.sql:14-25
```
```sql
INSERT INTO storage.buckets (id, name, public, ...)
VALUES ('documents', 'documents', TRUE, ...)  -- PUBLIC read!
```

**Risk:** Anyone with a document URL can download it without authentication.

**Mitigation in Place:**
```
@/Users/rey/Desktop/instantmed/lib/storage/documents.ts:60-76
```
- Application uses signed URLs with 7-day expiry
- URLs not exposed directly to patients in UI

**Residual Risk:** MEDIUM - If URL is shared/leaked, document accessible for 7 days.

### 4.3 Signed URL Usage

| Operation | Expiry | Implementation |
|-----------|--------|----------------|
| Document download | 7 days | `createSignedUrl(path, 604800)` |
| Certificate download | 7 days | Via `getSignedUrl()` helper |
| Attachment access | Session-based | RLS-protected, no signed URL needed |

### 4.4 Storage RLS Policies

**Attachments (Private):**
- INSERT: Patient can upload to own intake folders
- SELECT: Patient can view own uploads, doctors can view all
- DELETE: Patient can delete only from draft intakes

**Documents (Public):**
- SELECT: Anyone (`bucket_id = 'documents'`)
- INSERT: Doctors only
- DELETE: No one (immutable audit trail)

---

## 5. Transcript & Clinical Note Storage

### 5.1 AI Chat Transcripts

```
@/Users/rey/Desktop/instantmed/supabase/migrations/20250126000002_create_chat_transcripts.sql:5-42
```

| Field | Content | Risk |
|-------|---------|------|
| `messages` | Full conversation JSONB | HIGH - Contains all PHI discussed |
| `session_id` | Session identifier | LOW |
| `safety_flags` | Safety trigger history | LOW |

**RLS Protection:**
- Patients: Own transcripts only (`patient_id = auth.uid()`)
- Doctors: All transcripts (for clinical review)
- Service role: Full access (for API routes)

### 5.2 Clinical Notes

**Storage Locations:**

| Field | Table | Content |
|-------|-------|---------|
| `doctor_notes` | `intakes` | Doctor's private notes |
| `content` | `patient_notes` | Longitudinal patient notes |
| `content` | `document_drafts` | AI-generated clinical content |
| `generated_data` | `issued_certificates` | Certificate content JSON |

**RLS for `patient_notes`:**
- Patients can view own notes (except `note_type = 'admin'`)
- Doctors can view all, create all, update own

### 5.3 PHI in Audit Logs

| Table | PHI Content | Mitigation |
|-------|-------------|------------|
| `ai_chat_audit_log` | `user_input_preview`, `ai_output_preview` | ✅ Truncated (50 chars) |
| `audit_log` | `previous_state`, `new_state` | ⚠️ May contain full state |
| `audit_logs` | `metadata` JSONB | ⚠️ May contain PHI in context |

**Audit Log RLS:**
- Patients: Limited event types only (no admin actions, no raw state)
- Admins/Doctors: Full access

---

## 6. Secret Handling

### 6.1 Environment Variable Security

```
@/Users/rey/Desktop/instantmed/lib/env.ts:1-60
```

**Server-Only (never exposed to client):**
| Variable | Usage | Validated |
|----------|-------|-----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS | ✅ Required |
| `STRIPE_SECRET_KEY` | Payment processing | ✅ Production required |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification | ✅ Production required |
| `ENCRYPTION_KEY` | PHI encryption | ✅ Production required |
| `INTERNAL_API_SECRET` | Server-to-server | ✅ Production required |
| `RESEND_API_KEY` | Email sending | ⚠️ Optional |

**Public (safe for client):**
| Variable | Prefix |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ `NEXT_PUBLIC_` |

### 6.2 Secret Access Pattern

```
@/Users/rey/Desktop/instantmed/lib/supabase/service-role.ts:1-57
```
- Marked `"server-only"` - cannot be imported in client code
- Singleton pattern prevents key exposure in logs
- No secrets in error messages

### 6.3 Production Validation

```
@/Users/rey/Desktop/instantmed/lib/env.ts:62-72
```
Production requires:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `INTERNAL_API_SECRET`
- `ENCRYPTION_KEY` (min 32 bytes)
- `STRIPE_PRICE_*` IDs

---

## 7. Cross-Patient Access Verification

### 7.1 Data Access Paths Tested

| Path | Protection | Status |
|------|------------|--------|
| Patient → Own intakes | RLS `patient_id → profiles.auth_user_id` | ✅ Verified |
| Patient → Other intakes | Blocked by RLS | ✅ Verified |
| Patient → Own documents | RLS via `request_id` chain | ✅ Verified |
| Patient → Other documents | Blocked by RLS | ✅ Verified |
| Patient → Own transcripts | `patient_id = auth.uid()` | ✅ Verified |
| Patient → Other transcripts | Blocked by RLS | ✅ Verified |
| Patient → Admin notes | Blocked by `note_type != 'admin'` | ✅ Verified |

### 7.2 API Route Protection

| Route | Auth Pattern | Ownership Check |
|-------|--------------|-----------------|
| `/api/patient/documents/[id]` | `auth()` | ✅ Verifies intake ownership |
| `/api/patient/documents/[id]/download` | `getApiAuth()` | ✅ RLS + ownership check |
| `/api/patient/profile` | `auth()` | ✅ Uses clerk_user_id |
| `/api/patient/last-prescription` | `auth()` | ✅ Checks profile match |

### 7.3 Potential IDOR Vectors

| Endpoint | Vector | Mitigation |
|----------|--------|------------|
| Document download | `requestId` parameter | ✅ RLS blocks cross-patient |
| Intake view | `intakeId` parameter | ✅ RLS blocks cross-patient |
| AI review summary | `intakeId` in body | ✅ Auth required, RLS enforced |

---

## 8. Audit/Log Table PHI Leakage

### 8.1 Tables with Potential PHI

| Table | PHI Risk | Patient Access |
|-------|----------|----------------|
| `audit_log` | `previous_state`, `new_state` may contain full intake data | ✅ Limited to own intakes, subset of event types |
| `audit_logs` | `metadata` may contain context | ✅ Admin-only |
| `ai_chat_audit_log` | Truncated previews (50 chars) | ✅ Own records only |
| `ai_safety_blocks` | `trigger_preview` (truncated) | ❌ No patient policy |
| `compliance_audit_log` | `metadata`, `changes` | ✅ Doctor/admin only |

### 8.2 Audit Log Event Filtering

```
@/Users/rey/Desktop/instantmed/supabase/migrations/20240101000009_create_audit_log.sql:56-67
```
Patients can only see these event types:
- `intake_created`
- `intake_submitted`
- `payment_received`
- `status_changed`
- `document_generated`
- `document_sent`

**Blocked from patients:** Admin actions, decline reasons, doctor notes, internal state changes.

### 8.3 Logging PHI Sanitization

```
@/Users/rey/Desktop/instantmed/lib/observability/logger.ts
```
Logger sanitizes 30+ sensitive keys before output:
- Medicare numbers
- Dates of birth
- Phone numbers
- Addresses
- Medical conditions
- Passwords/tokens

---

## 9. Recommendations (Ranked by Severity)

### CRITICAL

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | **Documents bucket is PUBLIC** | `20241215000005_documents_storage.sql:18` | Change to `public = FALSE` and require signed URLs for all access |

### HIGH

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 2 | **PHI plaintext in multiple tables** | `intakes.doctor_notes`, `intake_answers.answers`, `ai_chat_transcripts.messages` | Implement field-level encryption for high-sensitivity fields |
| 3 | **Audit logs may expose state changes** | `audit_log.previous_state`, `new_state` | Sanitize PHI from state snapshots before logging |

### MEDIUM

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 4 | **`intake_drafts` session-based access** | RLS policy | Require auth for all access, remove `session_id IS NOT NULL` fallback |
| 5 | **`ai_safety_blocks` no patient RLS** | Missing policy | Add `patient_id = auth.uid()` SELECT policy for patients |
| 6 | **Unauthenticated AI chat access** | `/api/ai/chat-intake` | Consider requiring auth for all AI endpoints |
| 7 | **7-day signed URL expiry** | `lib/storage/documents.ts` | Reduce to 24-48 hours for sensitive documents |

### LOW

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 8 | **Plaintext original columns exist** | `profiles` table | Complete migration and drop `medicare_number`, `date_of_birth`, `phone` |
| 9 | **E2E auth bypass in codebase** | `lib/auth.ts:23-25` | Add runtime check that `VERCEL_ENV !== 'production'` |
| 10 | **No audit log for failed auth attempts** | `lib/auth.ts` | Log failed authentication attempts to `audit_logs` |

---

## 10. Summary

| Area | Status | Key Finding |
|------|--------|-------------|
| **RLS Policies** | ✅ Good | All patient-facing tables protected, proper join chains |
| **API Auth** | ✅ Good | Consistent `auth()` pattern, role checks in layouts |
| **Secret Handling** | ✅ Good | Server-only module, production validation |
| **Storage Buckets** | ⚠️ Issue | Documents bucket PUBLIC - needs fix |
| **PHI Encryption** | ⚠️ Partial | Only profiles encrypted, migration incomplete |
| **Audit Logs** | ⚠️ Concern | May contain PHI in state snapshots |
| **Cross-Patient** | ✅ Verified | RLS prevents all tested IDOR vectors |

**Overall Assessment:** Security foundation is solid with proper RLS, auth patterns, and secret handling. Primary concerns are:

1. **Documents bucket PUBLIC** - Critical fix needed
2. **PHI not encrypted at rest** in most tables
3. **Audit logs may leak PHI** in state change records

Addressing recommendations #1-3 is essential for healthcare compliance.
