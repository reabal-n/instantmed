# ARCHITECTURE.md — InstantMed System Architecture

> Canonical reference for system design, data flows, and integrations.
> For clinical rules see CLINICAL.md · For security see SECURITY.md · For ops see OPERATIONS.md

## Intake System

### Step-Based Wizard

Unified `/request` entry point routes all clinical flows through a dynamic step-based wizard.

```
app/request/page.tsx -> RequestFlow -> step-router.tsx (lazy) -> steps/*.tsx
                            |
                        store.ts (Zustand + localStorage persist)
```

**Core files:** `components/request/request-flow.tsx` (orchestrator), `step-router.tsx` (lazy loader), `step-error-boundary.tsx`, `store.ts` (Zustand), `lib/request/step-registry.ts` (step definitions + skip logic).

**Service routing** via `?service=` param. `mapServiceParam()` normalises aliases (`medcert` -> `med-cert`, `repeat-rx` -> `repeat-script`, `consultation` -> `consult`).

| Service | Steps |
|---------|-------|
| `med-cert` | certificate, symptoms, details, safety, review, checkout |
| `prescription` / `repeat-script` | medication, medication-history, medical-history, details, safety, review, checkout |
| `consult` | consult-reason, medical-history, details, safety, review, checkout |

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
| Safety rules | `lib/flow/safety/evaluate.ts` |

**Normalization:** Form flow uses `transformAnswers()` in `unified-checkout.ts`. Chat flow uses `normalizeCollectedFields()` in `chat-validation.ts`. Both map frontend field names to backend columns.

**DB insert sequence:** INSERT `intakes` (status=pending_payment) -> INSERT `intake_answers` -> Stripe redirect -> UPDATE `intakes` status=paid (webhook) -> INSERT `intake_drafts` (via `generateDraftsForIntake`).

**Tables:** `intakes`, `intake_answers`, `ai_chat_transcripts`, `ai_chat_audit_log`, `ai_safety_blocks`.

---

## Payments & Checkout

### Payment Flow

```
checkout-step.tsx -> unified-checkout.ts createCheckoutFromUnifiedFlow()
  -> lib/stripe/checkout.ts createIntakeAndCheckoutAction()
     1. Service kill-switch   2. Zod validation   3. Safety rules   4. Auth check
     5. Idempotency key (>=16 chars)   6. Rate limit   7. INSERT intakes
     8. Fraud detection   9. INSERT intake_answers   10. Link chat transcript
     11. Resolve Stripe price (lib/stripe/price-mapping.ts)
     12. stripe.checkout.sessions.create({ metadata: intake_id, patient_id, category, subtype })
     13. UPDATE intakes SET payment_id
  -> Stripe hosted checkout (redirect)
  -> app/api/stripe/webhook/route.ts
     1. Signature verify   2. Atomic claim (try_process_stripe_event RPC)
     3. Extract intake_id from metadata   4. Guard: intake exists (else DLQ + 500)
     5. Guard: already paid   6. UPDATE intakes paid   7. Guard: concurrent webhook
     8. Save Stripe customer ID   9. Payment notification
     10. generateDraftsForIntake() (30s timeout, fallback: ai_draft_retry_queue)
```

**Key files:** `lib/stripe/checkout.ts`, `lib/stripe/guest-checkout.ts`, `app/api/stripe/webhook/route.ts`, `app/actions/generate-drafts.ts`, `lib/stripe/price-mapping.ts`.

**Pre-checkout blocks** (enforced at `/request` and in `createIntakeAndCheckoutAction`): maintenance mode, business hours (`isOutsideBusinessHours`), capacity limit (`isAtCapacity`), disabled services. PostHog `operational_block` events track business-hours and capacity-limit blocks for analytics.

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
| React Email templates | `components/email/templates/` | Developer (production sends) |
| Database templates | `email_templates` table | Admin (editable content) |
| Admin preview | `lib/email/admin-preview.ts` | Server-only (preview/test) |

**Senders:** `lib/email/send-email.ts` (React templates via Resend), `lib/email/template-sender.ts` (DB templates with merge tags).

**Template types:** `med_cert_patient`, `med_cert_employer`, `welcome`, `script_sent`, `request_declined`.

**Admin hub:** `/admin/email-hub` links to editor (`/admin/emails`), preview (`/admin/emails/preview`), analytics (`/admin/emails/analytics`), queue (`/admin/email-queue`), outbox (`/admin/ops/email-outbox`).

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
  5. Render PDF (lib/pdf/med-cert-pdf-v2.tsx + lib/pdf/med-cert-render.ts)
  6. Upload to private Supabase Storage bucket
  7. INSERT issued_certificates (template_id, snapshots, pdf_hash SHA256)
  8. Log to certificate_audit_log
  9. Send patient email (dashboard link, not attachment)
