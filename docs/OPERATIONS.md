# OPERATIONS.md -- InstantMed Operations & Debugging

> Canonical reference for incident response, debugging, production readiness, and monitoring.
> Read this file when working on: production issues, deployments, cron jobs, monitoring, debugging errors.

---

## Incident Response

### Stripe Outage

**Symptoms:** Payment webhook failures in DLQ, checkout sessions timing out, payment status not updating.

1. Check Stripe status: https://status.stripe.com
2. Check DLQ monitor: `/admin/webhook-dlq`
3. If Stripe is down: enable per-service kill switches (`DISABLE_CHECKOUT_MED_CERT`, `DISABLE_CHECKOUT_PRESCRIPTION`, `DISABLE_CHECKOUT_CONSULT`); monitor `email_outbox` for failed payment confirmation emails
4. When Stripe recovers: disable kill switches, process DLQ items via `/admin/webhook-dlq`, verify all pending payments reconcile

### Stripe Webhook DLQ — Incident Triage

**Symptoms:** `/admin/webhook-dlq` shows unresolved entries, Sentry surfaces `stripe-webhook` errors, or a patient reports "I paid but nothing happened."

**Diagnosis (5 min):**
1. Open `/admin/webhook-dlq`. Note the `event_type` and `error_message` for each entry.
2. Common causes:
   - `Intake not found` -> checkout ran against a stale/deleted intake. Usually safe to resolve; patient needs a refund manually via Stripe dashboard.
   - `Missing intake_id` -> metadata missing on session. Check `stripe_sessions` table for the session, look up customer email in Stripe, refund via dashboard.
   - DB error during handler -> Supabase outage or RLS regression. Fix root cause first, then retry.
3. Cross-reference: for each DLQ entry, search Stripe dashboard Events > filter by `event_id` to confirm original delivery attempt.

**Recovery:**
1. Fix the root cause (deploy, env var, etc.).
2. In `/admin/webhook-dlq`, click **Retry** on each entry. Retry POSTs to `/api/stripe/webhook` with `X-Admin-Replay` + the stored payload.
3. On success the entry auto-resolves. Verify the target intake transitioned correctly.
4. If retry fails consistently after fix, mark **Resolve** with notes describing the manual action taken.

**Drill (quarterly):** In a staging branch, trigger a DLQ entry by forcing a handler error. Confirm it appears in `/admin/webhook-dlq`, then retry and verify resolution. Run the existing e2e spec locally to catch regressions:
```bash
PLAYWRIGHT=1 STRIPE_WEBHOOK_SECRET=whsec_test_... pnpm e2e e2e/stripe-webhook.spec.ts
```

**Key files:**
- Dispatcher: `app/api/stripe/webhook/route.ts`
- Handlers: `app/api/stripe/webhook/handlers/*.ts` (one per event type)
- DLQ admin: `app/api/admin/webhook-dlq/route.ts`
- Replay auth: `INTERNAL_API_SECRET` env var (required for admin retry)
- e2e: `e2e/stripe-webhook.spec.ts` (signature, idempotency, refund paths)

### Email Delivery Failures

**Symptoms:** Emails stuck "pending" in `email_outbox`, email dispatcher cron reporting high failure counts.

1. Check Resend status: https://resend-status.com
2. Check `/admin/emails/hub` for failed or pending outbox rows, delivery status, and recent queue activity.
3. Manual retry: click "Retry" on individual failed rows in Email delivery.
4. If Resend is completely down: emails auto-retry via the `email-dispatcher` cron; stale `sending` claims are recovered back to retryable `failed` rows.

### Database Connection Issues

**Symptoms:** 500 errors across multiple endpoints, slow page loads, connection timeout errors.

1. Check Supabase dashboard for connection count
2. Check `/admin/performance/database` for metrics
3. If connection pool exhausted: scale up Supabase compute (Project Settings > Database), kill long-running queries
4. If Supabase is down: check https://status.supabase.com

### Operational Controls (Review Timing / Capacity / Maintenance)

**Symptoms:** Patients report "High demand" when trying to request; maintenance banner shows unexpectedly; review-time messaging looks wrong.

1. Check `/admin/features` → Operational Controls: review timing reference, capacity limit, urgent notice, scheduled maintenance
2. PostHog: filter by `operational_block` event to see how often capacity blocks occur
3. Review timing reference: verify `business_hours_open`/`close` and `business_hours_timezone` (default Australia/Sydney). These values set expectations; they do not block checkout.
4. Capacity: `count_intakes_today_sydney` RPC; if at limit, either raise `capacity_limit_max` or wait for next day. If the capacity switch is enabled and the RPC fails, checkout fails closed as high demand until the RPC/schema issue is fixed or the capacity switch is deliberately disabled.
5. Scheduled maintenance: request and availability checks compute the active window directly from `maintenance_scheduled_start`/`maintenance_scheduled_end`; no separate cron flips `maintenance_mode`. If the banner stays on after the window, check whether an admin manually enabled `maintenance_mode` for an incident.
6. Doctor availability: paused doctors (`doctor_available = false`) see empty queue; toggle at `/doctor/settings/identity`

### Duplicate Patient Profiles

**Symptoms:** `/doctor/patients` shows linked profiles or `/admin/ops` flags patient identity risk.

**Triage:**

1. Open the canonical patient from `/doctor/patients`. The detail page aggregates linked request history before any merge.
2. Confirm the linked rows are guest duplicate profiles for the same person. Do not merge signed-in duplicate profiles from the UI; they require manual identity review.
3. Check the banner count and request history. If the canonical profile looks correct, use **Merge** from the patient detail page.
4. If merge is blocked because both profiles have health profile rows, manually compare those health rows first. Do not overwrite health history blindly.

**What merge does:**

1. Reassigns patient-owned records to the canonical profile in one database function.
2. Archives duplicate guest profile rows with `merged_into_profile_id`, `merged_at`, `merged_by`, and `merge_reason`.
3. Writes `patient_profile_merge_audit` and `audit_logs` entries with non-PHI IDs and movement counts.
4. Removes archived duplicate profiles from patient directory and duplicate-identity reporting.

**Post-merge verification:**

1. Refresh `/doctor/patients`; the duplicate group should disappear.
2. Open the canonical patient; request history, certificates, notes, and email history should remain visible.
3. Check `/admin/audit` for `patient_profiles_merged`.
4. If any merge fails, do not retry blindly. Read the returned blocker and resolve the conflicting record first.

### Operator Workflow Map

`/dashboard` is the staff cockpit. Use it first for the live queue, scripts-to-write, recovery prompts, and today-level operations. Admins inherit doctor capabilities, so the owner-operator should not need a separate "doctor mode".

| Workflow | Primary surface | Supporting surface |
|----------|-----------------|--------------------|
| Review paid clinical work | `/dashboard?status=review#doctor-queue` | `/admin/intakes` for ledger/search |
| Write or reconcile scripts | `/dashboard?status=scripts#doctor-queue` | `/admin/ops/parchment` for vendor recovery |
| Patient lookup and duplicate review | `/admin/patients` | `/doctor/patients/[id]`, `/admin/ops/patient-merge-audit` |
| Payment and webhook recovery | `/admin/finance`, `/admin/refunds` | `/admin/webhook-dlq` |
| Email delivery recovery | `/admin/emails/hub` | Compact controls link to `/admin/emails/templates` and `/admin/emails/suppression` |
| Revenue and conversion review | `/admin/analytics` | PostHog for deeper product analysis |
| Platform setup | `/admin/settings` | `/admin/features`, `/doctor/settings/identity`, `/admin/settings/templates` |

Pages outside this map should either be reachable from these surfaces, redirect to them, or be treated as cleanup candidates.
Incident-only PHI encryption diagnostics live at `/admin/settings/encryption`; keep it out of routine nav and dashboard crawl, and use it only for key rotation or backfill incidents.
Email delivery operations, suppression recovery, and email template editing stay under `/admin/emails/*`; do not duplicate them inside settings.
Support staff get a single sidebar entry, `/admin/ops`; nested webhook, Parchment, and prescribing-identity pages stay reachable from the ops recovery cards rather than becoming separate sidebar modes.
Admin-only pages should rely on `requireRole(["admin"])` default redirects so wrong-role staff land on the role-aware staff surface instead of bouncing through `/admin`.

### Solo-Doctor Operating Model

**Current phase:** one AHPRA-registered GP operates as treating doctor and Medical Director. The platform must protect clinical quality and doctor capacity before it optimises volume.

**Service priority order:**

| Priority | Service | Operating rule |
|----------|---------|----------------|
| 1 | Medical certificates | Primary volume engine. Suitable low-risk requests may use doctor-owned protocol automation with QA sampling. |
| 2 | Repeat prescriptions | One-off eScript review for existing stable medications. Escalate unclear or higher-risk cases. |
| 3 | Hair loss | One-off specialist assessment. No subscription, no pharmacy fulfilment. |
| 4 | ED | One-off specialist assessment with strict contraindication checks. |
| 5 | Women's health | Narrow scope only. Escalate complexity. |
| 6 | Weight loss | Manual/high-risk review. Do not automate in the solo-doctor phase. |

**Capacity guardrails:**

- Admin/support should be hired before a second doctor if support becomes the bottleneck.
- First support hire trigger: 30-50 orders/day or 10+ support tickets/day.
- Second doctor trigger: queue P95 above 2 hours during operating hours, QA falling behind, or sustained $60k-$80k/month gross revenue.
- Subscriptions, monthly prescribing, pharmacy fulfilment, and ongoing check-in programs remain dormant until staffing exists.

**Escalation rule:** For prescription and specialty requests, the operational default is form-first doctor review. The doctor may call or message directly when more information is clinically needed. Marketing and product copy must not hard-promise "no call needed" for prescribing pathways.

### Parchment / MIMS Prescribing Handoff

**Verdict:** InstantMed does not expose Parchment/MIMS medicine search to patients and does not seed prescription items into Parchment by API.

Current safe flow:

