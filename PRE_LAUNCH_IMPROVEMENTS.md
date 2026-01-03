# 🚀 InstantMed Pre-Launch Improvements Guide

**Date:** January 3, 2026  
**Status:** Production Readiness Assessment  
**Version:** 1.0.0

---

## Executive Summary

This document outlines critical improvements, security hardening, and operational readiness tasks that should be completed before launching InstantMed to production. Items are prioritized by severity and impact.

### Priority Levels
- 🔴 **CRITICAL** - Must fix before launch (security/legal risks)
- 🟠 **HIGH** - Should fix before launch (stability/UX issues)
- 🟡 **MEDIUM** - Fix within first week post-launch
- 🟢 **LOW** - Nice to have enhancements

---

## 🔴 CRITICAL FIXES (Must Complete Before Launch)

### 1. Remove Test Endpoints from Production

**Risk:** Security vulnerability, data leakage

**Files to Remove/Protect:**
- `app/api/test/med-cert-render/route.ts` - Test PDF rendering endpoint
- `app/api/doctor/test-apitemplate/route.ts` - Test API endpoint

**Actions:**
```bash
# Option 1: Delete test routes
rm -rf app/api/test/
rm app/api/doctor/test-apitemplate/route.ts

# Option 2: Add environment check
if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
}
```

**Verification:**
- [ ] Test endpoints return 404 in production
- [ ] No test routes accessible via URL

---

### 2. Environment Variables Documentation

**Risk:** Deployment failures, service outages

**Missing:** `.env.example` template file

**Action:** Create comprehensive environment template

```bash
# Create .env.example with all required variables
cat > .env.example << 'EOF'
# =============================================================================
# InstantMed Environment Variables Template
# =============================================================================
# Copy this file to .env.local for local development
# Configure in Vercel dashboard for production

# -----------------------------------------------------------------------------
# Clerk Authentication (REQUIRED)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# -----------------------------------------------------------------------------
# Supabase Database (REQUIRED)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# -----------------------------------------------------------------------------
# Stripe Payments (REQUIRED)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Use pk_live_... in production
STRIPE_SECRET_KEY=sk_test_... # Use sk_live_... in production
STRIPE_WEBHOOK_SECRET=whsec_...

# -----------------------------------------------------------------------------
# Application URL (REQUIRED)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Use https://instantmed.com.au in production

# -----------------------------------------------------------------------------
# Sentry Error Tracking (OPTIONAL but recommended for production)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=instantmed
SENTRY_AUTH_TOKEN=...

# -----------------------------------------------------------------------------
# Email Service - Resend (REQUIRED for notifications)
# -----------------------------------------------------------------------------
RESEND_API_KEY=re_...

# -----------------------------------------------------------------------------
# Internal API Security (REQUIRED)
# -----------------------------------------------------------------------------
INTERNAL_API_SECRET=generate-a-secure-random-string-here

# -----------------------------------------------------------------------------
# Upstash Redis - Rate Limiting (OPTIONAL but recommended)
# -----------------------------------------------------------------------------
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# -----------------------------------------------------------------------------
# Clerk Webhooks (REQUIRED for user sync)
# -----------------------------------------------------------------------------
CLERK_WEBHOOK_SECRET=whsec_...

# -----------------------------------------------------------------------------
# Feature Flags (OPTIONAL)
# -----------------------------------------------------------------------------
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_OCR=true

# -----------------------------------------------------------------------------
# Node Environment
# -----------------------------------------------------------------------------
NODE_ENV=development # Use 'production' in production
EOF
```

**Verification:**
- [ ] `.env.example` committed to repository
- [ ] README.md references `.env.example`
- [ ] All team members can set up locally using template
- [ ] Vercel environment variables match production requirements

---

### 3. Database Migration Status Check

**Risk:** Runtime errors, data integrity issues

**Outstanding Migration:** `scripts/024_med_cert_drafts.sql`

**Action:**
```bash
# Check if migration was applied
# In Supabase SQL Editor:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'med_cert_drafts';

# If not exists, apply migration:
# 1. Open Supabase Dashboard > SQL Editor
# 2. Copy contents of scripts/024_med_cert_drafts.sql
# 3. Execute migration
# 4. Verify table created successfully
```

