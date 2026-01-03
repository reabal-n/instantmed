# 🩺 InstantMed Comprehensive Platform Audit Report

**Date:** January 3, 2026  
**Auditor:** GitHub Copilot  
**Scope:** Full platform audit - security, code quality, UX, performance, compliance  
**Status:** 🔍 AUDIT COMPLETE

---

## Executive Summary

InstantMed is an Australian telehealth platform built with Next.js 16, Clerk authentication, Supabase database, and Stripe payments. The platform provides medical certificates and prescriptions online through AHPRA-registered GPs.

This audit identified **76 ESLint errors**, **82 warnings**, and several areas requiring attention across security, code quality, and operational readiness.

### Quick Stats
- **Total ESLint Issues:** 158 (76 errors, 82 warnings)
- **Critical Security Issues:** 2
- **High Priority Issues:** 6
- **Medium Priority Issues:** 12
- **Low Priority / Recommendations:** 15+

---

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

### 1. Console Statements in Production Code (76 errors)

**Risk Level:** HIGH - Information leakage, performance impact, unprofessional logs in production

**Locations (sample of 50+ files):**
```
lib/env.ts (lines 30, 83)
lib/feature-flags.ts (lines 36, 48, 58, 82, 191)
lib/flow/auth.ts (lines 38, 59, 113, 167, 198, 229, 278)
lib/flow/draft/storage.ts (lines 70, 88, 109, 157, 219, 246)
lib/data/profiles.ts (lines 104, 110, 134, 168)
lib/data/requests.ts (lines 544, 567)
lib/email/send.ts (lines 151, 160)
lib/approval/invariants.ts (lines 85, 169)
lib/analytics/intake-tracking.ts (line 28)
lib/analytics/web-vitals.ts (line 54)
lib/hooks/use-notifications.ts (line 94)
lib/supabase/proxy.ts (line 14)
components/shared/error-boundary.tsx (lines 42-45, 125)
components/shared/global-search.tsx (line 86)
components/shared/inline-auth-step.tsx (line 68)
components/shared/appointment-scheduler.tsx (line 83)
components/intake/enhanced-intake-flow.tsx (line 663)
components/ui/error-boundary.tsx (line 28)
components/ui/form-persistence.tsx (lines 34, 49)
```

**Impact:**
- Sensitive patient data could be logged to browser console
- Server-side logs may contain PII
- Performance degradation from excessive logging
- Unprofessional appearance if users open dev tools

**Recommendation:** Replace all `console.*` statements with the existing `@/lib/logger` utility which properly handles log levels and production filtering.

---

### 2. CSRF Protection Not Applied to Most API Routes

**Risk Level:** CRITICAL - Cross-site request forgery attacks possible

**Current State:**
- CSRF implementation exists at `lib/security/csrf.ts` with `validateCSRFToken()` and `requireValidCsrf()`
- Only **1 API route** uses CSRF protection: `/api/admin/decline/route.ts`

**Unprotected sensitive routes:**
```
/api/patient/profile/* (profile updates)
/api/patient/refill-prescription/* (prescription actions)
/api/patient/retry-payment/* (payment retries)
/api/doctor/assign-request/* (doctor assignments)
/api/doctor/update-request/* (request status changes)
/api/med-cert/submit/* (medical certificate submissions)
/api/repeat-rx/submit/* (repeat prescription submissions)
/api/repeat-rx/[id]/decision/* (approval/decline decisions)
```

**Recommendation:** Apply CSRF protection to all state-changing API routes (POST, PUT, PATCH, DELETE).

---

## 🟠 HIGH PRIORITY ISSUES (Should Fix Soon)

### 3. Rate Limiting Inconsistently Applied

**Risk Level:** HIGH - API abuse, DDoS vulnerability, potential financial loss

