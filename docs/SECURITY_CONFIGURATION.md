# Security Configuration Documentation

**Document Version:** 1.0
**Last Updated:** January 2026
**Classification:** Internal

---

## Overview

This document describes the security configurations and rationale for InstantMed's telehealth platform.

---

## 1. Content Security Policy (CSP)

### Current Configuration

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https: blob:;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://*.supabase.co https://api.stripe.com https://*.sentry.io https://*.posthog.com;
frame-src https://js.stripe.com https://challenges.cloudflare.com;
frame-ancestors 'self';
object-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

### Rationale for `unsafe-inline` and `unsafe-eval`

**Why these directives are present:**

1. **Next.js Framework Requirement**
   - Next.js injects inline scripts for page hydration
   - Styled-components generates inline styles
   - Dynamic imports use `eval` for code splitting

2. **Alternative Considered: Nonce-based CSP**
   - Would require custom Next.js configuration
   - Significant build complexity increase
   - Not fully supported in Next.js 15 production builds

3. **Mitigations in Place**
   - All scripts are first-party (no user-generated code)
   - No `innerHTML` with user content
   - Input sanitization removes script tags
   - `frame-ancestors 'self'` prevents clickjacking

### CSP Violation Monitoring

CSP violations are reported to Sentry:
```javascript
Content-Security-Policy-Report-Only: ... report-uri https://sentry.io/api/XXX/security/
```

---

## 2. HTTP Security Headers

