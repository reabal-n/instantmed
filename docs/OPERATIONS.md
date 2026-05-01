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
2. Check `/admin/emails/hub` for failed or pending outbox rows; use `/admin/emails/analytics` for delivery status and recent queue activity.
3. Manual retry: click "Retry" on individual failed rows in the email hub, or trigger `/api/ops/email-dispatcher` with `OPS_CRON_SECRET`.
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
5. Scheduled maintenance: cron runs every 5 min; if the window passed but banner still on, check whether an admin manually enabled `maintenance_mode` for an incident. Manually disable it only after the incident is resolved.
6. Doctor availability: paused doctors (`doctor_available = false`) see empty queue; toggle at `/doctor/settings/identity`

### Duplicate Patient Profiles

**Symptoms:** `/doctor/patients` shows linked profiles, `/admin/ops` flags patient identity risk, or the daily digest reports duplicate profiles.

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

1. Patients may use InstantMed medication search only for recall/record accuracy. That search is PBS/AMT-backed and must not be described as MIMS, prescribing advice, or medicine recommendation.
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
| `consult_subtype` | `ed`, `weight_loss`, `womens_health`, `hair_loss` | Consult category |
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

## Cron Jobs Reference

All crons use `verifyCronRequest()` from `lib/api/cron-auth.ts` for authentication.

| Job | Endpoint | Schedule | Purpose |
|-----|----------|----------|---------|
| Health Check | `/api/cron/health-check` | Every 5 min | Queue health, doctor activity, delivery health, AI metrics |
| Email Dispatcher | `/api/cron/email-dispatcher` | Every 5 min | Process pending/failed emails from `email_outbox` with atomic claiming; recovers stale `sending` claims and applies `DAILY_EMAIL_LIMIT` only to marketing/engagement sends |
| Release Stale Claims | `/api/cron/release-stale-claims` | Every 5 min | Release doctor intake claims that have gone stale to prevent queue stalls |
| Retry Drafts | `/api/cron/retry-drafts` | Every 5 min | Retry failed AI draft generation with exponential backoff |
| Business Alerts | `/api/cron/business-alerts` | Every 30 min | Aggregates business metrics: failed payments, email failures, SLA breaches |
| Stale Queue | `/api/cron/stale-queue` | Hourly | Alerts on paid intakes waiting > 4h (warning) or > 8h (critical) |
| Abandoned Checkouts | `/api/cron/abandoned-checkouts` | Hourly | Send recovery emails for abandoned checkout sessions |
| Emergency Flags | `/api/cron/emergency-flags` | Hourly | SMS emergency resources to patients who abandoned intakes with red flags |
| Scheduled Maintenance | `/api/cron/scheduled-maintenance` | Every 5 min | Sync `maintenance_mode` with `maintenance_scheduled_start`/`end` window; auto-enable/disable banner |
| AHPRA Re-verification | `/api/cron/ahpra-reverification` | Daily (6 AM AEST) | Flag overdue AHPRA verifications; disable approval for 30+ days overdue |
| Daily Reconciliation | `/api/cron/daily-reconciliation` | Daily (7 AM AEST) | Identify mismatches: paid without delivery, failed refunds, failed deliveries |
| Repeat Rx Reminders | `/api/cron/repeat-rx-reminders` | Daily (8 AM AEST) | Enqueue reminder emails for repeat scripts completed ~30 days ago |
| DLQ Monitor | `/api/cron/dlq-monitor` | Daily (9 AM UTC) | Alert on unprocessed Stripe webhook dead letter queue items > 24h old |
| QA Sampling | `/api/cron/qa-sampling` | Weekly (Mon 6 AM UTC) | Sample 10% of approved intakes from last week for quality review |
| Data Retention | `/api/cron/data-retention` | Daily (2 AM UTC) | Enforce AU health records retention (see CLINICAL.md → Data Retention Schedule); clean rate limit records |
| Exit Intent Nurture | `/api/cron/exit-intent-nurture` | Hourly (:30) | Send nurture emails (emails 2 & 3) to exit-intent captured visitors |
| Follow-Up Reminder | `/api/cron/follow-up-reminder` | Daily (1 AM UTC) | Day-3 follow-up emails to med cert patients |
| Treatment Follow-Up | `/api/cron/treatment-followup` | Daily (23:00 UTC = 09:00 AEST) | ED/hair-loss treatment follow-up reminder emails (max 3 per milestone, ≥3 days apart) |
| IndexNow | `/api/cron/indexnow` | Daily (6 AM UTC) | Submit sitemap URLs to IndexNow for Bing/Yandex indexing |
| Retry Auto-Approval | `/api/cron/retry-auto-approval` | Every 3 min | Retry auto-approval via `auto_approval_state` enum (pending/failed_retrying). Includes timeout recovery for stale `attempting` intakes (>10 min). Feature-flagged. |
| Decline Re-engagement | `/api/cron/decline-reengagement` | Hourly | Send re-engagement email 2-3h after intake decline; deduped via email_log |
| Cleanup Orphaned Storage | `/api/cron/cleanup-orphaned-storage` | Weekly (Sun 3 AM UTC) | Delete storage files with no DB record after 7-day grace period (max 50/run) |
| Outbox Archival | `/api/cron/outbox-archival` | Daily (4 AM UTC) | Delete delivered emails >90 days old and exhausted-failed emails >180 days old from `email_outbox` (batch 500) |
| Email Digest | `/api/cron/email-digest` | Weekly (Sun 22:00 UTC / Mon 08:00 AEST) | Sends weekly email ops summary to support@instantmed.com.au — sent/failed/bounced/complained counts, delivery rate, top types, bounced addresses |

