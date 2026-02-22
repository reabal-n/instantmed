# Data Retention Policy

**Document Version:** 1.0
**Last Updated:** January 2026
**Applicable Jurisdiction:** Australia

## Overview

InstantMed collects and processes personal health information (PHI) in accordance with:
- Privacy Act 1988 (Cth) and Australian Privacy Principles (APPs)
- My Health Records Act 2012 (Cth)
- Health Records Act 2001 (Vic) where applicable
- Medical Board of Australia guidelines

This document outlines the retention periods for different data categories.

---

## Retention Schedule

| Data Category | Retention Period | Legal Basis | Notes |
|---------------|------------------|-------------|-------|
| **Patient Medical Records** | 7 years minimum from last service | Medical Board guidelines | 10 years for minors (from age 18) |
| **Clinical Intakes** | 7 years from creation | Medical records obligation | Includes symptom data, history |
| **Compliance Audit Logs** | 7 years | Compliance requirement | Immutable, append-only |
| **AI Interaction Logs** | 7 years | Clinical safety audit | Truncated content, metadata only |
| **Payment Records** | 7 years | Tax Act (ATO requirement) | Stripe retains separately |
| **Profile Data** | Indefinite while active | Service delivery | Deleted 1 year after account closure |
| **Session/Auth Tokens** | 30 days | Security best practice | Auto-purged by Clerk |
| **Analytics Events** | 2 years | Business analytics | Anonymized after 90 days |
| **Email Logs** | 2 years | Communication audit | Resend retains separately |
| **Error/Debug Logs** | 90 days | Operational needs | No PHI in production logs |

---

## Soft Delete vs Hard Delete

### Soft Delete (Default)
- Records marked with `deleted_at` timestamp
- Data retained for retention period
- Not visible in application queries
- Can be restored if needed

### Hard Delete
- Permanent removal from database
- Applied after retention period expires
- Cannot be recovered
- Logged in compliance audit

---

## Data Subject Rights

### Right to Access
- Patients can request all data held about them
- Provided within 30 days of request
- Export format: PDF or JSON

### Right to Correction
- Patients can request corrections to inaccurate data
- Clinical data corrections require clinician review
- Audit trail maintained for all corrections

### Right to Deletion (Limited)
- Account data: Can be deleted on request
- Clinical records: Retained per medical records law
- Audit logs: Cannot be deleted (legal requirement)
- Financial records: Retained per Tax Act

---

## Implementation

### Automated Retention Jobs

```
Schedule: Daily at 02:00 AEST
Job: retention_cleanup_job

Actions:
1. Identify records past retention period
2. Verify no active legal holds
3. Execute hard delete
4. Log deletion in compliance_audit_log
```

### Database Columns

```sql
-- Soft delete support
deleted_at TIMESTAMPTZ DEFAULT NULL
deleted_by UUID REFERENCES profiles(id)

-- Retention metadata
retention_expires_at TIMESTAMPTZ
retention_category TEXT
```

### Legal Holds

When litigation or investigation is anticipated:
1. Legal places hold on specific records
2. Retention jobs skip held records
3. Hold removed only by legal authorization

---

## Third-Party Data Processors

| Processor | Data Type | Retention | Location |
|-----------|-----------|-----------|----------|
| Supabase | All database | Per our policy | Sydney, AU |
| Stripe | Payment data | Per Stripe policy | US (PCI compliant) |
| Clerk | Auth data | 30 days after deletion | US |
| Resend | Email metadata | 30 days | US |
| Sentry | Error logs | 90 days | US |
| PostHog | Analytics | 2 years | EU |

All processors have executed Data Processing Agreements (DPAs).

---

## Compliance Verification

### Quarterly Audit
- Review retention job execution logs
- Verify no data beyond retention period
- Check third-party processor compliance
- Document findings in compliance report

### Annual Review
- Review retention periods against current law
- Update policy if legislation changes
- Staff training on data handling
- External audit if required

---

## Contact

For data retention inquiries:
- Email: privacy@instantmed.com.au
- Phone: 1300 XXX XXX (business hours)
- Mail: [Physical address]

For deletion requests, allow 30 days processing time.

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial policy |
