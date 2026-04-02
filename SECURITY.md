# SECURITY.md -- InstantMed Security & Data Protection

> Canonical reference for encryption, access control, rate limiting, audit logging, and security operations.
> Read this file when working on: authentication, database queries, API routes, encryption, webhooks, rate limiting.

## PHI Encryption

### Model

Field-level **envelope encryption** using **AES-256-GCM** with unique IV per operation. Base64 encoding for storage. `ENCRYPTION_KEY` (simpler module) verified at startup via `verifyEncryptionSetup()` in `instrumentation.ts`. PHI envelope encryption (`PHI_MASTER_KEY`) is NOT verified at startup — it fails at first use if misconfigured.

1. Generate a per-record data key
2. Encrypt PHI with the data key (AES-256-GCM)
3. Encrypt the data key with the master key (KMS or env var)
4. Store encrypted data + encrypted data key together

**Key management:** All environments use `PHI_MASTER_KEY` (base64-encoded 32-byte key) as the master key for envelope encryption. AWS KMS integration was evaluated but not adopted — AES-256-GCM with env-var key is production-ready at current scale. Key rotation: generate new key, re-encrypt PHI fields via `scripts/encrypt-phi-backfill.ts`, update env var.

**Utility API** (`lib/security/phi-encryption.ts`): `encryptPHI()`, `decryptPHI()`, `encryptJSONB()`, `decryptJSONB()` -- all async, return/accept `EncryptedData` (ciphertext, encryptedDataKey, keyId, iv, authTag, version).

**Env vars:** `PHI_ENCRYPTION_ENABLED`, `PHI_ENCRYPTION_WRITE_ENABLED`, `PHI_ENCRYPTION_READ_ENABLED`, `PHI_MASTER_KEY`, `ENCRYPTION_KEY` (min 32 bytes).

### PHI Data Inventory

| Table | PHI Fields | Encrypted | RLS |
|-------|------------|-----------|-----|
| `profiles` | `medicare_number`, `date_of_birth`, `phone`, `full_name`, `address_*` | Yes (Phase 1) | Yes |
| `intakes` | `client_ip`, `doctor_notes`, `decline_reason` | `doctor_notes` ✅ Phase 2 | Yes |
| `intake_answers` | `answers` (JSONB), `allergy_details`, `medical_conditions`, symptom fields | All 3 ✅ Phase 2 | Yes |
| `intake_drafts` | `data` (JSONB) | `data_encrypted` ✅ Phase 3 | Yes |
| `ai_chat_transcripts` | `messages` (JSONB -- full conversation) | `messages_enc` ✅ Phase 3 | Yes |
| `ai_chat_audit_log` | `user_input_preview`, `ai_output_preview` | Truncated 50 chars | Yes |
| `patient_notes` | `content`, `title` | `content` ✅ Phase 2 | Yes |
| `issued_certificates` | `generated_data` (JSONB), `patient_name`, `pdf_storage_path` | `patient_name` ✅ Phase 2 | Yes |
| `health_summary` | N/A — computed view (aggregates from `intakes`, `issued_certificates`, `intake_answers`) | N/A (source tables encrypted) | N/A |
| `document_drafts` | `data` (JSONB), `content` (AI-generated), `edited_content` | `data` ✅ Phase 2 | Yes |
| `documents` | `storage_path` (references PDF with PHI) | N/A (ref) | Yes |
| `patient_health_profiles` | `allergies`, `conditions`, `current_medications`, `notes` | All 4 ✅ Phase 3 | Yes |

### Encryption Status

**Phase 1 (profiles — shipped):** `profiles.medicare_number_encrypted`, `profiles.date_of_birth_encrypted`, `profiles.phone_encrypted`.

**Phase 2 (data layer — shipped, migration `20260311000002`):**

| Table | Plaintext Column | Encrypted Column | Data Layer File | Status |
|-------|-----------------|------------------|-----------------|--------|
| `intake_answers` | `answers` (JSONB) | `answers_encrypted` | `lib/data/intake-answers.ts` | ✅ Dual-write + decrypt-on-read |
| `intake_answers` | `allergy_details` | `allergy_details_enc` | `lib/data/intake-answers.ts` | ✅ Dual-write + decrypt-on-read |
| `intake_answers` | `medical_conditions` | `medical_conditions_enc` | `lib/data/intake-answers.ts` | ✅ Dual-write + decrypt-on-read |
| `intakes` | `doctor_notes` | `doctor_notes_enc` | `lib/data/intakes.ts` | ✅ Dual-write + decrypt-on-read |
| `patient_notes` | `content` | `content_enc` | `lib/data/intakes.ts` | ✅ Dual-write + decrypt-on-read |
| `document_drafts` | `data` (JSONB) | `data_enc` | `lib/data/documents.ts` | ✅ Dual-write + decrypt-on-read |
| `document_drafts` | `edited_content` | `edited_content_enc` | `app/actions/draft-approval.ts`, `lib/ai/drafts/db.ts` | ✅ Dual-write + decrypt-on-read |
| `ai_chat_transcripts` | `messages` | `messages_enc` | `lib/chat/audit-trail.ts` | ✅ Dual-write + decrypt-on-read |
| `intake_drafts` | `data` | `data_encrypted` | `app/api/flow/drafts/` | ✅ Dual-write + decrypt-on-read |
| `issued_certificates` | `patient_name` | `patient_name_enc` | `lib/data/issued-certificates.ts` | ✅ Dual-write + decrypt-on-read |

