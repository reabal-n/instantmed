# Pre-Launch Remediation — Design Document

**Date:** 2026-02-22
**Author:** Platform Audit
**Status:** Pending Approval
**Approach:** B — "Launch-Ready" (Critical + High + Key Medium)

---

## Context

A comprehensive 6-domain audit of the InstantMed telehealth platform identified ~70+ issues across clinical safety, credibility, pricing, guest flow, UX/UI, documentation, and code quality. This design document describes the recommended remediation approach (Approach B) which addresses all critical and high-priority issues plus the most impactful medium-priority items.

### Audit Domains Covered
1. Intake forms, pathways, steps, and question types
2. Doctor dashboard, queue, and medical certificate generation
3. Certificate templates, PDF pipeline, and delivery flow
4. Prescription/Repeat-Rx workflow (Parchment simplification)
5. Guest checkout → signup flow
6. UX/UI credibility and design quality
7. All .md documentation files (55 files)

### Goals
- **Pre-launch hardening** — catch critical issues before real patients use the platform
- **Technical debt reduction** — remove dead code, fix inconsistencies, simplify over-engineered systems
- **Clinical safety** — ensure all safety guardrails are active in the new intake flow
- **Owner requirements alignment** — phone for all, 3-day certs, prescription simplification, no Medicare for med certs

---

## Approach Selection

Three approaches were evaluated:

| Approach | Scope | Timeline | Risk |
|----------|-------|----------|------|
| A: Surgical Strike | 19 critical+high fixes only | 3-5 days | Medium issues become production debt |
| **B: Launch-Ready** | **27 fixes (critical+high+key medium)** | **7-10 days** | **Best balance for healthcare launch** |
| C: Full Remediation | All 70+ issues | 3-4 weeks | Delays launch for low-impact items |

**Selected: Approach B** — Addresses all safety, compliance, and owner-requirement issues while deferring cosmetic and low-impact items. The prescription simplification (removing ~4,500 lines) is the largest single task but essential for alignment with the Parchment workflow.

---

## Phase 1: Safety & Compliance (Days 1-3)

### 1.1 Wire Controlled Substance Detection into New Intake
**Files:** `components/request/steps/medication-step.tsx`, `lib/clinical/intake-validation.ts`
**Change:** Import and call `checkControlledSubstance()` from `intake-validation.ts` in the medication step. Block submission with a clear warning if a controlled substance is detected. The function already exists — it just needs to be wired into the UI.

### 1.2 Connect Clinical Validation to Step Components
**Files:** `components/request/steps/symptoms-step.tsx`, `components/request/steps/safety-step.tsx`, `lib/clinical/intake-validation.ts`, `lib/clinical/triage-rules-engine.ts`
**Change:** Call `checkEmergencySymptoms()` on symptom text submission. Call `checkRedFlagPatterns()` on safety step answers. These functions exist in the clinical validation module but are not imported by any step component.

### 1.3 Restore Safety Screening
**Files:** `components/request/steps/safety-step.tsx`
**Change:** Add pregnancy, allergy, and adverse reaction screening questions to the safety step. The old `unified-flow-client.tsx` has these questions — extract the question definitions and add them to the new step component. Keep the emergency acknowledgment toggle. Target: ~150 lines (currently 78).

### 1.4 Make Phone Required for ALL Services
**Files:** `components/request/steps/patient-details-step.tsx`
**Change:** Remove the `needsPhone` conditional at line 88. Make phone always required regardless of service type. Update validation to match.

### 1.5 Fix Certificate Reference Entropy
**Files:** `lib/pdf/cert-identifiers.ts`
**Change:** Replace `Math.random()` at line 52 with `crypto.randomInt(100000)`. One-line fix.

### 1.6 Remove PII from Documentation
**Files:** `docs/QUICK_REFERENCE_MED_CERT.md`, `docs/PRODUCTION_CHECKLIST.md`
**Change:** Replace real doctor name, AHPRA number, and address with `[DOCTOR_NAME]`, `[AHPRA_NUMBER]`, `[ADDRESS]` placeholders. Remove Supabase project ref ID.

### 1.7 Remove All Fabricated Live Data
**Files:** `components/marketing/live-wait-time.tsx`, `components/marketing/total-patients-counter.tsx`, `app/medical-certificate/medical-certificate-client.tsx`, `app/repeat-prescription/repeat-prescription-client.tsx`, `app/general-consult/general-consult-client.tsx`, `components/marketing/service-picker.tsx`
**Change:** Remove `LiveWaitTime` component entirely. Remove `TotalPatientsCounter` component. Remove `getDailyStats()` from all 4 files. Replace with either real data from Supabase (if available) or honest static copy: "Most requests reviewed within 2-4 hours during business hours."

