# Database Table Audit

Last updated: 2026-01-24

## Summary

This document tracks the usage status of all database tables in the InstantMed application.

---

## ✅ Fully Connected Tables

| Table | Usage | Notes |
|-------|-------|-------|
| `profiles` | Core user data | Used everywhere |
| `intakes` | Patient requests | Main workflow table |
| `intake_answers` | Medical questionnaire data | Linked to intakes |
| `payments` | Stripe payments | Webhook + refunds |
| `services` | Service catalog | Admin services page |
| `audit_logs` | System audit trail | Admin audit page |
| `feature_flags` | Feature toggles | Admin features page |
| `patient_messages` | Doctor-patient messaging | `/patient/messages` |
| `stripe_webhook_events` | Idempotency tracking | Stripe webhook |

---

## ✅ Recently Connected (This Session)

| Table | Integration | Notes |
|-------|-------------|-------|
| `fraud_flags` | Admin Finance page | Risk management section |
| `stripe_disputes` | Admin Finance page | Dispute tracking section |
| `email_preferences` | Unsubscribe API | `/api/unsubscribe` endpoint |

---

## ⚠️ Partially Connected

| Table | Current State | Recommendation |
|-------|---------------|----------------|
| `referrals` | API exists (`/api/patient/referral`), service works | Add UI to patient dashboard |
| `credits` | Table exists, no usage | Implement with referral rewards OR remove |

### Referrals Implementation Status
- ✅ `lib/referrals/referral-service.ts` - Backend service
- ✅ `app/api/patient/referral/route.ts` - API endpoint
- ❌ Patient UI to view/share referral code
- ❌ Referral reward distribution

---

## ❌ Dead Tables (Candidates for Removal)

| Table | Rows | Notes | Action |
|-------|------|-------|--------|
| `payment_reconciliation` | 0 | No code references found | **Remove** |
| `credits` | 0 | Intended for referral rewards, not implemented | Keep for future OR remove |

### Removal Process
1. Verify no foreign key dependencies
2. Create migration to drop table
3. Remove any orphaned types

---

## Table Relationship Map

```
profiles (core)
├── intakes (patient_id)
│   ├── intake_answers (intake_id)
│   ├── payments (intake_id)
│   ├── fraud_flags (intake_id, patient_id)
│   └── stripe_disputes (intake_id)
├── referrals (referrer_id, referee_id)
├── credits (profile_id)
├── patient_messages (patient_id, sender_id)
└── email_preferences (profile_id)
```

---

## Action Items

1. **Referral UI** - Add referral code display to patient settings (low priority)
2. **Credits System** - Decision needed: implement referral rewards or remove table
3. **payment_reconciliation** - Safe to remove (no usage)

---

## Notes

- All tables have proper RLS policies
- Fraud detection writes to `fraud_flags` via `lib/fraud/detector.ts`
- Disputes are recorded by Stripe webhook handler
- Email preferences are used by unsubscribe endpoint