**Verification:**
- [ ] `med_cert_drafts` table exists in production database
- [ ] All RLS policies are active
- [ ] Indexes are created
- [ ] Foreign key constraints are valid

---

### 4. Security Headers Validation

**Risk:** XSS, clickjacking, data theft

**Current Status:** ✅ Headers configured in `next.config.mjs`

**Action:** Verify all security headers are working

**Test in Production:**
```bash
# Test security headers
curl -I https://your-domain.com | grep -E "Content-Security-Policy|X-Frame-Options|Strict-Transport"

# Expected headers:
# ✅ Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
# ✅ X-Content-Type-Options: nosniff
# ✅ X-Frame-Options: SAMEORIGIN
# ✅ X-XSS-Protection: 1; mode=block
# ✅ Referrer-Policy: strict-origin-when-cross-origin
# ✅ Content-Security-Policy: [full policy]
```

**Verification:**
- [ ] All security headers present in production
- [ ] CSP doesn't block legitimate resources
- [ ] Security headers score A+ on securityheaders.com

---

### 5. Console Statements in Production Code

**Risk:** Performance degradation, information leakage

**Current Status:** 9 console.* statements found in API routes

**Files to Fix:**
- `app/api/patient/referral/route.ts` - Line ~error handling
- `app/api/doctor/export/route.ts` - Line ~error handling
- `app/api/doctor/test-apitemplate/route.ts` - Line 17
- `app/api/test/med-cert-render/route.ts` - Line 77
- `app/api/terminology/amt/search/route.ts` - Multiple lines

**Action:** Replace with proper logging

```typescript
// BEFORE:
console.error("Error fetching referral data:", error)

// AFTER:
import { logger } from "@/lib/observability/logger"

logger.error("Error fetching referral data", {
  error: error instanceof Error ? error.message : String(error),
  context: "referral_fetch"
})
```

**Verification:**
- [ ] No console.* statements in API routes
- [ ] All errors logged to Sentry in production
- [ ] Sensitive data not logged

---

### 6. Stripe Webhook Configuration

**Risk:** Payment failures, revenue loss

**Action:** Verify webhook endpoint and events

**Required Webhook Events:**
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `customer.created`
- `customer.updated`

**Webhook URL:**
```
https://your-domain.com/api/webhooks/stripe
```

**Verification:**
- [ ] Webhook endpoint configured in Stripe Dashboard
- [ ] Webhook secret stored in production environment
- [ ] Test webhook delivery succeeds
- [ ] Failed payments trigger proper error handling
- [ ] Idempotency keys prevent duplicate processing

---

### 7. AHPRA and Medicare Compliance Review

**Risk:** Legal/regulatory violations, fines

**Action:** Final compliance checklist

**Medical Certificate Requirements:**
- [ ] Doctor AHPRA number displayed on all certificates
- [ ] Certificate includes required disclaimer text
- [ ] Patient consent collected before processing
- [ ] Data retention policy follows Australian healthcare laws
- [ ] Telehealth consultation standards met

**Medicare Validation:**
- [ ] Medicare number Luhn check algorithm validated
- [ ] Medicare number stored encrypted
- [ ] Medicare data access logged for audit

**Privacy (Privacy Act 1988):**
- [ ] Privacy policy updated and accessible
- [ ] Cookie consent banner (if using analytics)
- [ ] Data breach response plan documented
- [ ] Patient data deletion process implemented

**Verification:**
- [ ] Legal team reviewed compliance documentation
- [ ] All certificates include required legal disclaimers
- [ ] Audit log captures all medical data access

---

## 🟠 HIGH PRIORITY (Should Fix Before Launch)

### 8. Automated Testing Suite

**Current Status:** Only 3 test files exist

**Action:** Implement critical path testing

**Priority Test Coverage:**
1. **Payment Flow Tests**
   ```typescript
   // tests/payment-flow.test.ts
   - Test Stripe checkout creation
   - Test payment intent completion
   - Test webhook processing
   - Test refund handling
   ```

2. **Authentication Tests**
   ```typescript
   // tests/auth-flow.test.ts
   - Test Clerk sign-up flow
   - Test profile creation
   - Test admin access control
   - Test session management
   ```

