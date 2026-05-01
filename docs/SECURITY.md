# SECURITY.md -- InstantMed Security & Data Protection

> Canonical reference for encryption, access control, rate limiting, audit logging, and security operations.
> Read this file when working on: authentication, database queries, API routes, encryption, webhooks, rate limiting.

## PHI Encryption

### Model

Field-level **envelope encryption** using **AES-256-GCM** with unique IV per operation. Base64 encoding for storage. `ENCRYPTION_KEY` (simpler module) is verified by `verifyEncryptionSetup()` in `instrumentation.ts`. `PHI_MASTER_KEY` is included in production requirements in `lib/config/env.ts` and server-only getters throw at point of use if required production secrets are missing. Module-load production validation warns instead of throwing because Next build evaluates modules during static generation. Treat missing production encryption env vars as a release blocker even when the build itself succeeds.

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
| `intake_followups` | `side_effects_notes`, `patient_notes`, `effectiveness_rating` | No (patient-reported clinical state) | Yes |

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

### Medicare: Permanent Dual-Write

Medicare number is stored in both `profiles.medicare_number` (plaintext) and `profiles.medicare_number_encrypted` (AES-256-GCM). **Plaintext is kept permanently** — the doctor dashboard displays it directly and the Parchment eScript integration requires an unencrypted medicare number for prescription generation.

### Phase 2 Dual-Write (Other PHI Fields)

The Phase 2 PHI fields (added March 2026) are in dual-write mode — plaintext and encrypted columns are both written on every write, and reads prefer the encrypted column with a plaintext fallback. This is indefinitely safe. Post-launch, if a plaintext cutover is desired for non-medicare fields, create a new plan at that time.

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
| `intake_drafts` | **Owner-only** (authenticated role only) — no session_id fallback, no claim_guest policy | SELECT all (staff policy) | SELECT all (staff policy) |
| `safety_audit_log` | **None** (direct client writes denied) | SELECT all | SELECT all |
| `documents` | Own via `request_id` chain | SELECT/INSERT all | SELECT/INSERT all |
| `ai_chat_transcripts` | Own (`patient_id = auth.uid()`) | SELECT all | SELECT all |
| `patient_notes` | Own (except `note_type = 'admin'`) | SELECT/INSERT all, UPDATE own | SELECT/INSERT all, UPDATE own |
| `audit_log` | Own intake, limited event types | SELECT all | SELECT all |
| `audit_logs` | None | SELECT all | SELECT all |
| `feature_flags` | None | Read all | Read/Write all |
| `doctor_profiles` | None | Own only | All |
| `notifications` | Own (`user_id`) | Own | Own |
| `payments` | Own via intake chain | Via intake | All |
| `intake_followups` | Own (`patient_id`) — SELECT + UPDATE | All (SELECT/INSERT/UPDATE) | All |
| `followup_email_log` | None | None | None (service_role only) |

**Hardened 2026-04-08** via migration `20260408000001_lock_down_intake_drafts_and_safety_audit.sql` (applied to live Supabase):

- `intake_drafts`: dropped the previous `intake_drafts_user_select` policy that used `user_id = auth.uid() OR session_id IS NOT NULL` (the OR clause was always true, allowing any direct Supabase client call to read every draft — a PHI exfiltration vector). Also dropped `intake_drafts_claim_guest` which let any authenticated user take ownership of anonymous drafts and then read their contents. All access now flows through the service-role API at `/api/flow/drafts/[draftId]` which validates ownership at the API layer.
- `safety_audit_log`: dropped `safety_audit_authenticated_insert` (gated only on `session_id IS NOT NULL`, trivially bypassable) and replaced with a service_role-only INSERT policy. Prevents audit forgery (e.g. flipping `safety_outcome` from DECLINE to ALLOW to bypass clinical knockouts).
- `log_safety_evaluation` (both overloads) and `cleanup_old_drafts`: `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`. These are `SECURITY DEFINER` functions that could mutate `safety_audit_log` and `intake_drafts.safety_outcome` — they're only invoked from server-side code via the service role, so revoking client access is safe and necessary.

