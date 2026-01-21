# Launch Readiness Checklist

## ✅ Completed

### Authentication & Authorization
- [x] Clerk authentication fully integrated
- [x] All server-side code migrated from `createClient()` to `createServiceRoleClient()`
- [x] Middleware protects `/patient/*`, `/doctor/*`, `/admin/*` routes
- [x] Auth callback handles profile creation fallback
- [x] Role-based redirects working (patient → /patient, doctor/admin → /doctor)
- [x] Login audit logging implemented

### Error Handling
- [x] Global error boundary (`app/error.tsx`) with retry logic
- [x] Root error boundary (`app/global-error.tsx`) with Sentry reporting
- [x] 404 not-found page exists
- [x] Structured logging throughout (no production console.log)

### Security
- [x] CSP headers configured (script-src, connect-src, frame-src)
- [x] Security headers: HSTS, X-Frame-Options, X-Content-Type-Options
- [x] Stripe webhook signature verification
- [x] Environment variable validation with Zod (fails build on missing vars)
- [x] Rate limiting infrastructure (Redis + memory fallback)
- [x] Service role client used for all server-side DB access

### Performance & UX
- [x] 25 loading.tsx files for key routes
- [x] Image optimization enabled
- [x] PostHog analytics via reverse proxy (avoids ad blockers)

### Payments
- [x] Stripe webhook handles: checkout.session.completed, expired, charge.refunded, payment_failed
- [x] Idempotent event processing (atomic claim via DB function)
- [x] Dead letter queue for failed events
- [x] Refund email notifications

### Monitoring
- [x] Sentry integration for error tracking
- [x] Structured logger with context
- [x] Audit logging for logins and key actions

---

## 🔲 Pre-Launch Verification (Manual)

### Critical User Flows
Test these end-to-end in staging:

1. **Patient Intake Flow**
   - [ ] Sign up as new patient
   - [ ] Complete onboarding (address, Medicare)
   - [ ] Start medical certificate request
   - [ ] Complete payment via Stripe
   - [ ] Verify intake appears in doctor queue

2. **Doctor Review Flow**
   - [ ] Sign in as doctor
   - [ ] View intake in queue
   - [ ] Review patient details
   - [ ] Approve certificate
   - [ ] Verify PDF generated and stored
   - [ ] Verify patient receives email notification

3. **Certificate Download**
   - [ ] Patient can view certificate in dashboard
   - [ ] Patient can download PDF
   - [ ] Certificate verification page works

4. **Decline/Refund Flow**
   - [ ] Doctor can decline intake
   - [ ] Refund processed via Stripe
   - [ ] Patient receives refund notification email

### Email Delivery
- [ ] Test email sends from Resend (check spam folder)
- [ ] Verify email templates render correctly
- [ ] Check unsubscribe links work

### Mobile Testing
- [ ] Patient dashboard responsive
- [ ] Intake form usable on mobile
- [ ] Payment flow works on mobile

---

## 🔧 Recommended Before Launch

### High Priority
1. **Smoke test all email templates** - Send test emails for each type
2. **Verify Stripe webhook in production** - Use Stripe CLI to send test events
3. **Check Sentry is receiving errors** - Trigger a test error
4. **Verify DNS and SSL** - All domains resolve, HTTPS works

### Medium Priority
1. **Set up uptime monitoring** - Use Vercel or external service
2. **Configure Stripe fraud rules** - Review Radar settings
3. **Review Clerk security settings** - MFA, session duration
4. **Test password reset flow** - Via Clerk Account Portal

### Low Priority (Post-Launch OK)
1. **Performance audit** - Lighthouse scores
2. **Accessibility audit** - Screen reader testing
3. **SEO verification** - Check robots.txt, sitemap

---

## Environment Variables Checklist

### Required for Production
```
NEXT_PUBLIC_APP_URL=https://instantmed.com.au
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
INTERNAL_API_SECRET=
```

### Required for Full Functionality
```
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_WEBHOOK_SECRET=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
```

### Optional but Recommended
```
UPSTASH_REDIS_REST_URL=     # Rate limiting
UPSTASH_REDIS_REST_TOKEN=
VERCEL_AI_GATEWAY_API_KEY=  # AI features
NEXT_PUBLIC_POSTHOG_KEY=    # Analytics
```

---

## Go-Live Checklist

### 24 Hours Before
- [ ] Freeze code changes
- [ ] Run full test suite
- [ ] Verify all env vars in production
- [ ] Check database migrations are applied
- [ ] Notify support team

### Launch Day
- [ ] Deploy to production
- [ ] Smoke test critical flows
- [ ] Monitor Sentry for errors
- [ ] Watch Stripe dashboard for payments
- [ ] Keep team on standby for 2 hours

### 24 Hours After
- [ ] Review error logs
- [ ] Check email delivery rates
- [ ] Verify analytics data
- [ ] Address any user-reported issues