3. **Medical Certificate Generation**
   ```typescript
   // tests/med-cert-generation.test.ts
   - Test PDF generation
   - Test all certificate types (work, uni, carer)
   - Test data validation
   - Test RLS policies
   ```

**Setup:**
```bash
# Install testing dependencies
pnpm add -D @testing-library/react @testing-library/jest-dom jest jest-environment-jsdom

# Add test script to package.json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

**Verification:**
- [ ] Critical payment flow tested
- [ ] Authentication flow tested
- [ ] Medical cert generation tested
- [ ] Test coverage > 60% for critical paths
- [ ] CI runs tests on every PR

---

### 9. Error Monitoring and Alerts

**Current Status:** Sentry configured but needs production validation

**Action:** Set up error alerting

**Sentry Configuration:**
```typescript
// Add to sentry.server.config.ts
beforeSend(event, hint) {
  // Filter PII
  if (event.request?.data) {
    delete event.request.data.medicareNumber
    delete event.request.data.dob
    delete event.request.data.phoneNumber
  }
  return event
}
```

**Alert Rules to Configure:**
1. **Critical Errors** - Immediate Slack notification
   - Payment processing failures
   - Database connection errors
   - Auth system failures

2. **High Priority** - Email notification within 15 min
   - PDF generation failures
   - Email delivery failures
   - Webhook processing errors

3. **Medium Priority** - Daily digest
   - Rate limit exceeded
   - Validation errors
   - API timeouts

**Verification:**
- [ ] Sentry receiving production errors
- [ ] Alert rules configured
- [ ] PII filtered from error reports
- [ ] On-call rotation established

---

### 10. Rate Limiting Implementation

**Current Status:** Partial implementation with Upstash

**Action:** Ensure rate limits on all sensitive endpoints

**Endpoints Needing Rate Limits:**
```typescript
// High risk endpoints (if not already protected):
✅ /api/med-cert/submit
✅ /api/admin/decline
✅ /api/medications
⚠️  /api/patient/referral
⚠️  /api/doctor/export
⚠️  /api/webhooks/clerk
⚠️  /api/webhooks/stripe (different strategy - idempotency)
```

**Recommended Rate Limits:**
- Public endpoints: 60 requests/min per IP
- Authenticated endpoints: 200 requests/min per user
- Admin endpoints: 500 requests/min per doctor
- Webhook endpoints: 1000 requests/min (validated by signature)

**Verification:**
- [ ] Rate limiting active on all sensitive routes
- [ ] Rate limit exceeded returns 429 status
- [ ] Appropriate headers (X-RateLimit-*) sent
- [ ] Redis/Upstash connection monitored

---

### 11. Backup and Disaster Recovery

**Risk:** Data loss, extended downtime

**Action:** Implement backup strategy

**Supabase Backups:**
- [ ] Enable daily automated backups (Supabase dashboard)
- [ ] Test backup restoration procedure
- [ ] Document recovery time objective (RTO: 4 hours)
- [ ] Document recovery point objective (RPO: 24 hours)

**Critical Data to Backup:**
- Patient profiles
- Medical certificates and prescriptions
- Payment records
- Audit logs

**Disaster Recovery Plan:**
```markdown
1. Database failure:
   - Restore from Supabase backup (< 4 hours)
   - Verify data integrity
   - Update connection strings if needed

2. Vercel deployment failure:
   - Rollback to previous deployment
   - Or redeploy from Git tag

3. Stripe webhook failure:
   - Query Stripe API for recent events
   - Manually reconcile payment records
```

**Verification:**
- [ ] Backup schedule configured
- [ ] Restoration procedure tested
- [ ] DR plan documented and accessible
- [ ] Team trained on recovery procedures

---

### 12. Performance Optimization

**Action:** Optimize for production traffic

**Database Query Optimization:**
```sql
-- Check for missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.5
ORDER BY n_distinct DESC;