### Configured Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTPS enforcement |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing prevention |
| `X-Frame-Options` | `SAMEORIGIN` | Clickjacking protection |
| `X-XSS-Protection` | `1; mode=block` | XSS filter (legacy browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer control |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Feature restrictions |

### HSTS Configuration

- **Duration:** 2 years (63,072,000 seconds)
- **Subdomains:** Included
- **Preload:** Enabled (submitted to preload list)

---

## 3. Authentication Security

### Clerk Configuration

- **Provider:** Clerk (clerk.com)
- **Session Duration:** 7 days (with refresh)
- **MFA:** Available, optional for patients, recommended for clinicians

### Session Security

```typescript
// Middleware configuration
export default clerkMiddleware({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
})
```

### Protected Routes

| Path Pattern | Required Auth | Required Role |
|--------------|---------------|---------------|
| `/patient/*` | Yes | patient |
| `/doctor/*` | Yes | doctor |
| `/admin/*` | Yes | admin |
| `/api/admin/*` | Yes | admin |

---

## 4. CSRF Protection

### Implementation

**Location:** `lib/security/csrf.ts`

```typescript
// Token generation
const token = crypto.randomBytes(32).toString('hex')

// Cookie settings
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600, // 1 hour
}
```

### Protected Operations

- All state-changing API routes (POST, PUT, PATCH, DELETE)
- Form submissions
- Payment initiation

### Excluded Operations

- Webhook endpoints (use signature verification instead)
- Public read-only endpoints

---

## 5. Rate Limiting

### Implementation

**Location:** `lib/rate-limit/redis.ts`

**Backend:** Upstash Redis (production), In-memory (development)

### Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | 15 minutes |
| API (general) | 60 requests | 1 minute |
| Sensitive operations | 5 requests | 1 minute |
| AI endpoints | 20 requests | 1 minute |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1640000000
```

---

## 6. Input Validation & Sanitization

### Validation Framework

- **Schema Validation:** Zod v4
- **Runtime Enforcement:** Server-side only
- **Client Validation:** For UX, not security

### Sanitization Rules

**Location:** `lib/security/sanitize.ts`

```typescript
// Removed from input:
- HTML tags (except allowed list)
- Script tags
- Event handlers
- SQL keywords (basic patterns)
- Excessive whitespace
- Control characters
```

### Medical Data Validation

- Medicare number: Luhn check + format validation
- Phone: Australian format validation
- Date of birth: Age range validation

---

## 7. Encryption

### In Transit

- **Protocol:** TLS 1.2+ only
- **Provider:** Vercel (automatic)
- **Certificate:** Let's Encrypt (auto-renewed)

### At Rest

**Field-Level Encryption** (lib/security/encryption.ts)

| Field | Algorithm | Key Management |
|-------|-----------|----------------|
| medicare_number | AES-256-GCM | ENCRYPTION_KEY env var |
| date_of_birth | AES-256-GCM | ENCRYPTION_KEY env var |
| medical_history | AES-256-GCM | ENCRYPTION_KEY env var |

**Database Encryption**

- Supabase provides transparent disk encryption
- Additional field-level encryption for sensitive PHI

---

## 8. Logging & Monitoring

### Log Sanitization

**Location:** `lib/observability/logger.ts`

```typescript
// Automatically redacted fields:
- password, token, secret, key
- medicare, irn, providerNumber
- diagnosis, medication, symptom
- full_name, email, phone, address
```

### Security Monitoring

- **Sentry:** Error tracking, CSP violations
- **PostHog:** User behavior analytics
- **Supabase:** Database audit logs

### Alerting

- Failed login attempts > 10/hour
- Rate limit violations > 100/hour
- CSP violations (any)
- 5xx error rate > 1%

---

## 9. Webhook Security

### Stripe Webhooks

```typescript
// Signature verification
const sig = req.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
```

### Clerk Webhooks

```typescript
// Signature verification via svix
const wh = new Webhook(WEBHOOK_SECRET)
const evt = wh.verify(payload, headers)
```

### Resend Webhooks

```typescript
// Signature verification
const isValid = verifyResendSignature(payload, signature, secret)
```

---

## 10. Client-Side Storage

### SessionStorage Usage

The application uses sessionStorage for temporary data during authentication flows:

| Key | Data Type | Purpose | Cleared When |
|-----|-----------|---------|--------------|
| `pending_profile_name` | Full name | Profile creation after auth | After profile created |
| `pending_profile_dob` | Date of birth | Profile creation after auth | After profile created |
| `questionnaire_flow` | Boolean flag | Track auth redirect source | After profile created |
| `rx_form_data` | Form JSON | Preserve form during auth | After form restored |

### Security Considerations

1. **Scope:** SessionStorage is same-origin and session-scoped
2. **Lifetime:** Data is cleared when browser tab closes
3. **Access:** Accessible via JavaScript (XSS risk if CSP fails)
4. **Cleanup:** All sensitive data MUST be cleared after use

### Implementation Pattern

```typescript
// Before auth redirect - store temporarily
sessionStorage.setItem("pending_profile_name", fullName)
sessionStorage.setItem("pending_profile_dob", dob)

// After auth success - use and clear immediately
const pendingName = sessionStorage.getItem("pending_profile_name")
const pendingDob = sessionStorage.getItem("pending_profile_dob")

// Create profile with data...

// Clear immediately after use
sessionStorage.removeItem("pending_profile_name")
sessionStorage.removeItem("pending_profile_dob")
```

### What NOT to Store

Never store in sessionStorage:
- Medicare numbers
- Full medical history
- Payment card details
- Authentication tokens

---

## 11. Environment Variables

### Security Classification

| Variable | Classification | Notes |
|----------|---------------|-------|
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Never expose |
| `STRIPE_SECRET_KEY` | Secret | Never expose |
| `ENCRYPTION_KEY` | Secret | Never log |
| `CLERK_SECRET_KEY` | Secret | Never expose |
| `NEXT_PUBLIC_*` | Public | Safe for client |

### Validation

All environment variables validated at build time via Zod schema in `lib/env.ts`.

---

## 12. Incident Response

### Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| P0 | Data breach, system compromise | Immediate |
| P1 | Security vulnerability exploited | 1 hour |
| P2 | Potential vulnerability discovered | 24 hours |
| P3 | Security improvement needed | 1 week |

### Response Process

1. **Detect:** Automated monitoring or report
2. **Contain:** Isolate affected systems
3. **Investigate:** Root cause analysis
4. **Remediate:** Fix vulnerability
5. **Notify:** Affected parties (if required)
6. **Document:** Post-incident report

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial documentation |
