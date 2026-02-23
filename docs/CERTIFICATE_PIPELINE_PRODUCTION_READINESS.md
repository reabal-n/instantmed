# Certificate Pipeline Production Readiness Checklist

## Overview

This document provides a production readiness assessment for the certificate issuance pipeline, including completed features, remaining risks, and recommended follow-up hardening.

---

## ✅ Completed Features

### Core Pipeline

| Feature | Status | Implementation |
|---------|--------|----------------|
| Config-driven PDF rendering | ✅ Complete | `lib/pdf/med-cert-pdf-v2.tsx`, `lib/pdf/med-cert-render.ts` |
| Template versioning | ✅ Complete | `certificate_template_versions` table with snapshots |
| Clinic identity snapshots | ✅ Complete | Stored in `issued_certificates.clinic_identity_snapshot` |
| Doctor gating (provider/AHPRA) | ✅ Complete | Validation in `app/actions/approve-cert.ts` |
| Idempotent approval | ✅ Complete | Idempotency key + existing cert check |
| Audit logging | ✅ Complete | `certificate_audit_log` table + `logCertificateEvent()` |

### Security

| Feature | Status | Implementation |
|---------|--------|----------------|
| Secure PDF storage | ✅ Complete | Private bucket with authenticated access |
| Signed download URLs | ✅ Complete | 5-minute expiry via `getSecureDownloadUrl()` |
| Ownership verification | ✅ Complete | Patient/doctor role check before download |
| Rate limiting (verification) | ✅ Complete | 10 req/min normal, 3 req/min on failures |
| Input sanitization | ✅ Complete | Regex validation, character stripping |
| Minimal disclosure | ✅ Complete | Masked patient name, no sensitive data on invalid |

### Email Handling

| Feature | Status | Implementation |
|---------|--------|----------------|
| Dashboard link (not attachment) | ✅ Complete | Email links to `/patient/intakes/[id]` |
| Email failure tracking | ✅ Complete | `email_failed_at`, `email_failure_reason` columns |
| Admin retry queue | ✅ Complete | `app/admin/email-queue/` UI |
| Retry limit (max 3) | ✅ Complete | `email_retry_count` enforced |
| No duplicate emails | ✅ Complete | Check `email_sent_at` before sending |

### Verification

| Feature | Status | Implementation |
|---------|--------|----------------|
| Public verification endpoint | ✅ Complete | `app/api/verify/route.ts` |
| Rate limiting | ✅ Complete | IP-based with stricter limit on failures |
| Masked patient name | ✅ Complete | First name + last initial only |
| Revoked shows minimal info | ✅ Complete | Returns `{ valid: false }` only |
| Verification event logging | ✅ Complete | Logged to `certificate_audit_log` |

---

## ⚠️ Remaining Risks

### High Priority

| Risk | Description | Mitigation Recommendation |
|------|-------------|---------------------------|
| In-memory rate limiting | Current rate limiter uses in-memory Map; lost on server restart; doesn't work across multiple instances | **Migrate to Redis-based rate limiting** for production multi-instance deployments |
| No CAPTCHA | Verification endpoint has rate limiting but no CAPTCHA | Consider adding hCaptcha/Turnstile for sustained abuse scenarios |
| Template Studio not yet implemented | Template versioning DB layer exists but UI is pending | Complete Template Studio UI before go-live |

### Medium Priority

| Risk | Description | Mitigation Recommendation |
|------|-------------|---------------------------|
| Certificate revocation UI | Data layer supports revocation but no admin UI | Add admin interface for certificate revocation |
| Email bounce handling | Failed emails tracked but no webhook for bounces | Integrate Resend webhook for bounce/complaint handling |
| PDF regeneration | No mechanism to regenerate PDF if storage corrupted | Add admin action to regenerate from snapshot data |
| Audit log retention | No retention policy for audit logs | Define and implement retention policy (e.g., 7 years for medical records) |

### Low Priority

