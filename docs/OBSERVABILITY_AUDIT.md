# Observability & Incident Readiness Audit

**Audited:** 2026-01-25  
**Scope:** Sentry instrumentation, API error capture, cron monitoring, health endpoints, correlation IDs, logging noise/signal  
**Status:** Complete

---

## 1. Observability Hooks Inventory

### 1.1 Sentry Instrumentation

| Layer | File | What It Catches |
|-------|------|-----------------|
| **Server Init** | `instrumentation.ts:76-102` | Server-side init, critical path sampling (Stripe, approvals, prescriptions) |
| **Client Init** | `instrumentation-client.ts:42-103` | Client errors, session replay, route transitions |
| **Request Errors** | `instrumentation.ts:113-127` | `onRequestError` hook - all unhandled route errors |
| **API Wrapper** | `lib/observability/sentry.ts:214-249` | `withSentryApiCapture` - 5xx responses + exceptions |
| **Server Actions** | `lib/observability/sentry.ts:144-177` | `captureServerError` - structured action errors |

### 1.2 Sampling Configuration

| Environment | Traces Rate | Replay Rate | Error Replay |
|-------------|-------------|-------------|--------------|
| Production | 0.5 (server), 0.1 (client) | 0.1 | 1.0 |
| Preview | 1.0 | 0.1 | 1.0 |
| E2E | 1.0 | N/A | N/A |

**Critical Path Overrides (Always 1.0):**
- Stripe/webhook operations
- Approve/decline actions
- Prescription/med-cert flows

### 1.3 Error Filtering

```
@/Users/rey/Desktop/instantmed/instrumentation.ts:85-90
```
**Server ignores:** `Network request failed`, `Failed to fetch`, `Load failed`, `AbortError`

```
@/Users/rey/Desktop/instantmed/instrumentation-client.ts:62-75
```
**Client ignores:** Extensions, chrome://, Network errors, AbortError, ResizeObserver loop

---

## 2. Cron Monitoring

### 2.1 Scheduled Jobs

| Cron | Schedule | Sentry Capture | Health Signal |
|------|----------|----------------|---------------|
| `/api/cron/health-check` | */5 min | ✅ Exception capture | Queue health, doctor activity, delivery, AI |
| `/api/cron/stale-queue` | Hourly | ✅ `captureMessage` (warning/error) | SLA breach alerts |
| `/api/cron/dlq-monitor` | 9am daily | ✅ `captureMessage` | Dead letter queue alerts |
| `/api/cron/emergency-flags` | Hourly | ✅ `captureMessage` | Safety flags for abandoned intakes |
| `/api/cron/abandoned-checkouts` | Hourly | ❌ None visible | Recovery email triggers |
| `/api/cron/retry-drafts` | */5 min | ❌ None visible | AI draft retry |
| `/api/cron/process-email-retries` | */10 min | ❌ None visible | Email retry processing |
| `/api/cron/expire-certificates` | 1am daily | ❌ None visible | Certificate expiry |
| `/api/cron/cleanup-orphaned-storage` | Sun 3am | ❌ None visible | Storage cleanup |
| `/api/cron/release-stale-claims` | */5 min | ❌ None visible | Doctor claim release |

**Gap:** 5 of 10 cron jobs lack explicit Sentry error capture.

### 2.2 Cron Authentication

All crons use `verifyCronRequest()` from `lib/api/cron-auth.ts` for auth verification.

---

## 3. Health Endpoints

### 3.1 Primary Health Check

```
@/Users/rey/Desktop/instantmed/app/api/health/route.ts:21-131
```

| Check | Status Codes | Alert Behavior |
|-------|--------------|----------------|
| Database (Supabase) | 200/503 | ✅ Sentry warning (throttled 5min) |
| Redis (Upstash) | 200/503 | ✅ Sentry warning (throttled 5min) |
| Stripe API | 200/503 | ✅ Sentry warning (throttled 5min) |
| Environment vars | 200/503 | ✅ Sentry warning (throttled 5min) |

**Response:** `{ status: "healthy" | "degraded", checks: {...}, totalLatencyMs }`

### 3.2 Comprehensive Health Cron

```
@/Users/rey/Desktop/instantmed/app/api/cron/health-check/route.ts:26-106
```

| Subsystem | Metrics Captured |
|-----------|------------------|
| Queue | Size, oldest request age, SLA breach flag |
| Doctor Activity | Last activity, active doctors, business hours |
| Delivery | Tracked via `checkDeliveryHealthAndAlert()` |
| AI | Request count, failure rate, P95 latency |

