# SECURITY.md -- InstantMed Security & Data Protection

> Canonical reference for encryption, access control, rate limiting, audit logging, and security operations.
> Read this file when working on: authentication, database queries, API routes, encryption, webhooks, rate limiting.

## PHI Encryption

### Model

Field-level **envelope encryption** using **AES-256-GCM** with unique IV per operation. Base64 encoding for storage. Verified at startup via `verifyEncryptionSetup()`.

1. Generate a per-record data key
2. Encrypt PHI with the data key (AES-256-GCM)
3. Encrypt the data key with the master key (KMS or env var)
4. Store encrypted data + encrypted data key together

**Key management:** Production uses AWS KMS (`AWS_KMS_KEY_ARN`, HIPAA-eligible, automatic rotation, CloudTrail audit). Dev/staging uses local master key (`PHI_MASTER_KEY`, base64-encoded 32-byte key).

**Utility API** (`lib/security/phi-encryption.ts`): `encryptPHI()`, `decryptPHI()`, `encryptJSONB()`, `decryptJSONB()` -- all async, return/accept `EncryptedData` (ciphertext, encryptedDataKey, keyId, iv, authTag, version).

**Env vars:** `PHI_ENCRYPTION_ENABLED`, `PHI_ENCRYPTION_WRITE_ENABLED`, `PHI_ENCRYPTION_READ_ENABLED`, `PHI_MASTER_KEY`, `ENCRYPTION_KEY` (min 32 bytes).

### PHI Data Inventory

| Table | PHI Fields | Encrypted | RLS |
|-------|------------|-----------|-----|
| `profiles` | `medicare_number`, `date_of_birth`, `phone`, `full_name`, `address_*` | Yes | Yes |
| `intakes` | `client_ip`, `doctor_notes`, `decline_reason` | No | Yes |
| `intake_answers` | `answers` (JSONB), `allergy_details`, `medical_conditions`, symptom fields | No | Yes |
| `intake_drafts` | `draft_data` (JSONB) | No | Yes |
| `ai_chat_transcripts` | `messages` (JSONB -- full conversation) | No | Yes |
| `ai_chat_audit_log` | `user_input_preview`, `ai_output_preview` | Truncated 50 chars | Yes |
| `patient_notes` | `content`, `title` | No | Yes |
| `issued_certificates` | `generated_data` (JSONB), `patient_name`, `pdf_storage_path` | No | Yes |
| `health_summary` | Clinical summary content | No | Yes |
| `document_drafts` | `content` (AI-generated clinical content) | No | Yes |
| `documents` | `storage_path` (references PDF with PHI) | N/A (ref) | Yes |

**Currently encrypted (AES-256-GCM):** `profiles.medicare_number_encrypted`, `profiles.date_of_birth_encrypted`, `profiles.phone_encrypted`.

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
| `documents` | Public (signed URLs, 7-day expiry) | Via signed URL | INSERT | No one (immutable) |

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

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.sentry.io https://*.posthog.com;
frame-src https://js.stripe.com https://challenges.cloudflare.com;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

**Why `challenges.cloudflare.com`:** Required by Stripe Checkout for bot protection challenges during payment flows. This is Stripe's embedded Cloudflare challenge, not a standalone Turnstile implementation.

**Why `unsafe-inline`/`unsafe-eval`:** Required by Next.js 15 for hydration scripts, styled-components, and dynamic imports. Nonce-based CSP not fully supported in Next.js 15 production. Mitigated by: first-party scripts only, no `innerHTML` with user content, input sanitization, `frame-ancestors 'self'`.

CSP violations reported to Sentry via `report-uri`.

---

## Rate Limiting

**Backend:** Upstash Redis (production). Fallback: in-memory `Map` (100 actions/hour) if Redis unavailable. Implementation: `lib/security/rate-limit.ts`.

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | 15 minutes |
| API (general) | 60 requests | 1 minute |
| Sensitive operations | 5 requests | 1 minute |
| AI endpoints | 20 requests | 1 minute |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## Webhook Security

All webhooks use signature verification (not CSRF).

| Provider | Verification |
|----------|-------------|
| **Stripe** | `stripe.webhooks.constructEvent(body, req.headers['stripe-signature'], webhookSecret)` |
| **Clerk** | Svix: `new Webhook(WEBHOOK_SECRET).verify(payload, headers)` |
| **Resend** | `verifyResendSignature(payload, signature, secret)` |

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