**RPC:** `atomicApproveCertificate()` (migration `20260311014239`) writes both `patient_name` and `patient_name_enc` via `p_patient_name_enc` parameter. App layer uses `prepareCertificatePatientNameWrite()` before calling the RPC.

### Pending: Medicare Plaintext Removal

**Deadline: 2026-06-01.** Medicare number is currently stored in both `profiles.medicare_number` (plaintext) and `profiles.medicare_number_encrypted` (AES-256-GCM) for rollback safety. Once the encrypted column is confirmed fully populated and stable, the plaintext column must be dropped.

Plan: `docs/plans/2026-06-01-medicare-plaintext-removal.md`. Tracked at `lib/data/profiles.ts:97` — `TODO(security)`.

### Pending: Phase 2 Dual-Write Cutover

**Target: ~2 weeks post-launch (exact date TBD at launch).** The Phase 2 PHI fields (added March 2026) are currently in dual-write mode — plaintext and encrypted columns are both written on every write, and reads prefer the encrypted column with a plaintext fallback.

The dual-write is indefinitely safe, but the plaintext columns remain a liability in a data breach scenario. Once the platform has been live for ~2 weeks with zero decryption errors in Sentry, execute the cutover:

**Step 1 — Disable plaintext reads (flip flag, monitor 1 week):**
1. Set `PHI_ENCRYPTION_READ_ENABLED=true` and `PHI_ENCRYPTION_WRITE_ENABLED=true` (already set)
2. Remove the plaintext fallback from each `read*()` wrapper in `lib/security/phi-field-wrappers.ts`
3. Deploy. Watch Sentry for `[PHI]` decryption errors for 7 days.

**Step 2 — Drop plaintext columns (after 7 days clean):**
Create a migration that drops the plaintext columns from:
- `patient_notes` → `content`, `doctor_notes`
- `issued_certificates` → `patient_name`
- `document_drafts` → `data`
- `intake_answers` → `answers`, `allergy_details`, `medical_conditions`

**Tracked by:** `TODO(phi-cutover)` comments in `lib/security/phi-field-wrappers.ts`.

### Dual-Write Pattern

During migration, all writes store **both** plaintext and encrypted values. Reads prefer encrypted, fall back to plaintext. This allows:
- Zero-downtime rollout via feature flags
- Gradual confidence building (compare decrypted vs plaintext)
- Safe rollback by disabling read flags

```
Write: plaintext + _enc column (dual-write)
Read:  _enc → decrypt → return  ||  fallback → plaintext
```

Wrapper functions in `lib/security/phi-field-wrappers.ts`:
- `prepare*Write()` — returns spread-ready object with both columns
- `read*()` — prefers encrypted, falls back to plaintext
- All async, all graceful-fallback on error (log + continue)

**In transit:** TLS 1.2+ only, Vercel-managed, Let's Encrypt auto-renewed certificates.

---

## Row-Level Security (RLS)

**Core rule:** Every table with user data MUST have RLS enabled. No exceptions.

### Three-Tier Access Model

**Patient** -- own data only: `auth.uid() = user_id`

**Doctor** -- own patients + assigned intakes + unassigned pending intakes:
```sql
CREATE POLICY "doctors_assigned_intakes" ON intakes
FOR SELECT USING (
  auth.uid() = user_id
  OR auth.uid() = assigned_doctor_id
  OR (assigned_doctor_id IS NULL AND status = 'pending_review'
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'doctor'))
);
```

**Admin** -- full access: `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`

**Performance:** All policies use `(select auth.uid())` (evaluated once per query) not bare `auth.uid()` (per row).

### Table Policies