---

## 4. Correlation ID Analysis

### 4.1 Available Correlation IDs

| ID Type | Format | Propagation |
|---------|--------|-------------|
| `correlation_id` | `{timestamp36}-{uuid8}` | HTTP header `x-correlation-id` |
| `request_id` | UUID v4 | HTTP header `x-request-id` |
| `intake_id` | UUID | DB primary key, Stripe metadata |
| `session_id` | Stripe session ID | URL param, Stripe metadata |
| `chat_session_id` | UUID | Linked to intake on checkout |

### 4.2 Correlation ID Usage

| Feature Area | intake_id | session_id | correlation_id | request_id |
|--------------|-----------|------------|----------------|------------|
| **Intake Flow** | ✅ All logs | ✅ Checkout URLs | ❌ Not used | ❌ Not used |
| **Stripe Webhook** | ✅ In metadata | ✅ In payload | ✅ `stripe-{event.id}` | ❌ Not used |
| **Email Send** | ✅ In `request_id` | ❌ N/A | ❌ Not used | ❌ Not used |
| **Doctor Approvals** | ✅ In context | ❌ N/A | ❌ Not used | ❌ Not used |
| **AI Drafts** | ✅ In context | ❌ N/A | ❌ Not used | ❌ Not used |
| **Sentry Capture** | ✅ In `extra` | ❌ Not common | ❌ Not in tags | ❌ In `extra` only |

### 4.3 Correlation Gaps

| Issue | Impact |
|-------|--------|
| **correlation_id not in Sentry tags** | Cannot filter errors by request flow |
| **No session-to-intake linking in errors** | Cannot trace checkout failures back to session |
| **request_id not propagated to Sentry** | Cannot match logs to Sentry events |
| **AI requests lack intake_id** | Cannot correlate AI failures to patient case |

---

## 5. Logging Analysis (Noise vs Signal)

### 5.1 Logger Module

```
@/Users/rey/Desktop/instantmed/lib/observability/logger.ts:1-232
```

| Feature | Implementation | Notes |
|---------|----------------|-------|
| Log levels | debug/info/warn/error | Min level: `info` in production |
| PHI sanitization | ✅ 30+ sensitive keys redacted | Medicare, DOB, address, clinical terms |
| Structured output | JSON in production | Human-readable in development |
| Sentry integration | ✅ Auto-capture on `log.error` | Only if error object provided |
| Module loggers | ✅ `createLogger(module)` | 48 modules use this pattern |

### 5.2 Logging Patterns by Area

| Area | Logger Usage | Signal Quality |
|------|--------------|----------------|
| **Stripe/Checkout** | ✅ High - all steps logged | Good - includes amounts, session IDs |
| **Email/SMS** | ✅ Medium - send results | Good - includes template, recipient |
| **Doctor Approvals** | ✅ High - audit trail | Good - includes intake_id, doctor_id |
| **AI Drafts** | ✅ Medium - results | Noisy - debug logs in production |
| **Health Checks** | ✅ Medium - failures | Good - includes metrics |
| **Auth** | ⚠️ Low - basic only | Gap - no login/logout logging |

### 5.3 Noise Issues

| Pattern | Frequency | Recommendation |
|---------|-----------|----------------|
| Successful health checks | Every 5 min | Reduce to warning-only logging |
| AI cache hits | Every request | Move to debug level |
| Feature flag reads | Every page load | Remove or debug level |
| Supabase query logs | Development | Already dev-only, OK |

---

## 6. Gaps by Feature Area

### 6.1 Intake Flow

| Stage | Sentry Coverage | Correlation | Gap |
|-------|-----------------|-------------|-----|
| Form submission | ❌ No explicit capture | ✅ intake_id | Add client error boundary |
| ID verification | ❌ None | ✅ intake_id | Add verification failure capture |
| Checkout creation | ✅ Exception capture | ✅ intake_id, session_id | OK |
| Payment webhook | ✅ Full capture + DLQ | ✅ stripe event_id | OK |

### 6.2 Checkout Flow

| Stage | Sentry Coverage | Correlation | Gap |
|-------|-----------------|-------------|-----|
| Session creation | ✅ Exception capture | ✅ session_id | OK |
| Payment success | ✅ Via webhook | ✅ intake_id | OK |
| Payment failure | ✅ Via webhook | ✅ intake_id | OK |
| Abandoned checkout | ❌ No error signal | ❌ No correlation | Add abandonment metric |