| Risk | Description | Mitigation Recommendation |
|------|-------------|---------------------------|
| Legacy table support | Verification still checks legacy tables | Plan migration timeline to consolidate to `issued_certificates` |
| Download tracking granularity | Downloads logged but not differentiated by method (patient vs doctor vs admin) | Enhance audit metadata |
| Clinic multi-tenancy | Single clinic identity assumed | Plan for multi-clinic support if needed |

---

## 🔒 Security Hardening Recommendations

### Immediate (Before Production)

1. **Redis Rate Limiting**
   ```typescript
   // Replace lib/rate-limit.ts with Redis-backed implementation
   // Use Upstash Redis or similar for serverless-friendly rate limiting
   ```

2. **Environment Validation**
   - Ensure `SUPABASE_SERVICE_ROLE_KEY` is not exposed to client
   - Verify storage bucket RLS policies are correctly applied
   - Confirm signed URL generation uses correct bucket permissions

3. **Monitoring Setup**
   - Add alerting for high rate of failed verifications (potential brute force)
   - Monitor email delivery failure rate
   - Track certificate issuance volume anomalies

### Post-Launch

1. **CAPTCHA Integration**
   - Add Cloudflare Turnstile or hCaptcha to verification page
   - Trigger CAPTCHA after 3 failed attempts from same IP

2. **WAF Rules**
   - Configure Vercel/Cloudflare WAF rules for the verification endpoint
   - Block known bad actors and bot networks

3. **Penetration Testing**
   - Conduct security assessment of verification endpoint
   - Test for enumeration attacks
   - Verify rate limiting effectiveness under load

---

## 📋 Pre-Launch Checklist

### Database

- [ ] Migration `20260119000004_create_issued_certificates.sql` applied
- [ ] RLS policies verified on `issued_certificates`, `certificate_audit_log`
- [ ] Indexes created for performance (intake_id, patient_id, verification_code)
- [ ] Storage bucket `documents` has correct permissions

### Environment

- [ ] All required env vars set in production
- [ ] `RESEND_API_KEY` configured for email delivery
- [ ] Supabase service role key secured
- [ ] App URL (`NEXT_PUBLIC_APP_URL`) correctly set

### Testing

- [ ] Full approval flow tested end-to-end
- [ ] Idempotency verified (double-click test)
- [ ] Rate limiting verified (>10 requests test)
- [ ] Secure download verified (unauthenticated blocked)
- [ ] Email delivery verified (check inbox)
- [ ] Verification page tested with valid/invalid codes

### Monitoring

- [ ] Error tracking configured (Sentry/similar)
- [ ] Audit log queries accessible for compliance
- [ ] Email delivery dashboard accessible
- [ ] Rate limit metrics visible

---

## 📊 Metrics to Track

| Metric | Purpose | Alert Threshold |
|--------|---------|-----------------|
| Certificate issuance rate | Volume monitoring | >100/hour unusual |
| Verification requests/min | Abuse detection | >50/min from single IP |
| Email delivery failure rate | Delivery health | >5% failure rate |
| Download request failures | Access issues | >10% 403/404 rate |
| Rate limit hits | Abuse indication | >20/hour |

---

## 🗓️ Follow-Up Hardening Roadmap

### Week 1 Post-Launch
- [ ] Monitor metrics for anomalies
- [ ] Address any production issues
- [ ] Gather feedback on verification UX

### Month 1
- [ ] Implement Redis rate limiting
- [ ] Add CAPTCHA to verification
- [ ] Complete Template Studio UI

### Quarter 1
- [ ] Certificate revocation admin UI
- [ ] Email bounce webhook integration
- [ ] PDF regeneration capability
- [ ] Audit log export functionality

### Long-Term
- [ ] Multi-clinic support
- [ ] Certificate expiry notifications
- [ ] Bulk verification API for enterprise
- [ ] Digital signature verification (PKI)

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | [PENDING] | [PENDING] | [PENDING] |
| Security Review | [PENDING] | [PENDING] | [PENDING] |
| Product Owner | [PENDING] | [PENDING] | [PENDING] |
| Compliance | [PENDING] | [PENDING] | [PENDING] |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-18 | Cascade | Initial production readiness assessment |
