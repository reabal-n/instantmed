# Production Launch Checklist

Last updated: 2025-01-12

## Pre-Launch Manual Steps

### 🔒 Supabase Auth Settings (REQUIRED)

1. **Enable Leaked Password Protection**
   - Go to: [Supabase Dashboard](https://supabase.com/dashboard) → Project → Authentication → Providers → Email
   - Enable "Leaked Password Protection"
   - This checks passwords against HaveIBeenPwned.org to prevent compromised passwords
   - See: https://supabase.com/docs/guides/auth/password-security

2. **Review Auth Rate Limits**
   - Authentication → Rate Limits
   - Recommended: Use percentage-based connection strategy for better scaling

### 💳 Stripe Configuration

1. **Verify Price IDs**
   - Confirm all `STRIPE_PRICE_*` env vars match production Stripe account
   - Test mode uses `price_test_*`, production uses `price_live_*`

2. **Configure Webhooks**
   - Create webhook endpoint: `https://instantmed.com.au/api/webhooks/stripe`
   - Events to subscribe:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `checkout.session.completed`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

3. **Test Payment Flow**
   - Complete a test purchase end-to-end
   - Verify webhook delivery in Stripe dashboard

### 📧 Email Configuration

1. **Resend Domain Verification**
   - Verify sending domain in Resend dashboard
   - Update `RESEND_FROM_EMAIL` with verified domain

2. **Test Email Delivery**
   - Trigger each email type and verify delivery
   - Check spam folder behavior

### 🌐 Vercel Environment Variables

Required production env vars:
- [ ] `NEXT_PUBLIC_APP_URL` = `https://instantmed.com.au`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY` (live key)
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `INTERNAL_API_SECRET`
- [ ] `CLERK_SECRET_KEY` (if using Clerk)

Optional but recommended:
- [ ] `UPSTASH_REDIS_REST_URL` (rate limiting)
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `SENTRY_DSN` (error tracking)

### 🗄️ Database Migrations

Run migrations in production:
```bash
supabase db push --project-ref witzcrovsoumktyndqgz
```

Or apply via Supabase dashboard → SQL Editor.

Key migrations to verify:
- `20250112000001_security_fix_search_path.sql`
- `20250112000002_security_fix_view_definer.sql`
- `20250112000003_security_fix_safety_audit_rls.sql`
- `20250112000004_security_move_extension.sql`
- `20250112000005_performance_rls_initplan.sql`

### 📊 Monitoring Setup

1. **Sentry** - Already configured in `instrumentation.ts`
   - Verify DSN is set in production

2. **Uptime Monitoring** (recommended)
   - Set up BetterStack, Checkly, or similar
   - Monitor: `/`, `/api/health`, key service endpoints

3. **Stripe Webhook Alerts**
   - Configure alerts for failed webhook deliveries

## Post-Launch Verification

- [ ] Complete a real user flow (sign up → request → payment → delivery)
- [ ] Verify doctor dashboard access
- [ ] Check Sentry for any new errors
- [ ] Monitor Stripe for successful payments
- [ ] Verify email delivery to real addresses

## Rollback Plan

If critical issues arise:
1. Revert Vercel deployment to previous version
2. If DB migration issue, apply rollback migration
3. Notify affected users via email

---

## Security Fixes Applied (2025-01-12)

| Fix | Migration | Status |
|-----|-----------|--------|
| Function search_path hardening | `20250112000001` | ✅ Applied |
| View SECURITY INVOKER | `20250112000002` | ✅ Applied |
| RLS INSERT restriction | `20250112000003` | ✅ Applied |
| Extension schema move | `20250112000004` | ✅ Applied |
| RLS performance optimization | `20250112000005` | ✅ Applied |

## Performance Fixes Applied

All RLS policies updated to use `(select auth.uid())` pattern for optimal query performance at scale.
