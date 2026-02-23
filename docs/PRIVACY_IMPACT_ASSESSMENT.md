# Privacy Impact Assessment (PIA)

**Project:** InstantMed Telehealth Platform
**Assessment Date:** January 2026
**Assessor:** Engineering Team
**Status:** Pre-Production Review

---

## 1. Project Overview

### 1.1 Description
InstantMed is an asynchronous telehealth platform providing:
- Medical certificates for work/study absence
- Repeat prescription services
- General practitioner consultations

### 1.2 Scope
This PIA covers:
- Patient data collection and processing
- Clinician access to patient data
- Third-party data sharing
- Data security measures

---

## 2. Data Inventory

### 2.1 Personal Information Collected

| Data Element | Sensitivity | Purpose | Collection Method |
|--------------|-------------|---------|-------------------|
| Full Name | PII | Identity verification | Form input |
| Email | PII | Communication | Form input |
| Phone | PII | Contact | Form input |
| Date of Birth | PII | Age verification | Form input |
| Address | PII | Certificate delivery | Form input |
| Medicare Number | Health ID | Medicare eligibility | Form input |
| Medicare IRN | Health ID | Medicare claims | Form input |

### 2.2 Health Information Collected

| Data Element | Sensitivity | Purpose | Collection Method |
|--------------|-------------|---------|-------------------|
| Symptoms | PHI | Clinical assessment | Form input |
| Medical History | PHI | Clinical context | Form input |
| Current Medications | PHI | Drug interactions | Form input |
| Allergies | PHI | Safety check | Form input |
| Presenting Condition | PHI | Certificate reason | Form input |

### 2.3 Financial Information

| Data Element | Sensitivity | Purpose | Collection Method |
|--------------|-------------|---------|-------------------|
| Stripe Customer ID | Financial | Payment processing | Stripe API |
| Payment Status | Financial | Service delivery | Stripe webhook |

*Note: Full card details never stored - handled by Stripe (PCI-DSS compliant)*

---

## 3. Data Flows

### 3.1 Primary Data Flow
```
Patient (Browser)
    → Next.js Server (Vercel)
    → Supabase (PostgreSQL)
    → Clinician Dashboard
    → Certificate Generation
    → Email Delivery (Resend)
```

### 3.2 Third-Party Data Flows

| Recipient | Data Shared | Purpose | DPA Status |
|-----------|-------------|---------|------------|
| Supabase | All database records | Data storage | ✅ Signed |
| Stripe | Email, payment amount | Payment processing | ✅ Standard |
| Clerk | Email, name | Authentication | ✅ Standard |
| Resend | Email, patient name | Email delivery | ✅ Signed |
| Sentry | Error context (sanitized) | Error tracking | ✅ Signed |
| PostHog | Analytics events (anonymized) | Product analytics | ✅ Signed |
| OpenAI | Clinical notes (no identifiers) | AI assistance | ✅ BAA |

---

## 4. Privacy Principles Compliance

### 4.1 APP 1 - Open and Transparent Management

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Privacy Policy published | ✅ | /privacy-policy page |
| Collection notice | ✅ | Intake form introduction |
| Complaint handling | ✅ | privacy@instantmed.com.au |

### 4.2 APP 2 - Anonymity and Pseudonymity

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Option for anonymity | ❌ N/A | Healthcare requires identification |
| Justification documented | ✅ | Legal requirement for medical services |

### 4.3 APP 3 - Collection of Solicited Personal Information

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Only necessary data | ✅ | Intake limited to clinical needs |
| Consent obtained | ✅ | Terms acceptance + telehealth consent |
| Collection method lawful | ✅ | Direct from patient |

### 4.4 APP 4 - Dealing with Unsolicited Information

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Process for unsolicited data | ✅ | Support team procedures |

### 4.5 APP 5 - Notification of Collection

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Purpose stated | ✅ | Intake form explains use |
| Third parties identified | ✅ | Privacy policy lists all |
| Access rights explained | ✅ | Privacy policy section |

### 4.6 APP 6 - Use or Disclosure

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Used for stated purpose | ✅ | Clinical care only |
| Consent for secondary use | ✅ | Marketing opt-in separate |
| Law enforcement policy | ✅ | Subpoena process documented |

### 4.7 APP 7 - Direct Marketing

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Opt-out mechanism | ✅ | Unsubscribe link in emails |
| Health data not used | ✅ | Only service notifications |

### 4.8 APP 8 - Cross-border Disclosure

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Overseas recipients identified | ✅ | Privacy policy lists countries |
| Similar protections ensured | ✅ | DPAs with all processors |
| Countries: US, EU | ⚠️ | Documented in privacy policy |

### 4.9 APP 9 - Government Identifiers

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Medicare number use limited | ✅ | Only for eligibility verification |
| Not used as internal ID | ✅ | UUID primary keys |

### 4.10 APP 10 - Quality of Personal Information

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Accuracy ensured | ✅ | Patient can update profile |
| Currency maintained | ✅ | Edit profile feature |
| Verification processes | ✅ | Medicare validation |

### 4.11 APP 11 - Security of Personal Information

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Encryption in transit | ✅ | TLS 1.2+ enforced |
| Encryption at rest | ✅ | AES-256-GCM field encryption |
| Access controls | ✅ | RLS + role-based access |
| Destruction process | ✅ | DATA_RETENTION_POLICY.md |

### 4.12 APP 12 - Access to Personal Information

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Access request process | ✅ | Email to privacy@ |
| Response within 30 days | ✅ | SLA documented |
| Export format available | ✅ | PDF/JSON export |

### 4.13 APP 13 - Correction of Personal Information

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Correction request process | ✅ | Email to privacy@ |
| Clinical data review | ✅ | Clinician approval required |
| Audit trail | ✅ | compliance_audit_log |

---

## 5. Risk Assessment

### 5.1 Identified Risks

| Risk | Likelihood | Impact | Mitigation | Residual Risk |
|------|------------|--------|------------|---------------|
| Unauthorized access | Low | High | RLS, encryption, MFA | Low |
| Data breach | Low | Critical | Security monitoring, DLP | Low |
| Insider threat | Low | High | Audit logging, least privilege | Low |
| Third-party breach | Medium | High | DPAs, vendor assessment | Medium |
| Data loss | Low | High | Backups, replication | Low |
| Compliance failure | Low | High | Regular audits, training | Low |

### 5.2 Risk Mitigations

1. **Unauthorized Access**
   - Row-Level Security on all tables
   - Clerk authentication with MFA option
   - Session timeouts
   - IP allowlisting for admin

2. **Data Breach**
   - Field-level encryption for sensitive data
   - Sentry monitoring for anomalies
   - Incident response plan documented

3. **Third-Party Risk**
   - All processors have DPAs
   - Annual vendor security review
   - Data minimization in sharing

---

## 6. Recommendations

### 6.1 Implemented ✅
- [x] Field-level encryption for Medicare, DOB
- [x] Comprehensive audit logging
- [x] Row-Level Security
- [x] HTTPS/TLS enforcement
- [x] Log sanitization for PHI

### 6.2 Planned
- [ ] External penetration test (pre-launch)
- [ ] SOC 2 Type 1 certification (6 months)
- [ ] Annual privacy audit schedule
- [ ] Staff privacy training program

---

## 7. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Engineering Lead | [PENDING] | [PENDING] | [PENDING] |
| Compliance Officer | [PENDING] | [PENDING] | [PENDING] |
| Legal Counsel | [PENDING] | [PENDING] | [PENDING] |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial PIA |
