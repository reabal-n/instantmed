# ARCHITECTURE.md — InstantMed System Architecture

> Canonical reference for system design, data flows, and integrations.
> For clinical rules see CLINICAL.md · For security see SECURITY.md · For ops see OPERATIONS.md

## Canonical Routes (Source of Truth)

**There is one intake flow.** If you see an old reference to `/flow` or `/prescriptions/request` or `/consult/request`, those are deprecated paths that 301 via `next.config.mjs`. Edit the canonical target, not the redirect source.

| Canonical | Aliases (301 redirect) | Notes |
|---|---|---|
| `/request` | `/flow`, `/flow/:path*`, `/prescriptions/request`, `/prescriptions/new`, `/consult/request` | Sole intake flow (commit `18e26f0b7` killed the parallel `/flow` system) |
| `/medical-certificate` | `/medical-certificates`, `/medical-certificates/:path*` | Singular is canonical (`next.config.mjs`) |
| `/prescriptions` | `/repeat-prescription`, `/repeat-prescription/:path*`, `/repeat-prescriptions`, `/repeat-prescriptions/:path*`, `/prescription` | |
| `/` | `/medications`, `/medications/:path*` | Medications pages deleted 2026-04-08 (orphan duplicate of `/prescriptions/med/:slug`) |
| `/consult` | `/gp-consult` | |
| `/weight-loss` | `/weight-management`, `/weight-management/:path*` | |
| `/auth/login` | `/auth/sign-in` | |
| `/conditions/:slug` | `/health/:slug` | |
| `/conditions/:slug` | `/conditions/:slug/:city` | Condition-location combos redirect to parent (thin content consolidation) |

**Intake flow service slugs** (canonical values): `med-cert`, `prescription`, `repeat-script`, `consult`. Aliases (`medcert`, `repeat-rx`, `consultation`, `general-consult`) are normalized via `lib/request/draft-storage.ts:canonicalizeServiceType()`.

**Location SEO structure:**
- `/locations` — hub (browse by state OR by city)
- `/locations/state/[state]` — 8 state hub pages (nsw/vic/qld/wa/sa/tas/act/nt), added 2026-04-08
- `/locations/[city]` — 42 city pages

## Intake System

### Step-Based Wizard

Unified `/request` entry point routes all clinical flows through a dynamic step-based wizard.

```
app/request/page.tsx -> RequestFlow -> step-router.tsx (lazy) -> steps/*.tsx
                            |
                        store.ts (Zustand + localStorage persist)
```

**Core files:** `components/request/request-flow.tsx` (orchestrator), `step-router.tsx` (lazy loader), `step-error-boundary.tsx`, `store.ts` (Zustand), `lib/request/step-registry.ts` (step definitions + skip logic), `lib/request/consult-subtypes.ts` (consult subtype launch state).

**Service routing** via `?service=` param. `mapServiceParam()` normalises aliases (`medcert` -> `med-cert`, `repeat-rx` -> `repeat-script`, `consultation` -> `consult`).

