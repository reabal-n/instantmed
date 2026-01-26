# InstantMed Platform Feature Map

> Generated: January 2026  
> Status: **WIRED** | **PARTIALLY WIRED** | **UNWIRED**

---

## Table of Contents

1. [Public Marketing Pages](#1-public-marketing-pages)
2. [Intake (Form + Chat)](#2-intake-form--chat)
3. [Checkout/Payment](#3-checkoutpayment)
4. [Patient Portal](#4-patient-portal)
5. [Doctor Portal](#5-doctor-portal)
6. [Admin Portal](#6-admin-portal)
7. [Background Jobs/Crons](#7-background-jobscrons)
8. [Emails/Notifications](#8-emailsnotifications)
9. [Documents (PDF Generation, Storage, Downloads)](#9-documents-pdf-generation-storage-downloads)
10. [AI Drafts + Approval Workflow](#10-ai-drafts--approval-workflow)
11. [Top 10 Highest-Risk Failure Points](#11-top-10-highest-risk-failure-points)

---

## 1. Public Marketing Pages

### Main Routes/Pages

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/` | `app/page.tsx` | **WIRED** | Homepage with Hero, ServicePicker, HowItWorks, FAQ, Trust badges |
| `/about` | `app/about/page.tsx` | **WIRED** | About page |
| `/blog/*` | `app/blog/` | **WIRED** | Blog with article templates, tags, series |
| `/contact` | `app/contact/page.tsx` | **WIRED** | Contact form |
| `/faq/*` | `app/faq/` | **WIRED** | FAQ pages |
| `/how-it-works` | `app/how-it-works/page.tsx` | **WIRED** | Process explanation |
| `/pricing` | `app/pricing/page.tsx` | **WIRED** | Service pricing |
| `/reviews` | `app/reviews/page.tsx` | **WIRED** | Trustpilot reviews |
| `/trust` | `app/trust/page.tsx` | **WIRED** | Trust/compliance info |
| `/our-doctors` | `app/our-doctors/page.tsx` | **WIRED** | Doctor profiles |
| `/terms` | `app/terms/page.tsx` | **WIRED** | Terms of service |
| `/privacy` | `app/privacy/page.tsx` | **WIRED** | Privacy policy |
| `/clinical-governance` | `app/clinical-governance/page.tsx` | **WIRED** | Clinical governance info |

### Service Landing Pages

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/medical-certificate` | `app/medical-certificate/page.tsx` | **WIRED** | Med cert landing (47KB, full featured) |
| `/medical-certificate/[slug]` | `app/medical-certificate/[slug]/page.tsx` | **WIRED** | Dynamic cert types |
| `/prescriptions` | `app/prescriptions/page.tsx` | **WIRED** | Prescriptions landing |
| `/prescriptions/[subtype]` | `app/prescriptions/[subtype]/page.tsx` | **WIRED** | Dynamic prescription types |
| `/repeat-prescription` | `app/repeat-prescription/page.tsx` | **WIRED** | Repeat Rx landing |
| `/consult` | `app/consult/page.tsx` | **WIRED** | GP consult landing |
| `/general-consult` | `app/general-consult/page.tsx` | **WIRED** | General consult |
| `/weight-loss` | `app/weight-loss/page.tsx` | **WIRED** | Weight loss landing |
| `/weight-management` | `app/weight-management/page.tsx` | **WIRED** | Weight management |
| `/hair-loss` | `app/hair-loss/page.tsx` | **WIRED** | Hair loss landing |
| `/performance-anxiety` | `app/performance-anxiety/page.tsx` | **WIRED** | Performance anxiety |
| `/mens-health` | `app/mens-health/page.tsx` | **WIRED** | Men's health hub |
| `/womens-health` | `app/womens-health/page.tsx` | **WIRED** | Women's health hub |
| `/conditions` | `app/conditions/page.tsx` | **WIRED** | Conditions directory |
| `/symptoms` | `app/symptoms/page.tsx` | **WIRED** | Symptoms directory |
| `/medications` | `app/medications/page.tsx` | **WIRED** | Medications directory |
| `/locations` | `app/locations/page.tsx` | **WIRED** | Location pages for SEO |
| `/guides` | `app/guides/page.tsx` | **WIRED** | Health guides |
| `/for/*` | `app/for/` | **WIRED** | Audience-specific landing (students, workers, etc.) |
| `/compare` | `app/compare/page.tsx` | **WIRED** | Competitor comparison |

### Key Server Actions

| Action | File | Status |
|--------|------|--------|
| `contactForm` | `app/actions/contact-form.ts` | **WIRED** |

### Key API Routes

| Route | File | Status |
|-------|------|--------|
| `/api/health` | `app/api/health/route.ts` | **WIRED** |

### Key DB Tables

- `audit_logs` (page views tracking)
- `content_blocks` (CMS content)

---

## 2. Intake (Form + Chat)

### Main Routes/Pages

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/request` | `app/request/page.tsx` | **WIRED** | **Unified intake flow entry point** |
| `/start` | `app/start/page.tsx` | **WIRED** | Redirects to `/request` (legacy compat) |
| `/medical-certificate/request` | `app/medical-certificate/request/page.tsx` | **WIRED** | Redirects to `/request?service=med-cert` |
| `/prescriptions/request` | `app/prescriptions/request/page.tsx` | **WIRED** | Redirects to `/request?service=prescription` |
| `/consult/request` | `app/consult/request/page.tsx` | **WIRED** | Redirects to `/request?service=consult` |

### Key Components

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| `RequestFlow` | `components/request/request-flow.tsx` | **WIRED** | Main multi-step form orchestrator |
| `StepRouter` | `components/request/step-router.tsx` | **WIRED** | Dynamic step rendering |
| `steps/*` | `components/request/steps/` | **WIRED** | 11 step components |
| `ChatIntakeButton` | `components/chat/chat-intake.tsx` | **WIRED** | Floating chat button |

### Key Server Actions

| Action | File | Status | Notes |
|--------|------|--------|-------|
| `createRequest` | `app/actions/create-request.ts` | **WIRED** | Creates intake record |
| `validateMedicare` | `app/actions/validate-medicare.ts` | **WIRED** | Medicare validation |
| `cancelIntake` | `app/actions/cancel-intake.ts` | **WIRED** | Cancel intake |
| `intakeLock` | `app/actions/intake-lock.ts` | **WIRED** | Prevent concurrent edits |
| `safetySymptoms` | `app/actions/safety-symptoms.ts` | **WIRED** | Safety symptom checking |

### Key API Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/api/ai/chat-intake` | `app/api/ai/chat-intake/route.ts` | **WIRED** | AI chat for intake |
| `/api/ai/form-validation` | `app/api/ai/form-validation/route.ts` | **WIRED** | AI form validation |
| `/api/ai/symptom-suggestions` | `app/api/ai/symptom-suggestions/route.ts` | **WIRED** | AI symptom suggestions |
| `/api/flow/drafts` | `app/api/flow/drafts/` | **WIRED** | Draft management |
| `/api/medications/search` | `app/api/medications/search/route.ts` | **WIRED** | PBS medication search |
| `/api/terminology/snomed` | `app/api/terminology/snomed/route.ts` | **PARTIALLY WIRED** | SNOMED search (may not be fully used) |

### Key DB Tables

- `intakes` - Main request records
- `intake_answers` - Questionnaire responses
- `intake_drafts` - Draft intake data
- `services` - Service definitions
- `consents` - Patient consent records

### Key Libraries

| Library | File | Status |
|---------|------|--------|
| `step-registry` | `lib/request/step-registry.ts` | **WIRED** |
| `safety/rules` | `lib/flow/safety/rules.ts` | **WIRED** |
| `triage-rules-engine` | `lib/clinical/triage-rules-engine.ts` | **WIRED** |
| `repeat-rx/rules-engine` | `lib/repeat-rx/rules-engine.ts` | **WIRED** |
| `pbs/client` | `lib/pbs/client.ts` | **WIRED** |

---

## 3. Checkout/Payment

### Main Routes/Pages

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/patient/intakes/confirmed` | `app/patient/intakes/confirmed/page.tsx` | **WIRED** | Payment success landing |
| `/patient/intakes/cancelled` | `app/patient/intakes/cancelled/page.tsx` | **WIRED** | Payment cancelled |

### Key Server Actions

| Action | File | Status | Notes |
|--------|------|--------|-------|
| `unifiedCheckout` | `app/actions/unified-checkout.ts` | **WIRED** | Stripe checkout session creation |

### Key API Routes

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/api/stripe/webhook` | `app/api/stripe/webhook/route.ts` | **WIRED** | **Critical** - Payment webhooks |
| `/api/patient/retry-payment` | `app/api/patient/retry-payment/route.ts` | **WIRED** | Payment retry |
| `/api/patient/download-invoice` | `app/api/patient/download-invoice/route.ts` | **WIRED** | Invoice download |
| `/api/patient/get-invoices` | `app/api/patient/get-invoices/route.ts` | **WIRED** | List invoices |

### Key DB Tables

- `intakes` (payment_status, payment_id, paid_at, amount_cents)
- `stripe_webhook_events` (idempotency)
- `stripe_webhook_dead_letter` (failed webhooks)
- `stripe_disputes` (chargebacks)

### Key Libraries

| Library | File | Status |
|---------|------|--------|
| `stripe/checkout` | `lib/stripe/checkout.ts` | **WIRED** |
| `stripe/guest-checkout` | `lib/stripe/guest-checkout.ts` | **WIRED** |
| `stripe/client` | `lib/stripe/client.ts` | **WIRED** |
| `stripe/refunds` | `lib/stripe/refunds.ts` | **WIRED** |
| `stripe/payment-failure-handler` | `lib/stripe/payment-failure-handler.ts` | **WIRED** |

---

## 4. Patient Portal

### Main Routes/Pages

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/patient` | `app/patient/page.tsx` | **WIRED** | Patient dashboard |
| `/patient/intakes` | `app/patient/intakes/page.tsx` | **WIRED** | List of requests |
| `/patient/intakes/[id]` | `app/patient/intakes/[id]/page.tsx` | **WIRED** | Request detail |
| `/patient/intakes/success` | `app/patient/intakes/success/page.tsx` | **WIRED** | Success state |
| `/patient/documents` | `app/patient/documents/page.tsx` | **WIRED** | Document library |
| `/patient/prescriptions` | `app/patient/prescriptions/page.tsx` | **WIRED** | Prescription history |
| `/patient/messages` | `app/patient/messages/page.tsx` | **WIRED** | Message center |
| `/patient/notifications` | `app/patient/notifications/page.tsx` | **WIRED** | Notifications |
| `/patient/settings` | `app/patient/settings/page.tsx` | **WIRED** | Account settings |
| `/patient/payment-history` | `app/patient/payment-history/page.tsx` | **WIRED** | Payment history |
| `/patient/health-summary` | `app/patient/health-summary/page.tsx` | **PARTIALLY WIRED** | Health summary view |
| `/patient/onboarding` | `app/patient/onboarding/page.tsx` | **WIRED** | Patient onboarding flow |
| `/account` | `app/account/page.tsx` | **WIRED** | Account settings (alt entry) |

### Key Server Actions

| Action | File | Status |
|--------|------|--------|
| `account` | `app/actions/account.ts` | **WIRED** |
| `changeEmail` | `app/actions/change-email.ts` | **WIRED** |
| `emailPreferences` | `app/actions/email-preferences.ts` | **WIRED** |
| `certificateDownload` | `app/actions/certificate-download.ts` | **WIRED** |
| `resendCertificate` | `app/actions/resend-certificate.ts` | **WIRED** |
| `getChatTranscript` | `app/actions/get-chat-transcript.ts` | **WIRED** |
| `exportData` | `app/actions/export-data.ts` | **WIRED** |

### Key API Routes

| Route | File | Status |
|-------|------|--------|
| `/api/patient/profile` | `app/api/patient/profile/route.ts` | **WIRED** |
| `/api/patient/update-profile` | `app/api/patient/update-profile/route.ts` | **WIRED** |
| `/api/patient/documents` | `app/api/patient/documents/route.ts` | **WIRED** |
| `/api/patient/messages` | `app/api/patient/messages/route.ts` | **WIRED** |
| `/api/patient/resend-confirmation` | `app/api/patient/resend-confirmation/route.ts` | **WIRED** |
| `/api/patient/last-prescription` | `app/api/patient/last-prescription/route.ts` | **WIRED** |
| `/api/unsubscribe` | `app/api/unsubscribe/route.ts` | **WIRED** |

### Key DB Tables

- `profiles` - Patient profile data
- `intakes` - Patient requests
- `prescriptions` - Prescription records
- `issued_certificates` - Issued med certs
- `documents` - Document records
- `notifications` - In-app notifications
- `messages` - Patient messages
- `email_preferences` - Email opt-out

---

## 5. Doctor Portal

### Main Routes/Pages

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/doctor` | `app/doctor/page.tsx` | **WIRED** | Doctor dashboard with queue |
| `/doctor/queue` | `app/doctor/queue/page.tsx` | **WIRED** | Review queue |
| `/doctor/queue/[id]` | `app/doctor/queue/[id]/page.tsx` | **WIRED** | Review single intake |
| `/doctor/intakes/[id]` | `app/doctor/intakes/[id]/page.tsx` | **WIRED** | Intake detail view |
| `/doctor/intakes/[id]/document` | `app/doctor/intakes/[id]/document/page.tsx` | **WIRED** | Document preview |
| `/doctor/dashboard` | `app/doctor/dashboard/page.tsx` | **WIRED** | Alt dashboard entry |
| `/doctor/patients` | `app/doctor/patients/page.tsx` | **WIRED** | Patient list |
| `/doctor/repeat-rx` | `app/doctor/repeat-rx/page.tsx` | **WIRED** | Repeat Rx queue |
| `/doctor/analytics` | `app/doctor/analytics/page.tsx` | **WIRED** | Doctor analytics |
| `/doctor/settings` | `app/doctor/settings/page.tsx` | **WIRED** | Doctor settings |
| `/doctor/admin` | `app/doctor/admin/page.tsx` | **PARTIALLY WIRED** | Doctor admin tools |

### Key Server Actions

| Action | File | Status | Notes |
|--------|------|--------|-------|
| `approveAndSendCert` | `app/actions/approve-cert.ts` | **WIRED** | **Critical** - Certificate approval |
| `draftApproval` | `app/actions/draft-approval.ts` | **WIRED** | Draft approval workflow |
| `doctorIdentity` | `app/actions/doctor-identity.ts` | **WIRED** | Doctor credential setup |
| `clinicianAudit` | `app/actions/clinician-audit.ts` | **WIRED** | Clinician audit logging |

### Key API Routes

| Route | File | Status |
|-------|------|--------|
| `/api/doctor/assign-request` | `app/api/doctor/assign-request/route.ts` | **WIRED** |
| `/api/doctor/update-request` | `app/api/doctor/update-request/route.ts` | **WIRED** |
| `/api/doctor/bulk-action` | `app/api/doctor/bulk-action/route.ts` | **WIRED** |
| `/api/doctor/drafts` | `app/api/doctor/drafts/route.ts` | **WIRED** |
| `/api/doctor/export` | `app/api/doctor/export/route.ts` | **WIRED** |
| `/api/doctor/script-sent` | `app/api/doctor/script-sent/route.ts` | **WIRED** |
| `/api/doctor/monitoring-stats` | `app/api/doctor/monitoring-stats/route.ts` | **WIRED** |
| `/api/doctor/personal-stats` | `app/api/doctor/personal-stats/route.ts` | **WIRED** |
| `/api/doctor/log-view-duration` | `app/api/doctor/log-view-duration/route.ts` | **WIRED** |

### Key DB Tables

- `intakes` (claimed_by, claimed_at, reviewed_by, reviewed_at)
- `intake_drafts` - AI-generated drafts
- `issued_certificates` - Approved certificates
- `certificate_events` - Audit trail
- `certificate_edits` - Edit tracking
- `clinic_identity` - Clinic branding
- `certificate_templates` - PDF templates

### Key Libraries

| Library | File | Status |
|---------|------|--------|
| `data/intakes` | `lib/data/intakes.ts` | **WIRED** |
| `data/doctor-identity` | `lib/data/doctor-identity.ts` | **WIRED** |
| `data/issued-certificates` | `lib/data/issued-certificates.ts` | **WIRED** |
| `approval/med-cert-invariants` | `lib/approval/med-cert-invariants.ts` | **WIRED** |

---

## 6. Admin Portal

### Main Routes/Pages

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/admin` | `app/admin/page.tsx` | **WIRED** | Redirects to `/admin/analytics` |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | **WIRED** | Analytics dashboard |
| `/admin/audit` | `app/admin/audit/page.tsx` | **WIRED** | Audit log viewer |
| `/admin/clinic` | `app/admin/clinic/page.tsx` | **WIRED** | Clinic identity settings |
| `/admin/content` | `app/admin/content/page.tsx` | **PARTIALLY WIRED** | CMS content management |
| `/admin/doctors` | `app/admin/doctors/page.tsx` | **WIRED** | Doctor management |
| `/admin/email-queue` | `app/admin/email-queue/page.tsx` | **WIRED** | Email queue monitoring |
| `/admin/emails` | `app/admin/emails/page.tsx` | **WIRED** | Email templates |
| `/admin/features` | `app/admin/features/page.tsx` | **WIRED** | Feature flags |
| `/admin/finance` | `app/admin/finance/page.tsx` | **WIRED** | Financial reports |
| `/admin/ops` | `app/admin/ops/page.tsx` | **WIRED** | Operations dashboard |
| `/admin/refunds` | `app/admin/refunds/page.tsx` | **WIRED** | Refund management |
| `/admin/services` | `app/admin/services/page.tsx` | **WIRED** | Service configuration |
| `/admin/settings` | `app/admin/settings/page.tsx` | **WIRED** | Admin settings |
| `/admin/studio` | `app/admin/studio/page.tsx` | **WIRED** | Certificate template studio |
| `/admin/webhook-dlq` | `app/admin/webhook-dlq/page.tsx` | **WIRED** | Webhook dead letter queue |

### Key Server Actions

| Action | File | Status |
|--------|------|--------|
| `adminConfig` | `app/actions/admin-config.ts` | **WIRED** |
| `adminSettings` | `app/actions/admin-settings.ts` | **WIRED** |
| `templateStudio` | `app/actions/template-studio.ts` | **WIRED** |
| `templates` | `app/actions/templates.ts` | **WIRED** |
| `sendTestEmail` | `app/actions/send-test-email.ts` | **WIRED** |
| `emailRetry` | `app/actions/email-retry.ts` | **WIRED** |

### Key API Routes

| Route | File | Status |
|-------|------|--------|
| `/api/admin/approve` | `app/api/admin/approve/route.ts` | **WIRED** |
| `/api/admin/decline` | `app/api/admin/decline/route.ts` | **WIRED** |
| `/api/admin/make-doctor` | `app/api/admin/make-doctor/route.ts` | **WIRED** |
| `/api/admin/webhook-dlq` | `app/api/admin/webhook-dlq/route.ts` | **WIRED** |

### Key DB Tables

- `audit_logs` - System audit trail
- `feature_flags` - Feature toggles
- `admin_actions` - Admin action log
- `content_blocks` - CMS content
- `email_templates` - Email templates
- `clinic_identity` - Clinic branding
- `certificate_templates` - PDF templates

---

## 7. Background Jobs/Crons

### Configured Crons (vercel.json)

| Route | Schedule | Status | Purpose |
|-------|----------|--------|---------|
| `/api/cron/abandoned-checkouts` | `0 * * * *` (hourly) | **WIRED** | Send abandoned cart emails |
| `/api/cron/dlq-monitor` | `0 9 * * *` (daily 9am) | **WIRED** | DLQ health alerting |
| `/api/cron/retry-drafts` | `*/5 * * * *` (5 min) | **WIRED** | Retry failed AI drafts |
| `/api/cron/stale-queue` | `0 * * * *` (hourly) | **WIRED** | Alert on stale queue items |
| `/api/cron/emergency-flags` | `0 * * * *` (hourly) | **WIRED** | Check emergency feature flags |
| `/api/cron/health-check` | `*/5 * * * *` (5 min) | **WIRED** | System health check |
| `/api/cron/process-email-retries` | `*/10 * * * *` (10 min) | **WIRED** | Process email retry queue |
| `/api/cron/expire-certificates` | `0 1 * * *` (daily 1am) | **WIRED** | Expire old certificates |
| `/api/cron/cleanup-orphaned-storage` | `0 3 * * 0` (weekly Sun 3am) | **WIRED** | Clean orphaned files |
| `/api/cron/release-stale-claims` | `*/5 * * * *` (5 min) | **WIRED** | Release stale intake claims |

### Key DB Tables

- `ai_draft_retry_queue` - Draft retry queue
- `email_retry_queue` - Email retry queue
- `cron_job_runs` - Cron execution tracking

### Key Libraries

| Library | File | Status |
|---------|------|--------|
| `api/cron-auth` | `lib/api/cron-auth.ts` | **WIRED** |
| `email/abandoned-checkout` | `lib/email/abandoned-checkout.ts` | **WIRED** |
| `email/retry-queue` | `lib/email/retry-queue.ts` | **WIRED** |

---

## 8. Emails/Notifications

### Email Templates

| Template | File | Status | Trigger |
|----------|------|--------|---------|
| `request-approved` | `lib/email/templates/request-approved.tsx` | **WIRED** | Certificate approval |
| `request-declined` | `lib/email/templates/request-declined.tsx` | **WIRED** | Request declined |
| `request-received` | `lib/email/templates/request-received.tsx` | **WIRED** | New request submitted |
| `payment-confirmed` | `lib/email/templates/payment-confirmed.tsx` | **WIRED** | Payment successful |
| `payment-failed` | `lib/email/templates/payment-failed.tsx` | **WIRED** | Payment failed |
| `payment-retry` | `lib/email/templates/payment-retry.tsx` | **WIRED** | Retry payment prompt |
| `abandoned-checkout` | `lib/email/templates/abandoned-checkout.tsx` | **WIRED** | Cart abandonment |
| `form-recovery` | `lib/email/templates/form-recovery.tsx` | **WIRED** | Form recovery |
| `needs-more-info` | `lib/email/templates/needs-more-info.tsx` | **WIRED** | Info request |
| `dispute-alert` | `lib/email/templates/dispute-alert.tsx` | **WIRED** | Chargeback alert (admin) |
| `guest-complete-account` | `lib/email/templates/guest-complete-account.tsx` | **WIRED** | Guest account completion |
| `base-layout` | `lib/email/templates/base-layout.tsx` | **WIRED** | Base email template |

### Key Libraries

| Library | File | Status |
|---------|------|--------|
| `email/resend` | `lib/email/resend.ts` | **WIRED** |
| `email/send` | `lib/email/send.ts` | **WIRED** |
| `email/template-sender` | `lib/email/template-sender.ts` | **WIRED** |
| `email/send-status` | `lib/email/send-status.ts` | **WIRED** |
| `notifications/service` | `lib/notifications/service.ts` | **WIRED** |

### Key API Routes

| Route | File | Status |
|-------|------|--------|
| `/api/webhooks/resend` | `app/api/webhooks/resend/route.ts` | **WIRED** |
| `/api/notifications` | `app/api/notifications/route.ts` | **WIRED** |

### Key DB Tables

- `email_logs` - Email send history
- `email_retry_queue` - Failed email retries
- `notifications` - In-app notifications
- `email_preferences` - Opt-out preferences

---

## 9. Documents (PDF Generation, Storage, Downloads)

### PDF Generation

| Document | File | Status | Notes |
|----------|------|--------|-------|
| Medical Certificate | `lib/pdf/med-cert-pdf-v2.tsx` | **WIRED** | Main med cert template |
| Med Cert (legacy) | `lib/pdf/med-cert-pdf.tsx` | **PARTIALLY WIRED** | Legacy template |
| Med Cert Template | `lib/pdf/med-cert-template.tsx` | **WIRED** | Template component |
| Med Certificate Template | `lib/pdf/med-certificate-template.tsx` | **WIRED** | Alt template |
| Prescription Template | `lib/pdf/prescription-template.tsx` | **UNWIRED** | Placeholder only |
| Referral Template | `lib/pdf/referral-template.tsx` | **UNWIRED** | Placeholder only |

### Key Libraries

| Library | File | Status |
|---------|------|--------|
| `pdf/med-cert-render` | `lib/pdf/med-cert-render.ts` | **WIRED** |
| `pdf/generate-med-cert` | `lib/pdf/generate-med-cert.tsx` | **WIRED** |
| `pdf/generate-document` | `lib/pdf/generate-document.ts` | **WIRED** |
| `documents/apitemplate` | `lib/documents/apitemplate.ts` | **WIRED** |
| `documents/pdf-generator` | `lib/documents/pdf-generator.tsx` | **WIRED** |
| `documents/med-cert-pdf-factory` | `lib/documents/med-cert-pdf-factory.tsx` | **WIRED** |
| `storage/documents` | `lib/storage/documents.ts` | **WIRED** |

### Key API Routes

| Route | File | Status |
|-------|------|--------|
| `/api/med-cert/[id]` | `app/api/med-cert/[id]/route.ts` | **WIRED** |
| `/api/med-cert/preview` | `app/api/med-cert/preview/route.ts` | **WIRED** |
| `/api/med-cert/render` | `app/api/med-cert/render/route.ts` | **WIRED** |
| `/api/med-cert/submit` | `app/api/med-cert/submit/route.ts` | **WIRED** |
| `/api/patient/documents/[id]` | `app/api/patient/documents/[id]/route.ts` | **WIRED** |

### Key DB Tables

- `issued_certificates` - Certificate records
- `documents` - General document records
- `certificate_templates` - PDF templates
- `clinic_identity` - Clinic branding for PDFs

### Storage

- Supabase Storage bucket: `documents`
- Path pattern: `med-certs/{patient_id}/{certificate_number}.pdf`

---

## 10. AI Drafts + Approval Workflow

### Draft Generation

| Draft Type | Status | Notes |
|------------|--------|-------|
| `clinical_note` | **WIRED** | Generated for all intakes |
| `med_cert` | **WIRED** | Generated for med cert intakes |
| `repeat_rx` | **WIRED** | Generated for repeat Rx intakes |
| `consult` | **WIRED** | Generated for consult intakes |

### Key Server Actions

| Action | File | Status | Notes |
|--------|------|--------|-------|
| `generateDraftsForIntake` | `app/actions/generate-drafts.ts` | **WIRED** | **Critical** - AI draft generation |
| `saveDraft` | `app/actions/save-draft.ts` | **WIRED** | Save edited draft |
| `draftApproval` | `app/actions/draft-approval.ts` | **WIRED** | Approve/reject drafts |

### Key API Routes

| Route | File | Status |
|-------|------|--------|
| `/api/ai/review-summary` | `app/api/ai/review-summary/route.ts` | **WIRED** |

### Key Libraries

| Library | File | Status |
|---------|------|--------|
| `ai/drafts` | `lib/ai/drafts/` | **WIRED** |
| `ai/schemas` | `lib/ai/schemas/` | **WIRED** |
| `ai/validation` | `lib/ai/validation/` | **WIRED** |
| `ai/prompt-safety` | `lib/ai/prompt-safety.ts` | **WIRED** |
| `ai/cache` | `lib/ai/cache.ts` | **WIRED** |
| `ai/confidence` | `lib/ai/confidence.ts` | **WIRED** |
| `ai/audit` | `lib/ai/audit.ts` | **WIRED** |

### Key DB Tables

- `intake_drafts` - AI-generated drafts
- `ai_draft_retry_queue` - Failed draft retries
- `ai_audit_logs` - AI decision audit

### Workflow

1. **Payment confirmed** → Stripe webhook triggers `generateDraftsForIntake`
2. **AI generates** clinical_note + service-specific draft (med_cert/repeat_rx/consult)
3. **Doctor reviews** in `/doctor/queue/[id]`
4. **Doctor approves** → `approveAndSendCert` (for med certs)
5. **PDF generated** → Stored in Supabase → Email sent to patient

---

## 11. Top 10 Highest-Risk Failure Points

### 1. **Stripe Webhook Payment Processing**
- **File**: `app/api/stripe/webhook/route.ts:244-541`
- **Risk**: Lost revenue, orphaned intakes, customer complaints
- **Mitigation**: Idempotency via `stripe_webhook_events`, DLQ, Sentry alerts

### 2. **AI Draft Generation**
- **File**: `app/actions/generate-drafts.ts:181-327`
- **Risk**: Doctor queue stalls, delays in patient care
- **Mitigation**: Retry queue (`ai_draft_retry_queue`), cron retry, fallback to manual

### 3. **Certificate Approval Atomic Transaction**
- **File**: `app/actions/approve-cert.ts:302-331`
- **Risk**: Inconsistent state, duplicate certificates, audit trail gaps
- **Mitigation**: `atomicApproveCertificate` RPC, claim locking, PDF hash verification

### 4. **Intake Claim Race Condition**
- **File**: `app/actions/approve-cert.ts:144-160`
- **Risk**: Two doctors claim same intake, conflicting approvals
- **Mitigation**: `claim_intake_for_review` RPC with row locking

### 5. **PDF Generation + Storage**
- **File**: `app/actions/approve-cert.ts:225-292`
- **Risk**: Failed PDF = no certificate, patient can't download
- **Mitigation**: Retry upload, release claim on failure

### 6. **Email Delivery**
- **File**: `lib/email/resend.ts`
- **Risk**: Patient doesn't receive certificate notification
- **Mitigation**: Email retry queue, send status tracking, in-app notification fallback

### 7. **Auth/Profile Sync (Clerk → Supabase)**
- **File**: `app/api/webhooks/clerk/route.ts`
- **Risk**: User exists in Clerk but no profile → access denied
- **Mitigation**: `ensureProfile` action, guest checkout fallback

### 8. **Guest Checkout Flow**
- **File**: `lib/stripe/guest-checkout.ts`
- **Risk**: Payment succeeds but profile merge fails → orphaned intake
- **Mitigation**: Atomic profile merge RPC, `failed_profile_merges` table

### 9. **Stale Intake Claims**
- **File**: `app/api/cron/release-stale-claims/route.ts`
- **Risk**: Doctor claims intake but never approves → queue stall
- **Mitigation**: Cron releases claims after 30 min timeout

### 10. **Feature Flag Emergency Disable**
- **File**: `lib/feature-flags.ts`
- **Risk**: Critical feature enabled when broken, or disabled when needed
- **Mitigation**: `emergency-flags` cron, admin override, Sentry monitoring

---

## Summary Statistics

| Area | Total Features | WIRED | PARTIALLY WIRED | UNWIRED |
|------|----------------|-------|-----------------|---------|
| Public Marketing | 30+ | 30 | 0 | 0 |
| Intake | 15+ | 14 | 1 | 0 |
| Checkout | 10+ | 10 | 0 | 0 |
| Patient Portal | 20+ | 19 | 1 | 0 |
| Doctor Portal | 15+ | 14 | 1 | 0 |
| Admin Portal | 18+ | 17 | 1 | 0 |
| Crons | 10 | 10 | 0 | 0 |
| Emails | 12 | 12 | 0 | 0 |
| Documents | 10+ | 8 | 1 | 2 |
| AI Drafts | 10+ | 10 | 0 | 0 |

**Overall Platform Health**: ~95% WIRED, ~3% PARTIALLY WIRED, ~2% UNWIRED

---

## Legend

- **WIRED**: Feature is actively used and reachable via UI/API
- **PARTIALLY WIRED**: Feature exists but may have missing links, incomplete UI, or limited usage
- **UNWIRED**: Feature is implemented but not currently reachable or used (placeholder/future)
