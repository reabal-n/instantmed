# Certificate Pipeline Test Plan

## Overview

This document outlines the test plan for the production certificate issuance pipeline, including template versioning, doctor gating, idempotency, secure downloads, and verification hardening.

---

## 1. Template Studio Versioning

### 1.1 Save Creates New Version

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create new version | 1. Open Template Studio<br>2. Modify any setting (e.g., margin preset)<br>3. Click Save | New version created with incremented `version` number; previous version unchanged |
| Version history preserved | 1. Save 3 template versions<br>2. Query `certificate_template_versions` table | All 3 versions exist with unique IDs and sequential version numbers |

### 1.2 Old Versions Immutable

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Cannot modify old version | 1. Identify a non-active version ID<br>2. Attempt direct DB update to modify config | RLS policy blocks update; error returned |
| Version data integrity | 1. Create version V1<br>2. Create version V2<br>3. Re-query V1 | V1 config_snapshot unchanged |

### 1.3 Active Version Toggle

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Set active version | 1. Have V1 active<br>2. Set V2 as active via Template Studio | Only V2 has `is_active = true`; V1 now `is_active = false` |
| Single active constraint | Query for active versions | Exactly one version has `is_active = true` per template |

---

## 2. Issuance Template Locking

### 2.1 Uses Active Template at Approval Time

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Template snapshot captured | 1. Approve certificate<br>2. Query `issued_certificates.template_config_snapshot` | Snapshot matches the template config that was active at approval time |
| Clinic identity snapshot | 1. Approve certificate<br>2. Query `issued_certificates.clinic_identity_snapshot` | Snapshot contains clinic branding at time of approval |

### 2.2 Old Certs Use Original Version

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Template change doesn't affect old certs | 1. Approve cert A with template V1<br>2. Modify template to V2<br>3. Re-render cert A via download | Cert A still renders with V1 styling (from snapshot) |
| Preview uses snapshot | 1. View old certificate in patient dashboard<br>2. Download PDF | PDF matches original issuance, not current template |

---

## 3. Doctor Gating

### 3.1 Provider Number Required

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Missing provider blocks approval | 1. Set doctor profile `provider_number = NULL`<br>2. Attempt to approve certificate | Error: "Your Provider Number is not configured..." |
| Intake claim reverted | After above failure | Intake status reverts to `paid`; `reviewed_by` set to NULL |

### 3.2 AHPRA Number Required

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Missing AHPRA blocks approval | 1. Set doctor profile `ahpra_number = NULL`<br>2. Attempt to approve certificate | Error: "Your AHPRA Registration Number is not configured..." |
| Both required | 1. Have provider but no AHPRA<br>2. Attempt approval | Blocked with AHPRA error |

### 3.3 Happy Path

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Valid credentials allow approval | 1. Doctor has both provider_number and ahpra_number<br>2. Approve certificate | Certificate generated successfully |

---

## 4. Idempotency

### 4.1 Double Approve - Single Certificate

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Rapid double-click | 1. Click approve button twice rapidly | Only one certificate record created |
| Re-approval attempt | 1. Approve intake successfully<br>2. Call `approveAndSendCert` again with same intake | Returns existing certificate with `isExisting: true` |
| Certificate count | After double approval attempt | `issued_certificates` table has exactly 1 record for that intake |

### 4.2 Single Email

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| No duplicate email on re-approval | 1. Approve (email sent)<br>2. Re-approve same intake | Second call does NOT send another email |
| Email status check | Query `issued_certificates.email_sent_at` | Has value; `email_retry_count` is 0 or 1 |

### 4.3 Idempotency Key

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Key uniqueness | Generate keys for different intakes | Each intake produces unique key |
| Key stability | Generate key for same intake twice | Same key returned both times |

---

## 5. Secure Downloads

### 5.1 Unauthenticated Access Blocked

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| API without auth | 1. Call `/api/certificates/[id]/download` without session | 401 Unauthorized |
| Direct storage URL | 1. Attempt to access `documents/med-certs/...` directly | 401 or signed URL required |

### 5.2 Ownership Verification

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Patient can download own cert | 1. Log in as patient who owns certificate<br>2. Request download | Signed URL returned |
| Cannot download others' certs | 1. Log in as different patient<br>2. Request download for cert they don't own | 403 Forbidden |
| Doctor can download any | 1. Log in as doctor/admin<br>2. Request download for any valid cert | Signed URL returned |

### 5.3 Signed URL Expiry

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| URL expires after 5 minutes | 1. Generate signed URL<br>2. Wait 6 minutes<br>3. Attempt to use URL | Access denied; URL expired |
| Fresh URL works | 1. Generate signed URL<br>2. Use immediately | PDF downloads successfully |