-- Key indexes to verify exist:
-- ✅ requests(status, created_at)
-- ✅ requests(user_id, status)
-- ✅ med_cert_drafts(request_id, status)
-- ✅ payments(stripe_payment_intent_id)
-- ✅ profiles(clerk_user_id)
```

**Next.js Optimization:**
- [ ] Enable ISR for static pages (pricing, FAQ, about)
- [ ] Implement dynamic imports for heavy components
- [ ] Optimize images (use next/image everywhere)
- [ ] Add loading skeletons for async data

**CDN and Caching:**
- [ ] Configure Vercel Edge caching
- [ ] Set appropriate Cache-Control headers
- [ ] Enable gzip/brotli compression

**Verification:**
- [ ] Lighthouse score > 90 for key pages
- [ ] Time to First Byte (TTFB) < 200ms
- [ ] First Contentful Paint (FCP) < 1.5s
- [ ] Largest Contentful Paint (LCP) < 2.5s

---

### 13. Monitoring and Observability

**Action:** Set up production monitoring

**Metrics to Track:**
1. **Business Metrics**
   - Medical cert requests per day
   - Average approval time
   - Payment success rate
   - Revenue per day

2. **Technical Metrics**
   - API response times (p50, p95, p99)
   - Error rates by endpoint
   - Database connection pool usage
   - PDF generation time

3. **User Experience Metrics**
   - Web Vitals (CLS, LCP, FID/INP)
   - Form abandonment rate
   - Payment funnel completion

**Tools:**
- ✅ Vercel Analytics (already integrated)
- ✅ Sentry Performance (needs configuration)
- Consider: Datadog, New Relic, or CloudWatch

**Dashboard Setup:**
```typescript
// Add custom metrics
import { analytics } from '@/lib/analytics'

// Track business events
analytics.track('medical_certificate_requested', {
  certificateType: 'work',
  priority: false,
  amount: 19.95
})

analytics.track('payment_completed', {
  amount: 19.95,
  currency: 'AUD',
  provider: 'stripe'
})
```

**Verification:**
- [ ] Business metrics dashboard created
- [ ] Alerts configured for anomalies
- [ ] Weekly metrics review scheduled
- [ ] Team has access to dashboards

---

## 🟡 MEDIUM PRIORITY (First Week Post-Launch)

### 14. Clean Up Deprecated Code

**Files Marked as Deprecated:**
- `lib/flow/auth.ts` - Contains deprecated Supabase auth functions
- `lib/storage/documents.ts` - Contains deprecated upload function
- `lib/data/profiles.ts` - Contains deprecated profile function
- `lib/supabase/proxy.ts` - Deprecated after Clerk migration

**Action:**
```bash
# Review each deprecated function
# If no references exist, remove
# If references exist, migrate to new implementation
```

**Verification:**
- [ ] All deprecated functions either removed or documented
- [ ] No new code using deprecated APIs
- [ ] Migration guide created for any remaining deprecated code

---

### 15. Backup File Cleanup

**Found:** `proxy.ts.bak` in root directory

**Action:**
```bash
# Remove backup files
rm proxy.ts.bak

# Update .gitignore to prevent future backups
echo "*.bak" >> .gitignore
echo "*.backup" >> .gitignore
echo "*.old" >> .gitignore
```

**Verification:**
- [ ] No .bak, .backup, or .old files in repository
- [ ] .gitignore prevents backup files

---

### 16. API Documentation

**Missing:** Public API documentation for doctor dashboard

**Action:** Create API documentation

**Recommended Tool:** Swagger/OpenAPI

```yaml
# docs/api.yaml
openapi: 3.0.0
info:
  title: InstantMed API
  version: 1.0.0
paths:
  /api/med-cert/submit:
    post:
      summary: Submit medical certificate request
      security:
        - clerkAuth: []
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/MedCertRequest'
```

**Verification:**
- [ ] API endpoints documented
- [ ] Authentication requirements specified
- [ ] Request/response examples provided
- [ ] Rate limits documented

---

### 17. Accessibility Audit

**Action:** Ensure WCAG 2.1 AA compliance

**Key Areas:**
- [ ] Keyboard navigation works throughout
- [ ] Screen reader compatibility
- [ ] Color contrast meets requirements
- [ ] Form labels properly associated
- [ ] Error messages announced to screen readers
- [ ] Focus indicators visible

**Tools:**
```bash
# Install accessibility testing tools
pnpm add -D @axe-core/react eslint-plugin-jsx-a11y