### 6.3 Doctor Approvals

| Stage | Sentry Coverage | Correlation | Gap |
|-------|-----------------|-------------|-----|
| Claim intake | ❌ None | ✅ intake_id | Add claim failure capture |
| Generate drafts | ✅ `captureMessage` on unknown type | ✅ intake_id | OK |
| Approve/Decline | ✅ `captureApiError` | ✅ intake_id | OK |
| Sync clinical note | ✅ `captureMessage` on failure | ✅ intake_id, draft_id | OK |

### 6.4 Email/SMS Delivery

| Stage | Sentry Coverage | Correlation | Gap |
|-------|-----------------|-------------|-----|
| Send attempt | ❌ Logger only | ✅ intake_id | Add failure capture |
| Delivery webhook | ✅ Bounce alerts | ✅ provider_id | OK |
| Retry queue | ❌ None visible | ✅ certificate_id | Add retry failure capture |
| Hard bounce | ✅ `captureMessage` for critical | ✅ request_id | OK |

---

## 7. Recommended Golden Signals

### 7.1 Latency Signals

| Signal | Metric | Emission Point | Threshold |
|--------|--------|----------------|-----------|
| **Checkout P95** | Time from start to payment_intent | `lib/stripe/checkout.ts` | < 5s |
| **Doctor Review P95** | Time from paid to approved | `lib/monitoring/queue-health.ts` | < 60min |
| **AI Draft P95** | Generation latency | `lib/monitoring/ai-health.ts` | < 5s |
| **Email Delivery P95** | Send to delivered | `lib/monitoring/delivery-tracking.ts` | < 30s |

### 7.2 Traffic Signals

| Signal | Metric | Emission Point | Alert Condition |
|--------|--------|----------------|-----------------|
| **Intake Volume** | Intakes created/hour | New: `lib/monitoring/intake-volume.ts` | < 50% of 7-day avg |
| **Payment Volume** | Payments/hour | Stripe webhook | < 50% of 7-day avg |
| **Queue Depth** | Pending intakes | `lib/monitoring/queue-health.ts` | > 50 |

### 7.3 Error Signals

| Signal | Metric | Emission Point | Threshold |
|--------|--------|----------------|-----------|
| **Payment Failure Rate** | Failed/total payments | Stripe webhook | > 5% |
| **AI Failure Rate** | Failed/total AI requests | `lib/monitoring/ai-health.ts` | > 10% |
| **Email Bounce Rate** | Bounced/sent | `lib/monitoring/delivery-tracking.ts` | > 5% |
| **5xx Rate** | 5xx responses/total | `lib/observability/sentry.ts` | > 1% |

### 7.4 Saturation Signals

| Signal | Metric | Emission Point | Threshold |
|--------|--------|----------------|-----------|
| **Doctor Utilization** | Active doctors vs queue | `lib/monitoring/doctor-activity.ts` | Queue > 5x active doctors |
| **DLQ Depth** | Unresolved items | `/api/cron/dlq-monitor` | > 5 |
| **Retry Queue Depth** | Pending retries | New: `lib/email/retry-queue.ts` | > 10 |

### 7.5 Where to Emit (Implementation)

| Signal | Current Status | File Target |
|--------|----------------|-------------|
| Checkout latency | ❌ Not tracked | Add to `lib/stripe/checkout.ts` |
| Intake volume | ❌ Not tracked | Create `lib/monitoring/intake-volume.ts` |
| Payment failure rate | ✅ Via DLQ monitor | Already in webhook |
| Doctor review latency | ✅ Queue health | `lib/monitoring/queue-health.ts` |
| AI metrics | ✅ Full | `lib/monitoring/ai-health.ts` |
| Email delivery | ✅ Partial | `lib/monitoring/delivery-tracking.ts` |

---

## 8. Dashboard Filtering Strategy

### 8.1 Recommended Sentry Tags

| Tag | Values | Purpose |
|-----|--------|---------|
| `environment` | production, preview, development, e2e | ✅ Already implemented |
| `release` | Git SHA | ✅ Already implemented |
| `source` | api, server_action, webhook, cron, client | ✅ Partially implemented |
| `app_area` | admin, doctor, patient, public | ✅ In `sentry.ts` |
| `user_role` | admin, doctor, patient | ✅ Partially implemented |
| `service_type` | med_cert, prescription, consult, referral | ❌ Not implemented |
| `intake_id` | UUID | ❌ In extra, not tags |
| `alert_type` | sla_breach, queue_critical, ai_degradation, etc. | ✅ Implemented |