**Timezone note:** All cron schedules in `vercel.json` are UTC. "AEST" times above are UTC+10 (standard time). During AEDT (daylight saving, Oct–Apr), these shift 1 hour later in local time (e.g., "6 AM AEST" runs at 7 AM AEDT).

---

## Production Launch Checklist

### Supabase

1. Enable **Leaked Password Protection**: Authentication > Providers > Email (HaveIBeenPwned)
2. Review **Auth Rate Limits**: use percentage-based connection strategy

### Stripe

1. Verify all `STRIPE_PRICE_*` env vars match production (`price_live_*` not `price_test_*`)
2. Create webhook endpoint `https://<domain>/api/stripe/webhook` subscribing to `checkout.session.completed`, `checkout.session.expired`, `invoice.payment_succeeded`, `customer.subscription.deleted`
3. Test purchase end-to-end; verify webhook delivery

### Email

1. Verify sending domain in Resend; update `RESEND_FROM_EMAIL`
2. Test each email type; check spam behavior

### Vercel Env Vars

**Required:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `INTERNAL_API_SECRET`

**Recommended:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_DSN`

### Database Migrations

```bash
supabase db push --project-ref [SUPABASE_PROJECT_REF]
```

### Monitoring

1. Verify `SENTRY_DSN` set in production
2. Uptime monitor on `/`, `/api/health`
3. Stripe webhook failure alerts configured

### Post-Launch Verification

- [ ] Full user flow: sign up -> request -> payment -> delivery
- [ ] Doctor dashboard access works
- [ ] Sentry receiving events; Stripe payments succeeding; emails delivering

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

#### 5. Vercel env var rollback

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

**Admin page:** `/admin/ops/intakes-stuck` (requires `doctor` or `admin` role)

| Condition | Threshold | Reason Code |
|-----------|-----------|-------------|
| Paid but not picked up | > 4 hours (warning), > 8 hours (critical) | `paid_no_review` |
| In review or pending info | > 60 minutes | `review_timeout` |
| Approved but no delivery email | > 10 minutes | `delivery_pending` |
| Approved but delivery email failed | Any | `delivery_failed` |

**Escalation:** The `stale-queue` cron monitors `paid_no_review`. At 4h: Sentry warning. At 8h: Sentry critical + email escalation to `support@instantmed.com.au` with intake details (ID, service type, patient name, hours waiting).

**Kill switches:** `DISABLE_INTAKE_EVENTS=true` (disable event logging), `DISABLE_STUCK_INTAKE_SENTRY=true` (disable stuck intake Sentry warnings), `DISABLE_RECONCILIATION_SENTRY=true` (disable reconciliation mismatch Sentry warnings).

### Stuck Intake Resolution

| Reason | Cause | Resolution |
|--------|-------|------------|
| `paid_no_review` | No doctor picked up intake | Check doctor availability; assign/review manually |
| `review_timeout` | Doctor started but did not finish within 60 min | Contact doctor or reassign; check for blocking issues |
| `delivery_pending` | Approved but email not sent | Check `email_outbox` (`/doctor/admin/email-outbox?intake_id=...`); trigger manually |
| `delivery_failed` | Delivery email failed | Check `email_outbox` for error; verify patient email; retry or contact patient |

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
| Total Blocking Time (TBT) | ≤ 200ms | 80-330ms | Lighthouse CI |
| Interaction to Next Paint (INP) | ≤ 200ms | TBD (needs dashboard) | `WebVitalsReporter` |

**CI gate:** LHCI asserts FCP ≤ 3s, LCP ≤ 5.5s, TBT ≤ 400ms, CLS ≤ 0.1. More generous than the SLO because CI runners are noisier than real-user conditions. Breaching blocks merge.

**Bundle-size gate:** shared first-load JS ≤ 160 KB (current: 129 KB). Enforced by `scripts/check-bundle-size.sh` after every build.

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
| PHI leaks to Sentry/PostHog (detected in breadcrumbs/replays) | 0 | Privacy Act 1988 APP 11 obligation |
| Doctor action audit-log completeness | 100% | AHPRA audit trail requirement |

Violations of any clinical-safety SLO are P0 incidents regardless of frequency.

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
- **Synthetic**: TBD (Checkly / BetterStack / Vercel built-in checks). Until wired, rely on RUM lag — slower feedback.
- **Error tracking**: Sentry captures + custom tags (see `lib/observability/sentry.ts`).

---

## Monitoring Rules

### Golden Signals & Thresholds

| Category | Signal | Threshold | Source |
|----------|--------|-----------|--------|
| Latency | Checkout P95 | < 5s | `lib/stripe/checkout.ts` |
| Latency | Doctor Review P95 (paid to approved) | < 60 min | `lib/monitoring/queue-health.ts` |
| Latency | AI Draft P95 | < 5s | `lib/monitoring/ai-health.ts` |
| Latency | Email Delivery P95 | < 30s | `lib/monitoring/delivery-tracking.ts` |
| Error | Payment failure rate | > 5% | Stripe webhook |
| Error | AI failure rate | > 10% | `lib/monitoring/ai-health.ts` |
| Error | Email bounce rate | > 5% | `lib/monitoring/delivery-tracking.ts` |
| Error | 5xx rate | > 1% | `lib/observability/sentry.ts` |
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
| Business Alerts | Failed payments, SLA breaches | Telegram (`lib/notifications/telegram.ts`) |
| Payment Notifications | Successful checkout | Telegram (real-time) |

**Telegram alerts** require `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` env vars. If missing, alerts are silently skipped. Used by `business-alerts` cron, payment webhook, and health-check cron.

### Health Endpoints

| Endpoint | Checks | Response |
|----------|--------|----------|
| `/api/health` | Database, Redis, Stripe, env vars | `{ status: "healthy"|"degraded", checks, totalLatencyMs }` |
| `/api/cron/health-check` | Queue depth, doctor activity, delivery, AI | Sentry capture on degradation |

### Sentry Saved Searches

| Search | Query |
|--------|-------|
| Production Errors | `environment:production level:error` |
| Payment Issues | `source:webhook OR tags[alert_type]:stripe*` |
| SLA Breaches | `tags[alert_type]:sla_breach OR tags[alert_type]:sla_warning` |
| AI Degradation | `tags[alert_type]:ai_degradation` |
| Email Failures | `tags[alert_type]:email_bounce` |

### Known Observability Gaps

All previously identified gaps have been resolved:

| Priority | Gap | Status |
|----------|-----|--------|
| ~~HIGH~~ | ~~Crons lack Sentry error capture~~ | ✅ All 21 crons have `Sentry.captureException` |
| ~~HIGH~~ | ~~`intake_id` not in Sentry tags~~ | ✅ In tags via `captureApiError`, `captureServerError`, `captureCheckoutError` |
| ~~HIGH~~ | ~~No checkout latency tracking~~ | ✅ Latency tracked with >5s threshold alert in `lib/stripe/checkout.ts` |
| ~~MEDIUM~~ | ~~Email send failures not in Sentry~~ | ✅ Captured in `lib/email/send-email.ts` (lines 376, 541, 585) |
| ~~MEDIUM~~ | ~~`service_type` not in Sentry tags~~ | ✅ In tags via `captureApiError`, `captureServerError`, `captureCheckoutError` |

---

## Environment Variables

Required env vars validated at startup via Zod in `lib/env.ts`:

- **Supabase**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_*` (11 price IDs — includes `STRIPE_PRICE_PRIORITY_FEE`, `STRIPE_PRICE_REPEAT_RX_MONTHLY`)
- **Email**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`
- **Security**: `PHI_MASTER_KEY`, `ENCRYPTION_KEY`, `PHI_ENCRYPTION_ENABLED`, `INTERNAL_API_SECRET`
- **Redis**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **AI**: `ANTHROPIC_API_KEY`, `VERCEL_AI_GATEWAY_API_KEY`
- **Cron**: `CRON_SECRET`, `OPS_CRON_SECRET`
- **Monitoring**: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
- **Analytics**: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
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
- **Cron jobs:** health-check, retry-auto-approval, SLA monitoring — check for errors.

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
