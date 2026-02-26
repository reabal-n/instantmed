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

### Email Delivery Failures

**Symptoms:** Emails stuck "pending" in `email_outbox`, email dispatcher cron reporting high failure counts.

1. Check Resend status: https://resend-status.com
2. Check `/admin/ops/email-outbox` for stuck emails and `/admin/ops/email-queue` for retry queue
3. Manual retry: click "Retry" on individual emails in admin
4. If Resend is completely down: emails auto-retry via the `email-dispatcher` cron

### Database Connection Issues

**Symptoms:** 500 errors across multiple endpoints, slow page loads, connection timeout errors.

1. Check Supabase dashboard for connection count
2. Check `/admin/performance/database` for metrics
3. If connection pool exhausted: scale up Supabase compute (Project Settings > Database), kill long-running queries
4. If Supabase is down: check https://status.supabase.com

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

### INTERNAL_API_KEY (zero-downtime)

1. Generate: `openssl rand -base64 32`
2. Add `INTERNAL_API_KEY_NEW=<new-key>` to Vercel env vars
3. Deploy (both old and new keys work during overlap)
4. Verify system works, then set `INTERNAL_API_KEY=<new-key>`, remove `INTERNAL_API_KEY_NEW`
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

### Clerk Keys

1. Generate new keys in Clerk dashboard
2. Update `CLERK_SECRET_KEY` in Vercel
3. Deploy, then verify auth flows work

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
3. Check mapping in `lib/stripe/client.ts` -> `getConsultPriceId()`

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
| Production | 0.5 | 0.1 | 0.1 | 1.0 |
| Preview | 1.0 | 1.0 | 0.1 | 1.0 |
| E2E | 1.0 | 1.0 | N/A | N/A |

Critical paths (Stripe, approvals, prescriptions) are always sampled at 1.0.

---

## Cron Jobs Reference

All crons use `verifyCronRequest()` from `lib/api/cron-auth.ts` for authentication.

| Job | Endpoint | Schedule | Purpose |
|-----|----------|----------|---------|
| Health Check | `/api/cron/health-check` | Every 5 min | Queue health, doctor activity, delivery health, AI metrics |
| Email Dispatcher | `/api/cron/email-dispatcher` | Every 5 min | Process pending/failed emails from `email_outbox` with atomic claiming |
| Release Stale Claims | `/api/cron/release-stale-claims` | Every 5 min | Release doctor intake claims that have gone stale to prevent queue stalls |
| Retry Drafts | `/api/cron/retry-drafts` | Every 5 min | Retry failed AI draft generation with exponential backoff |
| Process Email Retries | `/api/cron/process-email-retries` | Every 10 min | DEPRECATED -- delegates to email-dispatcher. Kept for backward compat |
| Business Alerts | `/api/cron/business-alerts` | Every 30 min | Aggregates business metrics: failed payments, email failures, SLA breaches |
| Stale Queue | `/api/cron/stale-queue` | Hourly | Alerts on paid intakes waiting > 4h (warning) or > 8h (critical) |
| Abandoned Checkouts | `/api/cron/abandoned-checkouts` | Hourly | Send recovery emails for abandoned checkout sessions |
| Emergency Flags | `/api/cron/emergency-flags` | Hourly | SMS emergency resources to patients who abandoned intakes with red flags |
| Expire Certificates | `/api/cron/expire-certificates` | Daily (1 AM) | Mark certificates past their `end_date` as expired |
| AHPRA Re-verification | `/api/cron/ahpra-reverification` | Daily (6 AM AEST) | Flag overdue AHPRA verifications; disable approval for 30+ days overdue |
| Daily Reconciliation | `/api/cron/daily-reconciliation` | Daily (7 AM AEST) | Identify mismatches: paid without delivery, failed refunds, failed deliveries |
| Repeat Rx Reminders | `/api/cron/repeat-rx-reminders` | Daily (8 AM AEST) | Enqueue reminder emails for repeat scripts completed ~30 days ago |
| DLQ Monitor | `/api/cron/dlq-monitor` | Daily (9 AM) | Alert on unprocessed Stripe webhook dead letter queue items > 24h old |
| QA Sampling | `/api/cron/qa-sampling` | Daily | Sample 10% of approved intakes from last 24h for quality review |
| Data Retention | `/api/cron/data-retention` | Daily | Enforce AU health records retention (see CLINICAL.md → Data Retention Schedule); clean rate limit records |
| Cleanup Orphaned Storage | `/api/cron/cleanup-orphaned-storage` | Weekly (Sun 3 AM) | Delete storage files with no DB record after 7-day grace period (max 50/run) |