```

**Security:** Private storage bucket, signed URLs (5-15 min expiry) via `getSecureDownloadUrl()`, ownership check (patient/doctor/admin), certificate IDs via `crypto.randomInt()`. Public verification (`app/api/verify/route.ts`): rate-limited, masked patient name (first + last initial), no doctor name.

**Email delivery:** Links to `/patient/intakes/[id]`, failure tracked (`email_failed_at`, `email_failure_reason`), max 3 retries, duplicate prevention via `email_sent_at` check.

### Doctor Cert Workflow

1. Doctor loads draft from `med_cert_drafts` table
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
| `doctor_identity` | Doctor (admin validates) | Provider number, AHPRA, signature |
| `certificate_templates` | Admin | JSONB config, versioned per type |
| `issued_certificates` | System | Immutable record with template + identity snapshots |
| `template_audit_log` | System | Append-only change log |

**Certificate types:** `med_cert_work`, `med_cert_uni`, `med_cert_carer`. **Also generates:** pathology/imaging referral documents (`lib/pdf/referral-template.tsx`, HTML print-optimized with urgency levels). Versioning: any change -> new version (monotonic per type). Activation is atomic (deactivate old + activate new in transaction). Partial unique index enforces one active per type. Issued certificates lock to `template_id` + `template_version` with optional `template_config_snapshot` for guaranteed re-render. Certificates are immutable except status (valid -> revoked | superseded). Idempotency key: `SHA256(intake_id + doctor_id + date)`.

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
| `/doctor/repeat-rx/[id]` | Repeat prescription review | Intake + patient join |
| `/doctor/settings/identity` | Doctor identity config | Doctor profile |

**Queue architecture:** Paginated (`pageSize` capped at 100 via `Math.min()`). Stale data warning shown when queue may be out of date. Polling-based refresh. Paused doctors (`profiles.doctor_available = false`) receive an empty queue — `getDoctorQueue({ doctorId })` filters them out so they do not see new intakes.

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

**Guest → Authenticated flow:** Guest checkout creates profile without `clerk_user_id` → Stripe redirect → success URL `/auth/complete-account?intake_id={id}` → post-signin page links guest profile by email match → sets `email_verified: true` → checks `onboarding_completed` → routes to `/patient/onboarding` or `/patient`.

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

**Operational controls** (`/admin/features`): Business hours (configurable open/close, timezone), capacity limit (max intakes/day), urgent notice banner, scheduled maintenance (start/end datetime). Cron `scheduled-maintenance` syncs `maintenance_mode` with the scheduled window every 5 min.

Role assignment methods: SQL update on `profiles` table (production), `/api/admin/make-doctor` endpoint (dev/preview only, blocked in production), or Clerk dashboard metadata sync.

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
| `med_cert_drafts` | Certificate draft editing | `intakes.id` via `request_id` |
| `issued_certificates` | Issued certs with template snapshots | `intakes.id` |
| `certificate_template_versions` | Template versioning (immutable history) | Template ID |
| `certificate_audit_log` | Issuance/download/verify events | `issued_certificates.id` |

**Relationship hierarchy:**
```
profiles
  +-- intakes (patient_id)
  |     +-- intake_answers (intake_id)
  |     +-- payments (intake_id)
  |     +-- fraud_flags (intake_id, patient_id)
  |     +-- stripe_disputes (intake_id)
  +-- patient_messages (patient_id, sender_id)
  +-- email_preferences (profile_id)
  +-- referrals (referrer_id, referee_id)
