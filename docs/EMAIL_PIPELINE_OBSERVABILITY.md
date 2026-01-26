# Email Pipeline Observability Guide

This document describes where to observe failures and debug issues in the medical certificate email pipeline.

---

## 0. Email Outbox Admin Viewer

**Location**: `/doctor/admin/email-outbox`

A built-in admin UI for viewing and debugging email delivery issues.

### Access
- Requires doctor or admin role
- Navigate from doctor portal: Admin → Email Outbox

### Features
- **Stats dashboard**: Total, sent, failed, pending, E2E skipped counts
- **Filterable table**: Filter by status, email type, recipient, intake ID
- **Row details**: Click any row to see full metadata, error messages, and related links
- **Pagination**: Browse through all email records

### Quick Actions
- **Open Intake**: Link directly to the related intake
- **Copy Message ID**: Copy Resend provider message ID for lookup
- **View Metadata**: See full JSON metadata for debugging

### When to Use
- Debugging "email not received" reports
- Verifying email was sent for a specific intake
- Checking error messages for failed sends
- Confirming E2E test mode is working correctly

## Pipeline Overview

```
Doctor Approval → PDF Generation → Storage Upload → DB Update → Email Send → email_outbox Log
```

Each step can fail independently. This guide shows where to look for each type of failure.

---

## 1. Sentry Issues

### Dashboard
- **URL**: https://sentry.io → InstantMed project → Issues

### Key Filters

| Filter | Purpose |
|--------|---------|
| `action:approve_cert` | All approval flow errors |
| `action:send_email` | Email sending errors |
| `action:render_email_template` | Template rendering errors |
| `category:med_cert_approved` | Med cert approval events |
| `email_type:med_cert_patient` | Patient email issues |
| `email_type:med_cert_employer` | Employer email issues |

### Example Queries
```
# All email failures in last 24h
is:unresolved action:send_email

# Med cert approval failures
is:unresolved action:approve_cert

# Template rendering issues
is:unresolved action:render_email_template
```

### Tags to Look For
- `intake_id` - Links to specific intake
- `email_type` - Type of email (med_cert_patient, etc.)
- `cert_type` - Certificate type (work, study, carer)

---

## 2. Vercel Function Logs

### Dashboard
- **URL**: https://vercel.com → Project → Logs (or Deployments → Logs)

### Key Log Patterns

```bash
# Successful email send
[Email] Sent via Resend: med_cert_patient to ***@***.com

# E2E mode skip
[Email] E2E mode - skipping actual send

# Email failures
[Email] Resend API error: ...
[Email] Template render failed: ...

# Rate limiting
[Email] Employer email rate limit exceeded
```

### Filter by Function
- `POST /api/doctor/approve` - Approval endpoint
- Server actions in `app/actions/approve-cert.ts`
- Server actions in `app/actions/send-employer-email.ts`

---

## 3. Resend Message Logs

### Dashboard
- **URL**: https://resend.com/emails

### Key Information
- **Message ID** - Matches `provider_message_id` in email_outbox
- **Status** - Delivered, Bounced, Complained, etc.
- **Recipient** - Email address
- **Subject** - Email subject line
- **Timestamp** - When sent

### Common Issues
| Status | Meaning | Action |
|--------|---------|--------|
| Delivered | Email reached inbox | None |
| Bounced | Invalid email address | Check patient email |
| Complained | Marked as spam | Review email content |
| Failed | Delivery failed | Check Resend logs for details |

### Filtering by Tag
Resend emails are tagged with:
- `category` - e.g., `med_cert_approved`
- `intake_id` - Links to intake
- `cert_type` - work, study, carer

---

## 4. Supabase email_outbox Table

### SQL Query - Recent Emails
```sql
SELECT 
  id,
  email_type,
  to_email,
  subject,
  status,
  provider_message_id,
  error_message,
  created_at,
  sent_at
FROM email_outbox
ORDER BY created_at DESC
LIMIT 50;
```

### SQL Query - Failed Emails
```sql
SELECT *
FROM email_outbox
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

### SQL Query - Emails for Specific Intake
```sql
SELECT *
FROM email_outbox
WHERE intake_id = 'YOUR_INTAKE_ID'
ORDER BY created_at DESC;
```

### SQL Query - Email Rate Limit Check
```sql
SELECT * FROM check_employer_email_rate_limit('YOUR_INTAKE_ID');
```

### Status Values
| Status | Meaning |
|--------|---------|
| `pending` | Queued but not yet processed |
| `sent` | Successfully sent via Resend |
| `failed` | Send attempt failed |
| `skipped_e2e` | Skipped in E2E/Playwright mode |

---

## 5. Quick Debugging Checklist

### Email Not Received

1. **Check email_outbox**
   ```sql
   SELECT * FROM email_outbox 
   WHERE intake_id = 'XXX' 
   ORDER BY created_at DESC;
   ```

2. **If status = 'sent'**
   - Check Resend dashboard for delivery status
   - Check spam folder
   - Verify email address is correct

3. **If status = 'failed'**
   - Check `error_message` column
   - Check Sentry for detailed error
   - Check Vercel logs for stack trace

4. **If no row exists**
   - Email was never attempted
   - Check if approval succeeded (intake status)
   - Check Sentry for errors before email step

### PDF Not Generated

1. **Check issued_certificates**
   ```sql
   SELECT * FROM issued_certificates 
   WHERE intake_id = 'XXX';
   ```

2. **Check intake_documents**
   ```sql
   SELECT * FROM intake_documents 
   WHERE intake_id = 'XXX';
   ```

3. **Check Supabase Storage**
   - Navigate to Storage → documents bucket
   - Look for file at `storage_path`

---

## 6. E2E Testing Seam

When `PLAYWRIGHT=1` or `E2E=true` environment variable is set:
- Emails are NOT sent via Resend
- Status is logged as `skipped_e2e`
- `provider_message_id` is null

This allows E2E tests to verify the pipeline without sending real emails.

### Verify E2E Mode
```sql
SELECT * FROM email_outbox 
WHERE status = 'skipped_e2e'
ORDER BY created_at DESC;
```

---

## 7. Key Files

| File | Purpose |
|------|---------|
| `lib/email/send-email.ts` | Centralized email sender |
| `lib/email/render-template.ts` | Template rendering |
| `app/actions/approve-cert.ts` | Approval flow |
| `app/actions/send-employer-email.ts` | Employer email action |
| `components/email/templates/*` | Email templates |
| `supabase/migrations/20260126200001_create_email_outbox.sql` | Table schema |

---

## 8. Alerts (Recommended Setup)

### Sentry Alerts
- Alert on any error with `action:send_email`
- Alert on >5 errors/hour with `action:approve_cert`

### Supabase/Custom Monitoring
```sql
-- Failed emails in last hour
SELECT COUNT(*) FROM email_outbox 
WHERE status = 'failed' 
  AND created_at > NOW() - INTERVAL '1 hour';
```

### Resend Webhooks
Configure webhooks for:
- `email.bounced`
- `email.complained`
- `email.delivery_delayed`