### 5.4 Revoked Certificate

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Cannot download revoked cert | 1. Revoke a certificate<br>2. Attempt download | 410 Gone or appropriate error |

---

## 6. Verification Hardening

### 6.1 Rate Limiting

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Normal rate allowed | Make 5 requests in 1 minute from same IP | All succeed |
| Rate limit exceeded | Make 15 requests in 1 minute from same IP | Requests after 10th return 429 |
| Rate limit headers | Check response headers | `X-RateLimit-Remaining` and `X-RateLimit-Reset` present |

### 6.2 Failed Attempt Stricter Limit

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Invalid codes trigger stricter limit | Submit 5 invalid codes from same IP | After 3rd, stricter limit applies |
| Brute force protection | Attempt many invalid codes rapidly | Quickly rate limited |

### 6.3 Minimal Disclosure

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Patient name masked | Verify valid certificate for "John Smith" | Shows "John S." |
| Single name handled | Verify cert for patient with single name "Madonna" | Shows "Madonna" |
| Revoked shows no details | Verify a revoked certificate | Returns `{ valid: false }` only - no reason, no details |
| Not found shows minimal info | Verify non-existent code | Returns `{ valid: false }` only |

### 6.4 Valid Response Contents

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Shows required fields | Verify valid certificate | Response includes: `valid: true`, `certificateNumber`, `issueDate`, `issuingClinic` |
| No sensitive data exposed | Check response | No DOB, no address, no full name, no email |

### 6.5 Input Sanitization

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| SQL injection attempt | Submit `code='; DROP TABLE--` | Sanitized; returns invalid format error |
| XSS attempt | Submit `code=<script>alert(1)</script>` | Sanitized; returns invalid format error |
| Whitespace handling | Submit code with leading/trailing spaces | Trimmed and processed correctly |

---

## 7. Edge-Case Preview Scenarios

### 7.1 Long Names

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Long patient name | Preview cert with 50-char patient name | Name wraps appropriately; no overflow |
| Long doctor name with nominals | Preview with "Dr. Alexander Bartholomew Smith, MBBS, FRACGP, PhD" | Rendered without truncation or overflow |

### 7.2 Missing Signature

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| No signature image | Preview with doctor who has no signature uploaded | Shows "Electronically signed" with typed name and timestamp |
| Signature style setting | Set `signatureStyle: 'typed'` even with image available | Shows typed signature per config |

### 7.3 Long Address

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Multi-line clinic address | Preview with clinic address: "Suite 1A, Level 2, 123 Very Long Street Name, Suburb Name, VIC 3000" | Address wraps correctly; maintains readability |

### 7.4 Certificate Types

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Work certificate | Preview work cert | Shows "MEDICAL CERTIFICATE" with work-appropriate clinical statement |
| Study certificate | Preview uni cert | Shows appropriate study leave wording |
| Carer certificate | Preview carer cert with care recipient details | Shows carer details (name, relationship) |

---

## 8. Audit Trail

### 8.1 Event Logging

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Issuance logged | Approve certificate | `certificate_audit_log` has `issued` event |
| Download logged | Download certificate | `certificate_audit_log` has `downloaded` event |
| Verification logged | Verify certificate | `certificate_audit_log` has `verified` event |
| Email events logged | Approve cert (email sent or failed) | Appropriate `email_sent` or `email_failed` event |

### 8.2 Event Metadata

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| IP captured on verification | Verify from known IP | Event metadata includes `ip_address` |
| Actor captured | Doctor approves | Event has `actor_id` matching doctor's profile ID |

---

## Test Execution Commands

```bash
# Run TypeScript compilation check
npx tsc --noEmit --skipLibCheck

# Run ESLint on certificate pipeline files
npx eslint app/actions/approve-cert.ts lib/data/issued-certificates.ts app/api/verify/route.ts

# Run unit tests (if available)
npm run test -- --grep "certificate"

# Manual API verification test
curl "http://localhost:3000/api/verify?code=MC-TEST12345"
```

---

## Sign-Off Checklist

- [ ] All test cases executed
- [ ] No critical failures
- [ ] Rate limiting verified working
- [ ] Idempotency confirmed
- [ ] Doctor gating confirmed
- [ ] Secure downloads confirmed
- [ ] Template versioning confirmed
- [ ] Edge cases rendered correctly
- [ ] Audit events logging correctly

**Tested By:** _________________  
**Date:** _________________  
**Environment:** _________________