---

## Production Launch Checklist

### Supabase

1. Enable **Leaked Password Protection**: Authentication > Providers > Email (HaveIBeenPwned)
2. Review **Auth Rate Limits**: use percentage-based connection strategy

### Stripe

1. Verify all `STRIPE_PRICE_*` env vars match production (`price_live_*` not `price_test_*`)
2. Create webhook endpoint `https://<domain>/api/stripe/webhook` subscribing to `checkout.session.completed`, `checkout.session.expired`
3. Test purchase end-to-end; verify webhook delivery

### Email

1. Verify sending domain in Resend; update `RESEND_FROM_EMAIL`
2. Test each email type; check spam behavior

### Vercel Env Vars

**Required:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` (live), `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `INTERNAL_API_SECRET`, `CLERK_SECRET_KEY`

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

### Rollback

1. Revert Vercel deployment to previous version
2. If DB issue: apply rollback migration
3. Notify affected users via email

---

## SLA Targets

**Admin page:** `/doctor/admin/ops/intakes-stuck` (requires `doctor` or `admin` role)

| Condition | Threshold | Reason Code |
|-----------|-----------|-------------|
| Paid but not picked up | > 5 minutes | `paid_no_review` |
| In review or pending info | > 60 minutes | `review_timeout` |
| Approved but no delivery email | > 10 minutes | `delivery_pending` |
| Approved but delivery email failed | Any | `delivery_failed` |

**Kill switches:** `DISABLE_INTAKE_EVENTS=true` (disable event logging), `DISABLE_STUCK_INTAKE_SENTRY=true` (disable Sentry warnings).

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
| SLA Breach | Intake waiting > 60 min | Sentry (email alert, immediate) |
| Queue Critical | > 50 pending intakes | Sentry (email alert) |
| AI Down | Failure rate > 25% | Sentry (email alert) |
| Payment DLQ | > 5 items | Sentry (email alert) |
| Email Bounce Spike | Bounce rate > 5% | Sentry (email alert) |

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

| Priority | Gap | Fix |
|----------|-----|-----|
| HIGH | 5 crons lack Sentry error capture | Add `Sentry.captureException` in catch blocks |
| HIGH | `intake_id` not in Sentry tags | Move from extra to tags in `lib/observability/sentry.ts` |
| HIGH | No checkout latency tracking | Add timing metric in `lib/stripe/checkout.ts` |
| MEDIUM | Email send failures not in Sentry | Add capture in `lib/email/send.ts` |
| MEDIUM | `service_type` not in Sentry tags | Add to `captureApiError` context |

---

## Quick Ops Commands

> Dev commands (build, test, lint): see CLAUDE.md → Quick Start

```bash
vercel logs --follow               # Tail Vercel logs
stripe prices list --limit 5       # Verify Stripe prices
supabase db push --project-ref X   # Apply migrations
```

## Useful Links

### Support Channels

| Channel | Purpose |
|---------|---------|
| `support@instantmed.com.au` | Patient support (general) |
| `complaints@instantmed.com.au` | Formal complaints (14-day SLA, AHPRA escalation path) |
| `privacy@instantmed.com.au` | Data access/correction/deletion requests (30-day SLA) |
| `0450 722 549` | Phone support |

### Infrastructure Plans

| Service | Plan | Notes |
|---------|------|-------|
| Vercel | Pro | Hosting, edge, cron jobs |
| Supabase | Pro | Database, auth, storage, realtime |
| GitHub | Standard | Source control, GitHub Actions CI |

### Service Dashboards

Sentry: https://sentry.io | Vercel: https://vercel.com | Stripe: https://dashboard.stripe.com | PostHog: https://app.posthog.com | Supabase: https://supabase.com/dashboard | Resend: https://resend.com
