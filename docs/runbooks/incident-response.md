# Incident Response Runbooks

## Stripe Outage

### Symptoms
- Payment webhook failures in DLQ
- Checkout sessions timing out
- Payment status not updating

### Response
1. Check Stripe status page: https://status.stripe.com
2. Check DLQ monitor: /admin/webhook-dlq
3. If Stripe is down:
   - Enable "DISABLE_CHECKOUT_ALL" feature flag
   - Monitor email_outbox for failed payment confirmation emails
4. When Stripe recovers:
   - Disable the kill switch
   - Process DLQ items via /admin/webhook-dlq
   - Verify all pending payments reconcile

## Email Delivery Failures

### Symptoms
- Emails stuck in "pending" in email_outbox
- Email dispatcher cron reporting high failure counts

### Response
1. Check Resend status: https://resend-status.com
2. Check /admin/ops/email-outbox for stuck emails
3. Check /admin/ops/email-queue for retry queue
4. Manual retry: Click "Retry" on individual emails in admin
5. If Resend is completely down: emails will auto-retry via cron

## Database Connection Issues

### Symptoms
- 500 errors across multiple endpoints
- Slow page loads
- Connection timeout errors in logs

### Response
1. Check Supabase dashboard for connection count
2. Check /admin/performance/database for metrics
3. If connection pool exhausted:
   - Scale up Supabase compute (Project Settings > Database)
   - Check for long-running queries and kill them
4. If Supabase is down: Check https://status.supabase.com

## Security Incident

### Symptoms
- Anomalous activity in compliance dashboard
- Unusual access patterns
- Reports of unauthorized access

### Response
1. Check /admin/compliance for anomaly alerts
2. Review audit logs for affected timeframe
3. If confirmed:
   - Rotate all API keys (see api-key-rotation.md)
   - Disable affected accounts
   - Notify affected patients per Australian Privacy Act
   - Report to OAIC if notifiable data breach
