# Intake SLA Monitoring & Stuck Detector

## Overview

The Intake SLA Monitoring system tracks intake status transitions and detects intakes that are "stuck" in SLA-breaching states. This helps ops identify and resolve delays in the patient journey.

## UI Location

**Admin Page**: `/doctor/admin/ops/intakes-stuck`

Access requires `doctor` or `admin` role.

## SLA Thresholds

| Condition | Threshold | Reason Code |
|-----------|-----------|-------------|
| Paid but not picked up | > 5 minutes | `paid_no_review` |
| In review or pending info | > 60 minutes | `review_timeout` |
| Approved but no delivery email | > 10 minutes | `delivery_pending` |
| Approved but delivery email failed | Any | `delivery_failed` |

## Database Schema

### Table: `intake_events`

Audit log for all intake status transitions.

```sql
CREATE TABLE public.intake_events (
  id UUID PRIMARY KEY,
  intake_id UUID NOT NULL REFERENCES intakes(id),
  actor_role TEXT NOT NULL,  -- 'patient', 'doctor', 'admin', 'system'
  actor_id UUID,             -- profile ID of actor (nullable for system)
  event_type TEXT NOT NULL,  -- 'status_change', 'payment_received', etc.
  from_status intake_status,
  to_status intake_status,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### View: `v_stuck_intakes`

Real-time view of intakes in SLA-breaching states. Used by the admin page.

## Key Files

| File | Purpose |
|------|---------|
| `lib/data/intake-events.ts` | Event logging functions |
| `lib/data/intake-ops.ts` | Stuck detection queries |
| `app/doctor/admin/ops/intakes-stuck/page.tsx` | Admin page (server) |
| `app/doctor/admin/ops/intakes-stuck/intakes-stuck-client.tsx` | Admin page (client) |
| `supabase/migrations/20260126210000_create_intake_events.sql` | Schema migration |

## Environment Variables (Kill Switches)

| Variable | Effect |
|----------|--------|
| `DISABLE_INTAKE_EVENTS=true` | Disables event logging |
| `DISABLE_STUCK_INTAKE_SENTRY=true` | Disables Sentry warnings for stuck intakes |

## Sentry Integration

When an intake enters a stuck state, a Sentry warning is captured with:

- **Tags**: `intake_id`, `stuck_reason`, `service_type`, `consult_subtype`, `intake_status`
- **Fingerprint**: `['stuck-intake', intake_id, stuck_reason]` (deduped per intake + reason)

Warnings are deduped to avoid spam - each intake+reason combination only fires once per server process.

## Troubleshooting

### Stuck Intake: `paid_no_review`

**Cause**: Intake was paid but no doctor has picked it up.

**Resolution**:
1. Check if there are available doctors in the queue
2. Navigate to the intake and assign/review it
3. If systemic, check for queue processing issues

### Stuck Intake: `review_timeout`

**Cause**: Doctor started review but hasn't completed it within 60 minutes.

**Resolution**:
1. Check if the reviewing doctor is still active
2. Contact the doctor or reassign the intake
3. Check for any blocking issues (missing info, etc.)

### Stuck Intake: `delivery_pending`

**Cause**: Intake was approved but delivery email hasn't been sent.

**Resolution**:
1. Check the email_outbox for this intake (`/doctor/admin/email-outbox?intake_id=...`)
2. If no email record, trigger delivery manually
3. If email is pending, check email service health

### Stuck Intake: `delivery_failed`

**Cause**: Delivery email was attempted but failed.

**Resolution**:
1. Check the email_outbox for error details
2. Verify patient email address is valid
3. Retry the delivery or contact patient through other means

## Queries

### Find stuck intakes directly

```sql
SELECT * FROM v_stuck_intakes ORDER BY stuck_age_minutes DESC;
```

### Count stuck intakes by reason

```sql
SELECT stuck_reason, COUNT(*) 
FROM v_stuck_intakes 
GROUP BY stuck_reason;
```

### Get recent events for an intake

```sql
SELECT * FROM intake_events 
WHERE intake_id = 'YOUR_INTAKE_ID' 
ORDER BY created_at DESC 
LIMIT 20;
```

### Find intakes with failed delivery

```sql
SELECT i.id, i.reference_number, i.status, eo.error_message
FROM intakes i
JOIN email_outbox eo ON eo.intake_id = i.id
WHERE i.status = 'approved'
  AND eo.email_type IN ('request_approved', 'certificate_delivery')
  AND eo.status = 'failed';
```

## E2E Testing

```bash
# Run stuck intakes E2E tests
PLAYWRIGHT=1 pnpm e2e --grep "intakes-stuck"
```

## Adding New Event Types

To add a new event type:

1. Update the migration to add the new type to the `event_type` check constraint
2. Add a convenience wrapper in `lib/data/intake-events.ts`
3. Call the wrapper from the appropriate action

Example:

```typescript
// In lib/data/intake-events.ts
export async function logMyNewEvent(
  intakeId: string,
  actorId: string | null,
  metadata: Record<string, unknown> = {}
): Promise<string | null> {
  return logIntakeEvent({
    intakeId,
    eventType: "my_new_event",
    actorRole: actorId ? "doctor" : "system",
    actorId,
    metadata,
  })
}
```

## Monitoring Recommendations

1. **Set up alerts** in Sentry for high volume of `stuck-intake` warnings
2. **Dashboard widget** showing current stuck count on main admin dashboard
3. **Periodic review** of SLA thresholds based on operational data