### 8.2 Recommended Sentry Saved Searches

| Search Name | Query |
|-------------|-------|
| **Production Errors** | `environment:production level:error` |
| **Payment Issues** | `source:webhook OR tags[alert_type]:stripe*` |
| **SLA Breaches** | `tags[alert_type]:sla_breach OR tags[alert_type]:sla_warning` |
| **AI Degradation** | `tags[alert_type]:ai_degradation OR tags[alert_type]:ai_latency` |
| **Email Failures** | `tags[alert_type]:email_bounce OR tags[alert_type]:delivery_degradation` |
| **Doctor Portal** | `app_area:doctor` |
| **Admin Portal** | `app_area:admin` |

### 8.3 Dashboard Views

| Dashboard | Metrics | Source |
|-----------|---------|--------|
| **Operations** | Queue depth, SLA status, doctor activity | `/api/cron/health-check` |
| **Payments** | Payment volume, failure rate, DLQ depth | Stripe webhooks, DLQ monitor |
| **AI Health** | Request volume, failure rate, P95 latency | `lib/monitoring/ai-health.ts` |
| **Delivery** | Email/SMS volume, delivery rate, bounce rate | `lib/monitoring/delivery-tracking.ts` |

### 8.4 Alert Rules

| Alert | Condition | Channel |
|-------|-----------|---------|
| **SLA Breach** | Any intake waiting > 60min | Sentry → Slack (immediate) |
| **Queue Critical** | Queue > 50 | Sentry → Slack |
| **AI Down** | Failure rate > 25% | Sentry → PagerDuty |
| **Payment DLQ** | DLQ > 5 items | Sentry → Slack |
| **Email Bounce Spike** | Bounce rate > 5% | Sentry → Email |

---

## 9. Recommendations Summary

### HIGH Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 1 | **5 crons lack error capture** | `/api/cron/abandoned-checkouts/route.ts`, etc. | Add `Sentry.captureException` in catch blocks |
| 2 | **intake_id not in Sentry tags** | `lib/observability/sentry.ts` | Add `intake_id` to tags, not just extra |
| 3 | **No checkout latency tracking** | `lib/stripe/checkout.ts` | Add timing metric emission |

### MEDIUM Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 4 | **Email send failures not captured** | `lib/email/send.ts:125` | Add `Sentry.captureException` on failure |
| 5 | **AI requests lack intake_id correlation** | `lib/ai/drafts/db.ts` | Pass intake_id to `recordAIRequest` |
| 6 | **service_type not in Sentry tags** | `lib/observability/sentry.ts` | Add to `captureApiError` context |
| 7 | **Intake volume not tracked** | New file | Create `lib/monitoring/intake-volume.ts` |

### LOW Priority

| # | Issue | File Target | Fix |
|---|-------|-------------|-----|
| 8 | **Health check logs are noisy** | `/api/cron/health-check/route.ts` | Log only on degradation |
| 9 | **No client error boundary capture** | `app/error.tsx` | Add Sentry capture in error component |
| 10 | **Auth events not logged** | `lib/auth.ts` | Add login/logout audit events |

---

## 10. Summary

| Area | Status | Coverage |
|------|--------|----------|
| Sentry server instrumentation | ✅ Good | Critical paths sampled at 100% |
| Sentry client instrumentation | ✅ Good | Replay enabled, route tracking |
| API error capture | ⚠️ Partial | `withSentryApiCapture` exists but not universally applied |
| Cron monitoring | ⚠️ Partial | 5/10 crons have explicit capture |
| Health endpoints | ✅ Good | DB, Redis, Stripe checked with alerts |
| Correlation IDs | ⚠️ Partial | intake_id used, but not in Sentry tags |
| Logging | ✅ Good | PHI sanitization, structured logging |
| Golden signals | ⚠️ Partial | AI, queue, delivery tracked; checkout latency missing |

**Overall Assessment:** Observability foundation is solid with good Sentry integration and monitoring modules. Primary gaps are:
1. **Correlation:** `intake_id` needs to be a Sentry tag for filtering
2. **Coverage:** 5 cron jobs need error capture
3. **Latency:** Checkout flow timing not tracked
4. **Volume:** No intake volume baseline monitoring

Addressing recommendations #1-3 will significantly improve incident response capability.
