# Feature Flags & Kill Switches

## Overview

InstantMed uses two feature flag systems:

1. **Database-based flags** (`lib/feature-flags.ts`) - Cached, requires DB lookup, admin-editable
2. **Env-var flags** (`lib/config/feature-flags.ts`) - Instant, no DB, requires redeploy

This document covers the **env-var flags** for quick emergency kill switches.

## How to Disable a Flow Quickly

### 1. Via Vercel Dashboard (Production)

1. Go to Vercel → Project → Settings → Environment Variables
2. Add/update the relevant env var (see table below)
3. Redeploy the production branch

### 2. Via `.env.local` (Development)

```bash
# Add to .env.local
DISABLE_CHECKOUT_MED_CERT=true
```

Then restart your dev server.

## Available Kill Switches

| Env Var | Effect | User Message |
|---------|--------|--------------|
| `DISABLE_CHECKOUT_MED_CERT=true` | Blocks medical certificate checkout | "This service is temporarily unavailable." |
| `DISABLE_CHECKOUT_PRESCRIPTION=true` | Blocks prescription/script checkout | "This service is temporarily unavailable." |
| `DISABLE_CHECKOUT_CONSULT=true` | Blocks consult checkout | "This service is temporarily unavailable." |
| `DISABLE_EMPLOYER_EMAIL=true` | Blocks employer email sending | "Employer email is temporarily unavailable." |
| `FORCE_CALL_REQUIRED=true` | Makes calls required/optional for consults | Varies by subtype |
| `DISABLE_CONSULT_SUBTYPES=weight_loss,mens_health` | Disables specific consult subtypes | "This service is temporarily unavailable." |

## Where Flags Are Checked

| Flow | File | Function |
|------|------|----------|
| Authenticated checkout | `lib/stripe/checkout.ts` | `createIntakeAndCheckoutAction()` |
| Guest checkout | `lib/stripe/guest-checkout.ts` | `createGuestCheckoutAction()` |
| Employer email | `app/actions/send-employer-email.ts` | `sendEmployerEmail()` |
| Consult call requirement | `app/actions/check-feature-flags.ts` | `checkConsultCallRequirement()` |

## Sentry Integration

When a kill switch blocks a flow:

1. A **breadcrumb** is added with category `feature-flag`
2. An **info-level event** is captured with:
   - Tags: `flow`, `service_type`, `consult_subtype`, `kill_switch_reason`
   - Fingerprint: `['kill-switch', flow, serviceType]` (deduplicated)

This allows you to monitor kill switch activations without flooding Sentry.

## Server Action for Client-Side Checks

Use the server action to check flags from client components:

```typescript
import { getFeatureFlagStatus, checkConsultCallRequirement } from "@/app/actions/check-feature-flags"

// Get all flag status
const flags = await getFeatureFlagStatus()
if (flags.checkoutDisabled.med_cert) {
  // Show disabled UI
}

// Check if call is required for consult
const callReq = await checkConsultCallRequirement("weight_loss")
if (callReq.required) {
  // Show "call required" messaging
}
```

## Emergency Runbook

### Scenario: Need to disable all medical certificates immediately

```bash
# In Vercel dashboard or .env
DISABLE_CHECKOUT_MED_CERT=true
```

Then trigger a redeploy (or restart dev server).

### Scenario: Single consult subtype causing issues

```bash
DISABLE_CONSULT_SUBTYPES=weight_loss
```

### Scenario: Need to require calls for all consults

```bash
FORCE_CALL_REQUIRED=true
```

This will:
- Make `weight_loss` consults require a call
- Show "call may be required" messaging for other subtypes

## Comparison: Env vs DB Flags

| Feature | Env Flags | DB Flags |
|---------|-----------|----------|
| Speed | Instant (no DB) | ~30s cache |
| Admin UI | No | Yes |
| Requires redeploy | Yes | No |
| Best for | Emergencies | Routine toggles |

**Use env flags for:**
- Emergency shutdowns
- Deployment-time config
- Features not yet in admin UI

**Use DB flags for:**
- Admin-controlled toggles
- Medication blocklists
- Safety symptom lists

## Testing

```bash
# Run feature flag E2E tests
PLAYWRIGHT=1 pnpm e2e --grep "feature-flags"

# Test with kill switch active
DISABLE_CHECKOUT_MED_CERT=true pnpm dev
# Then try to checkout for a med cert
```

## Files

| File | Purpose |
|------|---------|
| `lib/config/feature-flags.ts` | Env-var flag definitions and helpers |
| `app/actions/check-feature-flags.ts` | Server action for client-side checks |
| `lib/feature-flags.ts` | DB-based flags (existing) |
| `e2e/feature-flags.spec.ts` | Playwright tests |
