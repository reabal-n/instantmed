# InstantMed Platform Consolidation & PostHog Fix

**Date:** 2026-02-22
**Status:** Approved
**Goal:** Fix broken analytics, consolidate redundant DB tables, verify patient dashboard, clean Stripe catalog

---

## Context

InstantMed is an Australian async telehealth platform (Next.js + Supabase + Stripe + Vercel).
The platform has 153 routes, 84 API routes, 67 Supabase tables, and 10 Stripe products.

Audit findings:
- PostHog: 3 of 4 dashboards are broken/useless, canonical funnel references stale events, no test filtering
- Supabase: 38 of 68 tables have zero rows, 9 audit tables with overlapping purpose
- Stripe: 2 duplicate products, specialty services ready but unlaunched
- Patient dashboard exists but functionality unverified

Target: $1M ARR → acquisition. Every fix must serve conversion or operational clarity.

---

## Section A: PostHog — Single Canonical Pathway

### A1. Delete broken dashboards
- Delete dashboard 969687 ("My App Dashboard") — auto-generated sample
- Delete dashboard 971161 ("Analytics basics" v1) — tracks non-existent events
- Delete dashboard 971238 ("Analytics basics" v2) — tracks non-existent events
- Delete orphaned insight w764C1Ub (sample "Referring domain")

### A2. Rebuild Admin Dashboard (ID 1189881)
Keep existing tiles that work, replace/add:

**Replace broken funnel** (insight 36PFBHu5) with 6-step canonical funnel:
```
$pageview (url contains "/")
  → service_selected
  → request_step_completed
  → intake_funnel_payment_completed
  → intake_funnel_approved
  → intake_funnel_document_delivered
```
- Window: 30 days
- Order: ordered (strict sequence)
- filterTestAccounts: true

**Add new tiles:**
1. Safety Evaluation Outcomes — trend on `safety_evaluation_completed` by `outcome`
2. Request Flow Drop-off — trend on `request_flow_exited` by step
3. SLA Breaches — trend on `business_alert_sla_breach`
4. Referring Domains — `$pageview` broken down by `$referring_domain`

### A3. Enable filterTestAccounts globally
- Set `filterTestAccounts: true` on every insight on the Admin Dashboard
- Define test account filter in PostHog project settings (filter by internal email domains or `is_team_member` person property)

### A4. Reconcile event naming in codebase
- Audit `/lib/analytics/conversion-events.ts` against actual emitting code
- Remove or update event name constants that don't match production events
- Ensure all analytics code references `request_step_completed` (not `intake_step_completed`)

---

## Section B: Supabase — Conservative Consolidation

### B1. Drop clearly dead tables (code-verified, 0 rows, 0 code references)
| Table | Rows | Code Refs | Reason |
|---|---|---|---|
| `med_cert_audit_events` | 0 | 0 | No code references anywhere. Truly dead. |

### B1-CORRECTED. Tables originally planned for removal but KEPT:
| Table | Rows | Code Refs | Why Kept |
|---|---|---|---|
| `audit_events` | 0 | 4 | Actively used by repeat-rx flow (eligibility, submission, decision, view) |
| `documents` | 0 rows in table | 62 | NOT a data table — it's a Supabase Storage bucket name used across certificate generation, email, approval, and download flows |

### B2-CANCELLED. Template table merge
`decline_reason_templates` has `requires_note` field, `info_request_templates` has `message_template` field. Different schemas serving different workflows. Merging adds risk for minimal benefit. Leaving both as-is.

### B3. Tables explicitly NOT touched
- All AI tables (6) — pre-built for AI features
- All prescription tables (5) — pre-built for repeat Rx
- Support ticket tables (2) — pre-built for support
- Patient profile tables (7) — active or planned
- `compliance_audit_log`, `phi_encryption_audit`, `safety_audit_log` — regulatory
- `intakes` (95 cols) — refactoring is a separate project
- Any table with data > 0 rows

---

## Section C: Patient Dashboard Verification

### C1. Functional testing
Verify these patient routes load and display correct data:
- `/patient` — main dashboard with recent intakes + prescriptions
- `/patient/intakes` — intake history list
- `/patient/intakes/[id]` — individual intake detail
- `/patient/documents` — document list
- `/patient/prescriptions` — prescription history
- `/patient/payment-history` — payment records
- `/patient/messages` — patient messages
- `/patient/health-profile` — health history
- `/patient/settings` — profile settings
- `/patient/notifications` — notification center

### C2. Check data flow
- Does intake status update in real-time?
- Do documents appear after doctor approval?
- Do payments show correct amounts?
- Are completed intakes properly displayed?

### C3. Report broken pages
Document any routes that error, show empty states incorrectly, or have broken links.

---

## Section D: Stripe Product Cleanup

### D1. Archive duplicate products
| Product | ID | Why Archive |
|---|---|---|
| Medical Certificate (old) | prod_TcBQpQx9CcRqL1 | Replaced by prod_Tiv9E2qwMg73in (1-day) + prod_TpZawtygZNMoAC (2-day) |
| Prescription (old) | prod_TcBQ4KA4oB909T | Replaced by prod_Tiv8dZIaXiWP7d (Repeat prescription) |

### D2. Leave specialty products
ED, Hair Loss, Weight Loss, Women's Health — ready for site launch, no changes needed.

---

## Out of Scope (future work)
- Subscription plans for repeat medications
- Launching specialty services on the website
- Refactoring the 95-column `intakes` table
- ChunkLoadError / Clerk auth loading fix
- SEO & content marketing
- Medicare integration