| Service | Steps |
|---------|-------|
| `med-cert` | certificate, symptoms, details, review, checkout |
| `prescription` / `repeat-script` | medication, medication-history, medical-history, details, review, checkout |
| `consult` (general) | consult-reason, medical-history, details, review, checkout |
| `consult` (ED) | ed-goals, ed-assessment (IIEF-5), ed-health (consolidated safety + medical history), ed-preferences, details (+ height/weight/BMI), review, checkout |
| `consult` (hair loss) | hair-loss-goals, hair-loss-assessment, hair-loss-health, hair-loss-preferences, details, review, checkout |
| `consult` (women's health / weight loss) | Coming-soon step definitions exist, but `lib/request/consult-subtypes.ts` blocks entry and server checkout validation until launched |

**Adding steps:** (1) Create component in `components/request/steps/` implementing `StepProps`, (2) register lazy import in `step-router.tsx`, (3) add definition to `lib/request/step-registry.ts`. Steps support conditional skip via `getStepsForService(type, { isAuthenticated, hasProfile, hasMedicare, answers })`.

### State Management

Zustand store with `persist` middleware. Key: `instantmed-request-draft`, expiry: 24h. Partialised: `serviceType`, `currentStepId`, `safetyConfirmed`, `answers`, patient identity fields. Recovery via `DraftRestorationBanner`. Navigation guard `goToStep()` prevents forward jumps; `canCheckout` validates required fields before payment.

### AI Chat Intake

Alternative conversational path via floating `ChatIntakeButton`. Routes to `app/api/ai/chat-intake/route.ts`.

**Intent classification** (turns 1-2): Button-based selection -> `medical_certificate` | `repeat_prescription` | `new_prescription` | `general_consult`.

**AI boundaries** -- CAN: collect symptoms via structured categories, flag patterns. CANNOT: diagnose, recommend medications, predict approval, answer medical questions.

**Structured output:**
```ts
interface StructuredIntake {
  status: 'in_progress' | 'ready_for_review' | 'requires_form' | 'safety_exit'
  serviceType: ServiceType
  data: MedCertIntake | RepeatRxIntake | NewRxIntake | ConsultIntake
  flags: IntakeFlag[]  // severity: info | caution | urgent | blocker
  requiresFormTransition: boolean
  aiMetadata: { turnCount, collectionDurationMs, modelVersion, promptVersion }
}
```

**Safety exits** (server-enforced, no continue option): emergency keywords -> 000/ED, crisis keywords -> Lifeline/Beyond Blue, Schedule 8 -> block + advise in-person GP, out-of-scope -> advise in-person care.

**Chat-to-form handoff:** On `requiresFormTransition: true`, data validated via `POST /api/ai/chat-intake/validate`, saved via `savePrefillData()`, redirect to `/request?prefill=true`. Transition triggers: cert >7 days, mental health new Rx, poor control + severe side effects, 3+ allergies, polypharmacy (5+ meds).

### Validation & Normalization

| Layer | Location |
|-------|----------|
| Client field-level | `components/request/steps/*.tsx` |
| Server Zod schemas | `lib/validation/med-cert-schema.ts`, `repeat-script-schema.ts`, `schemas.ts` |
| Pre-checkout | `lib/stripe/checkout.ts:93-136` |
| Safety rules | `lib/safety/evaluate.ts` |

**Normalization:** Form flow uses `transformAnswers()` in `unified-checkout.ts`. Chat flow uses `normalizeCollectedFields()` in `chat-validation.ts`. Both map frontend field names to backend columns.

### Address Search & Prescribing Address Flow

Address entry is unauthenticated because it runs before guest checkout and account creation. The public routes are protected by the `addressSearch` rate-limit bucket, not by auth.

```
AddressAutocomplete
  -> GET /api/places/autocomplete
     -> Addressfinder AU autocomplete first (GNAF/PAF, no post boxes)
     -> Google Places autocomplete fallback
  -> GET /api/places/details
     -> Addressfinder metadata for af:* ids
     -> Google Place Details for Google ids
  -> manual structured fallback fields
     -> addressLine1, suburb, state, postcode
```

Prescribing cases require the structured fields before checkout. They are normalized into `address_line1`, `suburb`, `state`, and `postcode`, persisted on `profiles`, visible in the doctor patient snapshot/admin prescribing identity blocker report, and used by `lib/parchment/sync-patient.ts` to build the Parchment address payload.

**DB insert sequence:** INSERT `intakes` (status=pending_payment) -> INSERT `intake_answers` -> Stripe redirect -> UPDATE `intakes` status=paid (webhook) -> INSERT `intake_drafts` (via `generateDraftsForIntake`).

**Tables:** `intakes`, `intake_answers`, `ai_chat_transcripts`, `ai_chat_audit_log`, `ai_safety_blocks`.

---

## Intake Status State Machine

**Enforced at DB level** via `validate_intake_status_transition` trigger. Any status update that violates these transitions raises a Postgres exception. No override exists outside E2E tests (see TESTING.md → E2E Intake Reset RPC).

```
                              ┌─────────────┐
                              │    draft     │
                              └──────┬───────┘
                                     │
                              ┌──────▼───────┐     ┌────────────────┐
                              │pending_payment├────►│checkout_failed │
                              └──────┬───────┘     └───────┬────────┘
                                     │                     │ (retry)
                                     │◄────────────────────┘
                              ┌──────▼───────┐
                              │     paid     │
                              └──┬───────┬───┘
                                 │       │
                          ┌──────▼──┐  ┌─▼──────────┐
                          │in_review│  │  approved   │ (direct approval)
                          └──┬──┬───┘  └──┬──────┬──┘
                             │  │         │      │
              ┌──────────────┘  │    ┌────▼──┐ ┌─▼───────────┐
              │                 │    │completed│ │awaiting_script│
        ┌─────▼─────┐    ┌─────▼──┐ └────────┘ └──────┬──────┘
        │pending_info│    │declined│                    │
        └─────┬─────┘    └────────┘             ┌──────▼──┐
              │                                 │completed │
        ┌─────▼────┐                            └─────────┘
        │escalated │
        └──────────┘
```

### Transition Rules

| From | Valid next states |
|------|-----------------|
| `draft` | `pending_payment`, `cancelled` |
| `pending_payment` | `paid`, `checkout_failed`, `cancelled`, `expired` |
| `checkout_failed` | `pending_payment`, `cancelled` |
| `paid` | `in_review`, `approved`, `cancelled` |
| `in_review` | `approved`, `declined`, `pending_info`, `escalated`, `cancelled` |
| `pending_info` | `in_review`, `paid`, `cancelled`, `expired` |
| `approved` | `completed`, `awaiting_script`, `cancelled` |
| `awaiting_script` | `completed`, `cancelled` |
| `escalated` | `in_review`, `declined`, `cancelled` |
| `declined` | *(terminal)* |
| `completed` | *(terminal)* |
| `cancelled` | *(terminal)* |
| `expired` | *(terminal)* |

**Terminal states** (`declined`, `completed`, `cancelled`, `expired`) accept no further transitions. Every non-terminal state can transition to `cancelled`.

**Valid initial states** (INSERT): `draft`, `pending_payment` only.

**Trigger:** `validate_intake_status_transition` on `intakes` table. `SECURITY DEFINER`, runs on INSERT and UPDATE. Skips validation if status unchanged.

---

## Payments & Checkout

### Payment Flow

```
checkout-step.tsx -> unified-checkout.ts createCheckoutFromUnifiedFlow()
  -> lib/stripe/checkout.ts createIntakeAndCheckoutAction()
     1. Env/DB service kill-switches   2. Capacity limit   3. Zod validation
     4. Medication blocklist   5. Safety rules   6. Auth check
     7. Idempotency key (>=16 chars)   8. Rate limit   9. INSERT intakes
     10. Fraud detection   11. INSERT intake_answers   12. Link chat transcript
     13. Resolve Stripe price (lib/stripe/price-mapping.ts)
     14. stripe.checkout.sessions.create({ metadata: intake_id, patient_id, category, subtype })
     15. UPDATE intakes SET payment_id
  -> Stripe hosted checkout (redirect)
  -> app/api/stripe/webhook/route.ts
     1. Signature verify   2. Atomic claim (try_process_stripe_event RPC)
     3. Extract intake_id from metadata   4. Guard: intake exists (else DLQ + 500)
     5. Guard: already paid   6. UPDATE intakes paid   7. Guard: concurrent webhook
     8. Save Stripe customer ID   9. Payment notification
     10. generateDraftsForIntake() (30s timeout, fallback: ai_draft_retry_queue)
```

**Key files:** `lib/stripe/checkout.ts`, `lib/stripe/guest-checkout.ts`, `lib/operational-controls/config.ts`, `lib/operational-controls/medication-blocklist.ts`, `app/api/stripe/webhook/route.ts`, `app/actions/generate-drafts.ts`, `lib/stripe/price-mapping.ts`.

**Pre-checkout blocks**: maintenance mode is enforced at `/request`; disabled services are enforced at `/request` and both checkout actions; capacity limits are enforced at `/request`, `createIntakeAndCheckoutAction`, and `createGuestCheckoutAction`. When the capacity switch is enabled and the daily counter RPC cannot be read, the system fails closed and shows the high-demand block. Business hours are a review-timing reference only and do not block checkout. PostHog `operational_block` events track capacity-limit blocks for analytics.

### Idempotency & Duplicate Protection

| Layer | Mechanism |
|-------|-----------|
| Client | Idempotency key per submission (`checkout-step.tsx`) |
| Server | Key validation >=16 chars (`checkout.ts:284`) |
| Database | UNIQUE constraint on `intakes.idempotency_key` |
| Stripe | Idempotency key on `sessions.create()` (guest flow) |
| Webhook | Atomic event claim via `try_process_stripe_event` RPC |
| Webhook | `payment_status === 'paid'` early return |
| Webhook | `WHERE payment_status IN ('pending','unpaid')` on UPDATE |

On Postgres 23505 (duplicate key), returns existing intake. If already paid, redirects to success.

**DLQ:** Missing intake -> `addToDeadLetterQueue()` + 500 (Stripe retries). Max 3 retries then 200 (stops retry storm). 5 items/hour -> Sentry FATAL. Admin UI at `/admin/webhook-dlq` with `X-Admin-Replay` replay. Daily cron: `cron/dlq-monitor/route.ts`.

**Retry payment** (`retryPaymentForIntakeAction`): auth + ownership + status guard (pending_payment only) + safety re-validation + expire old session + create fresh session.

### Decline & Refund Flow

Single canonical action: `declineIntake()` in `app/actions/decline-intake.ts`.

```
Entry points (doctor queue | admin panel | API)
  -> declineIntake({ intakeId, reason, reasonCode })
     1. Validate actor (doctor/admin)
     2. Atomic status update (optimistic locking) -> declined
     3. Process refund (eligible: med_cert, prescription; not: consult)
     4. Send decline email -> email_outbox
     5. Log: intake_events + compliance_audit_log
```

**Refund tracking** on `intakes`: `refund_status` (not_applicable | not_eligible | pending | succeeded | failed | skipped_e2e), `refund_stripe_id`, `refunded_at`, `refunded_by`. Failed refunds -> Sentry alert + reconciliation panel (`lib/data/reconciliation.ts`). Standalone refunds (any status) via `issueRefundAction()` in `app/doctor/queue/actions.ts`.

---

## Email System

### Architecture

| System | Location | Owner |
|--------|----------|-------|
| React Email templates | `lib/email/components/templates/` | Developer (production sends) |
| Database templates | `email_templates` table | Admin (editable content) |
| Admin preview | `lib/email/admin-preview.ts` | Server-only (preview/test) |

**Senders:** `lib/email/send-email.ts` (React templates via Resend), `lib/email/template-sender.ts` (DB templates with merge tags).

**Template types:** `med_cert_patient`, `med_cert_employer`, `welcome`, `script_sent`, `request_declined`.

**Admin hub:** `/admin/email-hub` links to editor (`/admin/emails`), preview (`/admin/emails/preview`), analytics (`/admin/emails/analytics`). Test studio at `/admin/email-test`.

### Retry & Delivery

All sends logged to `email_outbox`: `status` (pending | sent | failed | skipped_e2e), `provider_message_id` (Resend ID), `error_message`, `email_retry_count` (max 3), `intake_id`.

**Pipeline:** Doctor approval -> PDF generation -> Storage upload -> DB update -> Email send -> `email_outbox` log. Each step fails independently.

**E2E seam:** `PLAYWRIGHT=1` skips Resend sends, logs as `skipped_e2e`.

**Observability:** Sentry (`action:send_email`), Vercel logs, Resend dashboard (tagged `category`, `intake_id`), `email_outbox` queries.

### Email Test Studio

Admin interface at `/admin/email-test`. 4 themes (Modern, Sleek, Premium, Minimal), desktop/mobile preview, code view, test sends via Resend. Component: `EmailTestClient` at `app/admin/email-test/email-test-client.tsx`, API: `/api/admin/test-email/route.ts`.

---

## Certificate Pipeline

### Generation Flow

```
app/actions/approve-cert.ts
  1. Doctor gating (provider number + AHPRA)
  2. Idempotency check (existing cert?)
  3. Fetch active template from certificate_templates
  4. Snapshot clinic_identity + doctor_identity
  5. Render PDF (lib/pdf/template-renderer.ts — pdf-lib overlay on static template)
  6. Upload to private Supabase Storage bucket
  7. INSERT issued_certificates (template_id, snapshots, pdf_hash SHA256)
  8. Log to certificate_audit_log
  9. Send patient email (dashboard link, not attachment)
```

**Security:** Private storage bucket, signed URLs (5-15 min expiry) via `getSecureDownloadUrl()`, ownership check (patient/doctor/admin), certificate IDs via `crypto.randomInt()`. Public verification (`app/api/verify/route.ts`): rate-limited, masked patient name (first + last initial), no doctor name.

**Email delivery:** Links to `/patient/intakes/[id]`, failure tracked (`email_failed_at`, `email_failure_reason`), max 3 retries, duplicate prevention via `email_sent_at` check.

### Doctor Cert Workflow

1. Doctor loads draft from `document_drafts` table
2. Edits fields (patient name, dates, reason, cert type)
3. Calls `renderMedicalCertificateToPdf(draft, logoUrl)` via `pdf-lib` (template overlay)
4. Draft marked `status: 'issued'`, `issued_at` + `issued_by` set
5. PDF stored; `issued_certificates` record created with template config snapshot
6. Patient notified via email

### Template System

Config-driven, immutably versioned. Template config stored as JSONB in `certificate_templates`.

| Table | Owner | Purpose |
|-------|-------|---------|
| `clinic_identity` | Admin | Singleton clinic details (name, ABN, address, logo) |
| `profiles` | Doctor (admin validates) | Provider number, AHPRA number, signature (on `profiles` table) |
| `certificate_templates` | Admin | JSONB config, versioned per type |
| `issued_certificates` | System | Immutable record with template + identity snapshots |
| `certificate_audit_log` | System | Append-only issuance/download/verify log |

**Certificate types:** `work`, `uni`, `carer` (defined as `MedicalCertificateSubtype` in `types/db.ts`). Versioning: any change -> new version (monotonic per type). Activation is atomic (deactivate old + activate new in transaction). Partial unique index enforces one active per type. Issued certificates lock to `template_id` + `template_version` with optional `template_config_snapshot` for guaranteed re-render. Certificates are immutable except status (valid -> revoked | superseded). Idempotency via `cert_number` UNIQUE constraint (`generateCertificateNumber()` → `MC-YYYY-XXXXXXXX`) and `cert_ref` (`generateCertificateRef()` → `TYPE-YYYYMMDD-XXXXXXXX`). PDF integrity: SHA-256 hash stored on `issued_certificates`.

---

## Prescription Workflow

**Endpoint:** `GET /api/medications/search?q=<term>&limit=15` -- PBS read-only reference for medication recall. Returns: `pbs_code`, `drug_name`, `strength`, `form`, `manufacturer`.

**Hard constraints:** No ranking heuristics, no synonyms/substitutions/"did you mean", no clinical interpretation, no query caching, stateless. Never used by eligibility logic, approval automation, or AI.

**Patient UX:** Autocomplete dropdown, optional field (never blocks progression). Clinician view: patient-typed text + matched PBS item, labeled "Patient-selected (reference only)".

**Audit logging:** `intake_id`, `medication_search_used`, `medication_selected`, `selected_pbs_code`. Does NOT log keystrokes or partial queries.

**Controlled substances:** `lib/clinical/intake-validation.ts` hard-blocks Schedule 8 in both form and chat paths.

**Workflow:** Patient submits -> Doctor reviews in portal -> Doctor inputs into Parchment (external eScript) -> Doctor toggles "Script Sent" -> Patient notified via email.

---

## Doctor Portal

**Routes:** All under `/doctor`, require `doctor` or `admin` role.

| Route | Purpose | Data Source |
|-------|---------|-------------|
| `/doctor` | Queue + monitoring stats | `getDoctorQueue()`, `getIntakeMonitoringStats()` |
| `/doctor/intakes/[id]` | Intake review + AI drafts | `getIntakeWithDetails()`, `getAIDraftsForIntake()` |
| `/doctor/intakes/[id]/document` | Med cert generation | `getOrCreateMedCertDraftForIntake()` |
| `/doctor/patients` | Patient list (capped 100) | Direct Supabase query |
| `/doctor/analytics` | Intake + payment analytics | Direct Supabase query |
| `/doctor/scripts` | External script task list | `script_tasks` scoped by doctor/admin role |
| `/doctor/settings/identity` | Doctor identity config | Doctor profile |

**Queue architecture:** Paginated (`pageSize` capped at 100 via `Math.min()`). Stale data warning shown when queue may be out of date. Polling-based refresh. Paused doctors (`profiles.doctor_available = false`) receive an empty queue — `getDoctorQueue({ doctorId })` filters them out so they do not see new intakes. Live queue reads also exclude the fixed seeded E2E patient via `lib/data/seeded-e2e-data.ts` unless an E2E/test env flag is set.

**Intake review flow:**
1. Doctor opens case from queue
2. Patient answers displayed first; AI draft collapsed by default (prevents cognitive anchoring)
3. Red flags require explicit acknowledgment before approval (`hasRedFlags && !redFlagsAcknowledged`)
4. Clinical notes mandatory (minimum 20 characters)
5. Approval triggers `generateMedCertPdfAndApproveAction()` -- updates intake status, creates `generated_documents` record, sends email

**Safety controls:**
- AI drafts collapsed by default to prevent anchoring bias
- Red flag acknowledgment gate on approval
- Minimum clinical notes length enforced
- Stale queue warning via `role="alert"`

---

## Patient Portal

**Routes:** All under `/patient`, require `patient` role. Every route checks auth via `getAuthenticatedUserWithProfile()` or `requireRole(["patient"])`.

| Route | Purpose | Data Pattern |
|-------|---------|-------------|
| `/patient` | Dashboard (intakes + prescriptions) | `.limit(20)` intakes, `.limit(10)` prescriptions |
| `/patient/documents` | Certificate downloads | Intakes with `certificate_url` |
| `/patient/prescriptions` | Prescription history | Intakes + intake_answers + prescriptions |
| `/patient/messages` | Doctor-patient messaging (Supabase Realtime) | `patient_messages` table, `.limit(50)` |
| `/patient/intakes/[id]` | Intake detail + document download | Ownership check via `patient_id` |
| `/patient/payment-history` | Stripe invoices | Client-side fetch to `/api/patient/get-invoices` |
| `/patient/settings` | Profile, email prefs, export, delete | Multiple API endpoints |
| `/patient/health-summary` | Aggregated health summary (stats, recent requests, certs, Rx history) | Direct Supabase query |
| `/patient/notifications` | Notification feed (Supabase Realtime + Web Push via VAPID) | Direct Supabase query |

**Access control:** Double-layer -- RLS policies on every table (patient isolation via `auth.uid()` subquery) plus application-level ownership checks (`.eq("patient_id", patientId)`). Cross-patient access risk: LOW.

**Real-time:** Messaging and notifications use Supabase Realtime (`postgres_changes` subscription on INSERT/UPDATE). Push notifications via Web Push API (VAPID key, Service Worker). Notification types: `request_update`, `payment`, `document_ready`, `refill_reminder`, `system`, `promotion`.

**Guest → Authenticated flow:** Guest checkout creates profile without `auth_user_id` → Stripe redirect → success URL `/auth/complete-account?intake_id={id}` → post-signin page links the exact paid checkout profile when possible, otherwise one deterministic unlinked email match with paid history before newest guest fallback → sets `email_verified: true` → checks `onboarding_completed` → routes to `/patient/onboarding` or `/patient`.

**Payment state display:**

| Intake Status | What Patient Sees |
|---------------|-------------------|
| `pending_payment` | "Payment Required" card with CTA |
| `paid` | "Waiting for doctor review" |
| `in_review` | "Doctor is reviewing" |
| `approved` | "Approved" + download button |
| `declined` | "Declined" + reason |

---

## Admin Portal

**Access:** `admin` role only (set via `profiles.role = 'admin'` in Supabase).

Admin capabilities span the `/admin` route group and include: operations dashboard, analytics, compliance audit logs, feature flag management (kill switches, operational controls), finance (fraud flags, Stripe disputes), clinic identity configuration, and doctor management.

**Operational controls** (`/admin/features`): Review timing reference (open/close, timezone), capacity limit (max intakes/day), urgent notice banner, scheduled maintenance (start/end datetime). Runtime helpers live in `lib/operational-controls/`; admin writes go through `lib/feature-flags.ts` with server-side key/value validation. Cron `scheduled-maintenance` syncs `maintenance_mode` with the scheduled window every 5 min, but will not disable manually enabled maintenance mode from an admin incident response.

Role assignment methods: SQL update on `profiles` table (production) via Supabase dashboard or service role client.

---

## Database

### Core Tables

| Table | Purpose | Key Relations |
|-------|---------|---------------|
| `profiles` | User data (all roles) | Core FK target |
| `intakes` | Patient requests / main workflow | `profiles.id` via `patient_id` |
| `intake_answers` | Medical questionnaire responses | `intakes.id` via `intake_id` |
| `payments` | Stripe payment records | `intakes.id` via `intake_id` |
| `services` | Service catalog | Referenced by intakes |
| `patient_messages` | Doctor-patient messaging | `profiles.id` via `patient_id`, `sender_id` |
| `audit_logs` | System audit trail | Various FKs |
| `feature_flags` | Feature toggles | Standalone |
| `stripe_webhook_events` | Webhook idempotency tracking | Standalone |
| `fraud_flags` | Risk management flags | `intakes.id`, `profiles.id` |
| `stripe_disputes` | Dispute tracking | `intakes.id` |
| `email_preferences` | Unsubscribe / email prefs | `profiles.id` |
| `referrals` | Referral tracking ($5 credit both parties, UI: `referral-card.tsx`) | `profiles.id` (referrer + referee) |
| `document_drafts` | Certificate/document draft editing | `intakes.id` via `request_id` |
| `issued_certificates` | Issued certs with template snapshots | `intakes.id` |
| `certificate_audit_log` | Issuance/download/verify events | `issued_certificates.id` |
| `subscriptions` | Repeat Rx monthly subscriptions (Stripe) | `profiles.id` via `profile_id` |
| `intake_followups` | Post-approval follow-up check-ins (3/6/12-month) for ED and hair-loss patients | `intakes.id` via `intake_id`, `profiles.id` via `patient_id` |
| `followup_email_log` | Immutable log of follow-up reminder emails sent (max 3 per milestone) | `intake_followups.id` via `followup_id` |

**Relationship hierarchy:**
```
profiles
  +-- intakes (patient_id)
  |     +-- intake_answers (intake_id)
  |     +-- payments (intake_id)
  |     +-- fraud_flags (intake_id, patient_id)
  |     +-- stripe_disputes (intake_id)
  |     +-- intake_followups (intake_id, patient_id)
  |           +-- followup_email_log (followup_id)
  +-- patient_messages (patient_id, sender_id)
  +-- email_preferences (profile_id)
  +-- referrals (referrer_id, referee_id)
  +-- subscriptions (profile_id)
```

All tables have RLS policies. PHI fields use AES-256-GCM field-level encryption.

### API Routes by Domain

Route inventory is generated by `pnpm build`. Webhooks, cron jobs, and admin routes stay separate. Patient and doctor routes use RESTful patterns.

| Domain | Routes | Key Endpoints |
|--------|--------|---------------|
| **Admin** (2) | `/api/admin/*` | `test-email`, `webhook-dlq` |
| **AI** (6) | `/api/ai/*` | `chat-intake`, `chat-intake/validate`, `clinical-note`, `form-validation`, `med-cert-draft`, `symptom-suggestions` |
| **Cron** (21) | `/api/cron/*` | See OPERATIONS.md for full cron table |
| **Doctor** | `/api/doctor/*` | `assign-request`, `certificates/[intakeId]/download`, `drafts/[intakeId]`, `intakes/[id]/review-data`, `monitoring-stats`, `onboarding-status`, `patients/[patientId]/health-profile`, `scripts` (index + `[id]`), `export`, `log-view-duration` |
| **Patient** (14) | `/api/patient/*` | `certificates/[id]/download`, `documents/[intakeId]/download`, `get-invoices`, `download-invoice`, `health-profile`, `intake-status`, `messages` (GET/POST), `profile` (PATCH), `referral`, `refill-prescription`, `retry-payment`, `resend-confirmation`, `last-prescription`, `update-profile` |
| **Med Cert** (2) | `/api/med-cert/*` | `preview` (GET), `render` (POST) |
| **Stripe Portal** (1) | `/api/stripe/customer-portal` | POST → creates Stripe billing portal session for subscription management |
| **Webhooks** (5) | `/api/stripe/webhook`, `/api/stripe/verify-payment`, `/api/webhooks/resend`, `/api/webhooks/telegram`, `/api/webhooks/parchment` | Per-provider signature verification; webhook handlers include `invoice.payment_succeeded`, `customer.subscription.deleted`, `prescription.created` (Parchment) |
| **Misc** (12) | Various | `/api/certificates/[id]/download`, `/api/health`, `/api/medications/search`, `/api/verify`, `/api/unsubscribe`, `/api/search`, `/api/profile/ensure` |

### Server-Only Module Pattern

Any function that uses `createServiceRoleClient()` or accesses PHI directly must be in a `"server-only"` module. This prevents accidental client-bundle inclusion of service role keys.

**Pattern:**
```ts
// lib/db/patient-count.ts
import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function getPatientCountFromDB(): Promise<number> { ... }
```

**Rule:** If a linter or build error says "server-only import in client component" — the fix is to split the function into its own `server-only` file, not to suppress the error or remove the import guard.

---

## Component Patterns

### UIX Component Library

Custom abstraction layer at `components/uix/`. Import everything from `@/components/uix`.

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `UserCard` | User display with avatar | `name`, `description`, `avatarUrl`, `size` |
| `PageBreadcrumbs` | Navigation breadcrumbs | `showHome`, `links: {label, href?}[]` |
| `DatePickerField` | Date picker with ISO string I/O | `value`, `onChange`, `disablePast`, `isRequired` |
| `Snippet` | Copyable code/text display | `symbol`, `size`, children |
| `Pagination` | Shared pagination control | `page`, `totalPages`, `onPageChange` |
| `ScrollShadow` | Scroll container with edge affordance | children |

Also re-exports selected shadcn/Radix primitives: `Button`, `Card`, `Input`, `Badge`, `Skeleton`, `Spinner`, `Tooltip`, `Modal`, `Accordion`, and `Stepper`.

**Component decision tree:** See CLAUDE.md for quick-reference selection guide (shadcn vs UIX vs solid-depth components).

**File organization:** `components/ui/` (67 primitives), `components/shared/` (39 shared), `components/uix/` (UIX wrappers), plus domain directories (`admin/`, `doctor/`, `patient/`, `request/`, `marketing/`).

### Service Icon Tiles (`ServiceIconTile`)

Single source of truth for service icons across the entire UI. Import from `@/components/icons/service-icons`.

```tsx
<ServiceIconTile iconKey="Lightning" color="blue" size="sm" />
```

**Props:**

| Prop | Type | Values |
|------|------|--------|
| `iconKey` | `string` | `"FileText"`, `"Pill"`, `"Lightning"`, `"Sparkles"`, `"Heart"`, `"Flame"` |
| `color` | `string` | `"emerald"`, `"cyan"`, `"blue"`, `"violet"`, `"pink"`, `"rose"` |
| `size` | `"sm" \| "md" \| "lg"` | sm=nav/dropdown, md=compact cards, lg=main service cards |
| `className` | `string?` | Optional extra classes (e.g. `"mb-4"`) |

**Sizes:** `sm` → `w-8 h-8 rounded-lg` · `md` → `w-10 h-10 rounded-xl` · `lg` → `w-12 h-12 rounded-xl`

**Color → service mapping** (canonical, matches `services-dropdown.tsx`):
- `emerald` = Medical Certificates · `cyan` = Repeat Medication · `blue` = ED Treatment · `violet` = Hair Loss

**Used in:** `services-dropdown.tsx`, `mobile-menu-content.tsx`, `user-menu.tsx`, `service-cards.tsx`, `service-picker.tsx`. Do not create local icon containers — always use `ServiceIconTile`.

### Service Page Patterns

Two patterns coexist intentionally. Use this decision rule for every new service/marketing page:

**Pattern A — `ServiceFunnelPage` (config-driven)**
`components/marketing/service-funnel-page.tsx`

Use when: the page is a standard service landing page with a fixed section order (hero → how it works → pricing → testimonials → FAQ → CTA). All content is passed via a typed config object.

- All InstantMed service pages use this: med-cert, repeat-rx, consult, hair-loss, weight-loss, womens-health, etc.
- Sections are ordered and spaced consistently across all services — no per-page layout decisions
- To add a new service page: add a config to `lib/marketing/service-funnel-configs.ts`, create a route that renders `<ServiceFunnelPage config={...} />`

**Pattern B — Manual Morning Canvas composition**

Use when: the page is not a standard service funnel — it has a unique layout, unique section order, or content that doesn't fit the config model (e.g. `/trust`, `/our-doctors`, `/reviews`, homepage, `/pricing`).

- Compose sections directly from `components/marketing/sections/` (MeshGradientHero, FeatureGrid, TestimonialsSection, etc.)
- No constraint on section order — but use Morning Canvas components consistently
- Do NOT use this for service landing pages — use Pattern A instead

**The rule in one sentence:** Standard service = Pattern A (config). Unique layout = Pattern B (compose).

### Image Optimization

- Use `next/image` for all images
- Hero images: `priority={true}`. Below-fold: default lazy loading
- Next.js auto WebP/AVIF optimization enabled
- Exceptions (raw `<img>` allowed): email templates (client compatibility), blob URL previews (file upload/OCR), inline SVG decorations

---

## SEO System

**Programmatic SEO** generates 160+ static landing pages at build time (50 conditions + 27 symptoms + 34 guides + 5 comparisons + 46 audience). No DB calls at render.

**URL structure:**
```
/conditions/[slug]      50 condition pages (cold-and-flu, migraine, uti, etc.)
/symptoms/[slug]        Symptom-based landing pages
/guides/[slug]          How-to health guides
/compare/[slug]         Service comparison pages
/medications/[slug]     Medication information pages
/for/[audience]         Audience segment pages (students, parents, tradies, etc.)
/locations/[city]       Australian city pages
/intent/[slug]          High-intent search query landing pages
```

**Data layer:** `lib/seo/pages/` -- typed page definitions, shared interfaces, and lookup helpers. Template: `components/seo/seo-page-template.tsx`. Each page requires: unique title (50-60 chars), description (120-150 chars), 5+ symptoms, 3+ red flags, 3+ FAQs, 2+ disclaimers.

**Metadata:** Auto-generated `<title>`, `<meta description>`, Open Graph tags, canonical URLs. JSON-LD `FAQPage` structured data via `lib/seo/safe-json-ld.ts` and `components/seo/healthcare-schema.tsx`.

**Sitemap/robots:** `app/sitemap.ts` and `app/robots.ts` auto-update from the page data layer. No manual updates needed.

**IndexNow:** Automatic real-time index submission to Bing (and Yandex/other IndexNow participants) on new/updated content. Implementation: `/api/indexnow/route.ts` (endpoint) and `/api/cron/indexnow/route.ts` (scheduled). Key: stored in `INDEXNOW_KEY` env var. No Google support — Google has its own crawl pipeline.

**Internal linking:** Use explicit, page-owned links or `ContentHubLinks` for service-to-content cross-linking. Do not reintroduce null-rendering SEO compatibility wrappers.

**Compliance rules:** No guarantee claims ("instant", "cure", "100%"). Always include emergency disclaimers. No specific diagnoses. Australian language and regulations.

---

## AI Configuration

**Provider:** Anthropic Claude via Vercel AI SDK (`lib/ai/provider.ts`). Key: `ANTHROPIC_API_KEY` (preferred) or `VERCEL_AI_GATEWAY_API_KEY` (production gateway).

All AI usage is documentation-assistance only. Safety logic is deterministic (not AI). See CLINICAL.md → AI Boundary Rules.

### Model Configs

| Config key | Model | Temperature | Max tokens | Used for |
|-----------|-------|-------------|------------|---------|
| `clinical` | `claude-sonnet-4-20250514` | 0.1 | 2,000 | Medical cert drafts, clinical note generation |
| `advanced` | `claude-sonnet-4-20250514` | 0.2 | 4,000 | Review summary, complex documentation |
| `conversational` | `claude-sonnet-4-20250514` | 0.5 | 1,000 | Chat intake dialogue |
| `creative` | `claude-sonnet-4-20250514` | 0.7 | 500 | Symptom suggestions, intelligent completions |

**Helpers:** `getDefaultModel()` → clinical · `getAdvancedModel()` → advanced · `getConversationalModel()` → conversational · `getCreativeModel()` → creative.

**PII sanitization:** All prompts pass through `sanitizePromptInput()` before being sent. Strips Medicare numbers, AU phone numbers, email addresses, and DOB patterns. Clinical notes are sent with patient identifiers removed — patient identity is never in the AI context.

### AI Endpoints

| Route | Config used | Purpose |
|-------|-------------|---------|
| `/api/ai/chat-intake` | conversational | Conversational intake collection |
| `/api/ai/chat-intake/validate` | clinical | Validate + normalize chat-collected fields |
| `/api/ai/clinical-note` | clinical | Generate clinical notes for doctor review |
| `/api/ai/form-validation` | clinical | Validate free-text intake answers |
| `/api/ai/med-cert-draft` | clinical | Generate medical certificate draft text |
| `/api/ai/symptom-suggestions` | creative | Autocomplete symptom descriptions |

---

## Testing Architecture

See `TESTING.md` for full testing strategy, conventions, E2E patterns, auth bypass, and coverage rules.

**Quick reference:**
- Unit tests: Vitest, Node environment, `lib/__tests__/`, 80/70/80/80 coverage thresholds (scoped to `lib/clinical/` and `lib/security/` — `lib/state-machine/` was removed from the include list in 2026-04-08 since the directory no longer exists)
- E2E tests: Playwright, `e2e/`, auth bypass via `PLAYWRIGHT=1` + `__e2e_auth_user_id` cookie. **Full suite runs in CI** as of commit `ae1c80822` (previously only 4 of 47 specs ran). Requires `STRIPE_WEBHOOK_SECRET` (test-mode) in GitHub repo secrets or webhook tests silently skip.
- Current local test count: **1,521 passing** across 55 test files as of 2026-04-28. Earlier 987-test references are stale.
- Commands: `pnpm test` · `pnpm test:coverage` · `pnpm e2e:chromium`

---

## Directory Index

### `app/` — 571 files, 240 routes

| Directory | Purpose | Key files |
|-----------|---------|-----------|
| `app/actions/` | Server actions | `unified-checkout.ts` (checkout bridge), `generate-drafts.ts` (AI), `ensure-profile.ts` |
| `app/admin/` | Admin dashboard | `email-hub/`, `features/`, `settings/`, `ops/`, `analytics/` |
| `app/doctor/` | Doctor portal | `queue/` (intake queue), `intakes/[id]/` (review), `scripts/` (Rx tasks), `patients/` |
| `app/patient/` | Patient dashboard | `intakes/` (history + success), `settings/`, `onboarding/`, `documents/` |
| `app/api/` | API routes | `stripe/webhook/`, `cron/`, `ai/`, `health/`, `certificates/`, `intakes/` |
| `app/api/cron/` | Scheduled jobs (21) | `stale-queue/`, `email-dispatcher/`, `health-check/`, `release-stale-claims/`, etc. See OPERATIONS.md |
| `app/api/stripe/webhook/` | Stripe handlers | 9 handlers: `checkout-session-completed`, `checkout-session-expired`, `checkout-session-async-payment-succeeded/failed`, `charge-refunded`, `charge-dispute-created`, `payment-intent-payment-failed`, `invoice-payment-succeeded`, `customer-subscription-deleted`. Registered in `handlers/index.ts`. |
| `app/request/` | **Sole canonical intake flow.** Single page, step-based wizard. |
| `app/(dev)/` | Dev-only routes | Email preview, Sentry test — blocked in production by middleware |
| `app/blog/` | Health articles | ISR 12h, `[slug]/page.tsx` |
| `app/conditions/[slug]/` | SEO: conditions | Programmatic from `lib/seo/data/` |
| `app/symptoms/[slug]/` | SEO: symptoms | Programmatic from `lib/seo/data/` |
| `app/guides/[slug]/` | SEO: guides | Programmatic from `lib/seo/data/` |
| `app/for/[audience]/` | SEO: audience | students, parents, tradies, etc. |
| `app/locations/[city]/` | SEO: city pages | 42 Australian cities from `lib/seo/data/deep-city-content.ts` |
| `app/locations/state/[state]/` | SEO: state hub pages | 8 states (nsw/vic/qld/wa/sa/tas/act/nt) from `lib/seo/data/states.ts`. Added 2026-04-08 for head-term SEO ("online doctor new south wales"). |
| `app/intent/[slug]/` | SEO: high-intent | Search query landing pages |
| `app/compare/[slug]/` | SEO: comparisons | Service comparison pages |
| `app/offline/` | Offline fallback | PWA offline page — shown by service worker when network unavailable |

### `components/` — 394 files

| Directory | Count | Purpose |
|-----------|-------|---------|
| `ui/` | 67 | shadcn/Radix primitives (Button, Input, Dialog, etc.) |
| `uix/` | 11 | Thin shared wrappers and re-exports (UserCard, PageBreadcrumbs, DatePickerField, Pagination, Snippet, etc.) |
| `shared/` | 39 | Header, Footer, InlineAuthStep, CheckoutButton, LazyOverlays |
| `request/` | 32 | Intake flow: `request-flow.tsx` (orchestrator), `steps/` (per-step components), `store.ts` (Zustand) |
| `marketing/` | 20 | Landing pages, ServiceFunnelPage, testimonials, exit intent |
| `doctor/` | — | IntakeReviewPanel, RepeatPrescriptionChecklist, clinical views |
| `admin/` | — | Admin-specific panels and views |
| `patient/` | — | ReferralCard, CrossSellCard, dashboard components |
| `chat/` | — | AI chat intake (ChatIntake, lazy-loaded) |
| `charts/` | — | LazyAreaChart, LazyBarChart, etc. (dynamic import from recharts) |
| `effects/` | — | Confetti, ShakeAnimation |
| `providers/` | — | PostHogProvider, ThemeProvider, MotionProvider |
| `heroes/` | — | Morning Canvas hero variants (Split, Centered, Stats, FullBleed) |
| `ui/morning/` | — | Morning Canvas primitives (MeshGradientCanvas, WordReveal, PerspectiveTiltCard) |
| `ui/skeleton.tsx` | — | SkeletonCard, SkeletonForm, SkeletonList, SkeletonDashboard, Spinner |

### `lib/` — 334 files

| Directory | Purpose | Key files |
|-----------|---------|-----------|
| `lib/auth.ts` | Auth helpers | `getAuthenticatedUserWithProfile()`, `requireRoleOrNull()` |
| `lib/constants.ts` | App constants | PRICING, SYSTEM_AUTO_APPROVE_ID, CONTACT_EMAIL |
| `lib/env.ts` | Env validation | Zod schemas, `getAppUrl()` |
| `lib/format.ts` | Date formatting | All AEST, `formatDateLong()`, `addDays()` |
| `lib/utils.ts` | Utilities | `cn()` (class merger) |
| `lib/ai/` | AI integration | `provider.ts` (model profiles), prompts, clinical note generation |
| `lib/clinical/execute-cert-approval.ts` | Certificate approval pipeline | Fetch intake → validate → generate PDF → store → email |
| `lib/clinical/` | Clinical logic | `auto-approval.ts` (eligibility), `auto-approval-pipeline.ts` (orchestrator), `auto-approval-state.ts` (state machine — CAS transitions), `intake-validation.ts` (Schedule 8 blocking), `triage-rules-engine.ts` |
| `lib/data/` | Supabase queries | `intakes.ts`, `issued-certificates.ts`, `documents.ts`, `intake-answers.ts` — all use `createServiceRoleClient()` |
| `lib/email/` | Email system | `send-email.ts` (server sender), `send/` helpers, `email-dispatcher.ts` (cron processor) |
| `lib/safety/` | Safety & eligibility engine | `evaluate.ts`, `rules.ts`, `types.ts`. Used by `/request` flow + `lib/stripe/checkout.ts` pre-checkout gate. |
| `lib/offline-queue.ts` | Client-side offline action queue | Used by `hooks/use-connection-status.ts` |
| `lib/pdf/` | PDF generation | `template-renderer.ts` (pdf-lib overlay on static templates in `/public/templates/`) |
| `lib/rate-limit/` | Rate limiting | `redis.ts` (Upstash), `doctor.ts` (auto-approval limits). Fallback: in-memory Map |
| `lib/request/` | Step registry | `step-registry.ts` (step definitions), `validation.ts` (per-step Zod schemas) |
| `lib/security/` | Encryption | `phi-encryption.ts` (AES-256-GCM), `phi-field-wrappers.ts` (data layer wrappers) |
| `lib/stripe/` | Payments | `checkout.ts`, `guest-checkout.ts`, `price-mapping.ts`, `client.ts` |
| `lib/seo/data/` | SEO content | `conditions.ts`, `symptoms.ts`, `guides.ts`, `comparisons.ts`, `audience-pages.ts`, `condition-location-combos.ts`, `deep-city-content.ts` — drive programmatic pages |
| `lib/blog/articles/` | Blog content | Article data (12,574 lines total) |
| `lib/notifications/` | Alerts | `telegram.ts` (ops alerts), `service.ts` (payment notifications) |
| `lib/observability/` | Logging/monitoring | `logger.ts` (structured logger), `sentry.ts` (helpers) |
| `lib/feature-flags.ts` | Feature flags | DB-backed via `feature_flags` table, `getFeatureFlags()` |
| `lib/operational-controls/` | Runtime controls | Capacity fail-closed checks and medication-blocklist answer extraction |
| `lib/posthog-server.ts` | Server analytics | `getPostHogClient()`, funnel tracking, safety outcome tracking |
| `lib/validation/` | Validation schemas | `med-cert-schema.ts`, `repeat-script-schema.ts` |

### Other top-level

| File/Dir | Purpose |
|----------|---------|
| `middleware.ts` | Auth (Supabase), route protection, E2E bypass, prod route blocking |
| `instrumentation.ts` | Sentry server init |
| `instrumentation-client.ts` | PostHog + Sentry client init |
| `types/db.ts` | Supabase generated types + custom interfaces |
| `types/certificate-template.ts` | PDF template field definitions |
| `hooks/` | 5 custom hooks (use-connection-status, use-debounce, use-doctor-shortcuts, use-keyboard-navigation, use-landing-analytics) |
| `e2e/` | 46 Playwright specs, `helpers/` (seed/teardown, auth bypass). Full suite runs in CI. |
| `supabase/migrations/` | 52 SQL migration files (1 squashed baseline + 51 incremental). Most recent: `20260502012000_harden_info_request_rpc_privileges.sql` |
| `public/templates/` | Static PDF templates for certificate generation |

---

## Key Patterns

### Auth
```
getAuthenticatedUserWithProfile()  → { user, profile } or null (non-throwing)
requireRoleOrNull(["doctor"])      → role check, returns null if unauthorized
verifyCronRequest(request)         → cron auth via CRON_SECRET header
```

### Data Access
```
createServiceRoleClient()          → Supabase with service role (server-only, 187 files)
createClient()                     → Supabase with user session (client-side)
```

### Server Action Return Shape
```typescript
{ success: boolean; error?: string; data?: T }
```

### Intake Flow
```
/request?service=<type> → step-registry.ts defines steps → Zustand store → checkout → webhook → queue
```

### Certificate Pipeline
```
Document Builder approve action → approveAndSendCert() → executeCertApproval() → PDF render → Supabase Storage → email with dashboard link
```

Doctor-triggered medical certificate approval must enter through the Document Builder server action, not a duplicate API route.

### Auto-Approval Pipeline

Med cert only. Feature-flagged (`ai_auto_approve_enabled`), rate-limited, dry-run mode available.

**State machine** — single `auto_approval_state` enum column replaces the old 6-column boolean soup:

| State | Meaning |
|-------|---------|
| `awaiting_drafts` | Paid, AI drafts not yet generated |
| `pending` | Drafts ready, waiting for cron |
| `attempting` | Actively processing — IS the distributed lock |
| `approved` | TERMINAL: cert issued via auto-approval |
| `failed_retrying` | Transient failure, cron will retry |
| `needs_doctor` | TERMINAL: deterministic failure OR retries exhausted (≥10) |

**Transitions:**
```
payment webhook → awaiting_drafts → (drafts ready) → pending
                                                          ↓
                                                      cron picks up
                                                          ↓
                                                      attempting → (cert issued) → approved
                                                          ↓
                                             (deterministic fail) → needs_doctor
                                                          ↓
                                             (transient fail) → failed_retrying → cron retry
                                                          ↓
                                             (attempts ≥ 10) → needs_doctor

Timeout recovery: attempting (stale > 10 min) → failed_retrying (cron)
```

**Schema additions** (`intakes` table):

| Column | Type | Purpose |
|--------|------|---------|
| `auto_approval_state` | `auto_approval_state` enum | Single source of truth |
| `auto_approval_state_reason` | text | Failure reason for `failed_retrying` / `needs_doctor` |
| `auto_approval_state_updated_at` | timestamptz | Enables timeout recovery |

Kept: `auto_approval_attempts` (observability), `ai_approved`, `ai_approved_at` (read by 10+ files), `claimed_by`/`claimed_at` (doctor lock flows only).
Dropped: `auto_approval_skipped`, `auto_approval_skip_reason` (replaced by state enum).

Partial index on actionable states only: `idx_intakes_auto_approval_active` on `(auto_approval_state, paid_at) WHERE state IN ('pending', 'failed_retrying', 'attempting')`.

**Modules:**

| File | Role |
|------|------|
| `lib/clinical/auto-approval-state.ts` | Atomic CAS state transitions — all Sentry/PostHog/Telegram observability lives here |
| `lib/clinical/auto-approval-pipeline.ts` | Orchestrator: claim → eligibility → doctor select → execute → mark terminal state |
| `lib/clinical/auto-approval.ts` | Eligibility engine (unchanged) |

**Race condition handling:**

| Problem | Solution |
|---------|----------|
| Two cron instances, same intake | CAS: `UPDATE WHERE state = 'pending'` — only one wins |
| Webhook + cron race | Webhook sets `awaiting_drafts`; cron only sees `pending`/`failed_retrying` |
| Crashed pipeline orphan lock | Stale `attempting` → `failed_retrying` after 10 min |
| Pipeline succeeds, no release needed | `markApproved()` is atomic — no release step |

**Alerting:** `needs_doctor` (exhausted retries) and stale recovery trigger Telegram. Sentry: `warning` on exhausted retries and stale recovery; `info` on approval and deterministic `needs_doctor`.

---

## AI Configuration

Models in `lib/ai/provider.ts`. Routed through Vercel AI Gateway in production (fallback: direct Anthropic).

| Profile | Model | Temp | Use |
|---------|-------|------|-----|
| clinical | claude-sonnet-4-20250514 | 0.1 | Medical documentation — high accuracy |
| conversational | claude-sonnet-4-20250514 | 0.5 | Chat intake — balanced |
| creative | claude-sonnet-4-20250514 | 0.7 | Suggestions — more variety |
| advanced | claude-sonnet-4-20250514 | 0.2 | Complex medical analysis |

## Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Marketing homepage. Section order: hero (with `RegulatoryPartners` + `LastReviewedSignal` inline, trust signals at highest-anxiety moment) → lifestyle photo strip → service cards (active services only) → coming-soon strip → how-it-works → social proof → FAQ → CTA banner. `RegulatoryPartners` moved from mid-page into the hero. Coming-soon cards (Women's Health, Weight Loss) separated below active grid to prevent dead zones. |
| `/medical-certificate` | Premium landing for med certs — the gold-standard `MedCertLanding` pattern. |
| `/prescriptions` | Repeat medication landing (one-off eScript review workflow). Subscription language is dormant/future strategy unless reactivated in `docs/BUSINESS_PLAN.md`. |
| `/erectile-dysfunction` | Bespoke ED specialty landing (`ErectileDysfunctionLanding`). Routes into `/request?service=consult&subtype=ed`. Form-first doctor review; doctor may call/message if clinically needed. Short URL `/ed` 301s here. |
| `/hair-loss` | Bespoke hair loss specialty landing (`HairLossLanding`). Routes into `/request?service=consult&subtype=hair_loss`. Form-first doctor review; doctor may call/message if clinically needed. |
| `/consult` | Canonical generic doctor-consult funnel (`ServiceFunnelPage` + 12 FAQs + HowToSchema). The `/general-consult` URL was retired in commit `542ae8119` as an SEO cannibalization fix and now 301s here. |
| `/blog` | Doctor-reviewed health articles (12h ISR revalidation) |
| `/faq` | 34 FAQs across 7 categories |
| `/contact` | Contact form → support@instantmed.com.au |
| `/terms` | Terms of Service (Feb 2026). §5 "Clinical Governance Model" discloses the solo AHPRA-registered Medical Director and links to `/clinical-governance`. §13 links to `/complaints`. |
| `/privacy` | Privacy Policy (Feb 2026) |
| `/complaints` | 8-section complaints policy: 24h ack, 14-day clinical SLA, AHPRA + 8 state HCCC bodies + OAIC privacy escalation. Linked from footer + Terms §13. |
| `/clinical-governance` | Solo-director governance framework (protocol design, audit cadence, scope boundaries). Marketing surface uses "AHPRA-registered Medical Director" language — never FRACGP/cohort/peer-review claims. |
| `/conditions/[slug]` | Health condition pages |
| `/symptoms/[slug]` | Symptom pages |
| `/guides/[slug]` | How-to health guides |
| `/compare/[slug]` | Service comparison pages |
| `/medications/[slug]` | Medication information pages |
| `/intent/[slug]` | High-intent search query landing pages |
| `/for/[audience]` | Audience segment pages (students, parents, etc.) |
| `/locations/[city]` | Location-based pages |

## File Size Reference (largest client components)

| File | Size | Notes |
|------|------|-------|
| `components/marketing/med-cert-landing.tsx` | 38KB | Dynamic imports for testimonials/exit-intent |
| `app/admin/features/features-list.tsx` | 35KB | Feature flag admin |
| `components/request/request-flow.tsx` | 31KB | Intake flow orchestrator |
| `app/admin/settings/templates/template-studio-client.tsx` | 28KB | PDF template editor |
| `app/patient/intakes/[id]/client.tsx` | 28KB | Patient intake detail |
| `app/doctor/queue/queue-table.tsx` | 27KB | Doctor queue table |
| `lib/email/send-email.ts` | 598 lines | Email sender (server) |