```

All tables have RLS policies. PHI fields use AES-256-GCM field-level encryption.

### API Routes by Domain

**65 total routes.** Webhooks, cron jobs, and admin routes stay separate. Patient and doctor routes use RESTful patterns.

| Domain | Routes | Key Endpoints |
|--------|--------|---------------|
| **Admin** (4) | `/api/admin/*` | `approve`, `decline`, `make-doctor` (dev only), `webhook-dlq` |
| **AI** (5) | `/api/ai/*` | `chat-intake`, `chat-intake/validate`, `form-validation`, `review-summary`, `symptom-suggestions` |
| **Cron** (11) | `/api/cron/*` | `abandoned-checkouts`, `release-stale-claims`, `expire-certificates`, `process-email-retries`, `stale-queue`, `health-check`, `dlq-monitor`, `cleanup-orphaned-storage`, `emergency-flags`, `retry-drafts`, `scheduled-maintenance` |
| **Doctor** (9) | `/api/doctor/*` | `assign-request`, `update-request`, `bulk-action`, `drafts/[intakeId]`, `monitoring-stats`, `personal-stats`, `script-sent`, `export`, `log-view-duration` |
| **Patient** (10) | `/api/patient/*` | `documents/[id]/download`, `get-invoices`, `download-invoice`, `messages` (GET/POST), `profile` (PATCH), `retry-payment`, `resend-confirmation`, `last-prescription`, `update-profile` |
| **Med Cert** (3) | `/api/med-cert/*` | `preview` (GET), `render` (POST), `submit` (POST) |
| **Webhooks** (3) | `/api/stripe/webhook`, `/api/webhooks/clerk`, `/api/webhooks/resend` | One per provider, separate signature verification |
| **Misc** (12) | Various | `/api/certificates/[id]/download`, `/api/health`, `/api/medications/search`, `/api/verify`, `/api/unsubscribe`, `/api/search`, `/api/profile/ensure` |

---

## Component Patterns

### UIX Component Library

Custom abstraction layer at `components/uix/`. Import everything from `@/components/uix`.

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `DataTable` | Sortable, searchable, paginated table | `items`, `columns`, `rowKey`, `searchable`, `page`, `pageSize`, `totalItems` |
| `UserCard` | User display with avatar | `name`, `description`, `avatarUrl`, `size` |
| `PageBreadcrumbs` | Navigation breadcrumbs | `showHome`, `links: {label, href?}[]` |
| `DatePickerField` | Date picker with ISO string I/O | `value`, `onChange`, `disablePast`, `isRequired` |
| `Snippet` | Copyable code/text display | `symbol`, `size`, children |

Also re-exports common shadcn/Radix primitives: `Spinner`, `Progress`, `Skeleton`, `Chip`, `Badge`, `Tabs`, `Tab`, `Switch`, `Checkbox`, `Select`, `SelectItem`, `Tooltip`, `Popover`, `Divider`, `Spacer`, and full table primitives.

**Component decision tree:** See CLAUDE.md for quick-reference selection guide (shadcn vs UIX vs glass components).

**File organization:** `components/ui/` (155 primitives), `components/shared/` (73 shared), `components/uix/` (UIX wrappers), plus domain directories (`admin/`, `doctor/`, `patient/`, `request/`, `marketing/`).

### Image Optimization

- Use `next/image` (or `OptimizedImage` wrapper at `components/ui/optimized-image.tsx`) for all images
- Hero images: `priority={true}`. Below-fold: default lazy loading
- Next.js auto WebP/AVIF optimization enabled
- Exceptions (raw `<img>` allowed): email templates (client compatibility), blob URL previews (file upload/OCR), inline SVG decorations

---

## SEO System

**Programmatic SEO** generates 50+ static landing pages at build time. No DB calls at render.

**URL structure:**
```
/health/conditions/[slug]     16 condition pages (cold-and-flu, migraine, uti, etc.)
/health/certificates/[slug]   3 certificate types (work, study, carer)
/health/why-[slug]            1 benefit page
/health/resources/[slug]      2 resource pages (FAQ, disclaimer)
```

**Data layer:** `lib/seo/pages.ts` -- typed `ConditionPage` and `CertificatePage` interfaces. Template: `components/seo/seo-page-template.tsx`. Each page requires: unique title (50-60 chars), description (120-150 chars), 5+ symptoms, 3+ red flags, 3+ FAQs, 2+ disclaimers.

**Metadata:** Auto-generated `<title>`, `<meta description>`, Open Graph tags, canonical URLs. JSON-LD `FAQPage` structured data via `lib/seo/schema.ts`.

**Sitemap/robots:** `app/sitemap.ts` and `app/robots.ts` auto-update from the page data layer. No manual updates needed.

**IndexNow:** Automatic real-time index submission to Bing (and Yandex/other IndexNow participants) on new/updated content. Implementation: `lib/seo/indexnow.ts` (`submitToIndexNow(urls: string[])`). Called from: blog post publish, new SEO pages deploy. Key: stored in `INDEXNOW_KEY` env var, verified via `app/[INDEXNOW_KEY].txt` static route. No Google support — Google has its own crawl pipeline.

**Internal linking:** Each page links to 2-3 related pages. `components/seo/related-pages.tsx` handles cross-linking.

**Compliance rules:** No guarantee claims ("instant", "cure", "100%"). Always include emergency disclaimers. No specific diagnoses. Australian language and regulations.

---

## Testing Architecture

See `TESTING.md` for full testing strategy, conventions, E2E patterns, auth bypass, and coverage rules.

**Quick reference:**
- Unit tests: Vitest, Node environment, `lib/__tests__/`, 40% coverage threshold
- E2E tests: Playwright, `e2e/`, auth bypass via `PLAYWRIGHT=1` + `__e2e_auth_user_id` cookie
- Commands: `pnpm test` · `pnpm test:coverage` · `pnpm e2e:chromium`

---

## Directory Index

### `app/` — 563 files, 144 routes

| Directory | Purpose | Key files |
|-----------|---------|-----------|
| `app/actions/` | Server actions | `unified-checkout.ts` (checkout bridge), `generate-drafts.ts` (AI), `ensure-profile.ts` |
| `app/admin/` | Admin dashboard | `email-hub/`, `features/`, `settings/`, `ops/`, `analytics/` |
| `app/doctor/` | Doctor portal | `queue/` (intake queue), `intakes/[id]/` (review), `scripts/` (Rx tasks), `patients/` |
| `app/patient/` | Patient dashboard | `intakes/` (history + success), `settings/`, `onboarding/`, `documents/` |
| `app/api/` | API routes | `stripe/webhook/`, `cron/`, `ai/`, `health/`, `certificates/`, `intakes/` |
| `app/api/cron/` | Scheduled jobs | `email-dispatcher/` (5min), `daily-audit/`, `queue-monitor/`, `sla-monitor/` |
| `app/api/stripe/webhook/` | Stripe handlers | `handlers/checkout-session-completed.ts` (main payment handler) |
| `app/request/` | Unified intake flow | Single page, step-based wizard |
| `app/(dev)/` | Dev-only routes | Email preview, Sentry test — blocked in production by middleware |
| `app/blog/` | Health articles | ISR 12h, `[slug]/page.tsx` |
| `app/conditions/[slug]/` | SEO: conditions | Programmatic from `lib/seo/data/` |
| `app/symptoms/[slug]/` | SEO: symptoms | Programmatic from `lib/seo/data/` |
| `app/guides/[slug]/` | SEO: guides | Programmatic from `lib/seo/data/` |
| `app/for/[audience]/` | SEO: audience | students, parents, tradies, etc. |
| `app/locations/[city]/` | SEO: location | Australian cities |
| `app/intent/[slug]/` | SEO: high-intent | Search query landing pages |
| `app/compare/[slug]/` | SEO: comparisons | Service comparison pages |
| `app/offline/` | Offline fallback | PWA offline page — shown by service worker when network unavailable |

### `components/` — 355 files

| Directory | Count | Purpose |
|-----------|-------|---------|
| `ui/` | 60 | shadcn/Radix primitives (Button, Input, Dialog, etc.) |
| `uix/` | 11 | Abstractions (DataTable, UserCard, StatusBadge, etc.) |
| `shared/` | 31 | Header, Footer, InlineAuthStep, CheckoutButton, LazyOverlays |
| `request/` | 32 | Intake flow: `request-flow.tsx` (orchestrator), `steps/` (per-step components), `store.ts` (Zustand) |
| `marketing/` | 20 | Landing pages, ServiceFunnelPage, testimonials, exit intent |
| `doctor/` | — | IntakeReviewPanel, RepeatPrescriptionChecklist, clinical views |
| `admin/` | — | Admin-specific panels and views |
| `patient/` | — | ReferralCard, CrossSellCard, dashboard components |
| `chat/` | — | AI chat intake (ChatIntake, lazy-loaded) |
| `charts/` | — | LazyAreaChart, LazyBarChart, etc. (dynamic import from recharts) |
| `effects/` | — | Confetti, ShakeAnimation |
| `providers/` | — | PostHogProvider, ThemeProvider, ClerkProvider wrapper |
| `heroes/` | — | Morning Canvas hero variants (Split, Centered, Stats, FullBleed) |
| `ui/morning/` | — | Morning Canvas primitives (MeshGradientCanvas, WordReveal, PerspectiveTiltCard) |
| `ui/skeletons.tsx` | — | TableSkeleton, CardSkeleton, FormSkeleton |

### `lib/` — 324 files

| Directory | Purpose | Key files |
|-----------|---------|-----------|
| `lib/auth.ts` | Auth helpers | `getAuthenticatedUserWithProfile()`, `requireRoleOrNull()` |
| `lib/constants.ts` | App constants | PRICING, SYSTEM_AUTO_APPROVE_ID, CONTACT_EMAIL |
| `lib/env.ts` | Env validation | Zod schemas, `getAppUrl()` |
| `lib/format.ts` | Date formatting | All AEST, `formatDateLong()`, `addDays()` |
| `lib/utils.ts` | Utilities | `cn()` (class merger) |
| `lib/ai/` | AI integration | `provider.ts` (model profiles), prompts, clinical note generation |
| `lib/cert/` | Certificate pipeline | `execute-approval.ts` (9-step approval), PDF → storage → email |
| `lib/clinical/` | Clinical logic | `auto-approval.ts` (eligibility), `auto-approval-pipeline.ts` (orchestrator), `intake-validation.ts` (Schedule 8 blocking), `triage-rules-engine.ts` |
| `lib/data/` | Supabase queries | `intakes.ts`, `issued-certificates.ts`, `documents.ts`, `intake-answers.ts` — all use `createServiceRoleClient()` |
| `lib/email/` | Email system | `send-email.ts` (1505 lines, dispatcher), `email-dispatcher.ts` (cron processor) |
| `lib/flow/` | Intake flow logic | `safety/` (safety rules), `draft/` (localStorage drafts) |
| `lib/pdf/` | PDF generation | `template-renderer.ts` (pdf-lib overlay on static templates in `/public/templates/`) |
| `lib/rate-limit/` | Rate limiting | `redis.ts` (Upstash), `doctor.ts` (auto-approval limits). Fallback: in-memory Map |
| `lib/request/` | Step registry | `step-registry.ts` (step definitions), `validation.ts` (per-step Zod schemas) |
| `lib/security/` | Encryption | `phi-encryption.ts` (AES-256-GCM), `phi-field-wrappers.ts` (data layer wrappers) |
| `lib/stripe/` | Payments | `checkout.ts`, `guest-checkout.ts`, `price-mapping.ts`, `client.ts` |
| `lib/seo/data/` | SEO content | `conditions.ts`, `symptoms.ts`, `guides.ts` — drive programmatic pages |
| `lib/blog/articles/` | Blog content | Article data (13,768 lines total) |
| `lib/notifications/` | Alerts | `telegram.ts` (ops alerts), `service.ts` (payment notifications) |
| `lib/observability/` | Logging/monitoring | `logger.ts` (structured logger), `sentry.ts` (helpers) |
| `lib/feature-flags.ts` | Feature flags | DB-backed via `feature_flags` table, `getFeatureFlags()` |
| `lib/posthog-server.ts` | Server analytics | `getPostHogClient()`, funnel tracking, safety outcome tracking |
| `lib/validation/` | Validation schemas | `med-cert-schema.ts`, `repeat-script-schema.ts` |

### Other top-level

| File/Dir | Purpose |
|----------|---------|
| `middleware.ts` | Auth (Clerk), route protection, E2E bypass, prod route blocking |
| `instrumentation.ts` | Sentry server init |
| `instrumentation-client.ts` | PostHog + Sentry client init |
| `types/db.ts` | Supabase generated types + custom interfaces |
| `types/certificate-template.ts` | PDF template field definitions |
| `hooks/` | 5 custom hooks (useMediaQuery, useMounted, etc.) |
| `e2e/` | 43 Playwright specs, `helpers/` (seed/teardown, auth bypass) |
| `supabase/migrations/` | 178 SQL migrations |
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
createServiceRoleClient()          → Supabase with service role (server-only, 177 files)
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
Doctor approves → executeCertApproval() → PDF render → Supabase Storage → email with dashboard link
```

### Auto-Approval Pipeline
```
AI draft generated → attemptAutoApproval() → eligibility check → claim intake → build review data → executeCertApproval()
Feature-flagged (ai_auto_approve_enabled), rate-limited, dry-run mode available
```

---

## File Size Reference (largest client components)

| File | Size | Notes |
|------|------|-------|
| `components/marketing/med-cert-landing.tsx` | 38KB | Dynamic imports for testimonials/exit-intent |
| `app/admin/features/features-list.tsx` | 35KB | Feature flag admin |
| `components/request/request-flow.tsx` | 31KB | Intake flow orchestrator |
| `app/admin/settings/templates/template-studio-client.tsx` | 28KB | PDF template editor |
| `app/patient/intakes/[id]/client.tsx` | 28KB | Patient intake detail |
| `app/doctor/queue/queue-table.tsx` | 27KB | Doctor queue table |
| `lib/email/send-email.ts` | 1505 lines | Email dispatcher (server) |
