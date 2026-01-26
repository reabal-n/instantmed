# Debugging Checklist

Quick reference for finding and debugging errors in InstantMed.

## Where to Find Errors

### 1. Vercel Logs (Server-Side Errors)

**Location:** [Vercel Dashboard](https://vercel.com) → Your Project → Deployments → Select Deployment → Functions tab

**What you'll see:**
- Server action errors
- API route failures
- Build/compilation errors
- Edge runtime errors

**Key log patterns:**
```
[ERROR] - Unhandled exceptions
[CRITICAL] - Encryption/schema validation failures
[Sentry] - Initialization logs
x-request-id: <uuid> - Request correlation
```

**Filtering:**
- Use the search bar to filter by route (e.g., `/api/test`)
- Filter by status code (500, 503)
- Filter by time range

### 2. Sentry (Client + Server Errors)

**Location:** [sentry.io](https://sentry.io) → InstantMed Project

#### Issues Tab
- **All captured errors** - grouped by error message
- **Breadcrumbs** - user actions leading to error
- **Stack traces** - with source maps (production builds)
- **Tags** - environment, runtime, custom tags

#### Releases Tab
- **Deployment correlation** - which commit introduced the error
- **Source maps** - verify they're uploaded correctly
- **Adoption** - how many users on each release

#### Key Sentry Features:
| Feature | How to Use |
|---------|-----------|
| Search | `is:unresolved environment:production` |
| Filter by tag | Click any tag in an issue |
| Link to code | Click stack trace line → opens GitHub |
| Request ID | Search `x-request-id:<uuid>` in breadcrumbs |

### 3. Browser DevTools (Client-Side)

**Console tab:**
- React errors (hydration, state)
- Network failures
- PostHog/analytics errors

**Network tab:**
- Failed API calls (red entries)
- Server action responses
- Stripe checkout redirects

### 4. PostHog (User Behavior + Errors)

**Location:** PostHog Dashboard → Recordings / Events

**Useful for:**
- Seeing exactly what user did before error
- Funnel analysis for drop-off points
- Session recordings with console logs

---

## Common Error Scenarios

### Stripe Checkout Fails

1. **Check Vercel logs** for the `/api/` route or server action
2. **Search Sentry** for `Stripe` tag
3. **Verify env vars:**
   - `STRIPE_SECRET_KEY` - correct account (test vs live)
   - `STRIPE_PRICE_*` - price IDs exist in Stripe dashboard

**Quick test:**
```bash
# In Stripe CLI
stripe prices list --limit 5
```

### Consult Subtype Wrong Price

1. **Check env vars** in Vercel → Settings → Environment Variables:
   - `STRIPE_PRICE_CONSULT_ED`
   - `STRIPE_PRICE_CONSULT_HAIR_LOSS`
   - `STRIPE_PRICE_CONSULT_WOMENS_HEALTH`
   - `STRIPE_PRICE_CONSULT_WEIGHT_LOSS`

2. **Run unit test:**
   ```bash
   pnpm test lib/__tests__/consult-subtype-pricing.test.ts
   ```

3. **Check mapping in** `lib/stripe/client.ts` → `getConsultPriceId()`

### Client-Side Error (React)

1. **Open browser DevTools** → Console
2. **Search Sentry** with environment filter: `environment:production is:unresolved`
3. **Check error boundary** - should show fallback UI
4. **Look for hydration errors** - often SSR/client mismatch

### Server Action Fails

1. **Check Vercel Functions logs** for the route
2. **Search Sentry** for server-side tag
3. **Check request ID** - correlate across logs:
   - Vercel log: `x-request-id: abc123`
   - Sentry breadcrumb: same ID

---

## Sentry Setup Verification

### Quick Test (Development)

1. Navigate to `/sentry-test` in development
2. Click "Trigger Client Error"
3. Note the Event ID
4. Check Sentry dashboard - error should appear within 30 seconds

### Verify Sourcemaps (Production)

1. Deploy to Vercel
2. Trigger an error (or wait for one)
3. In Sentry, click on the error
4. Stack trace should show **actual file names and line numbers**, not minified code
5. If not working:
   - Check `SENTRY_AUTH_TOKEN` in Vercel
   - Verify `next.config.mjs` has Sentry config
   - Check Sentry → Releases → verify sourcemaps uploaded

### Environment Detection

Sentry environment is determined by:
```
PLAYWRIGHT=1     → "e2e"
VERCEL_ENV       → "production" | "preview" | "development"
NODE_ENV         → fallback
```

---

## E2E Test Debugging

### Running Tests Locally

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
pnpm test:e2e e2e/consult-subtypes.spec.ts

# Run with UI mode (see browser)
pnpm test:e2e --ui

# Run with debug mode
pnpm test:e2e --debug
```

### Viewing Test Artifacts

On failure, Playwright saves:
- **Screenshots** - `test-results/*/screenshot.png`
- **Traces** - `test-results/*/trace.zip` → Open with `npx playwright show-trace`
- **Videos** - `test-results/*/video.webm`

### Common E2E Failures

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Timeout on page load | Dev server not started | Check port 3001 is free |
| Element not found | Selector changed | Update selector or use data-testid |
| Auth fails | E2E_SECRET mismatch | Check `.env.local` |
| Flaky tests | Race condition | Add proper waits |

---

## Log Correlation

To trace a request through the system:

1. **Get request ID** from:
   - Browser Network tab → Response headers → `x-request-id`
   - Sentry breadcrumbs
   - Vercel logs

2. **Search Vercel logs** for that ID

3. **Search Sentry** breadcrumbs for that ID

4. **Check PostHog** session for that time

---

## Quick Commands

```bash
# Check TypeScript errors
pnpm tsc --noEmit

# Run all unit tests
pnpm test

# Run specific test
pnpm test lib/__tests__/consult-subtype-pricing.test.ts

# Check environment variables are set
env | grep STRIPE
env | grep SENTRY

# Tail Vercel logs (requires Vercel CLI)
vercel logs --follow
```

---

## Sentry Alert Configuration

### Recommended Alerts

Create the following alerts in Sentry → Alerts → Create Alert:

#### 1. Checkout Errors (Critical)

**Trigger:** When `checkout_error:true` tag appears

```
Filter: tags[checkout_error]:true
Threshold: > 0 events in 5 minutes
Action: Slack/Email immediately
```

This catches:
- Stripe session creation failures
- Webhook processing errors
- Payment verification failures

#### 2. Consult Subtype Errors

**Trigger:** Errors with `consult_subtype` tag

```
Filter: tags[consult_subtype]:* AND level:error
Threshold: > 5 events in 1 hour
Action: Slack notification
```

Helps identify broken flows for specific subtypes (ED, weight loss, etc.)

#### 3. Server Action Failures

**Trigger:** Server action errors

```
Filter: tags[source]:server_action AND level:error
Threshold: > 10 events in 15 minutes
Action: Email notification
```

#### 4. API 5xx Spike

**Trigger:** API returning 500+ status

```
Filter: tags[source]:api_5xx
Threshold: > 5 events in 5 minutes
Action: Slack immediately
```

### Key Tags for Filtering

| Tag | Description | Example Values |
|-----|-------------|----------------|
| `service_type` | Request service type | `consult`, `med-cert`, `prescription` |
| `consult_subtype` | Consult category | `ed`, `weight_loss`, `womens_health` |
| `step_id` | Current flow step | `checkout`, `consult_reason`, `review` |
| `intake_id` | Intake UUID | `uuid-...` |
| `checkout_error` | Checkout failure marker | `true` |
| `stripe_error_code` | Stripe error code | `resource_missing`, `invalid_request_error` |
| `price_id` | Stripe price ID used | `price_...` |

### Alert Best Practices

1. **Start narrow, expand later** - Begin with checkout errors only
2. **Use digest mode** - Group similar errors to avoid alert fatigue
3. **Include context in alerts** - Add `intake_id` and `consult_subtype` to messages
4. **Set up escalation** - Email → Slack → PagerDuty for critical paths

---

## Runbook: Diagnosing Payment/Checkout Failures

Step-by-step guide with concrete click paths for each tool.

### Scenario: Patient reports "Checkout failed" or "Payment didn't go through"

#### Step 1: Get the intake ID

Ask the patient for their email or check support ticket for any error details.

#### Step 2: Check Sentry (2 minutes)

1. **Go to:** sentry.io → InstantMed → Issues
2. **Search:** `tags[checkout_error]:true` or paste intake ID in search
3. **Click the issue** → Look at:
   - **Tags panel (right side):** `consult_subtype`, `stripe_error_code`, `price_id`
   - **Breadcrumbs:** What user did before error
   - **Stack trace:** Click any line to see source code
4. **If `stripe_error_code` exists:** Note it for Stripe lookup

#### Step 3: Check Vercel Logs (2 minutes)

1. **Go to:** vercel.com → instantmed → Deployments
2. **Click the deployment** from the error timestamp
3. **Click "Functions" tab** → Filter by `/api/checkout` or `/api/stripe`
4. **Look for:**
   - `[ERROR]` lines with stack traces
   - `x-request-id` header (correlates with Sentry)
   - Status codes: 500 = server error, 400 = bad request

#### Step 4: Check Stripe Dashboard (3 minutes)

1. **Go to:** dashboard.stripe.com → Developers → Events
2. **Filter:** Last 24 hours, type = `checkout.session.*`
3. **Find the session** by customer email or timestamp
4. **Check:**
   - **Status:** `complete`, `expired`, `open`?
   - **Payment Intent:** Did payment succeed?
   - **Webhook deliveries:** Click "Webhooks" → look for failures (red icons)

If webhook failed:
1. Click the failed webhook event
2. Check response body for error message
3. Click "Resend" to retry

#### Step 5: Check Database (if intake missing)

```sql
-- Find intake by patient email
SELECT i.id, i.status, i.payment_status, i.stripe_session_id, i.created_at
FROM intakes i
JOIN profiles p ON i.patient_id = p.id
WHERE p.email = 'patient@example.com'
ORDER BY i.created_at DESC
LIMIT 5;
```

### Common Resolution Paths

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Sentry shows `No such price` | Wrong Stripe price ID in env | Update env var, redeploy |
| Stripe shows session `complete` but intake `pending_payment` | Webhook failed | Resend webhook from Stripe dashboard |
| Vercel logs show 500 on `/api/stripe/webhook` | Webhook signature invalid | Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard |
| No Sentry error, no Stripe event | Checkout never initiated | Check client-side console logs, network tab |
| Intake exists with `paid` but patient says "failed" | Redirect issue | Check success/cancel URL configuration |

---

## Useful Links

- [Sentry Dashboard](https://sentry.io)
- [Vercel Dashboard](https://vercel.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [PostHog Dashboard](https://app.posthog.com)