# Run accessibility tests
npx lighthouse --only-categories=accessibility https://your-domain.com
```

**Verification:**
- [ ] Lighthouse accessibility score > 95
- [ ] Manual keyboard navigation test passed
- [ ] Screen reader test passed (NVDA/JAWS)

---

## 🟢 LOW PRIORITY (Post-Launch Enhancements)

### 18. Feature Flags System

**Current Status:** Basic feature flags in environment variables

**Enhancement:** Implement proper feature flag system

**Options:**
- LaunchDarkly (paid, enterprise-grade)
- Flagsmith (open source)
- PostHog (includes analytics)
- Custom implementation with Supabase

**Benefits:**
- Gradual rollout of new features
- A/B testing capabilities
- Quick rollback without deployment

---

### 19. Email Template Improvements

**Enhancement:** Professional email design system

**Current:** Basic transactional emails via Resend

**Improvements:**
- Branded email templates
- Mobile-responsive design
- Inline CSS for compatibility
- Unsubscribe management
- Email analytics

**Tools:**
- React Email (already compatible with Resend)
- MJML for responsive templates

---

### 20. Patient App / Mobile Optimization

**Enhancement:** PWA improvements or native mobile app

**PWA Enhancements:**
- Offline support for viewing past certificates
- Push notifications for status updates
- Add to home screen prompt
- App-like navigation

**Native App Considerations:**
- React Native for iOS/Android
- Share codebase with web
- Better native performance
- App store presence

---

## 📋 Pre-Launch Checklist Summary

### Critical (Must Complete)
- [ ] 1. Remove/protect test endpoints
- [ ] 2. Create .env.example documentation
- [ ] 3. Apply outstanding database migrations
- [ ] 4. Verify security headers in production
- [ ] 5. Replace console.* with proper logging
- [ ] 6. Configure and test Stripe webhooks
- [ ] 7. Complete AHPRA/Medicare compliance review

### High Priority (Should Complete)
- [ ] 8. Implement automated testing for critical paths
- [ ] 9. Set up error monitoring and alerts
- [ ] 10. Ensure rate limiting on all endpoints
- [ ] 11. Configure backup and disaster recovery
- [ ] 12. Optimize performance (Lighthouse > 90)
- [ ] 13. Set up monitoring dashboards

### Medium Priority (First Week)
- [ ] 14. Clean up deprecated code
- [ ] 15. Remove backup files
- [ ] 16. Create API documentation
- [ ] 17. Complete accessibility audit

### Low Priority (Post-Launch)
- [ ] 18. Implement feature flags system
- [ ] 19. Improve email templates
- [ ] 20. Enhance PWA/mobile experience

---

## 🎯 Launch Timeline Recommendation

### Week -2 (Before Launch)
- Complete all CRITICAL items (1-7)
- Complete HIGH priority items (8-13)
- Run security penetration test
- Load test with expected traffic + 3x buffer

### Week -1 (Pre-Launch)
- Final compliance review with legal team
- Soft launch to limited users (beta testing)
- Monitor errors and performance
- Fix any critical issues discovered

### Launch Day
- Deploy to production with monitoring
- Watch dashboards for first 24 hours
- Have rollback plan ready
- Post-launch retrospective

### Week +1 (Post-Launch)
- Complete MEDIUM priority items (14-17)
- Address any launch issues
- Collect user feedback
- Plan next iteration

---

## 📞 Support and Resources

### Key Contacts
- **Technical Lead:** [Name]
- **DevOps/Infrastructure:** [Name]
- **Security/Compliance:** [Name]
- **On-Call Rotation:** [Schedule Link]

### Documentation Links
- [Runbook for Common Issues]
- [Incident Response Playbook]
- [Architecture Diagrams]
- [Database Schema Documentation]

### Monitoring Dashboards
- Vercel Analytics: [Link]
- Sentry: [Link]
- Supabase: [Link]
- Stripe: [Link]

---

**Last Updated:** January 3, 2026  
**Next Review:** Pre-Launch (2 weeks before go-live)