See `OPERATIONS.md` §Rollback Runbook for the reversibility matrix and rollback path if any RLS change needs to be reverted.

**Patient-visible audit events:** `intake_created`, `intake_submitted`, `payment_received`, `status_changed`, `document_generated`, `document_sent`. All other events blocked.

**No DELETE policies** on most tables -- intentional for audit trail preservation.

### Storage Buckets

| Bucket | Visibility | Patient | Doctor | Delete |
|--------|-----------|---------|--------|--------|
| `attachments` | Private | Upload/view own | View all | Draft intakes only |
| `documents` | Private (signed URLs) | Via signed URL | INSERT | No one (immutable) |
| `intake-photos` | Private | Upload/view own folder (`{patient_id}/`) | View all | No one |

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
script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://*.doubleclick.net https://challenges.cloudflare.com;
worker-src 'self' blob:;
child-src 'self' blob:;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com data:;
img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://raw.githubusercontent.com https://svgl.app https://api.dicebear.com https://*.googleusercontent.com https://*.gravatar.com https://*.stripe.com https://pagead2.googlesyndication.com https://*.doubleclick.net https://www.google.com https://www.google.com.au;
connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://*.google-analytics.com https://*.google.com https://*.google.com.au https://www.googletagmanager.com https://*.googleadservices.com https://*.doubleclick.net https://*.sentry.io https://api.resend.com https://challenges.cloudflare.com https://*.posthog.com https://us.i.posthog.com https://accounts.google.com https://pagead2.googlesyndication.com;
frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com;
form-action 'self' https://*.supabase.co https://accounts.google.com;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
upgrade-insecure-requests;
```

**Why `challenges.cloudflare.com`:** Required by Stripe Checkout for bot protection challenges during payment flows. This is Stripe's embedded Cloudflare challenge, not a standalone Turnstile implementation.

**Why `unsafe-inline` (no `unsafe-eval` in prod):** `unsafe-inline` required by Next.js 16 for hydration scripts and dynamic imports. `unsafe-eval` added only in dev/test for HMR. Nonce-based CSP not fully supported in Next.js 16 production. Mitigated by: first-party scripts only, no `innerHTML` with user content, input sanitization, `frame-ancestors 'self'`.

**CSP violation reporting:** A separate `Content-Security-Policy-Report-Only` header (stricter, no `unsafe-inline`) reports violations to `/api/csp-report` via `report-uri`. The main enforced CSP does **not** include `report-uri`.

---

## Rate Limiting

**Two systems:**

1. **General API** (`lib/rate-limit/redis.ts`): Upstash Redis. Fallback: **fail-open** (allow request) when Redis unavailable — intentional for serverless (in-memory Maps don't persist across invocations).

2. **Doctor actions** (`lib/rate-limit/doctor.ts`): DB-backed sliding window (queries `audit_logs`). Fallback: in-memory `Map` with **half limits** when DB unavailable (per-instance, not shared).

| Endpoint Category | Limit | Window | Module |
|-------------------|-------|--------|--------|
| Standard API | 100 requests | 1 minute | redis |
| Authentication | 10 requests | 1 minute | redis |
| Sensitive operations | 20 requests | 1 hour | redis |
| File uploads | 30 requests | 1 hour | redis |
| AI endpoints | 30 requests | 1 minute | redis |
| Webhooks | 1000 requests | 1 minute | redis |
| Doctor approval | 20 requests | 1 hour | `lib/rate-limit/doctor.ts` |
| Doctor decline | 100 requests | 1 hour | `lib/rate-limit/doctor.ts` |
| Certificate issue | 30 requests | 1 hour | `lib/rate-limit/doctor.ts` |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## Webhook Security

All webhooks use signature verification (not CSRF).

| Provider | Handler | Verification |
|----------|---------|-------------|
| **Stripe** | `app/api/stripe/webhook/route.ts` | `stripe.webhooks.constructEvent(body, sig, secret)` — raw body via `request.text()` before any parsing. `STRIPE_WEBHOOK_SECRET` is server-only and must be present in production; point-of-use access fails if it is missing. |
| **Resend** | `app/api/webhooks/resend/route.ts` | Svix: `new Webhook(RESEND_WEBHOOK_SECRET).verify(payload, headers)` |
| **Parchment** | `app/api/webhooks/parchment/route.ts` | HMAC-SHA256: `X-Webhook-Signature: t=timestamp,v1=signature`. Signed payload: `{timestamp}.{rawBody}`. 5-min replay window. Timing-safe comparison via `crypto.timingSafeEqual`. `PARCHMENT_WEBHOOK_SECRET` from env. |

**Stripe admin replay path:** The webhook handler also accepts replays from the DLQ admin UI (`X-Admin-Replay: true` + `X-Admin-Replay-Secret` header). Replays are authenticated with `crypto.timingSafeEqual` against `INTERNAL_API_SECRET` and bypass signature verification (the payload was already verified on first receipt). This is intentional and audited.

---

## Authentication & Authorization

**Provider:** Supabase Auth. Cookie-based sessions with JWT refresh via middleware. Auth methods: email magic link + Google OAuth. MFA: available via Supabase, optional for patients, recommended for clinicians.

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

### Dev Route Group (`app/(dev)/`)

`app/(dev)/` files resolve to their path **without** the group prefix (e.g. `app/(dev)/cert-preview` → `/cert-preview`). They are **not** automatically blocked by Next.js. Middleware is the sole protection layer.

| Route | Path | Middleware block | Runtime guard |
|-------|------|-----------------|---------------|
| `app/(dev)/cert-preview/route.ts` | `/cert-preview` | Yes — 404 in production/preview | None (route handler, no redirect) |
| `app/(dev)/email-preview/page.tsx` | `/email-preview` | Yes — 302 to `/` in production/preview | `NODE_ENV === "production"` redirect |
| `app/(dev)/email-preview/[template]/page.tsx` | `/email-preview/:template` | Yes — covered by `/email-preview` prefix | `NODE_ENV === "production"` redirect |
| `app/(dev)/sentry-test/page.tsx` | `/sentry-test` | Yes — 404 in production/preview | `NODE_ENV !== "development"` renders locked UI |

None of these routes expose real PHI — all use hardcoded mock data or generate static layout-calibration PDFs. The middleware block is the primary control; runtime guards are defence-in-depth.

**2026-04-09 audit fix:** `/cert-preview` was missing a middleware block. Added to `middleware.ts` alongside `/sentry-test`.

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
| **Critical** | `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `ENCRYPTION_KEY` | Never expose, never log |
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

| Aspect | Env Kill Switches (`lib/config/kill-switches.ts`) | DB Flags (`lib/feature-flags.ts`) |
|--------|-----------|----------|
| Speed | Instant (no DB) | ~30s cache |
| Admin UI | No | Yes |
| Requires redeploy | Yes | No |
| Best for | Emergencies | Routine toggles, med blocklists |

**Write control:** DB feature-flag writes are admin-only at both layers: `/admin/features` uses admin-only server actions, and `feature_flags` RLS restricts direct table updates to `profiles.role = 'admin'`. Server-side mutation code rejects unknown keys and invalid value types/ranges before DB writes. Doctors may read flag status, but cannot mutate kill switches directly.

**Runtime control helpers:** Operational enforcement that is not pure flag fetching lives in `lib/operational-controls/`. Capacity limits fail closed when the limit is enabled and the daily count RPC cannot be read; medication blocklist extraction is shared by authenticated and guest checkout paths.

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