| Table | Patient | Doctor | Admin |
|-------|---------|--------|-------|
| `profiles` | Own (`auth_user_id = auth.uid()`) | SELECT all | SELECT all |
| `intakes` | Own via `patient_id` chain | SELECT/UPDATE all | SELECT/UPDATE all |
| `intake_answers` | Own via `intake_id` chain | SELECT all | SELECT/UPDATE all |
| `documents` | Own via `request_id` chain | SELECT/INSERT all | SELECT/INSERT all |
| `ai_chat_transcripts` | Own (`patient_id = auth.uid()`) | SELECT all | SELECT all |
| `patient_notes` | Own (except `note_type = 'admin'`) | SELECT/INSERT all, UPDATE own | SELECT/INSERT all, UPDATE own |
| `audit_log` | Own intake, limited event types | SELECT all | SELECT all |
| `audit_logs` | None | SELECT all | SELECT all |
| `feature_flags` | Read all | Read all | Read/Write all |
| `doctor_profiles` | None | Own only | All |
| `notifications` | Own (`user_id`) | Own | Own |
| `payments` | Own via intake chain | Via intake | All |

**Patient-visible audit events:** `intake_created`, `intake_submitted`, `payment_received`, `status_changed`, `document_generated`, `document_sent`. All other events blocked.

**No DELETE policies** on most tables -- intentional for audit trail preservation.

### Storage Buckets

| Bucket | Visibility | Patient | Doctor | Delete |
|--------|-----------|---------|--------|--------|
| `attachments` | Private | Upload/view own | View all | Draft intakes only |
| `documents` | Private (signed URLs) | Via signed URL | INSERT | No one (immutable) |

### Public Asset Security — Resolved

eSignature file (`/public/branding/eSignature.jpg`) was deleted 2026-04-01. Signatures in generated PDFs are embedded in the static template files (`/public/templates/*.pdf`), not dynamically injected. Doctor portal signature uploads use `signature_storage_path` in Supabase private Storage.

### Testing RLS

```sql
SET request.jwt.claim.sub = 'user-uuid-here';
SET request.jwt.claims = '{"role": "authenticated"}';
SELECT * FROM intakes;  -- Should only return user's intakes
RESET request.jwt.claim.sub;
RESET request.jwt.claims;
```

### New Table Checklist

1. `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
2. Create SELECT, INSERT, UPDATE policies (omit DELETE for audit trail)
3. Test with patient, doctor, and admin roles
4. Document policy in this file

---

## HTTP Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS enforcement (2 years) |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking protection |
| `X-XSS-Protection` | `1; mode=block` | XSS filter (legacy) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer control |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Feature restrictions |

### Content Security Policy

Defined in `next.config.mjs`. Key directives (production — `unsafe-eval` is **dev-only**, removed in production builds):

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au;
worker-src 'self' blob:;
child-src 'self' blob:;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://raw.githubusercontent.com https://svgl.app https://api.dicebear.com https://img.clerk.com https://*.clerk.com https://*.googleusercontent.com https://*.gravatar.com https://*.stripe.com https://pagead2.googlesyndication.com;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.google-analytics.com https://*.google.com https://www.googletagmanager.com https://*.googleadservices.com https://*.doubleclick.net https://*.sentry.io https://api.resend.com https://challenges.cloudflare.com https://*.posthog.com https://us.i.posthog.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au https://pagead2.googlesyndication.com;
frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au;
form-action 'self' https://*.supabase.co https://accounts.google.com https://*.clerk.accounts.dev https://*.clerk.com https://clerk.instantmed.com.au https://accounts.instantmed.com.au;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
upgrade-insecure-requests;
```

**Why `challenges.cloudflare.com`:** Required by Stripe Checkout for bot protection challenges during payment flows. This is Stripe's embedded Cloudflare challenge, not a standalone Turnstile implementation.

**Why `unsafe-inline` (no `unsafe-eval` in prod):** `unsafe-inline` required by Next.js 15 for hydration scripts and dynamic imports. `unsafe-eval` added only in dev/test for HMR. Nonce-based CSP not fully supported in Next.js 15 production. Mitigated by: first-party scripts only, no `innerHTML` with user content, input sanitization, `frame-ancestors 'self'`.

**CSP violation reporting:** A separate `Content-Security-Policy-Report-Only` header (stricter, no `unsafe-inline`) reports violations to `/api/csp-report` via `report-uri`. The main enforced CSP does **not** include `report-uri`.

---

## Rate Limiting

**Two systems:**

