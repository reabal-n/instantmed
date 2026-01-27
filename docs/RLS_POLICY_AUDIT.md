# Row Level Security (RLS) Policy Audit

**Date:** January 2026
**Status:** Production Ready

---

## Summary

All tables with sensitive data have RLS enabled with appropriate policies.

---

## Tables with RLS Enabled ✅

### Core Tables

| Table | Policy | Description |
|-------|--------|-------------|
| `profiles` | Users can only access their own profile | `auth.uid() = id` |
| `intakes` | Patients see own, doctors see assigned/unassigned | Complex policy with role checks |
| `certificates` | Linked to intake ownership | Via intake relationship |
| `messages` | Participants only | Sender or recipient check |
| `notifications` | User's own notifications | `auth.uid() = user_id` |
| `payments` | User's own payments | Via intake relationship |

### Admin Tables

| Table | Policy | Description |
|-------|--------|-------------|
| `audit_logs` | Admin only | Role check for admin/doctor |
| `feature_flags` | Read: all, Write: admin | Public read, admin write |
| `email_logs` | Admin only | Role check |
| `webhook_events` | Admin only | Role check |

### Doctor Tables

| Table | Policy | Description |
|-------|--------|-------------|
| `doctor_profiles` | Doctors see own, admins see all | Role-based access |
| `doctor_availability` | Doctor's own availability | `auth.uid() = doctor_id` |
| `intake_drafts` | Doctor's own drafts | `auth.uid() = doctor_id` |

---

## Policy Patterns

### Patient Access Pattern
```sql
CREATE POLICY "patients_own_data" ON table_name
FOR ALL USING (
  auth.uid() = user_id
);
```

### Doctor Access Pattern
```sql
CREATE POLICY "doctors_assigned_intakes" ON intakes
FOR SELECT USING (
  auth.uid() = user_id  -- Patient's own
  OR 
  auth.uid() = assigned_doctor_id  -- Assigned doctor
  OR
  (
    assigned_doctor_id IS NULL 
    AND status = 'pending_review'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'doctor'
    )
  )  -- Unassigned intakes for doctors
);
```

### Admin Access Pattern
```sql
CREATE POLICY "admin_full_access" ON table_name
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
```

---

## Security Recommendations

### High Priority

1. **Audit log immutability**
   - Ensure audit_logs has INSERT only policy for non-admins
   - No UPDATE or DELETE for anyone except system

2. **PHI encryption**
   - Sensitive fields should use column-level encryption
   - Already implemented for: medical history, symptoms, notes

3. **Rate limiting at DB level**
   - Consider pg_rate_limiter for write-heavy tables

### Medium Priority

4. **Temporal access control**
   - Doctors should only access intakes for limited time after completion
   - Consider adding `access_expires_at` column

5. **Cross-tenant isolation**
   - If multi-clinic support added, ensure tenant isolation

### Low Priority

6. **Query logging**
   - Enable pgaudit for sensitive table access logging

---

## Testing RLS Policies

```sql
-- Test as specific user
SET request.jwt.claim.sub = 'user-uuid-here';
SET request.jwt.claims = '{"role": "authenticated"}';

-- Verify patient can only see own intakes
SELECT * FROM intakes; -- Should only return user's intakes

-- Reset
RESET request.jwt.claim.sub;
RESET request.jwt.claims;
```

---

## Migration Checklist

When adding new tables:

- [ ] Enable RLS: `ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;`
- [ ] Create SELECT policy
- [ ] Create INSERT policy (if applicable)
- [ ] Create UPDATE policy (if applicable)
- [ ] Create DELETE policy (if applicable)
- [ ] Test with different user roles
- [ ] Document policy in this file

---

## Compliance Notes

- **HIPAA**: RLS provides access control layer for PHI
- **Australian Privacy Act**: Supports data minimization principle
- **AHPRA**: Medical records access is role-appropriate

---

## Last Audit

- **Date:** January 2026
- **Auditor:** Automated + Manual Review
- **Result:** All critical tables protected
- **Next Review:** Q2 2026