**Current State:**
- Two rate limiting implementations exist:
  1. `lib/rate-limit/index.ts` - In-memory (won't work across serverless instances)
  2. `lib/rate-limit/upstash.ts` - Redis-based (production-ready)

**Rate limited routes (only 2):**
- `/api/medications/route.ts` ✅
- `/api/med-cert/submit/route.ts` ✅

**Unprotected sensitive routes:**
```
/api/admin/approve/*
/api/admin/bulk-action/*
/api/doctor/*
/api/patient/retry-payment/*
/api/repeat-rx/*
/api/ai/*
/api/stripe/webhook/* (webhook should use signature verification, not rate limiting)
```

**Recommendation:** 
1. Remove in-memory rate limiter (`lib/rate-limit/index.ts`) - it won't work in serverless
2. Apply Upstash rate limiting to all sensitive endpoints
3. Configure Upstash Redis environment variables

---

### 4. React Hook Dependencies Missing

**Risk Level:** MEDIUM - Stale closures, unexpected behavior

**Locations:**
```
components/intake/enhanced-intake-flow.tsx:556 - useCallback missing 'handleSubmit' dependency
components/shared/animated-icons.tsx:648 - useEffect missing 'animations' dependency
components/flow/telehealth-flow-shell.tsx:251 - setState called directly in useEffect
```

**Recommendation:** Fix React hook dependency arrays to prevent stale closure bugs.

---

### 5. Unused Variables and Imports (82 warnings)

**Impact:** Bundle size bloat, code maintainability issues

**Sample locations:**
```
components/patient/enhanced-dashboard.tsx - 'Filter', 'Eye', 'toast' unused
components/repeat-rx/intake-flow.tsx - 'supabase' unused
components/ui/3d-folder.tsx - 'setIsSliding' unused
components/ui/alert.tsx - 'AlertCircle' unused
components/marketing/service-landing-page.tsx - 'colors' unused
lib/flow/configs.ts - 'withServiceStep' unused
lib/data/request-lifecycle.ts - 'VALID_PAYMENT_TRANSITIONS' unused
```

**Recommendation:** Remove unused imports and variables to reduce bundle size and improve code clarity.

---

### 6. TODO Items Still Pending

**Locations and Status:**
```typescript
// lib/data/requests.ts:466
// TODO: Implement when documents table is created

// lib/referrals/referral-service.ts:41
// TODO: Implement when referrals tracking table is created

// lib/observability/error-handler.ts:115
// TODO: Integrate with error tracking service

// components/med-cert/med-cert-flow-v2.tsx:548
// TODO: Submit to API

// app/api/patient/retry-payment/route.ts:70
// TODO: Implement email notification for retry
```

**Recommendation:** Review and implement pending TODOs or remove them if no longer relevant.

---

### 7. In-Memory Rate Limiter Won't Work in Serverless

**File:** `lib/rate-limit/index.ts`

**Issue:**
```typescript
// In-memory store (use Redis in production)
const store = new Map<string, RateLimitEntry>()
```

Serverless functions are stateless - each invocation may run on a different instance, making in-memory rate limiting ineffective.

**Recommendation:** 
1. Delete `lib/rate-limit/index.ts`
2. Use only `lib/rate-limit/upstash.ts` which uses Redis
3. Update all imports to use the Upstash implementation

---

### 8. SMS Service Not Configured

**File:** `lib/sms/service.ts`

**Current State:** SMS service is fully implemented with Twilio integration but requires environment variables:
```
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
```

**Impact:** Patients won't receive SMS notifications for:
- Request approval/decline
- eScript delivery
- Payment confirmation

**Recommendation:** Configure Twilio credentials in production environment or document that SMS is optional.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. dangerouslySetInnerHTML Usage (30+ instances)

**Risk Level:** MEDIUM (mitigated by JSON.stringify)

**Files using dangerouslySetInnerHTML:**
- Most usages are for JSON-LD structured data (safe)
- `components/ui/spotlight-card.tsx` - CSS injection (safe)
- `components/ui/safe-html.tsx` - Has sanitization (safe)

**Assessment:** Current usage is safe because:
1. JSON.stringify escapes special characters
2. SafeHtml component uses DOMPurify sanitization
3. No user input is directly injected

**Recommendation:** No immediate action needed, but audit any new usages.

---

### 10. Test Coverage is Minimal

**Current Tests:**
```
__tests__/med-cert-flow-v2.test.ts
__tests__/patient-api.test.ts
__tests__/payment-flow.test.ts
__tests__/repeat-rx/
```

**Missing:**
- No testing framework configured (no vitest/jest in dependencies)
- Tests use custom minimal test utilities
- No integration tests
- No E2E tests

**Recommendation:** 
1. Add vitest or jest as testing framework
2. Add tests for critical payment flows
3. Add E2E tests with Playwright for patient journey

---

### 11. Environment Variable Validation at Runtime

**Current:** `lib/env.ts` has validation but it's opt-in.

**Issue:** Missing required environment variables are only caught when accessed, not at startup.

**Recommendation:** Call `validateEnv()` at application startup and fail fast if critical variables are missing.

---

### 12. Head Element Usage Warning

**File:** `lib/email/templates/base-layout.tsx:11`

**Warning:** Using `<head>` element instead of Next.js `<Head>` component.

**Note:** This is actually fine for email templates (they're not Next.js pages), but the linter doesn't know that.

**Recommendation:** Add eslint-disable comment with explanation.

---

### 13. Sitemap Could Be More Dynamic

**File:** `app/sitemap.ts`

**Current:** Includes static pages and programmatic SEO pages.

**Missing:**
- Blog posts (if dynamic)
- Medication pages
- Location pages for all cities

**Recommendation:** Add all dynamic content pages to sitemap for better SEO.

---

### 14. User Deletion Not Fully Implemented

**File:** `app/api/webhooks/clerk/route.ts:119`

**Current:**
```typescript
case 'user.deleted': {
  // Optionally delete the profile
  // await supabase.from('profiles').delete().eq('clerk_user_id', id)
}
```

**Issue:** User deletion is commented out - patient data may persist after Clerk account deletion.

**Recommendation:** 
1. Decide on data retention policy
2. Either soft-delete profiles or anonymize data
3. Consider GDPR compliance requirements

---

### 15. Feature Flags Table May Not Exist

**File:** `lib/feature-flags.ts`

**Issue:** Feature flags query `kill_switches` table which may not exist in all environments.

**Current Mitigation:** Code logs warning and returns default values if table doesn't exist.

**Recommendation:** Ensure migration `20241217000003_feature_flags.sql` is applied to all environments.

---

## 🟢 LOW PRIORITY / RECOMMENDATIONS

### 16. Code Style: setState in useEffect

**File:** `components/flow/telehealth-flow-shell.tsx:251`

**Issue:** Calling setState synchronously in useEffect can cause cascading renders.

**Recommendation:** Use a flag variable or move logic to useMemo/useCallback.

---

### 17. Unused ESLint Disable Directive

**File:** `components/repeat-rx/intake-flow.tsx:668`

**Warning:** Unused eslint-disable directive.

**Recommendation:** Remove the unnecessary disable comment.

---

### 18. Consider TypeScript Strict Mode Enhancements

**File:** `tsconfig.json`

**Current:** Strict mode is enabled.

**Recommendation:** Consider adding:
```json
"noUncheckedIndexedAccess": true,
"exactOptionalPropertyTypes": true
```

---

### 19. Bundle Analyzer Available But Not Documented

**File:** `next.config.mjs`

**Feature:** `ANALYZE=true pnpm build` will generate bundle analysis.

**Recommendation:** Document this in README for performance optimization.

---

### 20. Email Templates Use React Email Style

**Observation:** Email templates in `lib/email/templates/` use React components.

**Recommendation:** Consider using `@react-email/components` for better email client compatibility.

---

## ✅ THINGS DONE WELL

### Security Positives
1. **Stripe Webhook Security** - Proper signature verification and idempotency
2. **Row Level Security** - Comprehensive RLS policies in Supabase migrations
3. **Content Security Policy** - Fully implemented in next.config.mjs
4. **Input Sanitization** - `lib/security/sanitize.ts` with Zod schemas
5. **HSTS, X-Frame-Options, etc.** - All security headers configured
6. **Clerk Authentication** - Modern, secure authentication provider
7. **Audit Logging** - `lib/security/audit-log.ts` for tracking actions
8. **Fraud Detection** - `lib/fraud/detector.ts` checks for suspicious patterns

### Architecture Positives
1. **Clean Code Organization** - Logical folder structure
2. **Server/Client Separation** - Proper use of "use server" and "use client"
3. **Type Safety** - TypeScript throughout with strict mode
4. **Database Migrations** - Well-organized with proper versioning (29 migrations)
5. **Feature Flags** - Database-driven kill switches for services
6. **Logger Utility** - Centralized logging (just needs to be used consistently)

### UX Positives
1. **Accessibility** - Skip-to-content, ARIA labels, live regions
2. **SEO** - Comprehensive metadata, structured data, sitemap
3. **Error Pages** - Custom 404, error.tsx, global-error.tsx
4. **Mobile Optimization** - Touch targets, responsive design
5. **Performance** - Image optimization, code splitting

---

## 📋 PRIORITIZED ACTION PLAN

### Phase 1: Critical Security (This Week)
| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P0 | Apply CSRF to all mutation APIs | 2-3 hours | High |
| P0 | Remove in-memory rate limiter, use Upstash | 1 hour | High |
| P0 | Replace console.* with logger | 2-4 hours | Medium |

### Phase 2: High Priority (Next 2 Weeks)
| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P1 | Add rate limiting to sensitive endpoints | 2 hours | High |
| P1 | Fix React hook dependencies | 1 hour | Medium |
| P1 | Clean up unused imports/variables | 1-2 hours | Low |
| P1 | Implement pending TODOs or remove | 4-6 hours | Medium |

### Phase 3: Medium Priority (Next Month)
| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P2 | Add testing framework and tests | 1-2 days | Medium |
| P2 | Configure SMS notifications | 2 hours | Medium |
| P2 | Add startup environment validation | 1 hour | Medium |
| P2 | Implement user deletion handling | 2 hours | Medium |

### Phase 4: Recommendations (Ongoing)
| Priority | Issue | Effort | Impact |
|----------|-------|--------|--------|
| P3 | Expand sitemap with dynamic pages | 2 hours | Low |
| P3 | Add bundle size monitoring | 1 hour | Low |
| P3 | Document development scripts | 1 hour | Low |

---

## 📊 METRICS SUMMARY

| Category | Score | Notes |
|----------|-------|-------|
| **Security** | 7/10 | Good foundation, needs CSRF and consistent rate limiting |
| **Code Quality** | 6/10 | Many linting errors, unused code |
| **Testing** | 3/10 | Minimal test coverage |
| **Performance** | 8/10 | Good optimizations, bundle analyzer available |
| **SEO** | 9/10 | Excellent metadata and structured data |
| **Accessibility** | 7/10 | Good basics, could add more ARIA |
| **Documentation** | 5/10 | README exists but could be more comprehensive |
| **Monitoring** | 7/10 | Sentry configured, analytics in place |

**Overall Platform Readiness: 70%**

---

## 🔒 ENVIRONMENT VARIABLES CHECKLIST

### Required for Production
| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk authentication |
| `CLERK_SECRET_KEY` | Clerk server-side auth |
| `CLERK_WEBHOOK_SECRET` | User sync webhook |
| `NEXT_PUBLIC_SUPABASE_URL` | Database connection |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side DB access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB access |
| `STRIPE_SECRET_KEY` | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Payment webhooks |
| `RESEND_API_KEY` | Email notifications |
| `NEXT_PUBLIC_SITE_URL` | Base URL for redirects |
| `SENTRY_DSN` | Error tracking |
| `INTERNAL_API_KEY` | Server-to-server auth |

### Optional (Recommended)
| Variable | Purpose |
|----------|---------|
| `UPSTASH_REDIS_REST_URL` | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `TWILIO_ACCOUNT_SID` | SMS notifications |
| `TWILIO_AUTH_TOKEN` | SMS notifications |
| `TWILIO_FROM_NUMBER` | SMS sender |
| `VERCEL_AI_GATEWAY_API_KEY` | AI features |

---

*Generated by GitHub Copilot - January 3, 2026*  
*Audit Scope: Security, Code Quality, UX, Performance, Compliance*