1. **General API** (`lib/rate-limit/redis.ts`): Upstash Redis. Fallback: **fail-open** (allow request) when Redis unavailable — intentional for serverless (in-memory Maps don't persist across invocations).

2. **Doctor actions** (`lib/security/rate-limit.ts`): DB-backed sliding window. Fallback: in-memory `Map` with **half limits** when DB unavailable (per-instance, not shared).

| Endpoint Category | Limit | Window | Module |
|-------------------|-------|--------|--------|
| Standard API | 100 requests | 1 minute | redis |
| Authentication | 10 requests | 1 minute | redis |
| Sensitive operations | 20 requests | 1 hour | redis |
| File uploads | 30 requests | 1 hour | redis |
| AI endpoints | 30 requests | 1 minute | redis |
| Webhooks | 1000 requests | 1 minute | redis |
| Doctor approval | 20 requests | 1 hour | security/rate-limit |
| Doctor decline | 100 requests | 1 hour | security/rate-limit |
| Certificate issue | 30 requests | 1 hour | security/rate-limit |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## Webhook Security

All webhooks use signature verification (not CSRF).

| Provider | Verification |
|----------|-------------|
| **Stripe** | `stripe.webhooks.constructEvent(body, req.headers['stripe-signature'], webhookSecret)` |
| **Clerk** | Svix: `new Webhook(WEBHOOK_SECRET).verify(payload, headers)` |
| **Resend** | Svix: `new Webhook(RESEND_WEBHOOK_SECRET).verify(payload, headers)` |

---

## Authentication & Authorization

**Provider:** Clerk. Session duration: 7 days (with refresh). MFA: available, optional for patients, recommended for clinicians.

### CSRF Protection (`lib/security/csrf.ts`)

- Token: `crypto.randomBytes(32).toString('hex')`
- Cookie: `httpOnly`, `secure` (prod), `sameSite: 'strict'`, `maxAge: 3600`
- **Protected:** All state-changing routes (POST/PUT/PATCH/DELETE), form submissions, payment initiation
- **Excluded:** Webhooks (signature verification), public read-only endpoints

### Protected Routes

| Path Pattern | Required Role |
|--------------|---------------|
| `/patient/*` | patient |
| `/doctor/*` | doctor |
| `/admin/*`, `/api/admin/*` | admin |
| `/api/health` | None (health check) |
| `/api/cron/*` | Vercel cron auth |
| `/api/webhooks/*` | Signature verification |

### Auth Patterns

| Pattern | Usage |
|---------|-------|
| `auth()` from `@/lib/auth` | Most API routes (20+ files) |
| `getApiAuth()` | Document download, med-cert routes |
| `requireRole()` / `requireRoleOrNull()` | Admin/doctor layouts, server actions |

### Input Validation

- **Zod** schema validation (server-side enforced; client-side for UX only)
- **Sanitization** (`lib/security/sanitize.ts`): strips HTML/script tags, event handlers, SQL patterns, control characters
- **Medical data:** Medicare Luhn check, Australian phone format, DOB age range

### E2E Test Auth Bypass

Only when `NODE_ENV=test` or `PLAYWRIGHT=1`. Middleware blocks `/api/test/*` and `/(dev)/*` in production/preview.

---

## Audit Logging

### Core Principle

If an action affects clinical care or access to care, it must be **reconstructable after the fact**. Logs prove **who decided what, and when**.

### Five Required Categories

> Clinical audit requirements context: CLINICAL.md → Clinical Decision Boundaries

1. **Request lifecycle** -- created, reviewed, outcome assigned (time-ordered)
2. **Clinician involvement** -- who reviewed, who selected final outcome (proves human-in-the-loop)
3. **Triage outcome** -- Approved / Needs Call / Declined (changes traceable)
4. **Synchronous contact indicators** -- whether call required, whether it occurred
5. **Prescribing boundary evidence** -- no prescribing inside platform; external only

### Log Characteristics

Immutable, append-only, non-editable after creation, timestamped, attributable to a role (clinician vs system).

### Scope & Readiness

Logs are for compliance and defensibility only — not decision-support, analytics, clinical notes, or Parchment substitute. System must answer: Who reviewed? When decided? What outcome? Call required? Where was prescribing? If any answer is unclear, logging is insufficient.

### Log Sanitization (`lib/observability/logger.ts`)

Auto-redacted (30+ keys): `password`, `token`, `secret`, `key`, `medicare`, `irn`, `providerNumber`, `diagnosis`, `medication`, `symptom`, `full_name`, `email`, `phone`, `address`.

### PHI in Audit Logs

| Table | PHI Content | Mitigation |
|-------|-------------|------------|
| `ai_chat_audit_log` | Input/output previews | Truncated to 50 chars |
| `audit_log` | `previous_state`, `new_state` | May contain full state |
| `audit_logs` | `metadata` JSONB | May contain PHI in context |
| `compliance_audit_log` | `metadata`, `changes` | Doctor/admin access only |

### Alerting Thresholds

- Failed login attempts > 10/hour
- Rate limit violations > 100/hour
- CSP violations (any)
- 5xx error rate > 1%

Monitoring: Sentry (errors, CSP), PostHog (behavior), Supabase (DB audit logs).

---

## Secret Management

| Classification | Variables | Rule |
|----------------|-----------|------|
| **Critical** | `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ENCRYPTION_KEY`, `CLERK_SECRET_KEY` | Never expose, never log |
| **Sensitive** | `STRIPE_WEBHOOK_SECRET`, `INTERNAL_API_SECRET`, `RESEND_API_KEY` | Server-only |
| **Public** | `NEXT_PUBLIC_*` (Supabase URL, anon key, Stripe publishable key) | Safe for client |

**Production validation** (`lib/env.ts`, Zod): requires `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `INTERNAL_API_SECRET`, `ENCRYPTION_KEY` (min 32 bytes), all `STRIPE_PRICE_*` IDs.

**Access:** Service role client (`lib/supabase/service-role.ts`) is marked `"server-only"`, uses singleton pattern, never leaks secrets in error messages.

### Client-Side Storage

| Key | Purpose | Cleared |
|-----|---------|---------|
| `pending_profile_name` | Profile creation after auth | After profile created |
| `pending_profile_dob` | Profile creation after auth | After profile created |
| `questionnaire_flow` | Track auth redirect source | After profile created |
| `rx_form_data` | Preserve form during auth | After form restored |

**Never store:** Medicare numbers, medical history, payment card details, auth tokens.

---

## Feature Flags & Kill Switches

### Two Systems

| Aspect | Env Flags (`lib/config/feature-flags.ts`) | DB Flags (`lib/feature-flags.ts`) |
|--------|-----------|----------|
| Speed | Instant (no DB) | ~30s cache |
| Admin UI | No | Yes |
| Requires redeploy | Yes | No |
| Best for | Emergencies | Routine toggles, med blocklists |

### Kill Switches (Env Vars)

| Env Var | Effect |
|---------|--------|
| `DISABLE_CHECKOUT_MED_CERT=true` | Blocks med cert checkout |
| `DISABLE_CHECKOUT_PRESCRIPTION=true` | Blocks prescription checkout |
| `DISABLE_CHECKOUT_CONSULT=true` | Blocks consult checkout |
| `DISABLE_EMPLOYER_EMAIL=true` | Blocks employer email sending |
| `FORCE_CALL_REQUIRED=true` | Requires calls for all consults |
| `DISABLE_CONSULT_SUBTYPES=<csv>` | Disables specific consult subtypes |
| `DISABLE_INTAKE_EVENTS=true` | Disables intake event logging |
| `DISABLE_STUCK_INTAKE_SENTRY=true` | Disables Sentry warnings for stuck intakes |
| `DISABLE_RECONCILIATION_SENTRY=true` | Disables Sentry warnings for reconciliation mismatches |

### Where Checked

| Flow | File | Function |
|------|------|----------|
| Authenticated checkout | `lib/stripe/checkout.ts` | `createIntakeAndCheckoutAction()` |
| Guest checkout | `lib/stripe/guest-checkout.ts` | `createGuestCheckoutAction()` |
| Employer email | `app/actions/send-employer-email.ts` | `sendEmployerEmail()` |
| Consult call req | `app/actions/check-feature-flags.ts` | `checkConsultCallRequirement()` |

**Sentry:** Kill switch activations log a breadcrumb (`feature-flag` category) and info event with tags `flow`, `service_type`, `consult_subtype`, `kill_switch_reason`, fingerprint `['kill-switch', flow, serviceType]`.

### Emergency Runbook

Set env var in Vercel dashboard, then redeploy:
- **Disable all med certs:** `DISABLE_CHECKOUT_MED_CERT=true`
- **Disable one subtype:** `DISABLE_CONSULT_SUBTYPES=weight_loss`
- **Require all calls:** `FORCE_CALL_REQUIRED=true`

---

## Security Incident Classification

> Full incident response procedures: OPERATIONS.md → Incident Response

| Level | Description | Response Time | Action |
|-------|-------------|---------------|--------|
| **P0** | Data breach, system compromise | Immediate | Contain, investigate, notify |
| **P1** | Vulnerability exploited | 1 hour | Isolate, remediate |
| **P2** | Potential vulnerability found | 24 hours | Root cause analysis, fix |
| **P3** | Security improvement needed | 1 week | Document, schedule |

**Process:** Detect -> Contain -> Investigate -> Remediate -> Notify (if required) -> Document.