---

## Phase 2: Owner Requirements & Pricing (Days 3-5)

### 2.1 Add 3-Day Certificate Option
**Files:** `components/request/steps/certificate-step.tsx`, `lib/constants.ts`, `components/request/steps/checkout-step.tsx`
**Change:** Add 3-day option to certificate duration selector. Add `MED_CERT_3DAY` pricing constant. Update checkout step pricing map. Recommended pricing structure:
- 1 day: $19.95
- 2 days: $29.95
- 3 days: $39.95 (new)

Optimal duration/date UI: Radio button group for 1/2/3 days with a start date picker. End date auto-calculated and displayed. No free-form date ranges.

### 2.2 Fix Pricing Inconsistencies
**Files:** `components/request/service-hub-screen.tsx`, `components/request/steps/checkout-step.tsx`, `lib/constants.ts`
**Change:** Make `lib/constants.ts` the single source of truth. Remove all hardcoded price overrides from `service-hub-screen.tsx` ($59.95 for women's health) and `checkout-step.tsx` (line 88 hardcoded 2-day override). Import from constants everywhere.

### 2.3 Fix Service Hub Routing
**Files:** `components/request/service-hub-screen.tsx`
**Change:** Change "Repeat Prescription" card to route to `'repeat-script'` service type (not `'prescription'`). This fixes the pricing from $49.95 to $29.95.

### 2.4 Fix Certificate Type Naming
**Files:** `components/request/steps/certificate-step.tsx`, `components/request/steps/review-step.tsx`
**Change:** Standardize on `'study'` (not `'uni'`) across all components. Update review step label mapping to match.

### 2.5 Simplify Prescription System for Parchment
**Files:** Multiple files across `app/prescriptions/`, `app/doctor/repeat-rx/`, `app/api/repeat-rx/`, `lib/repeat-rx/`
**Change:** This is the largest single task. The approach:

1. **Simplify patient intake** to 4-5 steps:
   - Medication name + strength (simple text input, not PBS search)
   - Brief reason / notes (free text)
   - Patient details (name, DOB, Medicare/IHI, address, phone — all required)
   - Consent + payment

2. **Simplify doctor review** to a request card:
   - Patient details (copy-ready for Parchment)
   - Medication requested
   - Patient notes
   - "Mark Script Sent" toggle (promotes `script_tasks` to primary interface)

3. **Remove over-engineered components:**
   - 681-line rules engine (`lib/repeat-rx/rules-engine.ts`)
   - Eligibility API endpoint
   - Clinical summary generation
   - PBS medication search for prescriptions (keep for reference only)
   - Gating/knockout steps
   - Static medication database (`lib/data/medications.ts`)

4. **Keep:** `script_tasks.ts` (pending_send → sent → confirmed), audit logging, payment flow, Stripe integration.

**Note:** Do NOT delete the removed files immediately. Move them to a `_deprecated/` directory first, then delete after confirming the simplified flow works in production.

---

## Phase 3: UX & Guest Flow (Days 5-7)

### 3.1 Fix `/auth/register` Query Param Pass-Through
**Files:** `app/auth/register/page.tsx`
**Change:** Forward `email` and `redirect` query parameters to the Clerk sign-up URL. Parse `searchParams`, construct the Clerk URL with `?email_address=...&redirect_url=...` parameters.

### 3.2 Fix BECS Guest Account Email
**Files:** `app/api/stripe/webhook/route.ts`
**Change:** In the `async_payment_succeeded` handler (lines 777-903), add the same `sendGuestCompleteAccountEmail()` call that exists in the `checkout.session.completed` handler.

### 3.3 Replace Stock Doctor Photos
**Files:** `app/medical-certificate/medical-certificate-client.tsx`, service page files, testimonial data
**Change:** Replace Unsplash stock photo URLs with illustrated medical avatars (e.g., DiceBear "notionists" style or custom SVG illustrations). Never use identifiable stock photos of people claiming to be platform doctors.

### 3.4 Tone Down Pricing Psychology
**Files:** `components/marketing/hero.tsx`, service page files
**Change:** Remove struck-through "$60-90 at a GP" from hero. State price plainly: "Medical certificates from $19.95." Move price comparisons to a dedicated "How we compare" section below the fold if desired.

### 3.5 Delete Dead Unified Flow Code
**Files:** `app/request/unified-flow-client.tsx`, `app/start/unified-flow-client.tsx`
**Change:** Delete both files (~2,800 lines). Verify no imports reference them first (confirmed by audit: neither is imported anywhere).

---

## Phase 4: Hardening (Days 7-10)

### 4.1 Server-Side AHPRA Validation
**Files:** `app/actions/approve-cert.ts`, `app/doctor/settings/identity/` (server action)
**Change:** Add AHPRA format regex validation (`/^[A-Z]{3}\d{10}$/`) in the approval pipeline, not just client-side.

### 4.2 Soft Lock Maximum Duration
**Files:** `app/doctor/intakes/[id]/intake-detail-client.tsx`
**Change:** Add a 60-minute maximum lock duration. After 60 minutes of continuous extension, auto-release the lock and require re-claim.

### 4.3 Rate Limiting Fallback
**Files:** `lib/security/rate-limit.ts`
**Change:** Add an in-memory fallback rate limit (e.g., `Map<string, number[]>` with TTL). If the DB check fails AND the in-memory count exceeds a higher threshold (e.g., 100/hour), block the action.

### 4.4 Audit Log Search Enhancement
**Files:** `app/doctor/admin/audit-logs/audit-logs-client.tsx`
**Change:** Add date range picker and event type filter to the audit logs page. Keep existing intake ID search.

### 4.5 Fix Name Validation for International Characters
**Files:** `lib/request/validation.ts`
**Change:** Replace `/^[a-zA-Z\s'-]+$/` with a Unicode-aware regex or use a simpler approach: strip control characters but allow any Unicode letter categories (`\p{L}`).

### 4.6 Update Auth Documentation
**Files:** `docs/SYSTEM_BRIEF.md`, `docs/DEVELOPER_GUIDE.md`, `docs/RLS_POLICY_AUDIT.md`
**Change:** Update auth references from Supabase Auth to Clerk. Document the Clerk-to-Supabase JWT bridging mechanism. Remove HIPAA reference (not applicable in Australia).

### 4.7 Fix Stale Copy
**Files:** `app/how-it-works/page.tsx`
**Change:** Replace "Welcome to 2024" with evergreen copy: "Everything sent via email or SMS. No app needed."

---

## Deferred Items (Post-Launch Backlog)

These items are tracked but not included in the launch remediation:

- Template loader performance optimization (skip fs attempt on Vercel)
- Inconsistent download API patterns (redirect vs JSON)
- Fixed 30-second stale poll interval (add visibility-based backoff)
- Client-side-only queue search (server-side pagination)
- Loading skeleton descriptive text
- Guest re-download path after 7-day URL expiry
- Orphaned guest profile cleanup
- SEO doc consolidation (3 docs → 1)
- Medication search doc consolidation (2 docs → 1)
- Design system unification (3 conflicting specs → 1)
- Dead `merge_guest_profile()` SQL function and `failed_profile_merges` table
- Dead `RegisterClient` component
- Email outbox broken back link (`/admin/ops` → `/doctor/admin/ops`)
- Stuck intakes view action buttons
- themeColor change (orange → clinical blue)
- AnimatedFlipLink → standard hover states
- "Get started" → "Start a Request" CTA copy
- Reduce checkout trust badges from 8+ to 3-4
- Shooting stars and animated orbs removal
- Screenshot file in API directory cleanup
- Privacy Impact Assessment sign-off completion
- Medicolegal audit report re-assessment (Jan 2025)
- Empty `.windsurf` and `.cursor` config file cleanup
- README.md and CLAUDE.md creation

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Prescription simplification breaks existing requests | Medium | High | Use `_deprecated/` directory, feature flag the new flow, test with existing data |
| Pricing changes confuse returning patients | Low | Medium | Update all price references atomically in a single deployment |
| Clinical validation false positives block legitimate patients | Medium | Medium | Start with warning-only mode, escalate to hard-block after monitoring |
| Guest flow changes break existing pending intakes | Low | High | Test with active guest intakes before deploying |

---

## Success Criteria

- [ ] All 7 critical issues resolved and verified
- [ ] All 12 high-priority issues resolved and verified
- [ ] All 8 targeted medium-priority issues resolved and verified
- [ ] No regression in existing E2E test suite (42+ tests)
- [ ] Prescription flow simplified to request + toggle
- [ ] 3-day certificate option available and priced correctly
- [ ] Phone required for all service types
- [ ] All fabricated live data removed
- [ ] Certificate references use cryptographic randomness
- [ ] Guest → signup flow works end-to-end with email pre-fill
