# ARCHITECTURE.md — InstantMed System Architecture

> Canonical reference for system design, data flows, and integrations.
> For clinical rules see CLINICAL.md · For security see SECURITY.md · For ops see OPERATIONS.md

## Canonical Routes (Source of Truth)

**There is one intake flow.** If you see an old reference to `/flow` or `/prescriptions/request` or `/consult/request`, those are deprecated paths that 301 via `next.config.mjs`. Edit the canonical target, not the redirect source.

| Canonical | Aliases / redirects | Notes |
|---|---|---|
| `/request` | `/start`, `/start?service=...`, `/flow`, `/flow/:path*`, `/prescriptions/request`, `/prescriptions/repeat`, `/prescriptions/repeat-script`, `/prescriptions/chronic`, `/prescriptions/new`, `/prescriptions/new-medication`, `/prescriptions/:subtype`, `/consult/request`, `/medical-certificate/request` | Sole intake flow (commit `18e26f0b7` killed the parallel `/flow` system). `/start` is a 307 compatibility route that maps legacy `service` values and preserves attribution/query params before redirecting. `/flow` and old prescription subtype paths redirect via `next.config.mjs`. |
| `/medical-certificate` | `/medical-certificates`, `/medical-certificates/:path*` | Singular is canonical (`next.config.mjs`) |
| `/prescriptions` | `/repeat-prescription`, `/repeat-prescription/:path*`, `/repeat-prescriptions`, `/repeat-prescriptions/:path*`, `/prescription` | |
| `/` | `/medications`, `/medications/:path*` | Medications pages deleted 2026-04-08 (orphan duplicate of `/prescriptions/med/:slug`) |
| `/consult` | `/gp-consult` | |
| `/weight-loss` | `/weight-management`, `/weight-management/:path*` | |
| `/sign-in` | `/auth/login`, `/auth/sign-in`, `/login` | |
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
| `med-cert` | certificate, symptoms, details (skipped when profile identity is complete), checkout |
| `prescription` / `repeat-script` | medication, medication-history, medical-history, details, review/pay |
| `consult` (general) | **Retired 2026-05-20.** No active flow — the `'general'` subtype was removed from `ConsultSubtype`. `/consult` is now a services-overview page; `/general-consult` 301s into it. `consult` stays in code only as the parent category for the subtypes below. |
| `consult` (ED) | ed-goals, ed-assessment (IIEF-5), ed-health (consolidated safety + medical history), ed-preferences, details (+ height/weight/BMI), review, checkout |
| `consult` (hair loss) | hair-loss-goals, hair-loss-assessment, hair-loss-health (consolidated safety + medical history), hair-loss-preferences, details, review, checkout |
| `consult` (women's health) | womens-health-type, womens-health-assessment, medical-history, details, review, checkout. Live 2026-06-15; scoped to UTI + new/switch pill via `LIVE_WOMENS_HEALTH_OPTIONS` (`ocp_repeat` routes to repeat-script; morning-after / period-pain / "other" gated). |
| `consult` (weight loss) | weight-loss-assessment, weight-loss-call-scheduling, medical-history, details, review, checkout. **Gated** — `weight_loss` is in `BLOCKED_CONSULT_SUBTYPES`; entry returns no steps until launch readiness changes. |

**Adding steps:** (1) Create component in `components/request/steps/` implementing `StepProps`, (2) register lazy import in `step-router.tsx`, (3) add definition to `lib/request/step-registry.ts`. Steps support conditional skip via `getStepsForService(type, { isAuthenticated, hasProfile, hasMedicare, answers })`.

### State Management

Zustand store with `persist` middleware. Key: `instantmed-request-draft`, expiry: 24h. Partialised: `serviceType`, `currentStepId`, `safetyConfirmed`, `answers`, patient identity fields. Recovery via `DraftRestorationBanner`. Navigation guard `goToStep()` prevents forward jumps; `canCheckout` validates required fields before payment.

### Attribution

First-touch attribution is captured client-side by `lib/analytics/attribution.ts` into `sessionStorage` and passed through `app/actions/unified-checkout.ts` to both authenticated and guest Stripe checkout paths. The checkout actions normalize attribution via `lib/analytics/attribution-storage.ts` before persisting to `intakes`: `utm_source`, `utm_medium`, `utm_id`, `utm_campaign`, `utm_content`, `utm_term`, sanitized `referrer`, sanitized `landing_page`, `attribution_captured_at`, `gclid`, `gbraid`, `wbraid`, and Google Ads ValueTrack diagnostics (`campaignid`, `adgroupid`, `keyword`, `creative`, `matchtype`, `device`, `network`).

Because referrer-stripped traffic (native LLM apps, in-app browsers, iOS, word-of-mouth — ~50% of paid orders, the "Direct/Unknown" bucket) is structurally invisible to referrer capture, a self-reported `intakes.heard_about_us` column (enum token, NOT PHI, write-once) is collected post-payment via an optional "How did you hear about us?" survey rendered on `/patient/intakes/success`, `/auth/complete-account`, and the review-request email (one-click links). Write path is token-authed (`lib/crypto/heard-about-us-token.ts` → `app/api/attribution/heard`); option set in `lib/analytics/heard-about-us.ts`. Forward-only.

The Stripe webhook reads the persisted intake attribution when payment completes, sends captured click IDs and/or hashed first-party user identifiers through the server-side Google Ads purchase uploader, mirrors attribution to PostHog, and records a PHI-safe `google_ads_conversion_upload` audit row. When `GOOGLE_DATA_MANAGER_CONVERSIONS_ENABLED=true`, the uploader uses Google Data Manager API and stores the returned `request_id` / `upload_identifier`; otherwise it falls back to the legacy Google Ads API upload path and stores `upload_job_id`. The hourly `/api/cron/google-ads-conversions` backfill scans reportable paid intakes, skips already-successful uploads, and retries failed or missing uploads using the intake id as Google's transaction/order dedupe key and the stored `paid_at` timestamp as the conversion time. Stripe refunds and disputes adjust that same Google Ads order through `google_ads_conversion_adjustment`: full refunds/disputes retract the conversion, and partial refunds restate **Net Retained Purchase Value**. It deliberately does not pre-filter to rows that already look Google-attributed, because enhanced conversions can match via hashed first-party data when a click ID was not captured. Google only keeps click identifiers for a bounded window, so uploads drop expired `gclid`/`gbraid`/`wbraid` values when enhanced user data exists, and record a terminal `skipped_expired_click_identifier` audit row when no other match signal is available. Admin source reporting in `/admin/analytics` and Business KPIs uses UTM first, then persisted referrer, then direct landing-page fallback.

The canonical intake funnel uses `purchase_completed_server` as the only paid-stage event. Client `purchase_completed` can still exist for decorative browser analytics, but it is droppable and must not be used for purchase truth. Step-friction analysis uses `intake_validation_blocked` with safe metadata only: service type, consult subtype, step id, optional step position, blocker count, and generic blocker labels.

The Google Ads upload action is deliberately separate from the browser website purchase action: Google Ads offline click uploads require an `UPLOAD_CLICKS` conversion action. Data Manager uploads do not use a Google Ads developer token, but the destination still maps to the same offline purchase action and request-status diagnostics use the Data Manager `requestId`. Google Ads API remains useful for reporting and conversion-action preflight. If the configured conversion action returns `INVALID_CONVERSION_ACTION_TYPE`, the cron treats it as non-retryable until the env var is updated; call `/api/cron/google-ads-conversions?force=1` after updating the action ID. `EXPIRED_EVENT` failures are also terminal for that click/conversion pair and should not be forced through another historical backfill. The local click-identifier max age defaults to 90 days (`GOOGLE_ADS_CLICK_IDENTIFIER_MAX_AGE_DAYS`) and can be lowered if the purchase action's configured click-through window is shorter.

### AI Assistance

AI is bounded to clinician-support documentation helpers. There is no parallel chat-intake path and no public AI validation endpoint in the current product: patients use the canonical `/request` form, and doctors review the submitted answers before any clinical decision. Do not reintroduce conversational intake without an explicit product and clinical-governance decision.

**AI boundaries** -- CAN: draft internal clinical notes and service-specific documentation for doctor review. CANNOT: diagnose, recommend medications, predict approval, answer medical questions, validate checkout safety, or replace doctor review.

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

Prescribing cases require the structured fields before checkout. They are normalized into `address_line1`, `suburb`, `state`, and `postcode`, persisted on `profiles`, visible in the doctor patient snapshot/admin prescribing identity blocker report, and used by `lib/parchment/sync-patient.ts` to build the Parchment address payload. Doctor approval into `awaiting_script` also rechecks prescribing identity server-side so legacy or imported incomplete profiles cannot enter the prescribing handoff silently.

Parchment linkage and demographic refresh are separate operations. If `profiles.parchment_patient_id` already exists, normal prescribing handoffs reuse it and proceed to SSO without calling the Parchment patient-update endpoint. Doctor-created patients still sync on first link; the explicit patient edit/resync path pushes current structured given name, family name, identifiers, and address. This prevents a provider-side demographic verification outage—or a correction made only in Parchment—from blocking every later prescription open.

**DB insert sequence:** INSERT `intakes` (status=pending_payment) -> INSERT `intake_answers` -> Stripe redirect -> UPDATE `intakes` status=paid (webhook) -> INSERT `intake_drafts` (via `generateDraftsForIntake`).

**Tables:** `intakes`, `intake_answers`, `safety_audit_log`, `ai_chat_transcripts`, `ai_chat_audit_log`, `ai_safety_blocks`.

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
| `paid` | `in_review`, `approved`, `awaiting_script`, `declined`, `pending_info`, `escalated`, `cancelled` |
| `in_review` | `approved`, `awaiting_script`, `declined`, `pending_info`, `escalated`, `cancelled` |
| `pending_info` | `in_review`, `paid`, `declined`, `cancelled`, `expired` |
| `approved` | `completed`, `awaiting_script`, `cancelled` |
| `awaiting_script` | `completed`, `declined`, `cancelled` |
| `escalated` | `in_review`, `approved`, `declined`, `cancelled` |
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
review-step.tsx -> unified-checkout.ts createCheckoutFromUnifiedFlow()
  -> lib/stripe/checkout.ts createIntakeAndCheckoutAction()
     1. Env/DB service kill-switches   2. Capacity limit   3. Zod validation
     4. Medication blocklist   5. Safety completeness + rules   6. Auth check
     7. Idempotency key (>=16 chars)   8. Rate limit   9. INSERT intakes
     10. Fraud detection   11. INSERT intake_answers   12. Link chat transcript
     13. Resolve Stripe price (lib/stripe/price-mapping.ts)
     14. stripe.checkout.sessions.create({ metadata: intake_id, patient_id, category, subtype })
     15. UPDATE intakes SET payment_id
  -> Stripe hosted checkout (redirect)
  -> app/api/stripe/webhook/route.ts
     1. Signature verify   2. Atomic claim (try_process_stripe_event RPC)
     3. Extract intake_id from metadata   4. Guard: intake exists (else DLQ + 500)
     5. Guard: already paid   6. Guard: intake is still payment-retryable
     7. UPDATE intakes paid   8. Guard: concurrent/stale webhook
     9. Save Stripe customer ID   10. Payment notification
     11. generateDraftsForIntake() (30s timeout, fallback: ai_draft_retry_queue)
```

**Key files:** `lib/stripe/checkout.ts`, `lib/stripe/guest-checkout.ts`, `lib/operational-controls/config.ts`, `lib/operational-controls/medication-blocklist.ts`, `app/api/stripe/webhook/route.ts`, `app/actions/generate-drafts.ts`, `lib/stripe/price-mapping.ts`.

**Pre-checkout blocks**: maintenance mode is enforced at `/request`; disabled services are enforced at `/request` and both checkout actions; capacity limits are enforced at `/request`, `createIntakeAndCheckoutAction`, and `createGuestCheckoutAction`. When the capacity switch is enabled and the daily counter RPC cannot be read, the system fails closed and shows the high-demand block. Business hours are a review-timing reference only and do not block checkout. Safety completeness is enforced server-side before rule evaluation; missing critical answers return `REQUEST_MORE_INFO`, persist a sanitized `safety_audit_log` row, and do not create a Stripe session. PostHog `operational_block` events track capacity-limit blocks for analytics.

**Checkout failure visibility:** Authenticated and guest checkout both preserve failed Stripe session creation as `intakes.status = checkout_failed` with `checkout_error` rather than deleting the request. Operators can see and recover failed payment setup attempts; only answer-save failures roll back the just-created intake because no usable clinical record exists yet.

### Idempotency & Duplicate Protection

| Layer | Mechanism |
|-------|-----------|
| Client | Idempotency key per submission (`review-step.tsx`) |
| Server | Key validation >=16 chars (`checkout.ts:284`) |
| Database | UNIQUE constraint on `intakes.idempotency_key` |
| Stripe | Idempotency key on `sessions.create()` (guest flow) |
| Webhook | Atomic event claim via `try_process_stripe_event` RPC |
| Webhook | `payment_status === 'paid'` early return |
| Webhook | Paid transitions require current `payment_id = session.id`, retryable intake status, and `payment_status IN ('pending','unpaid','failed')` |

On Postgres 23505 (duplicate key), returns existing intake. If already paid, redirects to success.

**DLQ:** Missing intake -> `addToDeadLetterQueue()` + 500 (Stripe retries). Non-retryable or stale paid webhooks -> `addToDeadLetterQueue()` + 200 (operator-visible, no retry storm). Max 3 retries then 200. 5 items/hour -> Sentry FATAL. Admin UI at `/admin/webhook-dlq` with `X-Admin-Replay` replay. Daily cron: `cron/dlq-monitor/route.ts`.

**Retry payment** (`retryPaymentForIntakeAction`): auth + ownership + status guard (`pending_payment` or `checkout_failed` with unpaid/pending/failed payment state) + safety re-validation + expire old session + create fresh session.

**Guest checkout failures:** after clinical answers/compliance audit are persisted, Stripe price/session failures mark the intake `checkout_failed` and keep `checkout_error` for operator recovery. The system must not hard-delete those intakes because that hides paid-flow failures from support and breaks the audit trail.

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

**Refund tracking** on `intakes`: `refund_status` (not_applicable | not_eligible | pending | succeeded | failed | skipped_e2e), `refund_stripe_id`, `refunded_at`, `refunded_by`. Full refunds write `payment_status = refunded`; partial refunds write `payment_status = partially_refunded`. Failed refunds -> Sentry alert + reconciliation panel (`lib/data/reconciliation.ts`). Standalone refunds (any status) via `issueRefundAction()` in `app/doctor/queue/actions.ts`.

**`amount_cents` is the source of truth for refund math** and must equal what Stripe actually charged. The paid-transition webhook handlers (`checkout-session-completed.ts`, `checkout-session-async-payment-succeeded.ts`) reconcile `amount_cents = session.amount_total` so referral-credit coupons (a Stripe `amount_off` coupon) and the Priority review fee (an extra line item) don't desync the stored amount from the charge. Seeding the list price instead made `issueRefundAction()` refund **more** than the charge for coupon customers (Stripe rejects "Refund amount > charge amount") and **less** for Priority review customers (short by $9.95). Note: orders paid before 2026-06-07 may still carry the list price in `amount_cents`; reconcile those from Stripe if a legacy refund fails.

---

## Email System

### Architecture

| System | Location | Owner |
|--------|----------|-------|
| React Email templates | `lib/email/components/templates/` | Developer (production sends) |
| Database templates | `email_templates` table | Admin (editable content) |
| Admin preview | `lib/email/admin-preview.ts` | Server-only (preview/test) |

**Senders:** `lib/email/send-email.ts` (React templates via Resend), `lib/email/template-sender.ts` (DB templates with merge tags).

**Template types:** Legacy retry reconstruction supports core transactional and lifecycle types including `med_cert_patient`, `med_cert_employer`, `script_sent`, `request_declined`, `consult_approved`, and `still_reviewing`; new outbox rows replay their frozen encrypted provider body instead. (The dead specialty `*_approved`, `welcome`, `verification_code`, `intake_submitted`, `payment_retry`, and `referral_credit` templates were removed in the 2026-07-06 email Wave 2 cleanup — real prescription approvals notify via `script_sent`.) Supabase Auth send-email templates cover `magiclink`, `signup`, and `recovery` via `app/api/webhooks/supabase-auth/route.ts`. Marketing/engagement types are capped by warmup limits; transactional clinical/payment sends are not.

**Email delivery:** `/admin/emails/hub` is the single delivery operations surface: outbox recovery, delivery status, sequence ownership, and compact controls for templates, suppression, and auth recovery health. Email template editing lives at `/admin/emails/templates`; certificate details and static-PDF preview live separately at `/admin/settings/templates`. In development, `/email-preview/magic-link` covers Supabase auth email QA. Legacy `/admin/email-hub`, `/admin/email-test`, `/admin/email-outbox`, `/admin/email-queue`, `/admin/ops/email-outbox`, `/admin/emails/preview`, and `/admin/emails/analytics` redirect to the owning email surfaces.

### Retry & Delivery

All sends logged to `email_outbox`: `status` (pending | sending | sent | failed | skipped_e2e), `delivery_status`, `provider_message_id` (Resend ID), `error_message`, `retry_count` (dispatcher max 10), `intake_id`, `patient_id`, `certificate_id`, and reconstruction metadata. New rows also carry the exact Resend request body as AES-256-GCM ciphertext inside internal outbox metadata; the dispatcher decrypts and replays that frozen body so dynamic links and tags remain byte-stable under the same provider idempotency key, without adding plaintext HTML or body content to metadata. For a legacy row without ciphertext, the dispatcher reconstructs once and persists that encrypted body before its first idempotent provider call. The dispatcher atomically claims rows as `sending`, recovers stale `sending` claims, retries retryable failed rows with backoff, and permanently fails invalid certificate or non-retryable provider responses after surfacing them to Sentry/logs.

**Pipeline:** Doctor approval -> PDF generation -> Storage upload -> DB update -> Email send -> `email_outbox` log. Each step fails independently.

**E2E seam:** `PLAYWRIGHT=1` skips Resend sends, logs as `skipped_e2e`.

**Observability:** Sentry (`action:send_email`, dispatcher exhaustion, stale sending recovery), Vercel logs, Resend dashboard, `/admin/emails/hub`, the canonical `/api/cron/email-dispatcher`, and `email_outbox` queries. Resend webhook lifecycle events update `delivery_status`; raw recipient addresses must be masked in logs/analytics.

### Email Test Studio

Email preview lives inside `/admin/emails/templates` for admin review and `/email-preview/*` for development template QA. Test sends use the admin email server action from the template editor or Email delivery; there is no separate `/admin/email-test` page or direct test-send API.

---

## Certificate Pipeline

### Generation Flow

```
app/actions/approve-cert.ts
  1. Doctor gating (provider number + AHPRA)
  2. Idempotency check (existing cert?)
  3. Fetch active static PDF config from certificate_templates
  4. Snapshot clinic_identity + doctor_identity
  5. Render PDF (lib/pdf/template-renderer.ts — pdf-lib overlay on static template)
  6. Upload to private Supabase Storage bucket
  7. INSERT issued_certificates (template_id, snapshots, pdf_hash SHA256)
  8. Log to certificate_audit_log
  9. Send patient email (dashboard link, not attachment)
```

**Security:** Private storage bucket, authenticated app-streamed downloads for patients, and short-lived storage signed URLs only behind server routes. Downloads require ownership checks (patient/doctor/admin as appropriate), and certificate IDs use `crypto.randomInt()`. Public verification (`app/api/verify/route.ts`): rate-limited, masked patient name (first + last initial), no doctor name.

**Email delivery:** Links to `/patient/intakes/[id]`, failure state is visible through certificate fields and `email_outbox`, dispatcher retry max is 10, duplicate prevention happens through certificate sent markers plus the outbox idempotency guard.

**Corrections:** A correction keeps the certificate identity but switches to a unique storage version inside `commit_certificate_correction`. Patient requests are limited to the current valid document, the paid 1/2/3-day tier, and three durable correction events. The atomic switch resets certificate and intake delivery state plus per-version resend counters; notification defaults on, and outbox duplicate/resend guards are scoped to the new storage version so prior delivery cannot make the corrected PDF appear sent.

### Doctor Cert Workflow

1. Doctor loads draft from `document_drafts` table
2. Edits fields (patient name, dates, reason, cert type)
3. Calls `renderMedicalCertificateToPdf(draft, logoUrl)` via `pdf-lib` (template overlay)
4. Draft marked `status: 'issued'`, `issued_at` + `issued_by` set
5. PDF stored; `issued_certificates` record created with template config snapshot
6. Patient notified via email

### Certificate PDF Config

Static-PDF overlay config is stored as immutable JSONB in `certificate_templates`. Operators can preview the active certificate and edit clinic identity, but PDF layout changes stay in code review.

| Table | Owner | Purpose |
|-------|-------|---------|
| `clinic_identity` | Admin | Singleton clinic details (name, ABN, address, logo) |
| `profiles` | Doctor (admin validates) | Provider number, AHPRA number, signature (on `profiles` table) |
| `certificate_templates` | Admin | Static PDF overlay config, versioned per type |
| `issued_certificates` | System | Immutable record with template + identity snapshots |
| `certificate_audit_log` | System | Append-only issuance/download/verify log |

**Certificate types:** `work`, `uni`, `carer` (defined as `MedicalCertificateSubtype` in `types/db.ts`). Versioning: any change -> new version (monotonic per type). Activation is atomic (deactivate old + activate new in transaction). Partial unique index enforces one active per type. Issued certificates lock to `template_id` + `template_version` with optional `template_config_snapshot` for guaranteed re-render. Certificates are immutable except status (valid -> revoked | superseded). Idempotency via `cert_number` UNIQUE constraint (`generateCertificateNumber()` → `MC-YYYY-XXXXXXXX`) and `cert_ref` (`generateCertificateRef()` → `TYPE-YYYYMMDD-XXXXXXXX`). PDF integrity: SHA-256 hash stored on `issued_certificates`.

---

## Prescription Workflow

**Medication entry:** Free-text box (`components/request/steps/medication-step.tsx`) — the patient types one medication name per request (with optional strength/form) or describes it. The PBS reference combobox + `GET /api/medications/search` lookup (and `lib/clinical/pbs-client.ts`) were **retired 2026-06-28** (#208 + dead-code sweep): the lookup was slow and read as a hard "search and select from a list" gate, while the doctor confirms the exact medicine in Parchment/MIMS at prescribing time anyway.

**Hard constraints:** No clinical interpretation, substitution, eligibility logic, approval automation, or AI in the intake. Clinical backstops operate on the typed text: controlled-substance hard block (`isControlledSubstance` in `lib/clinical/intake-validation.ts`), the dedicated-service steer (hair-loss + contraceptive-pill medicines route to their own services via `detectDedicatedServiceForMedication`), and the server-side `dedicated_service_medication` attention flag (`lib/clinical/derive-intake-flags.ts`).

**Patient UX:** Plain input with a "describe it if you're unsure" prompt and recent-medication quick-pick chips. Clinician view: patient-requested medicine context, labeled as reference only and confirmed inside Parchment/MIMS.

**Controlled substances:** `lib/clinical/intake-validation.ts` hard-blocks Schedule 8 in both form and chat paths.

**Repeat medication normalization:** Repeat-prescription validation, medication blocklists, AI draft context, and doctor-facing case summaries all read through the canonical repeat-medication extractors. Scalar fields (`medicationName`, `medication_strength`, etc.) and the `answers.medications[]` compatibility array stay aligned, but active repeat requests accept exactly one medication row so the single dose/history answer remains unambiguous. The medication name is required; strength/form are optional and surface as doctor attention flags when missing. `prescriptionHistory = "never"` is rejected server-side because this flow is not for new prescriptions.

**Workflow:** Patient submits -> Doctor reviews in portal -> Doctor approves for prescribing after identity completeness check -> Doctor prescribes in embedded Parchment or external fallback -> Parchment webhook or manual confirmation marks script sent -> Patient notified via email.

---

## Doctor Portal

**Routes:** All under `/doctor`, require `doctor` or `admin` role.

| Route | Purpose | Data Source |
|-------|---------|-------------|
| `/doctor` | Legacy redirect to `/dashboard` | `next.config.mjs` |
| `/doctor/intakes/[id]` | Compact three-lane intake review cockpit + AI drafts | `getIntakeWithDetails()`, `getAIDraftsForIntake()` |
| `/doctor/intakes/[id]/document` | Med cert generation | `getOrCreateMedCertDraftForIntake()` |
| `/doctor/patients` | Patient list (capped 100) | Direct Supabase query |
| `/admin/analytics` | Intake + payment analytics | Direct Supabase query |
| `/doctor/scripts` | Legacy redirect to `/dashboard?status=scripts#doctor-queue` | `next.config.mjs` |
| `/doctor/settings/identity` | Doctor identity config | Doctor profile |

**Queue architecture:** Paginated (`pageSize` capped at 100 via `Math.min()`). Stale data warning shown when queue may be out of date. Polling-based refresh. Paused doctors (`profiles.doctor_available = false`) receive an empty queue — `getDoctorQueue({ doctorId })` filters them out so they do not see new intakes. Live queue reads also exclude the fixed seeded E2E patient via `lib/data/seeded-e2e-data.ts` unless an E2E/test env flag is set.

**Intake review flow:**
1. Doctor opens case from queue
2. `IntakeReviewCockpit` presents patient identity/history, request summary, blockers, and decision actions in one compact surface
3. AI draft is collapsed by default (prevents cognitive anchoring)
4. Red flags require explicit acknowledgment before approval (`hasRedFlags && !redFlagsAcknowledged`)
5. Clinical notes mandatory (minimum 20 characters)
6. Approval triggers the service-specific action -- med cert approval updates intake status, creates the document record, and sends email; repeat scripts move through prescribing identity checks and Parchment/manual script delivery

**Safety controls:**
- AI drafts collapsed by default to prevent anchoring bias
- Red flag acknowledgment gate on approval
- Minimum clinical notes length enforced
- Stale queue warning via `role="alert"`
- Staff blockers strip exposes only decision blockers such as identity missing, note too short, message needed, or delivery pending

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
| `/patient/settings` | Profile, email prefs, export, retained-record account closure | Multiple API endpoints |
| `/patient/health-profile` | Edit allergies, conditions, medications, and emergency contact | `/api/patient/health-profile` |

**Access control:** Double-layer -- RLS policies on every table (patient isolation via `auth.uid()` subquery) plus application-level ownership checks (`.eq("patient_id", patientId)`). Cross-patient access risk: LOW.

**Real-time:** Messaging and request-status trackers use Supabase Realtime with polling fallbacks where needed. The old standalone patient notification feed is retired; patient-visible updates should land in requests, messages, documents, prescriptions, or payment history.

**Guest → Authenticated flow:** Guest checkout creates profile without `auth_user_id` → Stripe redirect → success URL `/auth/complete-account?intake_id={id}` → post-signin page links the exact paid checkout profile when possible, otherwise one deterministic unlinked email match with paid history before newest guest fallback → sets `email_verified: true` → checks `onboarding_completed` → routes to `/patient/onboarding` or `/patient`. Closed profiles (`account_closed_at is not null`) are excluded from relinking.

**Account closure:** Patient self-service closure enters through the service-role-only `close_patient_account` RPC. In one database transaction it checks active clinical work, inserts a no-FK `closed_auth_accounts` tombstone keyed by the Auth user ID, clears `profiles.auth_user_id`, records `account_closed_at` / `account_closure_reason`, and minimises non-essential profile/contact PHI while retained clinical/payment/audit rows remain linked by `profiles.id`. Clearing `auth_user_id` removes direct RLS access even while an old access JWT is still valid. The server then globally revokes refresh sessions; post-sign-in, the auth trigger, and every profile-creation fallback check the service-role-only tombstone before any link/create and route closed users to `/auth/account-closed`.

**Payment state display:**

| Intake Status | What Patient Sees |
|---------------|-------------------|
| `pending_payment` | "Payment Required" card with CTA |
| `paid` | "Waiting for doctor review" |
| `in_review` | "Doctor is reviewing" |
| `approved` | "Approved" + download button |
| `declined` | "Declined" + reason |

---

## Staff Portal (Admin · Doctor · Support)

**Roles:** Three staff role values on `profiles.role` (Phase 1 of dashboard remaster, 2026-05-11):

- `admin` — owner-operator. Holds both admin and doctor capabilities via role inheritance (`getRoleCapabilities("admin") = ["admin", "doctor"]`). Single admin per platform; future doctor hires are `doctor` role only.
- `doctor` — clinical only. Holds the `doctor` capability.
- `support` — non-clinical operations. Holds the `support` capability. Sidebar shows `/admin/ops` for recovery triage and `/admin/intakes` Ledger for request/payment metadata lookup; the Ops cockpit links through to `/admin/webhook-dlq`, `/admin/ops/parchment`, and `/admin/ops/prescribing-identity` with masked/redacted data only when recovery work needs it. No clinical answers, approvals, prescribing access, patient directory, Email delivery, finance, analytics, or settings access.

Capability helpers in `lib/auth/staff-capabilities.ts`. Per-doctor capability flags on `profiles` (`can_review_med_certs`, `can_review_repeat_rx`, `can_review_consults`, `can_review_ed`, `can_review_hair_loss`, `can_prescribe_s4`, `can_prescribe_s8`) scope future doctor hires before their service-line verification completes; owner-operator is unrestricted by default. Parchment prescribing actions call `checkParchmentPrescribingCapability(...)` before external handoff: `prescribe_s4` is required for every embedded prescribing launch, and `prescribe_s8` is required when repeat-script intake answers include a controlled-medication name.

**Canonical URL:** `/dashboard`. As of Phase 2 of the dashboard remaster (2026-05-12), `/dashboard` is the real staff surface: role-aware content (admin gets setup/readiness cards above the same clinical queue; doctor gets the queue; support is redirected to the bounded support ops cockpit at `/admin/ops`), `SystemHealthPill` in the header, and doctor availability toggle. Legacy `/admin`, `/doctor`, and `/doctor/dashboard` redirect here from `next.config.mjs`; `/doctor/queue` redirects to the review-filtered cockpit at `/dashboard?status=review#doctor-queue`, and `/doctor/scripts` redirects to the scripts-filtered cockpit. New code references `STAFF_*_HREF` constants from `lib/dashboard/routes.ts`; legacy `ADMIN_*_HREF` / `DOCTOR_*_HREF` aliases stay until a later remaster phase consolidates the file tree.

## Admin Portal

**Access:** `admin` role only for admin data pages (set via `profiles.role = 'admin'` in Supabase). The `/admin` shell also hosts bounded support surfaces for `support` role on explicit non-clinical routes only: `/admin/ops`, `/admin/intakes` Ledger, `/admin/webhook-dlq`, `/admin/ops/parchment`, and `/admin/ops/prescribing-identity`. In the current solo-doctor operating model, the same person can be both admin and treating doctor, so admin surfaces are designed as an operator cockpit rather than a separate mode.

Admin capabilities span the `/admin` route group and include: operator cockpit, patient directory/profile lookup, operations dashboard, analytics, compliance audit logs, feature flag management (kill switches, operational controls), finance (fraud flags, Stripe disputes), clinic identity configuration, and doctor management.

**Staff cockpit architecture:** `/dashboard` is the primary combined operator surface (Phase 2 of dashboard remaster, 2026-05-12). It uses `OperatorShell`, shared navigation from `lib/dashboard/staff-navigation.ts` (`getStaffNav(profile)`), live sidebar counts from `lib/data/staff-nav-counts.ts`, compact summaries from `lib/doctor/case-summary.ts`, and the `SystemHealthPill` in the header (45s poll on `/api/admin/system-health`). Dedicated Queue navigation deep-links to `/dashboard?status=review#doctor-queue`, Scripts navigation deep-links to `/dashboard?status=scripts#doctor-queue`, Ledger navigation points to `/admin/intakes` for search/source records, and Patients deep-links to `/admin/patients` with the active prescribing-identity blocker count. Owner-operator doctor setup uses the shared doctor identity page at `/doctor/settings/identity`; `/admin/settings/doctor-identity` is a redirect-only compatibility alias. `/admin/intakes/[id]` (admin) and `/doctor/intakes/[id]` (doctor) share the same `IntakeDetailClient`. Phase 4a (2026-05-12) collapsed `/admin/patients/[id]` to a redirect; the canonical patient profile is `/doctor/patients/[id]`. The patient directory defaults to most recent request and exposes only operational filters: status, service, state, and Parchment sync.

**Operational controls** (`/admin/features`): Bounded operator console for platform/service kill switches, review timing reference (open/close, timezone), capacity limit (max intakes/day), urgent notice banner, scheduled maintenance (start/end datetime), safety libraries, automation, and recent changes. The critical strip keeps platform, med cert, repeat Rx, and consult kill switches visible without scrolling; lower-priority controls sit in compact tabs with internal pane scrolling only. Runtime helpers live in `lib/operational-controls/`; admin writes go through `lib/feature-flags.ts` with server-side key/value validation. Scheduled maintenance is computed at request/availability read time, so no background cron needs to flip `maintenance_mode`.

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
| `email_suppressions` | Account-less marketing opt-outs (email-keyed unsubscribe for recipients with no profile, e.g. partial-intake drafts; Spam Act s18). Service-role only, no anon/authenticated grants | Standalone (`email_lower` PK) |
| `referrals` | Referral tracking ($5 credit both parties, UI: `referral-card.tsx`) | `profiles.id` (referrer + referee) |
| `document_drafts` | Certificate/document draft editing | `intakes.id` via `request_id` |
| `issued_certificates` | Issued certs with template snapshots | `intakes.id` |
| `certificate_audit_log` | Issuance/download/verify events | `issued_certificates.id` |
| `partial_intakes` | Anonymous abandoned-intake recovery drafts; answers and non-recovery identity fields encrypted | `session_id` bearer token |
| `subscriptions` | Retired Repeat Rx subscription history table. No runtime app surface or webhook handler depends on it while the one-off model is active. | `profiles.id` via `profile_id` |
| `intake_followups` | Historical rows for old ED/hair-loss check-ins, shown staff-side only. Current one-off model does not create new automated follow-ups, and patient follow-up routes are redirected to request history. | `intakes.id` via `intake_id`, `profiles.id` via `patient_id` |
| `followup_email_log` | Legacy log of retired treatment follow-up reminder emails | `intake_followups.id` via `followup_id` |

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
  +-- partial_intakes (session_id bearer token, not profile-owned until conversion)
  +-- subscriptions (profile_id, retired historical table)
```

All tables have RLS policies. PHI fields use AES-256-GCM field-level encryption.

### API Routes by Domain

Route inventory is generated by `pnpm build`. Webhooks, cron jobs, and admin routes stay separate. Patient and doctor routes use RESTful patterns.

| Domain | Routes | Key Endpoints |
|--------|--------|---------------|
| **Admin** (4) | `/api/admin/*` | `staff-nav-counts`, `system-health` (Phase 2, powers `SystemHealthPill`), `webhook-dlq`, `heard-about-us-backfill` (one-time attribution backfill — admin POST, dry-run by default) |
| **Cron** (21) | `/api/cron/*` | See OPERATIONS.md for full cron table |
| **Doctor** (8) | `/api/doctor/*` | `certificates/[intakeId]/download`, `intakes/[id]/audit-view`, `intakes/[id]/lock`, `intakes/[id]/review-data`, `log-view-duration`, `patients/[patientId]/health-profile`, `patients/[patientId]/summary`, `scripts/[id]` |
| **Patient** (11) | `/api/patient/*` | `certificates/[id]/download`, `documents/[intakeId]/download`, `get-invoices`, `download-invoice`, `health-profile`, `intake-status`, `messages` (GET/POST), `profile` (PATCH), `referral`, `retry-payment`, `resend-confirmation` |
| **Med Cert** (2) | `/api/med-cert/*` | `preview` (GET), `render` (POST) |
| **Webhooks** (6) | `/api/stripe/webhook`, `/api/stripe/verify-payment`, `/api/webhooks/resend`, `/api/webhooks/telegram`, `/api/webhooks/parchment`, `/api/webhooks/supabase-auth` | Per-provider signature verification for one-off checkout, refunds, disputes, async payment outcomes, auth sync, and `prescription.created` (Parchment). Repeat Rx subscription acquisition and runtime compatibility handlers are retired. |
| **Misc** (13) | Various | `/api/draft`, `/api/certificates/[id]/download`, `/api/health`, `/api/og`, `/api/verify`, `/api/unsubscribe`, `/api/search`, `/api/profile/ensure`, `/api/attribution/heard` (token-authed self-reported "how did you hear about us?" write; POST in-app + GET one-click for email) |

### Server-Only Module Pattern

Any function that uses `createServiceRoleClient()` or accesses PHI directly must be in a `"server-only"` module. This prevents accidental client-bundle inclusion of service role keys.

**Pattern:**
```ts
// lib/data/system-health.ts
import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export async function getSystemHealth(): Promise<SystemHealth> { ... }
```

**Rule:** If a linter or build error says "server-only import in client component" — the fix is to split the function into its own `server-only` file, not to suppress the error or remove the import guard.

---

## Component Patterns

### UIX Component Library

> **Status:** Compatibility layer in retreat. Do not add new APIs here. Prefer canonical components from `@/components/ui` and domain-specific primitives first. This subsection absorbed the previous `components/uix/README.md` on 2026-05-23 doc cleanup so the doc surface stays in one place.

Custom abstraction layer at `components/uix/`. Import everything from `@/components/uix`.

**Full export list:**

```tsx
import {
  Accordion,
  AccordionItem,
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CompactStepper,
  DatePickerField,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  PageBreadcrumbs,
  Pagination,
  ScrollShadow,
  Skeleton,
  Snippet,
  Spinner,
  Stepper,
  Tooltip,
  UserCard,
  useDisclosure,
} from "@/components/uix"
```

**Bespoke uix primitives** (the actual abstraction layer, not re-exports):

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `UserCard` | User display with avatar | `name`, `description`, `avatarUrl`, `size` |
| `PageBreadcrumbs` | Navigation breadcrumbs | `showHome`, `links: {label, href?}[]` |
| `DatePickerField` | Date picker with ISO string I/O | `value`, `onChange`, `disablePast`, `isRequired` |
| `Snippet` | Copyable code/text display | `symbol`, `size`, children |
| `Pagination` | Shared pagination control | `page`, `totalPages`, `onPageChange` |
| `ScrollShadow` | Scroll container with edge affordance | children |
| `CompactStepper` / `Stepper` | Stepper variants | step-state props |
| `Modal` (+ `ModalBody`, `ModalFooter`, `ModalHeader`) | Modal primitives | `useDisclosure` hook for open state |

Also re-exports selected shadcn/Radix primitives: `Button`, `Card` (+ sub-parts), `Input`, `Badge`, `Skeleton`, `Spinner`, `Tooltip`, `Accordion` (+ `AccordionItem`).

**Usage examples:**

```tsx
import { PageBreadcrumbs, Snippet, UserCard } from "@/components/uix"

<PageBreadcrumbs
  showHome
  links={[
    { label: "Admin", href: "/admin" },
    { label: "Settings" },
  ]}
/>

<UserCard name="Clinician" description="General Practitioner" />

<Snippet symbol="" size="sm">
  MC-REFERENCE
</Snippet>
```

**Component decision tree:** See CLAUDE.md for quick-reference selection guide (shadcn vs UIX vs solid-depth components).

**File organization:** core primitives in `components/ui/`, shared cross-surface components in `components/shared/`, UIX wrappers in `components/uix/`, staff cockpit shell/page/split-pane/action palettes in `components/operator/`, plus domain directories (`admin/`, `doctor/`, `patient/`, `request/`, `marketing/`).

### Operator Components

Use `components/operator/` for staff pages that combine admin and clinical work. These primitives are intentionally compact and bounded so the operator can scan and act without whole-page dashboard scrolling.

| Component | Purpose |
|-----------|---------|
| `OperatorShell` | Admin staff shell with shared sidebar and mobile operator nav |
| `OperatorPage` / `OperatorPageHeader` | Bounded staff page frame and standard header |
| `OperatorScrollArea` | Internal scroll region for secondary content inside a bounded staff page |
| `OperatorPanel` | Solid-depth portal panel using the canonical dashboard card pattern |
| `OperatorSplitPane` | Recovery queue/list plus detail layout for ops pages |
| `StaffCommandPalette` | Keyboard-accessible staff search/jump surface |

Do not build new bespoke admin shells or mode-switching pages. If a staff page needs a new layout primitive, add it under `components/operator/` and document it here in the same commit.

**Future doctor data boundary:** Admin uses broad operator data. Non-admin doctors are scoped through `lib/doctor/patient-access.ts` for patient directory, patient detail, patient drawer APIs, and doctor analytics. The relationship sources are intake claim/review/reviewer fields, script-task ownership, issued certificates, and patient notes; the global unclaimed queue is not enough to place a patient in a doctor's directory/search/analytics history.

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
- `emerald` = Medical Certificates · `cyan` = Repeat Medication · `blue` = ED Assessment · `violet` = Hair Loss

**Used in:** `services-dropdown.tsx`, `mobile-menu-content.tsx`, `user-menu.tsx`, and `service-cards.tsx`. Do not create local icon containers — always use `ServiceIconTile`.

### Service Page Patterns

Two patterns coexist intentionally. Use this decision rule for every new service/marketing page:

**Pattern A — `ServiceFunnelPage` (config-driven)**
`components/marketing/service-funnel-page.tsx`

Use when: the page is a standard service landing page with a fixed section order (hero → how it works → pricing → testimonials → FAQ → CTA). All content is passed via a typed config object.

- All InstantMed service pages use this: med-cert, repeat-rx, consult, hair-loss, weight-loss, womens-health, etc.
- Sections are ordered and spaced consistently across all services — no per-page layout decisions
- To add a new service page: build a dedicated layout following the live examples (`/medical-certificate`, `/erectile-dysfunction`, `/hair-loss`). The generic funnel template (`ServiceFunnelPage` + `lib/marketing/service-funnel-configs.ts`) was deleted 2026-07-03 — its only consumer was the retired General Consult route.

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
/medications/[slug]     Retired. `/medications/*` and `/prescriptions/med/*` redirect to service-level prescription pages.
/for/[audience]         Audience segment pages (students, parents, tradies, etc.)
/locations/[city]       Australian city pages
/intent/[slug]          High-intent search query landing pages
```

**Data layer:** `lib/seo/pages/` -- typed page definitions, shared interfaces, and lookup helpers. Template: `components/seo/seo-page-template.tsx`. Each page requires: unique title (50-60 chars), description (120-150 chars), 5+ symptoms, 3+ red flags, 3+ FAQs, 2+ disclaimers.

**Metadata:** Auto-generated `<title>`, `<meta description>`, Open Graph tags, canonical URLs. JSON-LD `FAQPage` structured data via `lib/seo/safe-json-ld.ts` and `components/seo/healthcare-schema.tsx`.

**Sitemap/robots:** `app/sitemap.ts` and `app/robots.ts` auto-update from the page data layer. No manual updates needed.

**IndexNow:** Manual protected submission to Bing (and Yandex/other IndexNow participants) only. `lib/seo/indexnow.ts` reads every sitemap listed in `robots.txt`, dedupes URLs, and is used by `/api/indexnow/route.ts` when `INDEXNOW_SECRET` is configured. `INDEXNOW_KEY` is optional only while it matches the public verification file fallback. No Google support — Google has its own crawl pipeline. The scheduled cron was retired because it is not required for clinical operations, payment recovery, or compliance.

**Internal linking:** Use explicit, page-owned links or `ContentHubLinks` for service-to-content cross-linking. Do not reintroduce null-rendering SEO compatibility wrappers.

**Compliance rules:** No guarantee claims ("instant", "cure", "100%"). Always include emergency disclaimers. No specific diagnoses. Australian language and regulations.

---

## AI Configuration

**Provider:** Anthropic Claude via Vercel AI SDK (`lib/ai/provider.ts`). Key: `ANTHROPIC_API_KEY` (preferred) or `VERCEL_AI_GATEWAY_API_KEY` (production gateway).

All AI usage is documentation-assistance only. Safety logic is deterministic (not AI). See CLINICAL.md → AI Boundary Rules.

### Model Configs

| Config key | Model | Temperature | Max tokens | Used for |
|-----------|-------|-------------|------------|---------|
| `clinical` | `claude-opus-4-8` | n/a (deprecated) | 2,000 | Medical cert drafts, clinical note generation |

**Helper:** `getModelWithConfig("clinical")` is the only runtime model entrypoint.

**PII sanitization:** Prompt inputs pass through `checkAndSanitize()` / `sanitizeAnswerValue()` before being sent. Patient identity is minimized in draft prompts; AI output remains internal and requires doctor review before use.

### AI Draft Actions

| Action | Config used | Purpose |
|-------|-------------|---------|
| `app/actions/drafts/generate-clinical-note.ts` | clinical | Generate internal clinical notes for doctor review |
| `app/actions/drafts/generate-med-cert.ts` | clinical | Generate medical certificate draft data |
| `app/actions/drafts/generate-repeat-rx.ts` | clinical | Generate repeat prescription review draft data |
| `app/actions/drafts/generate-consult.ts` | clinical | Generate consult review draft data |

---

## Testing Architecture

See `TESTING.md` for full testing strategy, conventions, E2E patterns, auth bypass, and coverage rules.

**Quick reference:**
- Unit tests: Vitest, Node environment, `lib/__tests__/`, 80/70/80/80 coverage thresholds (scoped to `lib/clinical/` and `lib/security/` — `lib/state-machine/` was removed from the include list in 2026-04-08 since the directory no longer exists)
- E2E tests: Playwright, `e2e/`, auth bypass via `PLAYWRIGHT=1` + `__e2e_auth_user_id` cookie. **Full suite runs in CI** as of commit `ae1c80822` (previously only 4 of 47 specs ran). Requires `STRIPE_WEBHOOK_SECRET` (test-mode) in GitHub repo secrets or webhook tests silently skip.
- Current local unit test count: **2,453 tests** across 258 test files as of 2026-05-19. Earlier 1,521-test and 987-test references are stale.
- Commands: `pnpm test` · `pnpm test:coverage` · `pnpm e2e:chromium`

---

## Directory Index

### `app/` — 549 files, 235 route files

Filesystem route-count drift is guarded by `lib/__tests__/project-docs-drift-contract.test.ts`; `pnpm build` remains the source of truth for expanded static/SSG route output.

| Directory | Purpose | Key files |
|-----------|---------|-----------|
| `app/actions/` | Server actions | `unified-checkout.ts` (checkout bridge), `generate-drafts.ts` (AI), `ensure-profile.ts` |
| `app/admin/` | Admin dashboard | `patients/`, `intakes/`, `emails/`, `features/`, `settings/`, `ops/`, `analytics/` |
| `app/doctor/` | Doctor portal under the shared staff shell | `intakes/[id]/` (review detail), `patients/`, `settings/`; queue/scripts entry points resolve through `/dashboard` |
| `app/patient/` | Patient dashboard | `intakes/` (history + success), `settings/`, `onboarding/`, `documents/` |
| `app/api/` | API routes (86 route files) | `stripe/webhook/`, `cron/`, `health/`, `certificates/`, `intakes/`, and the count-only `internal/support-inbox-alert/` diagnostic bridge |
| `app/api/cron/` | Scheduled jobs (27) | `stale-queue/`, `telegram-notifications/`, `email-dispatcher/`, `health-check`, `google-ads-conversions`, `google-ads-diagnostics-watch`, `cert-reactivation`, `parchment-smoke`, etc. See OPERATIONS.md |
| `app/api/stripe/webhook/` | Stripe handlers | 7 handlers: `checkout-session-completed`, `checkout-session-expired`, `checkout-session-async-payment-succeeded/failed`, `charge-refunded`, `charge-dispute-created`, `payment-intent-payment-failed`. Repeat Rx subscription handlers are retired; unsupported Stripe events are acknowledged and claimed by the dispatcher without running business logic. Registered in `handlers/index.ts`. |
| `app/request/` | **Sole canonical intake flow.** Single page, step-based wizard. |
| `app/(dev)/` | Dev-only routes | Email preview only; retired `/cert-preview` and `/sentry-test` prefixes remain fail-closed in middleware |
| `app/blog/` | Guide-only health articles | MDX content from `content/blog/`, ISR 12h, `[slug]/page.tsx` |
| `app/resources/` | Linkable authority assets | Source-backed public references for telehealth safety, employer evidence, secure prescription requests, GP access, complaints, and governance |
| `app/conditions/[slug]/` | SEO: conditions | Programmatic from `lib/seo/data/` |
| `app/symptoms/[slug]/` | SEO: symptoms | Programmatic from `lib/seo/data/` |
| `app/guides/[slug]/` | SEO: guides | Programmatic from `lib/seo/data/` |
| `app/for/[audience]/` | SEO: audience | students, parents, tradies, etc. |
| `app/locations/[city]/` | SEO: city pages | 42 Australian cities from `lib/seo/data/deep-city-content.ts` |
| `app/locations/state/[state]/` | SEO: state hub pages | 8 states (nsw/vic/qld/wa/sa/tas/act/nt) from `lib/seo/data/states.ts`. Added 2026-04-08 for head-term SEO ("online doctor new south wales"). |
| `app/intent/[slug]/` | SEO: high-intent | Search query landing pages |
| `app/compare/[slug]/` | SEO: comparisons | Service comparison pages |
| `app/offline/` | Offline fallback | PWA offline page — shown by service worker when network unavailable |

### `components/`

| Directory | Purpose |
|-----------|---------|
| `ui/` | shadcn/Radix primitives (Button, Input, Dialog, etc.) |
| `uix/` | Thin shared wrappers and re-exports (UserCard, PageBreadcrumbs, DatePickerField, Pagination, Snippet, etc.) |
| `shared/` | Header, Footer, global notices, referral capture, and shared trust/auth controls |
| `operator/` | OperatorShell, bounded staff pages, split panes, local action palettes |
| `request/` | Intake flow: `request-flow.tsx` (orchestrator), `steps/` (per-step components), `store.ts` (Zustand) |
| `marketing/` | Landing pages, ServiceFunnelPage, testimonials, exit intent |
| `blog/` | Guide article template, TOC, visuals, related reading, share controls |
| `doctor/` | IntakeReviewPanel, RepeatPrescriptionChecklist, clinical views |
| `admin/` | Admin-specific panels and views |
| `patient/` | ReferralCard, CrossSellCard, dashboard components |
| `providers/` | AttributionCapture, GlobalDeferredClients, PostHogLoader, ServiceAvailabilityProvider |
| `heroes/` | Morning Canvas hero variants (Split, Centered, Stats, FullBleed) |
| `ui/morning/` | Morning Canvas primitives (MorningSkyBackground, NavigationProgress, WordReveal, PerspectiveTiltCard) |
| `ui/skeleton.tsx` | SkeletonCard, SkeletonForm, SkeletonList, SkeletonDashboard, Spinner |

### `lib/`

| Directory | Purpose | Key files |
|-----------|---------|-----------|
| `lib/auth/` | Auth helpers | `helpers.ts`, `staff-capabilities.ts`, post-auth redirects and guest profile linking |
| `lib/constants/index.ts` | App constants | PRICING, SYSTEM_AUTO_APPROVE_ID, CONTACT_EMAIL |
| `lib/config/env.ts` | Env validation | Zod schemas, `getAppUrl()` |
| `lib/format.ts` | Date formatting | All AEST, `formatDateLong()`, `addDays()` |
| `lib/utils.ts` | Utilities | `cn()` (class merger) |
| `lib/ai/` | AI integration | `provider.ts` (model profiles), prompts, clinical note generation |
| `lib/clinical/execute-cert-approval.ts` | Certificate approval pipeline | Fetch intake → validate → generate PDF → store → email |
| `lib/clinical/` | Clinical logic | `auto-approval.ts` (eligibility), `auto-approval-pipeline.ts` (orchestrator), `auto-approval-state.ts` (state machine — CAS transitions), `intake-validation.ts` (Schedule 8 blocking), `triage-rules-engine.ts` |
| `lib/data/` | Supabase queries | `intakes.ts`, `issued-certificates.ts`, `documents.ts`, `intake-answers.ts` — all use `createServiceRoleClient()` |
| `lib/email/` | Email system | `send-email.ts` (server sender), `send/` helpers, `email-dispatcher.ts` (cron processor) |
| `lib/safety/` | Safety & eligibility engine | `evaluate.ts`, `rules.ts`, `types.ts`, `audit-log.ts`. Used by `/request` flow + authenticated, guest, and retry-payment checkout gates. |
| `lib/offline-queue.ts` | Client-side offline action queue | Used by `hooks/use-connection-status.ts` |
| `lib/pdf/` | PDF generation | `template-renderer.ts` (pdf-lib overlay on static templates in `/public/templates/`) |
| `lib/rate-limit/` | Rate limiting | `redis.ts` (Upstash), `doctor.ts` (auto-approval limits). Fallback: in-memory Map |
| `lib/request/` | Step registry | `step-registry.ts` (step definitions), `validation.ts` (per-step Zod schemas) |
| `lib/security/` | Encryption | `phi-encryption.ts` (AES-256-GCM), `phi-field-wrappers.ts` (data layer wrappers) |
| `lib/stripe/` | Payments | `checkout.ts`, `guest-checkout.ts`, `price-mapping.ts`, `client.ts` |
| `lib/seo/data/` | SEO content | `conditions.ts`, `symptoms.ts`, `guides.ts`, `comparisons.ts`, `audience-pages.ts`, `condition-location-combos.ts`, `deep-city-content.ts` — drive programmatic pages |
| `lib/blog/` | Health guide content system | MDX loader/parser, article registry, shared heading slugs, visual registry |
| `lib/notifications/` | Alerts | `telegram.ts` + `paid-request-telegram.ts` (broad-service-class request pager), `service.ts` (payment notifications), `support-inbox-alert.ts` + processor (manual aggregate-only support count diagnostics) |
| `lib/observability/` | Logging/monitoring | `logger.ts` (structured logger), `sentry.ts` (helpers) |
| `lib/feature-flags.ts` | Feature flags | DB-backed via `feature_flags` table, `getFeatureFlags()` |
| `lib/operational-controls/` | Runtime controls | Capacity fail-closed checks and medication-blocklist answer extraction |
| `lib/analytics/posthog-server.ts` | Server analytics | `getPostHogClient()`, funnel tracking, safety outcome tracking |
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
| `e2e/` | 73 TypeScript files, including 65 specs and `helpers/` (seed/teardown, auth bypass). Focused paid-flow and ops smoke specs are the blocking CI gate. |
| `supabase/migrations/` | 95 SQL migration files (1 squashed baseline + 94 incremental). Most recent: `20260713085920_lock_down_security_definer_rpc_acls.sql`. |
| `public/templates/` | Static PDF templates for certificate generation |
| `content/blog/` | 107 MDX health guide articles. Article bodies are guide-only; service CTAs belong on landing pages, not inside guides. Rewritten articles must be comprehensive, source-backed, and backed by at least two GPT-generated local visuals. |
| `public/images/blog/` | Local WebP hero and article visual assets for health guides. New generated guide visuals carry a deterministic `InstantMed` wordmark added after image generation. |
| `scripts/audit-health-guides.mjs` | Content QA backlog for guide-only copy, minimum visual depth, local images, rendering defects, source depth, article depth, and safety-boundary gaps |

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
| `lib/clinical/auto-approval-state.ts` | Atomic CAS state transitions with Sentry/PostHog observability |
| `lib/clinical/auto-approval-pipeline.ts` | Orchestrator: claim → eligibility → doctor select → execute → mark terminal state |
| `lib/clinical/auto-approval.ts` | Eligibility engine (unchanged) |

**Post-approval doctor oversight:** Auto-approval is not the end of the governance workflow. `getPendingBatchReviews()` reads unresolved auto-approved medical certificates oldest-first (`batch_reviewed_at IS NULL`) for staff who hold `review_med_certs`. The `/dashboard` banner exposes only the aggregate count and oldest age; opening the oldest certificate loads the normal clinical record and requires one explicit outcome. `markBatchReviewed()` compare-and-set stamps one eligible certificate and writes an `ai_audit_log` review receipt. `revokeAIApproval()` is the second valid outcome: it revokes the certificate, returns the intake to manual review, and stamps the same `batch_reviewed_at` / `batch_reviewed_by` receipt. The database permits that otherwise-forbidden `approved → in_review` reversal only when the original intake was AI-approved, a revoked issued-certificate row exists, and both batch-review receipt fields are present. There is no bulk action and no silent backfill.

`getBatchReviewHealth()` supplies aggregate-only pending, overdue, and oldest-age values to `/api/cron/business-alerts`. The critical `med_cert_batch_review_overdue` metric is captured in Sentry without including intake IDs, patient IDs, or PHI.

**Race condition handling:**

| Problem | Solution |
|---------|----------|
| Two cron instances, same intake | CAS: `UPDATE WHERE state = 'pending'` — only one wins |
| Webhook + cron race | Webhook sets `awaiting_drafts`; cron only sees `pending`/`failed_retrying` |
| Crashed pipeline orphan lock | Stale `attempting` → `failed_retrying` after 10 min |
| Doctor acts while auto-approval is `attempting` | Manual med-cert approval force-takes only the `System (Auto-Approve)` claim, parks `auto_approval_state='needs_doctor'` with `manual_doctor_override`, then continues through the normal certificate approval pipeline |
| Pipeline succeeds, no release needed | `markApproved()` is atomic — no release step |

**Alerting:** Sentry records `warning` on exhausted retries and stale recovery, and `info` on approval and deterministic `needs_doctor`. These state changes do not create Telegram messages; the original paid-request message may be edited when its review status changes.

---

## AI Configuration

Models in `lib/ai/provider.ts`. Routed through Vercel AI Gateway in production (fallback: direct Anthropic).

| Profile | Model | Temp | Use |
|---------|-------|------|-----|
| clinical | claude-opus-4-8 | n/a | Medical documentation — high accuracy |

## Key Pages

| Route | Purpose |
|-------|---------|
| `/` | Marketing homepage. Section order: hero → subdued regulatory strip → active service cards → compact coming-soon teaser → how-it-works → compact FAQ → CTA banner → compliance marquee. Coming-soon services are preview-only, with no waitlist/newsletter capture. |
| `/medical-certificate` | Premium landing for med certs. Current structure: hero -> consolidated workplace proof with employer-logo context -> compact certificate selector -> time comparison -> how-it-works -> fee/refund suitability -> scope limits -> compact FAQ -> CTA. CTAs that advertise the 1-day price carry `duration=1` into `/request`. |
| `/prescriptions` | Repeat medication landing (one-off eScript review workflow). Subscription language is dormant/future strategy unless reactivated in `docs/BUSINESS_PLAN.md`. |
| `/erectile-dysfunction` | Bespoke ED specialty landing (`ErectileDysfunctionLanding`). Routes into `/request?service=consult&subtype=ed`. Form-first doctor review; doctor may call/message if clinically needed. Short URL `/ed` 301s here. |
| `/hair-loss` | Bespoke hair loss specialty landing (`HairLossLanding`). Routes into `/request?service=consult&subtype=hair_loss`. Form-first doctor review; doctor may call/message if clinically needed. |
| `/consult` | Services overview page (no intake funnel). General Consult was retired on 2026-05-20; the URL preserves the SEO surface for "online doctor" queries and routes visitors to the 4 active services (med-cert, repeat Rx, ED, hair loss). `/general-consult` 301s here. |
| `/blog` | Doctor-reviewed, guide-only health articles (12h ISR revalidation) |
| `/resources` | Source-backed authority resources for journalists, search engines, and answer engines. Individual assets cover telehealth safety, employer policy, secure prescription requests, GP access, complaints, and governance. |
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
| `/medications/[slug]` | Retired medication information pages. Redirect-only. |
| `/intent/[slug]` | High-intent search query landing pages |
| `/for/[audience]` | Audience segment pages (students, parents, etc.) |
| `/locations/[city]` | Location-based pages |

## File Size Reference (largest client components)

| File | Size | Notes |
|------|------|-------|
| `components/marketing/med-cert-landing.tsx` | 38KB | Main med-cert acquisition page; retired exit-intent email campaign code is intentionally absent |
| `app/admin/features/features-list.tsx` | 35KB | Feature flag admin |
| `components/request/request-flow.tsx` | 31KB | Intake flow orchestrator |
| `app/admin/settings/templates/certificate-details-client.tsx` | 9KB | Read-only certificate details + static PDF preview |
| `app/patient/intakes/[id]/client.tsx` | 28KB | Patient intake detail |
| `app/doctor/queue/queue-table.tsx` | 27KB | Doctor queue table |
| `lib/email/send-email.ts` | 598 lines | Email sender (server) |