1. Patients type the medication name as plain free text only for recall/record accuracy (the PBS/AMT reference-search was retired 2026-06-28, #211). It must not be described as MIMS, prescribing advice, or medicine recommendation.
2. InstantMed stores patient-reported medicine name, strength, form, prior history, current dose, and safety answers on the intake.
3. Doctor review builds a doctor-facing prescription context from the intake answers.
4. When the doctor opens Parchment, InstantMed syncs the patient profile and opens the Parchment patient prescription screen by SSO.
5. The doctor must search/select the actual medicine inside Parchment. Parchment/MIMS is the prescribing source of truth.

Operational rules:

- Do not add patient-facing MIMS search unless Parchment and MIMS both grant written permission for that specific patient-facing use.
- Do not preselect or auto-create prescription items in Parchment unless Parchment provides a supported, conformant API endpoint for prescription drafts.
- The Parchment panel may show copyable requested-medicine context for doctor convenience, but the doctor must confirm medicine, PBS/private status, quantity, repeats, directions, contraindications, and monitoring inside Parchment.
- Parchment confirmed custom-domain iframe whitelist for `https://instantmed.com.au` and `https://www.instantmed.com.au` on 2026-05-01. If the doctor portal falls back to a new tab on those hosts, check `lib/parchment/embed-policy.ts`, `NEXT_PUBLIC_PARCHMENT_IFRAME_ALLOWED_HOSTS`, and Parchment CSP before assuming SSO is broken.
- If a doctor reports mismatch between InstantMed context and Parchment/MIMS search results, treat Parchment as source of truth and document the discrepancy in clinical notes.
- Treat `Parchment webhook could not match prescription.created to an intake` Sentry warnings as P1 operations issues: the script may exist in Parchment while InstantMed has not completed the linked request or sent the patient notification. These are also logged as `webhook_failed` audit events and surfaced in `/admin/ops`.

**Weekly operating dashboard:**

| Metric | Target |
|--------|--------|
| Refund rate | Below 8-10% |
| Chargeback rate | Below 0.5% |
| Support tickets | Below 5 per 100 orders |
| Median med-cert turnaround | Below 30 minutes |
| Doctor queue P95 | Below 2 hours during operating hours |
| Doctor minutes/order | Trending down without complaint increase |
| Auto/manual med-cert split | Stable and explainable |
| QA sample backlog | Current |

### Operator Continuity / Break-Glass

> If the primary operator is unavailable, locked out, or unreachable, the account
> inventory, sealed-secret **location** register (pointers, never values), and
> recovery procedure live in [`docs/runbooks/BREAK_GLASS.md`](runbooks/BREAK_GLASS.md).
> Keep its `🔒 LOCATION: ____` fields filled in and reviewed quarterly. The PHI
> encryption keys are the single most important continuity control — without them,
> Supabase backups are unreadable.

### Security Incident

> Classification levels: SECURITY.md → Security Incident Classification

**Symptoms:** Anomalous activity in compliance dashboard, unusual access patterns, reports of unauthorized access.

1. Check `/admin/compliance` for anomaly alerts
2. Review audit logs for affected timeframe
3. If confirmed breach:
   - Rotate **all** API keys (see API Key Rotation below)
   - Disable affected accounts
   - Notify affected patients per Australian Privacy Act
   - Report to OAIC if notifiable data breach

---

## API Key Rotation

### INTERNAL_API_SECRET (zero-downtime)

1. Generate: `openssl rand -base64 32`
2. Add `INTERNAL_API_SECRET_NEW=<new-key>` to Vercel env vars
3. Deploy (both old and new keys work during overlap)
4. Verify system works, then set `INTERNAL_API_SECRET=<new-key>`, remove `INTERNAL_API_SECRET_NEW`
5. Deploy final

### CRON_SECRET

1. Generate: `openssl rand -base64 32`
2. Update `CRON_SECRET` in Vercel env vars
3. Deploy immediately (Vercel cron reads env at runtime)

### ENCRYPTION_KEY / PHI_MASTER_KEY

> **CRITICAL: Do NOT rotate without a data migration plan.** Existing encrypted PHI will become unreadable.

1. Contact engineering lead
2. Plan backfill/re-encryption before rotation
3. Use `scripts/encrypt-phi-backfill.ts` for re-encryption

### Stripe Keys

1. Generate new keys in Stripe dashboard
2. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel
3. Deploy, then verify webhook delivery in Stripe dashboard

---

## Debugging Checklist

### Where to Find Errors

| Source | What It Shows | Key Patterns / Filtering |
|--------|--------------|--------------------------|
| **Vercel Logs** (Deployments > Functions) | Server action errors, API route failures, build errors | Filter by route (`/api/stripe`), status (500), `x-request-id` |
| **Sentry** (Issues tab) | Client + server errors with breadcrumbs, stack traces, tags | `is:unresolved environment:production`, search `x-request-id:<uuid>` |
| **Browser DevTools** (Console/Network) | React errors, failed API calls, Stripe redirects | Red entries in Network tab, hydration errors in Console |
| **PostHog** (Recordings/Events) | User behavior before error, funnel drop-offs, session recordings | Session recordings with console logs |

### Common Error Scenarios

**Stripe Checkout Fails:**
1. Check Vercel logs for the server action or `/api/` route
2. Search Sentry for `Stripe` tag
3. Verify env vars: `STRIPE_SECRET_KEY` (test vs live), `STRIPE_PRICE_*` IDs exist in Stripe
4. Quick test: `stripe prices list --limit 5`

**Consult Subtype Wrong Price:**
1. Check Vercel env vars: `STRIPE_PRICE_CONSULT_ED`, `STRIPE_PRICE_CONSULT_HAIR_LOSS`, `STRIPE_PRICE_CONSULT_WOMENS_HEALTH`, `STRIPE_PRICE_CONSULT_WEIGHT_LOSS`
2. Run: `pnpm test lib/__tests__/consult-subtype-pricing.test.ts`
3. Check mapping in `lib/stripe/price-mapping.ts` -> `getConsultPriceId()`

> **Note:** Consult subtype prices (`STRIPE_PRICE_CONSULT_ED`, `STRIPE_PRICE_CONSULT_HAIR_LOSS`, `STRIPE_PRICE_CONSULT_WOMENS_HEALTH`, `STRIPE_PRICE_CONSULT_WEIGHT_LOSS`) are hard-validated in production by `lib/stripe/price-mapping.ts` — a missing env var causes a thrown error at checkout rather than a silent fallback to the generic consult price. This is intentional: mischarging a customer is worse than a 500. `lib/env.ts` also enforces these four vars at boot under `NODE_ENV=production`, so this is a belt-and-braces check.

**Client-Side React Error:**
1. Open browser DevTools Console
2. Search Sentry: `environment:production is:unresolved`
3. Check error boundary (should show fallback UI). Look for hydration mismatch errors.

**Server Action Fails:**
1. Check Vercel Functions logs for the route
2. Search Sentry for `source:server_action`
3. Correlate via `x-request-id` across Vercel logs and Sentry breadcrumbs

### Log Correlation

To trace a request end-to-end:

1. Get `x-request-id` from: Browser Network tab response headers, Sentry breadcrumbs, or Vercel logs
2. Search Vercel logs for that ID
3. Search Sentry breadcrumbs for that ID
4. Check PostHog session for that timestamp

Available correlation IDs:

| ID Type | Format | Where It Appears |
|---------|--------|-----------------|
| `correlation_id` | `{timestamp36}-{uuid8}` | HTTP header `x-correlation-id`, Stripe webhook |
| `request_id` | UUID v4 | HTTP header `x-request-id` |
| `intake_id` | UUID | DB primary key, Stripe metadata, Sentry extra |
| `session_id` | Stripe session ID | URL param, Stripe metadata |

### Diagnosing Payment Failures

**Scenario:** Patient reports "Checkout failed" or "Payment didn't go through."

| Step | Action | What to Look For |
|------|--------|-----------------|
| 1. Get intake ID | Ask patient for email or check support ticket | |
| 2. Check Sentry (2 min) | Search `tags[checkout_error]:true` or paste intake ID | Tags: `consult_subtype`, `stripe_error_code`, `price_id` |
| 3. Check Vercel Logs (2 min) | Deployments > Functions > filter `/api/checkout` or `/api/stripe` | `[ERROR]` lines, `x-request-id`, status 500/400 |
| 4. Check Stripe (3 min) | Developers > Events > filter `checkout.session.*` by email/time | Session status, payment intent, webhook delivery |
| 5. Check Database | Run SQL below by patient email | Intake status vs payment status |

```sql
SELECT i.id, i.status, i.payment_status, i.stripe_session_id, i.created_at
FROM intakes i JOIN profiles p ON i.patient_id = p.id
WHERE p.email = 'patient@example.com'
ORDER BY i.created_at DESC LIMIT 5;
```

**Common Resolution Paths:**

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Sentry shows `No such price` | Wrong Stripe price ID in env | Update env var, redeploy |
| Stripe session `complete` but intake `pending_payment` | Webhook failed | Resend webhook from Stripe dashboard |
| 500 on `/api/stripe/webhook` | Webhook signature invalid | Check `STRIPE_WEBHOOK_SECRET` matches Stripe |
| No Sentry error, no Stripe event | Checkout never initiated | Check client-side console/network |
| Intake `paid` but patient says "failed" | Redirect issue | Check success/cancel URL configuration |

---

## Sentry Configuration

### Recommended Alerts

| Alert | Filter | Threshold | Action |
|-------|--------|-----------|--------|
| **Checkout Errors** (Critical) | `tags[checkout_error]:true` | > 0 events in 5 min | Sentry email (immediate) |
| **Consult Subtype Errors** | `tags[consult_subtype]:* AND level:error` | > 5 events in 1 hour | Sentry email |
| **Server Action Failures** | `tags[source]:server_action AND level:error` | > 10 events in 15 min | Sentry email |
| **API 5xx Spike** | `tags[source]:api_5xx` | > 5 events in 5 min | Sentry email (immediate) |

### Key Sentry Tags

| Tag | Values | Purpose |
|-----|--------|---------|
| `service_type` | `consult`, `med-cert`, `prescription` | Request service type |
| `consult_subtype` | Active: `ed`, `hair_loss`, `womens_health`; gated future: `weight_loss` | Consult category |
| `step_id` | `checkout`, `consult_reason`, `review` | Current flow step |
| `intake_id` | UUID | Intake identifier |
| `checkout_error` | `true` | Checkout failure marker |
| `stripe_error_code` | `resource_missing`, `invalid_request_error` | Stripe error code |
| `price_id` | `price_...` | Stripe price ID used |

### Environment Detection

```
PLAYWRIGHT=1     -> "e2e"
VERCEL_ENV       -> "production" | "preview" | "development"
NODE_ENV         -> fallback
```

### Sampling Configuration

| Environment | Server Traces | Client Traces | Replay | Error Replay |
|-------------|--------------|---------------|--------|--------------|
| Production | 0.5 | 0.1 | 0.01 | 0.5 |
| Preview | 1.0 | 1.0 | 0.1 | 1.0 |
| E2E | 1.0 | 1.0 | N/A | N/A |

Critical paths (Stripe, approvals, prescriptions) are always sampled at 1.0.

---

## Build & Deployment Cost

Vercel billing is dominated by **Build CPU Minutes**, not runtime compute. Two config-only levers keep it down; each reverts in one line.

**1. Previews are skipped on non-production branches, and docs/test-only `main` commits are skipped too.** `vercel.json` sets `"ignoreCommand": "bash scripts/vercel-ignore-build.sh"`. The script builds when `VERCEL_GIT_COMMIT_REF` is `main` **and** the commit changes a runtime path; it skips (a) every non-`main` branch (a feature/PR push no longer burns a full preview build — previews were ~half of all builds), and (b) `main` commits that touch only non-runtime paths (`*.md`, `docs/`, `e2e/`, `**/__tests__/`, `*.test.*`/`*.spec.*`, `.github/`) — these were ~26% of `main` builds (73/284 in 30d) and change nothing the server runs, so the edit just ships with the next runtime deploy. Runtime paths (`app`/`components`/`lib`-non-test/`public`/`scripts`/`supabase`/`package.json`/lockfile) always build, and the gate **fails safe** (builds) if the diff can't be computed (shallow clone / root commit). Safe because the required CI gate `build` (`.github/workflows/ci.yml`: lint + typecheck + unit tests + Playwright E2E + Lighthouse, all against **localhost**) validates every PR and does **not** consume a Vercel preview URL; branch protection on `main` requires only the `build` check.
- **Force a build for one commit:** `[deploy]` in the latest commit message builds a `main` commit that would otherwise be skipped as non-runtime; `[preview]` builds a preview for a non-`main` branch (and Vercel's `deployment_status` re-fires the preview-only `e2e-preview.yml` smoke against the live URL).
- **Revert:** delete the `ignoreCommand` line from `vercel.json` (the script goes inert).

**2. Lint + type-check are not re-run inside `next build`.** `next.config.mjs` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`. CI (`pnpm lint` + `pnpm typecheck`) and `pnpm ci` already gate every merge, so re-running them inside the Vercel build was duplicated Build CPU Minutes — measured at **48.9s of a 186s production build**; local `pnpm build` dropped 88s → 67s.
- **Caveat:** a direct `git push origin main` that bypasses CI (owner has `enforce_admins: false`) would not get an in-build type/lint check. Keep shipping via PR so CI runs — the normal auto-merge flow.
- **Revert:** set both flags back to `false`.

**Build machine tier (dashboard only).** Production builds run on the **Enhanced** machine (more vCPUs ≈ 2× Build CPU Minutes/build). Builds are not patient-facing, so downgrading to **Standard** in Settings → Build & Deployment roughly halves billed CPU-minutes/build for a longer wall time — recommended for cost. Dashboard-only; not settable via `vercel.json`.

**Already optimal — do not "fix":** the pnpm/build cache restores on Vercel (build log: "Restored build cache from previous deployment"); Sentry source-map upload is token-gated to Vercel with `widenClientFileUpload: false` + `hideSourceMaps: true`. **Turbopack stays off** — hard-pinned, see CLAUDE.md Stack Pin Policy.

---

## Cron Jobs Reference

All crons use `verifyCronRequest()` from `lib/api/cron-auth.ts` for authentication.

Cron surface policy: every `app/api/cron/*/route.ts` must be scheduled in `vercel.json`, documented in this table, and operationally justified as one of: clinical queue safety, payment/intake recovery, delivery recovery, compliance retention, health monitoring, or explicit growth support. `scripts/check-vercel-cron-routes.mjs` fails both directions: scheduled jobs with no route and route files with no schedule. Dormant engagement jobs, duplicate post-care nudges, dashboard digests, and future subscription nudges stay deleted rather than paused in production.

| Job | Endpoint | Schedule | Purpose |
|-----|----------|----------|---------|
| Health Check | `/api/cron/health-check` | Every 5 min | Cron heartbeat watchdog only; queue delay, delivery failures, and business alerts stay owned by their dedicated jobs |
| Email Dispatcher | `/api/cron/email-dispatcher` | Every 5 min | Process pending/failed emails from `email_outbox` with atomic claiming; recovers stale `sending` claims and applies `DAILY_EMAIL_LIMIT` only to marketing/engagement sends |
| Release Stale Claims | `/api/cron/release-stale-claims` | Every 5 min | Release doctor intake claims that have gone stale to prevent queue stalls |
| Retry Drafts | `/api/cron/retry-drafts` | Every 5 min | Retry failed AI draft generation with exponential backoff |
| Business Alerts | `/api/cron/business-alerts` | Every 30 min | Aggregates business metrics: failed payments, no-purchase revenue safety, Google Ads purchase-import health, email failures, SLA breaches |
| Stale Queue | `/api/cron/stale-queue` | Hourly | Alerts on paid intakes waiting > 4h (warning) or > 8h (critical) |
| Abandoned Checkouts | `/api/cron/abandoned-checkouts` | Every 20 min (:00/:20/:40) | Payment-stage recovery for submitted intakes stuck at checkout; first nudge eligible after 20 min, follow-up 24h after first nudge |
| Partial Intake Recovery | `/api/cron/recover-partial-intakes` | Hourly (:15) | Pre-checkout draft recovery only; excludes review/checkout drafts so it does not overlap abandoned-checkout recovery |
| Cleanup Intake Drafts | `/api/cron/cleanup-intake-drafts` | Daily (4 AM UTC) | Delete stale saved intake drafts so anonymous draft storage does not grow unbounded |
| Refill Reminders | `/api/cron/refill-reminders` | Daily (11 PM UTC / 9 AM AEST) | One-off reactivation: nudges patients to reorder a repeatable script ~week 10-11 after issue (before a script + 2 repeats supply runs out; window in `lib/clinical/repeats-policy.ts`). Ships OFF; no-ops until `REFILL_REMINDER_EMAILS_ENABLED=true`. Marketing-consent gated per patient. NOT the retired subscription nudge — creates no order |
| Cert Reactivation | `/api/cron/cert-reactivation` | Daily (10 PM UTC / 8 AM AEST) | One reactivation nudge per past med-cert patient whose most recent certificate is 35-120 days old (`lib/email/cert-reactivation.ts`). Ships OFF; no-ops until `CERT_REACTIVATION_EMAILS_ENABLED=true`. Marketing-consent gated; `intakes.reactivation_email_sent_at` dedups; reorder link carries `utm_source=cert_reactivation`. NOT a subscription — creates no order. Pre-flight: `?testEmail=you@x.com` |
| Emergency Flags | `/api/cron/emergency-flags` | Hourly | Sentry-logs red-flag abandoned intakes for clinical monitoring. Does NOT send outbound SMS/email (the route is logging-only; corrected 2026-06-11). |
| Telegram Notifications | `/api/cron/telegram-notifications` | Every 5 min | Retry missed paid-request Telegram notifications when webhook-time sends fail |
| AHPRA Re-verification | `/api/cron/ahpra-reverification` | Daily (6 AM AEST) | Flag overdue AHPRA verifications; disable approval for 30+ days overdue |
| Daily Reconciliation | `/api/cron/daily-reconciliation` | Daily (7 AM AEST) | Identify mismatches: paid without delivery, failed refunds, failed deliveries |
| Parchment Smoke | `/api/cron/parchment-smoke` | Daily (7:30 AM AEST) | Validate production Parchment token and organisation access without creating a patient or prescription; heartbeat appears in `/admin/ops/parchment` |
| PostHog Reconciliation | `/api/cron/posthog-reconciliation` | Hourly (:15) | Compare last 24h `intakes.payment_status='paid'` count (Supabase) vs `purchase_completed_server` event count (PostHog, `is_e2e=false`). Sentry alerts on >10% drift; "critical" past 30%. Requires `POSTHOG_PROJECT_API_KEY` (PostHog personal API key with `query:read` scope) + `POSTHOG_PROJECT_ID` (numeric, `277439`). Noops with `skipped: true` if either is missing. |
| Google Ads Conversions | `/api/cron/google-ads-conversions` | Hourly (:45) | Backfill paid conversion uploads from Supabase truth using captured click IDs and/or hashed first-party identifiers; skips when the configured offline conversion action preflight is a hard error |
| Google Ads Diagnostics Watch | `/api/cron/google-ads-diagnostics-watch` | Hourly (:50) | Watches the recovery upload job after its processing window; compares Google Ads offline diagnostics against production audit reconciliation and fails loudly if the job stays invisible, rejected, pending, or accepted while primary purchase conversions remain zero |
| DLQ Monitor | `/api/cron/dlq-monitor` | Daily (9 AM UTC) | Alert on unprocessed Stripe webhook dead letter queue items > 24h old |
| QA Sampling | `/api/cron/qa-sampling` | Weekly (Mon 6 AM UTC) | Sample 10% of approved intakes from last week for quality review |
| Data Retention | `/api/cron/data-retention` | Daily (2 AM UTC) | Enforce AU health records retention (see CLINICAL.md → Data Retention Schedule); clean rate limit records |
| Review Request | `/api/cron/review-request` | Daily (10 AM UTC) | Explicit growth-support job for opted-in review request emails after completed care |
| Review Request Backfill | `/api/cron/review-request-backfill` | Monthly (1st, 3 AM UTC) | Explicit growth-support catch-up for satisfied patients (approved/completed) who never got a review email — those outside the daily cron's 48–72h window. Scheduled run is **dry-run only** (logs the eligible-straggler count as a monitor); the real send is a manual `?dryRun=false` trigger (CRON_SECRET-gated). Reuses the consent-gated, `review_email_sent_at`-deduped send path |
| Retry Auto-Approval | `/api/cron/retry-auto-approval` | Every 3 min | Retry auto-approval via `auto_approval_state` enum (pending/failed_retrying). Includes timeout recovery for stale `attempting` intakes (>10 min). Feature-flagged. |
| Cleanup Orphaned Storage | `/api/cron/cleanup-orphaned-storage` | Weekly (Sun 3 AM UTC) | Delete storage files with no DB record after 7-day grace period (max 50/run) |
| Outbox Archival | `/api/cron/outbox-archival` | Daily (4 AM UTC) | Delete delivered emails >90 days old and exhausted-failed emails >180 days old from `email_outbox` (batch 500) |

**Priority review analytics rename:** From 2026-06-25, patient checkout UI emits `priority_review_opted_in` / `priority_review_opted_out`. To protect existing saved PostHog insights, it also dual-emits the legacy `express_review_opted_in` / `express_review_opted_out` aliases with `legacy_alias_for` through 2026-08-31. New dashboards should use the `priority_review_*` events; delete the aliases only after saved insights are migrated.

**Timezone note:** All cron schedules in `vercel.json` are UTC. "AEST" times above are UTC+10 (standard time). During AEDT (daylight saving, Oct–Apr), these shift 1 hour later in local time (e.g., "6 AM AEST" runs at 7 AM AEDT).

---

## Search Indexing Triage

Use the read-only Google Search Console audit before changing SEO/content code:

```bash
pnpm seo:gsc-index-audit -- --inspect-limit=20
```

This command requires Google application-default credentials with access to the `instantmed.com.au` Search Console property. It uses URL Inspection/Search Analytics data only; it does not submit pages for indexing.

Operational rules:

- Treat `_next/static`, font, CSS/JS, favicon, manifest, auth/account, Clerk, and redirect-only alias rows as expected noise unless they expose a broken canonical redirect.
- For Google issues, verify live canonicals, robots, sitemap inclusion, and last crawl before changing content. IndexNow only supports Bing/Yandex discovery and does not repair Google indexing.
- `/api/indexnow` is a manual/on-demand endpoint only when `INDEXNOW_SECRET` is deliberately configured. It is not scheduled as a production cron because it is not required for clinical operations, payment recovery, or compliance.
- Add content depth only to public canonical pages that should rank and convert. Do not create duplicate route trees for redirect aliases.
- For selected priority URLs, use Search Console inspection/request indexing manually after deploy and recrawl validation. Do not use Google's Indexing API for ordinary website pages; Google Search Central scopes it to `JobPosting` and livestream `BroadcastEvent` pages.

---

## Production Launch Checklist

### Current release gate (updated 2026-06-12)

Before treating a production deploy or paid-traffic ramp as clean:

1. `pnpm release:check` must pass. This includes Node/runtime pins, stack pins, route/cron/orphan checks, strict integration checks via `CHECK_INTEGRATIONS_STRICT=1 pnpm check:integrations`, lint, typecheck, tests, production build, and bundle budget.
2. GitHub CI `build`, Vercel production deployment status, and the post-deploy smoke workflow must be green.
3. `Video review (auto)` must be interpreted by failure mode. A failure caused only by committing `docs/reviews/*` directly to protected `main` is deployment-process noise, not app-health evidence; fix the workflow to upload an artifact or open a PR before using "all checks green" as a release signal. A failure from capture, console errors, checkout friction, or low review score is a product-quality blocker.
4. Google Ads stays blocked until production-scoped runtime proof shows `GOOGLE_ADS_CONVERSION_ACTION_PURCHASE` is an enabled offline click-import `UPLOAD_CLICKS` purchase action and purchase imports/diagnostics agree with Supabase/PostHog/Stripe truth.
5. Parchment-backed paid traffic stays blocked until daily production Parchment smoke is green and every prescribing-capable doctor has a production `parchment_user_id`.

### Supabase

1. Enable **Leaked Password Protection**: Authentication > Providers > Email (HaveIBeenPwned)
2. Review **Auth Rate Limits**: use percentage-based connection strategy

### Stripe

1. Verify all `STRIPE_PRICE_*` env vars match production (`price_live_*` not `price_test_*`)
2. Create webhook endpoint `https://<domain>/api/stripe/webhook` subscribing to `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `payment_intent.payment_failed`, `charge.refunded`, and `charge.dispute.created`. Do not enable invoice or `customer.subscription.*` events while the one-off model is active; those runtime handlers are retired.
3. Test purchase end-to-end; verify webhook delivery

### Email

1. Verify sending domain in Resend; update `RESEND_FROM_EMAIL`
2. Configure the Supabase Auth > Hooks > Send Email hook to `https://<domain>/api/webhooks/supabase-auth`; set `SUPABASE_AUTH_WEBHOOK_HOOK_SECRET` in Vercel so magic link, signup, and recovery emails use the branded React Email template instead of Supabase defaults
3. Test each email type; check spam behavior

### Vercel Env Vars

**Required:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SUPABASE_AUTH_WEBHOOK_HOOK_SECRET`, `INTERNAL_API_SECRET`

**Recommended:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`

### Database Migrations

```bash
supabase db push --project-ref [SUPABASE_PROJECT_REF]
```

### Monitoring

1. Verify `SENTRY_DSN` set in production
2. Uptime monitor on `/`, `/api/health`
3. Stripe webhook failure alerts configured
4. `/admin/ops` integrity strip has no unexplained critical cards (review SLA backlog, cert+refund orphans, refund-record anomalies)
5. Automated video review either succeeds or its failure is classified in the deploy notes

### Post-Launch Verification

- [ ] Full user flow: sign up -> request -> payment -> delivery
- [ ] Doctor dashboard access works
- [ ] Sentry receiving events; Stripe payments succeeding; emails delivering
- [ ] Post-deploy smoke workflow green
- [ ] Google Ads purchase preflight green before any paid ramp
- [ ] Parchment smoke and linked-prescriber checks green before any prescribing-service paid ramp

### Rollback Runbook

**Decision tree (5 min triage):**

```
Production alert fires
        |
        v
Is the issue in code, DB, or config?
        |
   +----+----+----------+
   |         |          |
  code      DB        config
   |         |          |
   v         v          v
FULL      MIGRATION   VERCEL ENV
ROLLBACK  ROLLBACK    ROLLBACK
```

**Severity classes:**
- **P0** (PHI leak, payment corruption, auth bypass) → rollback immediately, investigate after
- **P1** (broken flow for > 10% of users, Stripe webhook DLQ > 10 events) → rollback if fix not ready in 15 min
- **P2** (degraded UX, non-critical feature broken) → fix forward, no rollback

---

#### 1. Code rollback (full Vercel deployment revert)

**When:** a recent deploy introduced a regression.

**Steps:**

1. **Identify the last known-good deployment** — Vercel Dashboard → instantmed → Deployments → find the deployment tagged READY with a commit SHA *before* the bad one. Note its deployment URL.
2. **Promote it** — click the three-dot menu on that deployment → **"Promote to Production"**. This takes ~10 seconds and switches the production alias (`instantmed.com.au`) back to the old build. No rebuild required.
3. **Verify** — curl `https://instantmed.com.au/api/health` returns 200 within 30 seconds of promotion. Check Sentry error rate drops within 2 minutes.
4. **Revert the bad commit on main** — so the next deploy doesn't reintroduce it:
   ```bash
   git revert <bad-commit-sha>
   git push origin main
   ```
   This triggers a new deploy with the revert — verify it goes green in Vercel and CI before closing the incident.
5. **Post-incident** — create a Sentry issue note with the bad commit SHA, the symptom, and the rollback time.

**Common gotchas:**
- Vercel promote is atomic and idempotent. You cannot "half-rollback."
- If the bad deploy changed env vars (via `vercel env add`), the rollback does NOT revert those. Check Vercel env vars against git history.
- Supabase Auth sessions are cookie-based. If the issue was middleware auth, users may need to re-authenticate.

---

#### 2. Database migration rollback

**When:** a migration broke RLS, corrupted data, or locked a table.

**Reversibility matrix** (check before applying any migration to prod):

| Migration type | Reversible? | Rollback path |
|---|---|---|
| `CREATE TABLE` | ✅ Yes | `DROP TABLE` |
| `ADD COLUMN` (nullable) | ✅ Yes | `DROP COLUMN` |
| `ADD COLUMN NOT NULL` (no default) | ⚠️ If you have the data | Requires backfill on rollback |
| `CREATE INDEX` | ✅ Yes | `DROP INDEX` |
| `CREATE POLICY` | ✅ Yes | `DROP POLICY` |
| `ALTER POLICY` | ✅ Yes (if you saved the original) | `DROP` + recreate with saved definition |
| `DROP TABLE` | ❌ **NO** | Restore from PITR backup |
| `DROP COLUMN` | ❌ **NO** | Restore from PITR backup |
| `UPDATE` (data migration) | ⚠️ Depends | Restore from PITR backup if no snapshot |
| `GRANT` / `REVOKE` | ✅ Yes | Inverse statement |

**Steps:**

1. **Stop writes immediately** — if the issue is data corruption, set `DISABLE_INTAKE_EVENTS=true` in Vercel env to halt new intake creation while you investigate. This is a kill switch — see "Kill Switches" section.
2. **Assess reversibility** — use the matrix above. If it's a `DROP` on a non-empty table, skip to step 5 (PITR restore).
3. **Write the rollback migration** — in a NEW migration file named `<timestamp>_rollback_<original_name>.sql`. Never edit or delete the original migration — it's part of history.
4. **Apply via Supabase MCP or CLI** — `mcp__supabase__apply_migration` or `supabase db push`. Verify with `mcp__supabase__get_advisors` that no new security lints appeared.
5. **PITR restore** (only if irreversible) — Supabase Dashboard → Project → Database → Backups → select a point-in-time **before** the bad migration. This causes ~5 minutes of downtime. Coordinate with users via status page.
6. **Fix forward** — write a corrected migration and re-apply.

**Our recent example:** migration `20260408000001_lock_down_intake_drafts_and_safety_audit.sql` is fully reversible because every statement is `DROP POLICY IF EXISTS` + `CREATE POLICY` + `REVOKE`. To roll back: write a new migration that `DROP`s the new policies and recreates the old permissive ones.

---

#### 3. Stripe webhook DLQ replay

**When:** webhooks failed during the incident window and events need to be reprocessed.

**How it works:** every failed Stripe webhook event lands in `stripe_webhook_dead_letter` with the full event payload. The admin panel at `/admin/webhook-dlq` lists entries.

**Steps:**

1. **Check DLQ depth** — Vercel deploy logs or `/admin/webhook-dlq` shows count. Sentry alerts fire at > 5 unprocessed events.
2. **Investigate root cause** — click an entry, read the error. Common causes: signature verification failed (env var wrong), downstream DB error (migration issue), handler bug.
3. **Fix the root cause** — don't replay until the underlying issue is resolved. Otherwise the replay just re-fails and doubles the queue.
4. **Replay individually** — for each entry in DLQ, click "Retry." This POSTs the original payload back to `/api/stripe/webhook` with the original signature (re-verified idempotently via `tryClaimEvent`).
5. **Bulk replay** — for > 10 entries, use the admin "Retry all" button. This processes sequentially with rate limiting to avoid overwhelming the downstream.
6. **Verify** — DLQ depth returns to 0, Sentry alert clears, and the affected intakes show the expected state transitions in `intake_events` log.

**Idempotency guarantee:** `tryClaimEvent` is a Supabase RPC that uses `INSERT ... ON CONFLICT` on `stripe_event_id`. A double-replay of the same event is a no-op.

---

#### 4. Auth session invalidation (auth incident)

**When:** the rollback was auth-related and you need to force every user to re-authenticate.

**Steps:**

1. Supabase Dashboard → Authentication → Sessions. Or run: `SELECT auth.sessions WHERE NOT is_revoked;`
2. To revoke all sessions: `UPDATE auth.sessions SET not_after = now() WHERE not_after > now();`
3. Users will be redirected to `/sign-in` on their next request. Post an in-app banner (via `feature_flags` table) if the incident window is > 5 minutes.
4. **This is irreversible** — users cannot "un-log-out" without signing back in. Only use for actual auth compromises.

---

#### 5. Patient account access support

**When:** a patient says they cannot sign in, forgot password does not arrive, or a test patient was created with a magic-link-only Supabase Auth user.

**Steps:**

1. **Check the user shape first** — Supabase Dashboard → Authentication → Users → search the email. If the user exists without a password provider, do not create a duplicate user or duplicate profile.
2. **Use the lowest-friction recovery path** — direct the patient to `/sign-in`, enter their email, and use **Email me a sign-in link**. This works for existing passwordless accounts without account duplication.
3. **If they want a password** — direct them to `/auth/forgot-password`. Recovery links must land on `/auth/callback?next=/auth/reset-password`; the reset page only updates the password after Supabase establishes the recovery session.
4. **Check auth email health** — `/admin/ops` → **Auth Email Failures (24h)**. A failed `magiclink` or `recovery` event points to Resend/API/config delivery failure, not bad patient input.
5. **If auth events are unavailable** — verify migration `20260504063000_auth_email_events.sql` has been applied and that the production hook has `SUPABASE_AUTH_WEBHOOK_HOOK_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` configured.
6. **Do not bypass the flow** — do not manually set a patient password, email raw Supabase action links, or link multiple profiles by email match. Fix the delivery/config issue, then let Supabase issue a fresh sign-in or recovery link.

**Escalate immediately** if `/admin/ops` shows any auth email failure after a deploy or if multiple patients report missing sign-in/recovery links within 15 minutes.

---

#### 6. Vercel env var rollback

**When:** a config change (env var edit/delete) broke production.

**Steps:**

1. Vercel Dashboard → instantmed → Settings → Environment Variables.
2. **Scroll the audit log** (top right of the env vars page, "Recent changes") to find the last change before the incident.
3. Restore the old value manually — Vercel does NOT automatically version env vars. You must remember the old value or recover from `.env.production` (if you pulled it recently) or from `git log` on `.env.local`.
4. Trigger a new deployment — env vars only take effect on new builds. Either push an empty commit (`git commit --allow-empty -m "chore: redeploy after env rollback"`) or click "Redeploy" on the latest deployment in Vercel.

**Prevention:** before editing any env var in production, pull the current value with `vercel env pull .env.production.backup` so you have a rollback copy.

---

#### 6. Comms template (P0/P1 only)

When rolling back affects users, post a status update within 10 minutes of the rollback completing.

**Status page (status.instantmed.com.au if configured):**
```
[INVESTIGATING] We're aware of an issue affecting [symptom]. Our team
is investigating and we'll post an update within 15 minutes.
```

**Email to affected users (if > 50 users impacted):**
```
Subject: InstantMed service update

Hi there,

Between [start time] and [end time] AEST today, some users experienced
[symptom]. We've resolved the issue and your account is back to
normal. If you started a request during that window and haven't
received your certificate or prescription, please reply to this email
and we'll check your status manually.

Apologies for the disruption,
The InstantMed team
```

Send via Resend transactional — do NOT use a marketing email template (compliance risk).

---

#### 7. Post-incident checklist

After every rollback, within 24 hours:

- [ ] Sentry issue created with root cause, timeline, and commit SHAs
- [ ] GitHub PR opened with the fix forward (if not already landed)
- [ ] Incident duration noted (start of symptom → full recovery)
- [ ] Number of affected users counted (via PostHog funnel drop-off comparison)
- [ ] PostHog annotation added at both boundaries
- [ ] CLAUDE.md or ARCHITECTURE.md updated if the incident revealed a documentation gap
- [ ] If PHI-adjacent: logged in `compliance_audit_log` with incident classification per SECURITY.md

---

## SLA Targets

**Admin page:** `/admin/ops/intakes-stuck` (requires `admin` via the admin shell)

| Condition | Threshold | Reason Code |
|-----------|-----------|-------------|
| Paid but not picked up | > 5 minutes in the admin stuck-intake viewer; stale-queue monitoring uses the patient delay threshold | `paid_no_review` |
| In review or pending info | > 60 minutes | `review_timeout` |
| Approved but no delivery email | > 10 minutes | `delivery_pending` |
| Approved but delivery email failed | Any | `delivery_failed` |

**Escalation:** The `stale-queue` cron monitors paid requests still waiting for review through PostHog and Sentry. Telegram is intentionally reserved for new paid request notifications only. Patient delay emails use `patient_delay_email_hours` (default 2h), and Sentry severity becomes critical when 5+ intakes breach that threshold.

**Kill switches:** `DISABLE_INTAKE_EVENTS=true` (disable event logging), `DISABLE_STUCK_INTAKE_SENTRY=true` (disable stuck intake Sentry warnings), `DISABLE_RECONCILIATION_SENTRY=true` (disable reconciliation mismatch Sentry warnings).

### Stuck Intake Resolution

| Reason | Cause | Resolution |
|--------|-------|------------|
| `paid_no_review` | No doctor picked up intake | Check doctor availability; assign/review manually |
| `review_timeout` | Doctor started but did not finish within 60 min | Contact doctor or reassign; check for blocking issues |
| `delivery_pending` | Approved but email not sent | Check `email_outbox` via `/admin/emails/hub?intake_id=...`; trigger manually |
| `delivery_failed` | Delivery email failed | Check `/admin/emails/hub?intake_id=...` for error; verify patient email; retry or contact patient |

### Useful SQL Queries

```sql
-- Current stuck intakes
SELECT * FROM v_stuck_intakes ORDER BY stuck_age_minutes DESC;

-- Count by reason
SELECT stuck_reason, COUNT(*) FROM v_stuck_intakes GROUP BY stuck_reason;

-- Recent events for an intake
SELECT * FROM intake_events WHERE intake_id = '<ID>' ORDER BY created_at DESC LIMIT 20;

-- Failed delivery emails
SELECT i.id, i.reference_number, i.status, eo.error_message
FROM intakes i JOIN email_outbox eo ON eo.intake_id = i.id
WHERE i.status = 'approved'
  AND eo.email_type IN ('request_approved', 'certificate_delivery')
  AND eo.status = 'failed';
```

---

## Service Level Objectives (SLOs)

> **What this section is:** the formal targets we commit to. Below these, we're "broken" and must respond. Above these, we're fine to ship. Every alert in the Monitoring Rules section exists to protect one of these SLOs.
>
> **Review cadence:** monthly. If an SLO is consistently green, tighten it. If consistently red, either invest in fixing the underlying issue or loosen it with a written justification.

### Web Performance SLOs (measured by real-user CrUX + Lighthouse CI)

| Metric | Target (p75) | Current | Source |
|---|---|---|---|
| First Contentful Paint (FCP) | ≤ 2.0s | 1.4s local / 3.4s prod | `WebVitalsReporter`, PSI |
| Largest Contentful Paint (LCP) | ≤ 2.5s | 5.2s prod conversion pages | `WebVitalsReporter`, PSI |
| Cumulative Layout Shift (CLS) | ≤ 0.1 | 0.003 | `WebVitalsReporter` |
| Total Blocking Time (TBT) | ≤ 200ms | PR CI noisy; production gate remains ≤ 300ms | Lighthouse CI |
| Interaction to Next Paint (INP) | ≤ 200ms | TBD (needs dashboard) | `WebVitalsReporter` |

**CI gate:** PR LHCI blocks on FCP ≤ 3s, CLS ≤ 0.1, accessibility ≥ 0.9, and SEO ≥ 0.9. LCP and TBT are warning-only in the general PR Lighthouse config because simulated throttling on GitHub runners has produced 600ms-1s TBT outliers and 7s+ LCP on untouched marketing pages. The dedicated mobile `/request` Lighthouse gate hard-gates stable paid-intake metrics (FCP ≤2s, TBT ≤300ms, CLS ≤0.05) while keeping composite performance score and simulated LCP warning-only.

**Bundle-size gate:** shared first-load JS ≤ 160 KB (current: 129 KB). Enforced by `scripts/check-bundle-size.sh` after every release build.

**Build-time budget:** release builds run through `scripts/build-release.sh`, which captures Next output for the bundle gate and warns above 180s. The budget is warning-only because GitHub runner CPU variance can move build time materially; repeated warnings should trigger a focused route-count/static-generation pass, not a framework upgrade.

**Monthly stack health:** `.github/workflows/stack-drift.yml` runs on the first day of each month and checks active Node 24, framework pins, lockfile dedupe, high-severity audit status, and an outdated-package report. Outdated framework packages are not automatic upgrade instructions; use the Stack Pin Policy first.

### Reliability SLOs

| SLO | Target | Window | Error Budget |
|---|---|---|---|
| Crash-free user sessions | ≥ 99.5% | 30-day rolling | 0.5% = ~3.6 hours/mo of sessions may crash |
| Server 5xx rate | < 0.5% | 7-day rolling | Violation → page |
| Payment-intent success (after card accepted) | ≥ 99.9% | 30-day rolling | Any webhook-failure stack → page |
| Intake submit → certificate delivered (medcert) | ≥ 99% | 7-day rolling | Failures must be refunded within 24h |
| Email delivery success (non-bounce) | ≥ 98% | 7-day rolling | Bounce spike → investigate provider |

### Clinical-Safety SLOs (non-negotiable)

| SLO | Target | Reason |
|---|---|---|
| Controlled-substance requests blocked at submit | 100% | Clinical safety — Schedule 8 cannot be prescribed via this channel |
| Missing safety-critical answers blocked before payment | 100% | Patients must not reach Stripe with incomplete emergency/eligibility screening |
| PHI leaks to Sentry/PostHog (detected in breadcrumbs/replays) | 0 | Privacy Act 1988 APP 11 obligation |
| Doctor action audit-log completeness | 100% | AHPRA audit trail requirement |

Violations of any clinical-safety SLO are P0 incidents regardless of frequency.
Recent checkout safety stops are visible in `/admin/ops` from sanitized `safety_audit_log` rows. The log stores outcome metadata and answer keys only, not the full clinical answers payload.

### Response Expectations

| Severity | Response time | Escalation |
|---|---|---|
| P0 (PHI leak, payment broken, clinical-safety breach) | 15 min | Phone + Telegram + Sentry |
| P1 (SLO breach sustained 30 min) | 1 hour | Telegram + Sentry email |
| P2 (SLO warning / non-breaching anomaly) | Next business day | Sentry email |
| P3 (informational, trend) | Weekly review | Dashboard only |

### How SLOs are measured

- **RUM**: `WebVitalsReporter` in `app/layout.tsx` fires `web_vital` events to PostHog. Build a PostHog Insight grouping by `$pathname` + `device_type` for p50/p75/p95.
- **CI-Lab**: `@lhci/cli` on every push to `main` + every PR. Results retained 14 days as GH artifact.
- **Synthetic**: GitHub Actions runs `e2e/prod-request-flow-synthetic.spec.ts` against `https://instantmed.com.au` every 5 minutes. It clicks the med-cert certificate type, duration, and start-date controls and smoke-checks repeat script, prescription, ED, and hair-loss request paths.
- **Error tracking**: Sentry captures + custom tags (see `lib/observability/sentry.ts`).

---

## Monitoring Rules

### Golden Signals & Thresholds

| Category | Signal | Threshold | Source |
|----------|--------|-----------|--------|
| Latency | Checkout P95 | < 5s | `lib/stripe/checkout.ts` |
| Latency | Doctor Review P95 (paid to approved) | < 60 min | `lib/monitoring/queue-health.ts` |
| Latency | Email Delivery P95 | < 30s | `lib/monitoring/delivery-tracking.ts` |
| Error | Payment failure rate | > 5% | Stripe webhook |
| Error | No purchases despite demand | 24h warning / 48h critical when reportable saved intakes or active drafts exist | `/api/cron/business-alerts` |
| Error | AI draft failure rate | > 10% | `document_drafts.status = failed` + Sentry tag `source:ai_draft` |
| Error | Email bounce rate | > 5% | `lib/monitoring/delivery-tracking.ts` |
| Error | 5xx rate | > 1% | `lib/observability/sentry.ts` |
| Error | Request step crash | Any event | Sentry tag `boundary:request-step` |
| Saturation | Doctor utilization | Queue > 5x active doctors | `lib/monitoring/doctor-activity.ts` |
| Saturation | DLQ depth | > 5 unresolved | `/api/cron/dlq-monitor` |
| Saturation | Retry queue depth | > 10 pending | `lib/email/retry-queue.ts` |

### Alert Routing

| Alert | Condition | Channel |
|-------|-----------|---------|
| SLA Warning | Intake waiting > 4h | Sentry warning |
| SLA Critical | Intake waiting > 8h | Sentry critical + Resend email to support@ |
| Queue Critical | > 50 pending intakes | Sentry (email alert) |
| AI Down | Failure rate > 25% | Sentry (email alert) |
| Payment DLQ | > 5 items | Sentry (email alert) |
| Email Bounce Spike | Bounce rate > 5% | Sentry (email alert) |
| Business Alerts | Failed payments, no-purchase revenue safety, SLA breaches | Telegram (`lib/notifications/telegram.ts`) |
| Payment Notifications | Successful checkout | Telegram (real-time) |
| Request Flow Synthetic | Any production request-path render/click failure | GitHub Actions failure |
| Staff Role Gate | More than one auth-linked human admin, owner-admin missing doctor identity, or doctor missing required prescribing/certificate identity | `pnpm check:staff-roles` release failure |

**Telegram alerts** require `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` env vars. If missing, alerts are silently skipped. Used by `business-alerts` cron and payment webhook.

### Health Endpoints

| Endpoint | Checks | Response |
|----------|--------|----------|
| `/api/health` | Database, Redis, Stripe, env vars | `{ status: "healthy"|"degraded", checks, totalLatencyMs }` |
| `/api/cron/health-check` | Critical cron heartbeats | Sentry capture when essential scheduled jobs are overdue |

### Release-time Ops Checks

| Command | Purpose | Notes |
|---------|---------|-------|
| `pnpm check:staff-roles` | Read-only Supabase check for the one-human-admin model and doctor readiness | Defaults owner admin to `me@reabal.ai`; override with `OWNER_ADMIN_EMAIL`. Set `ALLOW_OWNER_ADMIN_PAUSED=1` only when releasing intentionally paused. |
| `DEMOTE_ADMIN_EMAILS='old-admin@example.com' DEMOTE_ADMIN_ROLE=patient pnpm fix:staff-roles` | Dry-run demotion for extra human admin profiles | Add `-- --apply` only after reviewing the target list. Writes go through `admin_change_profile_role`, which refuses to remove the last auth-linked human admin and resets clinical capability flags on demotion. |
| `pnpm check:sentry` | Verifies `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` can read the configured Sentry project | Does not print the token. 401 means rotate the token; 404 usually means wrong org/project slug. |

### Sentry Saved Searches

| Search | Query |
|--------|-------|
| Production Errors | `environment:production level:error` |
| Payment Issues | `source:webhook OR tags[alert_type]:stripe*` |
| Request Step Crashes | `boundary:request-step route:/request` |
| SLA Breaches | `tags[alert_type]:sla_breach OR tags[alert_type]:sla_warning` |
| AI Degradation | `tags[alert_type]:ai_degradation` |
| Email Failures | `tags[alert_type]:email_bounce` |

### Known Observability Gaps

All previously identified gaps have been resolved:

| Priority | Gap | Status |
|----------|-----|--------|
| ~~HIGH~~ | ~~Crons lack Sentry error capture~~ | ✅ Scheduled crons have Sentry capture or route-level failure reporting |
| ~~HIGH~~ | ~~`intake_id` not in Sentry tags~~ | ✅ In tags via `captureApiError`, `captureServerError`, `captureCheckoutError` |
| ~~HIGH~~ | ~~No checkout latency tracking~~ | ✅ Latency tracked with >5s threshold alert in `lib/stripe/checkout.ts` |
| ~~MEDIUM~~ | ~~Email send failures not in Sentry~~ | ✅ Captured in `lib/email/send-email.ts` (lines 376, 541, 585) |
| ~~MEDIUM~~ | ~~`service_type` not in Sentry tags~~ | ✅ In tags via `captureApiError`, `captureServerError`, `captureCheckoutError` |

---

## Environment Variables

Required env vars validated at startup via Zod in `lib/env.ts`:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, active one-off `STRIPE_PRICE_*` IDs, and `STRIPE_PRICE_PRIORITY_FEE`. Repeat Rx subscription acquisition is inactive and has no production price env requirement.
- **Email**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`
- **Security**: `PHI_MASTER_KEY`, `ENCRYPTION_KEY`, `PHI_ENCRYPTION_ENABLED`, `INTERNAL_API_SECRET`
- **Redis**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **AI**: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `VERCEL_AI_GATEWAY_API_KEY`
- **Cron**: `CRON_SECRET`
- **Monitoring**: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- **Analytics**: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- **Google Ads purchase uploads**: `GOOGLE_ADS_CUSTOMER_ID`, `GOOGLE_ADS_DEVELOPER_TOKEN`, `GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`, `GOOGLE_ADS_CONVERSION_ACTION_PURCHASE` (must be an offline click-import `UPLOAD_CLICKS` action, not the browser purchase tag); optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`, `GOOGLE_ADS_QUOTA_PROJECT_ID`, `GOOGLE_ADS_API_VERSION`
- **Alerts**: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET` (optional)
- **Parchment**: `PARCHMENT_API_URL`, `PARCHMENT_PARTNER_ID`, `PARCHMENT_PARTNER_SECRET`, `PARCHMENT_ORGANIZATION_ID`, `PARCHMENT_ORGANIZATION_SECRET`, `PARCHMENT_WEBHOOK_SECRET` (all optional — required only when `parchment_embedded_prescribing` feature flag is enabled); optional `NEXT_PUBLIC_PARCHMENT_IFRAME_ALLOWED_HOSTS` override if the default iframe host allow-list needs to change
- **Parchment smoke test**: `PARCHMENT_SMOKE_USER_ID` (sandbox/linked prescriber user ID required for `pnpm smoke:parchment`)
- **Address search**: `ADDRESSFINDER_KEY` or existing `NEXT_PUBLIC_ADDRESSFINDER_KEY`, `ADDRESSFINDER_SECRET` (primary AU address provider), `GOOGLE_PLACES_API_KEY` (fallback + server-side geocoding). Prefer `ADDRESSFINDER_KEY` for new deployments because the key is only used server-side.
- **Other**: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `ADMIN_EMAILS`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`

---

## Quick Ops Commands

> Dev commands (build, test, lint): see CLAUDE.md → Quick Start

```bash
vercel logs --follow               # Tail Vercel logs
stripe prices list --limit 5       # Verify Stripe prices
supabase db push --project-ref X   # Apply migrations
```

## Compliance Documents

| Document | Location | Purpose |
|----------|----------|---------|
| Google Ads Policy Audit | `docs/compliance/GOOGLE-ADS-AUDIT.md` | Ad policy checklist — certification requirements, code changes made, ongoing action items |

---

## Useful Links

### Support Channels

| Channel | Purpose |
|---------|---------|
| `support@instantmed.com.au` | Patient support (general) |
| `complaints@instantmed.com.au` | Formal complaints + data access/correction/deletion requests (14-day SLA, AHPRA escalation path) |
| `0450 722 549` | Phone support |

### Infrastructure Plans

| Service | Plan | Notes |
|---------|------|-------|
| Vercel | Pro | Hosting, edge, cron jobs |
| Supabase | Pro | Database, auth, storage, realtime |
| GitHub | Standard | Source control, GitHub Actions CI |

### Service Dashboards

Sentry: https://sentry.io | Vercel: https://vercel.com | Stripe: https://dashboard.stripe.com | PostHog: https://app.posthog.com | Supabase: https://supabase.com/dashboard | Resend: https://resend.com

---

## Backup & Disaster Recovery

### Database (Supabase PostgreSQL)

**Automatic backups:** Supabase Pro includes daily backups with 7-day retention. Point-in-Time Recovery (PITR) available via Supabase dashboard.

**Recovery steps:**
1. Go to Supabase Dashboard → Project → Database → Backups
2. Select the target restore point (daily snapshot or PITR timestamp)
3. Restore creates a new project — verify data before switching
4. Update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars
5. Redeploy the application

**Manual export (monthly recommended):**
```bash
# Export full schema + data
pg_dump "$DATABASE_URL" --format=custom --no-owner > backup-$(date +%Y%m%d).dump

# Restore to new database
pg_restore --no-owner --dbname="$NEW_DATABASE_URL" backup-YYYYMMDD.dump
```

### File Storage (Supabase Storage)

**Certificates and documents** are stored in Supabase Storage buckets:
- `certificates` — Patient certificates (signed PDFs)
- `documents` — Intake documents, uploads

**Recovery:** Supabase Storage is backed up alongside the database. For individual file recovery, use the Supabase Storage API or dashboard.

### Application Code

**Source of truth:** GitHub (`main` branch). All deployments are from git.

**Recovery:** Redeploy from Vercel dashboard or `git push` to trigger rebuild.

### Secret Rotation Procedures

| Secret | Rotation Process | Downtime |
|--------|-----------------|----------|
| `STRIPE_SECRET_KEY` | Generate new key in Stripe → update Vercel env → redeploy | Zero (old key valid for 24h) |
| `STRIPE_WEBHOOK_SECRET` | Roll endpoint secret in Stripe → update env → redeploy | Brief (webhooks fail until deployed) |
| `SUPABASE_SERVICE_ROLE_KEY` | Regenerate in Supabase dashboard → update env → redeploy | Brief |
| `RESEND_API_KEY` | Regenerate in Resend → update env → redeploy | Zero |
| `PHI_MASTER_KEY` | **CRITICAL:** Must re-encrypt all PHI fields. See SECURITY.md | Requires migration |
| `ENCRYPTION_KEY` | **CRITICAL:** Same as PHI_MASTER_KEY | Requires migration |
| `UPSTASH_REDIS_REST_TOKEN` | Regenerate in Upstash → update env → redeploy | Brief (rate limits fail open) |
| `CRON_SECRET` | Generate new value → update env → redeploy | Zero (crons use header auth) |
| `ANTHROPIC_API_KEY` | Regenerate in Anthropic console → update env → redeploy | Zero |
| `GEMINI_API_KEY` | Regenerate in Google AI Studio → update env → redeploy | Zero |

### Recovery Time Objectives

| Scenario | RTO | RPO | Notes |
|----------|-----|-----|-------|
| Vercel outage | 0 (CDN failover) | 0 | Static pages served from CDN edge |
| Supabase outage | 1-4h (PITR restore) | < 1h | Depends on PITR granularity |
| Stripe outage | 0 (kill switches) | 0 | DLQ captures failed webhooks for replay |
| Secret compromise | 15min (rotation) | 0 | Rotate immediately, redeploy |
| Full data loss | 4-8h | 24h | Restore from daily backup |
| Code regression | 5min (rollback) | 0 | Vercel instant rollback to previous deployment |

### Pre-Launch Drills — do each once, confirm muscle memory

> These are the "never the first time in production" drills. Schedule each **before** first paid customer.

#### Drill 1 — Code rollback (5 min)

1. Vercel dashboard → Project → Deployments
2. Pick the previous successful deployment (not current)
3. Click "Promote to production"
4. Confirm the promotion — Vercel CDN cuts over in 30–60s
5. Verify in an incognito window: `curl -sI https://instantmed.com.au/` → check `x-vercel-id` header changed
6. Promote current deployment back to restore

**Success criterion:** full cycle in under 3 minutes, no intake/checkout interruption.

#### Drill 2 — Database backup restore (60 min)

1. Supabase Dashboard → Project → Database → Backups → pick latest daily snapshot
2. Click "Restore" → chooses new project (Supabase forces a new project for restores)
3. In the new project SQL editor:
   ```sql
   -- Row counts — compare to prod
   SELECT 'intakes', count(*) FROM intakes
   UNION ALL SELECT 'profiles', count(*) FROM profiles
   UNION ALL SELECT 'intake_events', count(*) FROM intake_events;
   -- Sample intake should exist
   SELECT id, status, service_type, created_at FROM intakes ORDER BY created_at DESC LIMIT 5;
   ```
4. Verify an RLS policy still works:
   ```sql
   -- Should return zero rows when run as the `anon` role
   SET ROLE anon;
   SELECT id FROM intakes LIMIT 1;  -- must return 0 rows
   RESET ROLE;
   ```
5. Delete the restored project once verified — only the drill confirmation matters.

**Success criterion:** row counts match prod ±1%, RLS still enforced, no storage bucket URLs broken.

#### Drill 3 — Incident-response tabletop (60 min)

Walk through each scenario aloud. For each: who notices, what's the first action, what gets rolled back, what gets communicated to customers.

- **A.** Stripe webhook handler returns 500 for 20 minutes. Payments succeed, intakes never transition to `paid`.
- **B.** Supabase RLS policy change breaks patient dashboard (all patients see blank intake list).
- **C.** A single patient's medicare number appears in a Sentry breadcrumb.
- **D.** Doctor queue shows 0 items but `intakes` has 12 `paid` rows.
- **E.** A patient reports they never received their certificate email. Resend shows `delivered`.

**Success criterion:** for each scenario, you have (1) detection path, (2) mitigation, (3) communication draft, (4) post-incident root-cause action. Write what's missing into this doc immediately after the drill.

### Disaster Recovery Checklist

**If a secret is compromised:**
1. Rotate the compromised secret immediately (see table above)
2. Redeploy via Vercel dashboard
3. Check audit logs for unauthorized access in the exposure window
4. If PHI was potentially accessed: follow SECURITY.md breach protocol
5. Document the incident in the incident log

**If the database is corrupted:**
1. Stop all cron jobs (Vercel dashboard → Cron → Disable)
2. Enable maintenance mode (`maintenance_mode` feature flag)
3. Restore from PITR to the last known good state
4. Verify critical tables: `intakes`, `profiles`, `issued_certificates`, `email_outbox`
5. Re-enable cron jobs and disable maintenance mode
6. Reconcile any payments received during downtime via Stripe dashboard

**If a deployment breaks production:**
1. Vercel dashboard → Deployments → find last working deployment → Promote to Production
2. This takes effect in < 60 seconds
3. Investigate the broken deployment in a preview branch

---

## Daily Audit

> Copy-paste this into Claude Code. Run daily. Takes ~15-20 min.

---

You are performing a comprehensive daily audit of the InstantMed codebase and production environment. This is a Next.js 15.5 / React 18 / Supabase (DB + Auth) / Stripe v22 telehealth platform preparing for launch.

**Instructions:** Load `CLAUDE.md` first. Run every check below. Use subagents in parallel where checks are independent. Auto-fix safe mechanical issues (dead imports, unused variables, lint violations, type errors). For anything that changes logic, behavior, or public APIs — report it but do NOT fix it. Commit safe fixes in grouped commits (one per category).

---

### 1. Type Safety & Build Health

```
pnpm typecheck
pnpm lint
pnpm build
```

- Fix type errors, lint violations, build failures.
- Flag new `any` types, `@ts-ignore`, or `as unknown as` casts.
- Check `lib/env.ts` — any new env vars missing validation?

### 2. Dead Code & Redundancy

- Unused exports: functions, components, types, constants with zero import references.
- Duplicate logic: inline format functions, repeated Supabase queries, copy-pasted validation.
- Files >500 lines that should be split.
- Stale `revalidatePath()` calls pointing to non-existent routes.
- Orphaned test files whose source was deleted.

### 3. Security & Compliance

- Every `app/api/` route has auth (`requireApiRole`, `requireApiAuth`, or `getApiAuth`).
- Every `app/actions/` server action has auth (`requireRoleOrNull` or equivalent).
- No `console.log`/`console.error` — use `createLogger` from `@/lib/observability/logger`.
- No hardcoded secrets or API keys in source.
- No PHI fields returned to client components without encryption/masking.
- Rate limiting applied to all public-facing API routes.
- New `createServiceRoleClient()` usages bypass RLS — are they justified?

### 4. Clinical Logic

- Load `CLINICAL.md`.
- `lib/clinical/intake-validation.ts` still hard-blocks Schedule 8 substances.
- AI prompts in `lib/ai/` — temperature settings correct per ARCHITECTURE.md AI Configuration table?
- Consent flows intact (safety consent merged into review step, not standalone).

### 5. Database & Data Layer

- N+1 query patterns in `lib/data/` files.
- `.single()` where `.maybeSingle()` should be used (throws on missing rows).
- Unhandled Supabase errors (queries without error checking).
- All date operations use `Australia/Sydney` timezone.
- New migrations since last audit — flag for review.

### 6. Payment & Billing

- Stripe price IDs in `lib/stripe/price-mapping.ts` match CLAUDE.md pricing table.
- Webhook handlers have proper signature verification.
- Refund flow integrity — no partial refund edge cases.

### 7. Email & Notifications

- Resend email templates in `lib/email/` compile without errors.
- No emails contain PHI in subject lines.
- No fire-and-forget email sends without error handling.

### 8. Frontend Quality

- Load `DESIGN.md` (includes motion and animation specs).
- Design system violations: wrong card surfaces, prohibited colors, wrong fonts, glass on content.
- Dark mode works on new/changed components (`dark:` variants present).
- `useReducedMotion()` respected in all Framer Motion animations.
- Missing loading states (pages without `loading.tsx` or skeleton components).
- All forms use react-hook-form + Zod.

### 9. Test Coverage

```
pnpm test
```

- Fix failing tests.
- Flag critical paths (auth, payments, cert generation, clinical validation) below 40% coverage.
- Run `pnpm e2e:chromium` if `PLAYWRIGHT=1` available — report failures.

### 10. Production Health

Using Vercel MCP, PostHog MCP, and Sentry MCP:

- **Vercel:** Runtime logs last 24h — filter error/warning, categorize.
- **PostHog:** Error tracking issues last 24h. Key funnel anomalies (intake → checkout → approval).
- **Sentry:** Unresolved issues by frequency. Flag new issues since last audit.
- **Cron jobs:** health-check heartbeat watchdog, retry-auto-approval, stale-queue, and dispatcher jobs — check for errors.

### 11. Whitelabel Readiness

- Hardcoded "InstantMed" references outside `lib/constants.ts` and `CLAUDE.md`.
- Hardcoded ABN, addresses, phone numbers, emails outside constants.
- Doctor-specific names or details on marketing pages.

---

### Output Format

```
# Daily Audit Report — [DATE]

## Fixed (auto-applied)
- [ ] Category: what was fixed (files changed)

## Needs Attention
### Critical (blocks launch or breaks prod)
- Finding, file, line, severity, recommendation

### Important (fix this week)
- Finding, file, line, severity, recommendation

### Minor (tech debt)
- Finding, file, line, severity, recommendation

## Production Health
- Vercel: X errors in last 24h
- PostHog: funnel status, anomalies
- Sentry: X unresolved issues (top 3)
- Cron: status of each job

## Stats
- Type errors: X → Y
- Lint violations: X → Y
- Test results: X passed, Y failed
- Coverage: X%
- Dead code removed: X lines
```


---

## Integration Invariants + Operator Runbook Queries (added 2026-05-23 evening)

Queries the operator should run weekly. As of 2026-05-29, Q1/Q2/Q4 also render live on `/admin/ops` (the "Integrity (weekly invariants)" strip); Q3 stays a manual config check. Future work: convert each to a cron + Sentry alert. The seeded-E2E patient filter in the SQL below uses `e2e00000-0000-0000-0000-000000000002` to match `SEEDED_E2E_PATIENT_PROFILE_ID` (the app filter); the prior `0000...0001` literal matched no real row.

### Q1 — Queue P95 by category/subtype (90d)

Detects category-level breaches of the 24h max review SLA. Per `docs/REVENUE_MODEL.md` §5 the target is "median below 30 minutes, P95 below 2 hours during operating hours." 2026-05-23 evening snapshot: **med cert work P95 = 165h (7x over 24h max); max = 14 days**.

```sql
WITH first_review AS (
  SELECT intake_id, MIN(created_at) AS first_clinician_view
  FROM compliance_audit_log
  WHERE event_type = 'clinician_opened_request'
  GROUP BY intake_id
)
SELECT
  i.category, i.subtype,
  COUNT(*) AS paid_count,
  COUNT(fr.first_clinician_view) AS reviewed_count,
  ROUND(EXTRACT(EPOCH FROM PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY (fr.first_clinician_view - i.paid_at))) / 3600.0, 2) AS p50_hours,
  ROUND(EXTRACT(EPOCH FROM PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (fr.first_clinician_view - i.paid_at))) / 3600.0, 2) AS p95_hours,
  ROUND(EXTRACT(EPOCH FROM MAX(fr.first_clinician_view - i.paid_at)) / 3600.0, 2) AS max_hours
FROM intakes i
LEFT JOIN first_review fr ON fr.intake_id = i.id
WHERE i.payment_status IN ('paid', 'refunded', 'partially_refunded')
  AND i.paid_at > NOW() - INTERVAL '90 days'
  AND i.patient_id != 'e2e00000-0000-0000-0000-000000000002'
GROUP BY i.category, i.subtype
ORDER BY p95_hours DESC NULLS LAST;
```

Action thresholds:
- P95 > 24h on med-cert work for >1 reporting period: capacity issue or auto-decline trigger needed.
- Max > 7 days on any category: refund + apology email; review the specific intake.

### Q2 — Cert + refund orphan detection

Finds intakes where the platform issued a certificate AND refunded the payment, but the cert was not revoked. Each row is a real-world case where an employer could verify the cert via `/api/verify` and get `valid` status.

```sql
SELECT
  i.id AS intake_id,
  i.category, i.subtype,
  i.payment_status, i.refund_status, i.refunded_at,
  ic.id AS certificate_id,
  ic.status AS cert_status,
  ic.issue_date AS cert_issue_date
FROM intakes i
INNER JOIN issued_certificates ic ON ic.intake_id = i.id
WHERE i.payment_status IN ('refunded', 'partially_refunded')
  AND ic.status = 'valid'
  AND i.patient_id != 'e2e00000-0000-0000-0000-000000000002'
ORDER BY i.refunded_at DESC NULLS LAST;
```

2026-05-23 evening snapshot: **2 orphans**. Per-orphan operator decision needed (revoke vs goodwill-accept). The auto-revoke-on-refund question is clinical/legal policy, not engineering — needs an explicit decision before any contract test or code path is added.

2026-06-01 reconciliation: **0 orphans** after revoking the two fully refunded legacy certificates via production service-role reconciliation. Certificate revocation audit rows and system audit rows were written. Roadmap status: closed as an active incident; keep this invariant monitored in `/admin/ops`. No automatic revoke-on-refund product policy was added.

### Q3 — INVALID_TYPE pattern audit across integrations

The Google Ads `INVALID_CONVERSION_ACTION_TYPE` bug (env var points at a resource ID that exists but is the wrong TYPE) is a recurring pattern. Other integrations could have the same hole:

| Integration | Existence check | Type check at boot | Risk |
|---|---|---|---|
| **Stripe price IDs** (`STRIPE_PRICE_*`) | ✅ Zod validates env var is set | ✅ `pnpm check:integrations` fetches each price and asserts `type = one_time` | Medium |
| **Parchment org/partner IDs** | ✅ daily smoke | ✅ smoke validates org access (indirect type check) | Low |
| **Resend** | ✅ API key validated at boot | ✅ `pnpm check:integrations` validates sender/domain or restricted-key smoke send | Low |
| **Anthropic/OpenAI model names** | ✅ string declared in source | ✅ `pnpm check:integrations` checks configured review/clinical model availability | Low |
| **Google Ads conversion action ID** | ✅ if env var present | ✅ `pnpm check:integrations` fetches the configured action and asserts `type = UPLOAD_CLICKS` and `status = ENABLED` | **High when failing** |

Current gate: `pnpm release:check` runs `CHECK_INTEGRATIONS_STRICT=1 pnpm check:integrations`. Treat any strict warning/failure as a release blocker before paid ramp. Google Ads remains blocked until production-scoped Vercel env/runtime preflight proves `GOOGLE_ADS_CONVERSION_ACTION_PURCHASE` is a live offline click-import purchase action, not a browser website purchase tag.

### Q4 — Refund record invariant check

Detects `payment_status = 'refunded'` rows that don't have a corresponding refund record. Each row is a legacy data anomaly likely from before the `refund_status` enum was added.

```sql
SELECT id, category, subtype, paid_at, refunded_at, refund_status, refund_amount_cents
FROM intakes
WHERE payment_status IN ('refunded', 'partially_refunded')
  AND (refund_status IS NULL OR refund_status = 'not_applicable' OR refunded_at IS NULL)
  AND patient_id != 'e2e00000-0000-0000-0000-000000000002'
ORDER BY paid_at DESC;
```

2026-05-23 evening snapshot: 1 row (intake `4fc90333-...`, study cert issued 2026-04-14, marked refunded with no refund record). Operator action: backfill `refund_status` + `refunded_at` from Stripe dashboard OR mark as `not_applicable` with explicit reason.

2026-06-01 reconciliation: **0 anomalies** after backfilling the legacy study-certificate refund from Stripe (`refund_status='succeeded'`, Stripe refund ID, `refunded_at`, and corrected charged amount to match the Stripe PaymentIntent). A system audit row was written. Roadmap status: closed as an active incident; keep this invariant monitored in `/admin/ops`.

### Q5 — Reactivation reminder funnel (refill reminders → reorders)

Measures whether the one-off refill reminder (`/api/cron/refill-reminders`, fires ~week 10-11 post-issue) actually drives reorders. The first real wave lands ~2026-07-13 (the May-issued scripts maturing into the window). The reorder link carries `utm_source=refill_reminder`, so a paid reorder is attributable. `test=true` outbox rows (operator pre-flight `?testEmail=`) have a NULL `patient_id` and are excluded.

```sql
WITH sent AS (
  SELECT patient_id, MIN(created_at) AS reminded_at
  FROM email_outbox
  WHERE email_type = 'refill_reminder' AND patient_id IS NOT NULL
  GROUP BY patient_id
),
reorders AS (
  SELECT DISTINCT s.patient_id
  FROM sent s
  JOIN intakes i ON i.patient_id = s.patient_id
  WHERE i.utm_source = 'refill_reminder'
    AND i.status IN ('paid', 'approved', 'completed', 'awaiting_script')
    AND i.created_at >= s.reminded_at
)
SELECT
  (SELECT COUNT(*) FROM sent) AS patients_reminded,
  (SELECT COUNT(*) FROM reorders) AS patients_reordered,
  ROUND(100.0 * (SELECT COUNT(*) FROM reorders) / NULLIF((SELECT COUNT(*) FROM sent), 0), 1) AS conversion_pct;
```

Run after each weekly wave. If conversion is healthy, the reactivation lever works → consider widening (e.g. a second nudge, or backfilling lapsed scripts once a back-catalog exists). If ~0 after a few waves with good deliverability, the email/offer needs rework before scaling.

### How these become alerts

When the operator wants to formalize:

1. Wrap each query in a Vercel cron route under `app/api/cron/`.
2. **DONE (2026-05-29).** `/admin/ops` renders an "Integrity (weekly invariants)" strip with 3 cards: Review SLA backlog (Q1 proxy: paid intakes awaiting review past 24h), Cert + refund orphans (Q2), Refund record anomalies (Q4). Counts come from `getOperationalInvariants()` in `lib/admin/ops-invariants.ts` (service-role, seeded-E2E filtered, fail-soft). The cert-orphan card is critical on any non-zero count; SLA backlog goes critical at `SLA_BREACH_CRITICAL` (10).
3. Sentry alert when any count is non-zero (severity warning) or P95 exceeds target (severity critical).
4. Update `docs/SECURITY.md` Kill Switches table if the alert should pause new paid intakes.
