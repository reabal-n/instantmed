# DOCTOR_ONBOARDING.md — InstantMed

> Internal technical onboarding playbook for new clinicians.
> Covers the platform-side setup. Clinical onboarding (protocols, scope, supervision) is a separate doc owned by the Medical Director.
>
> **Audience:** operator (admin) + the new doctor's first technical setup session.
> **When to load:** onboarding a new clinician, AHPRA verification, Parchment user_id linking, service-line capability changes, suspending/reactivating a doctor.

---

## 0. Pre-onboarding checklist (operator side)

Before bringing the new doctor into the system, the operator confirms:

- [ ] AHPRA registration number is current (active GP registration, no conditions, no recency-of-practice flags). Format `/^[A-Z]{3}\d{10}$/` (e.g. `MED0001234567`). The platform validates the format only; the operator must verify currency on the AHPRA public register.
- [ ] Medical Director has approved the new clinician for at least one service line (med certs is the lowest-bar starting line).
- [ ] Indemnity insurance confirmed.
- [ ] Parchment account exists for the doctor (separate flow: doctor signs up via Parchment, receives a `user_id`). If not, see §3.
- [ ] Doctor has reviewed `docs/CLINICAL.md` (clinical boundaries + prescribing rules + AI limits + consent) and `docs/SECURITY.md` (PHI handling).

## 1. Staff role model

InstantMed runs 3 staff roles, defined on `profiles.role` (Phase 1 of dashboard remaster, 2026-05-11):

| Role | Capability inheritance | Surface access |
|------|------------------------|----------------|
| `admin` | admin + doctor (owner-operator only) | Everything. The owner-operator is both admin and doctor; admin role inherits doctor capabilities. |
| `doctor` | doctor | Clinical surfaces only: queue, cases, patient profiles scoped via `lib/doctor/patient-access.ts`, identity settings. |
| `support` | support | Non-clinical operations only: `/admin/ops`, `/admin/webhook-dlq`, `/admin/ops/parchment`, `/admin/ops/prescribing-identity`. Phase 8 (2026-05-20) opened `/admin/intakes` (intake ledger) and the intake refund action ($100/refund cap, 3/24h limit). No clinical actions, no prescribing, no Email delivery, no settings. |

A new doctor hire gets `role = doctor`. Owner-operator stays `role = admin`.

**Future-doctor patient boundary:** Non-admin doctors see ONLY patients with a concrete doctor relationship (claimed/reviewed/reviewing intake, owned script task, issued certificate, or authored patient note). Enforced in `lib/doctor/patient-access.ts`. Do not give a new doctor `admin` role to bypass this; it exists on purpose to prevent cross-doctor PHI exposure.

## 2. Per-doctor capability flags

Seven boolean columns on `profiles`, gated at runtime via `doctorHasCapability(profile, capability)` from `lib/auth/staff-capabilities.ts`:

| Capability key | DB column | Default for new doctor | Owner-operator default |
|----------------|-----------|------------------------|------------------------|
| `review_med_certs` | `can_review_med_certs` | `true` | `true` |
| `review_repeat_rx` | `can_review_repeat_rx` | `true` | `true` |
| `review_consults` | `can_review_consults` | `true` | `true` |
| `review_ed` | `can_review_ed` | `true` | `true` |
| `review_hair_loss` | `can_review_hair_loss` | `true` | `true` |
| `prescribe_s4` | `can_prescribe_s4` | `true` | `true` |
| `prescribe_s8` | `can_prescribe_s8` | **`false`** (explicit grant required) | `true` |

**`prescribe_s8` is the only flag that defaults off.** Schedule 8 prescribing requires an explicit AHPRA-restricted grant; do not flip this without confirming the new doctor's S8 authority on the AHPRA register.

**Runtime gating:**
- `app/actions/approve-cert.ts` gates on `review_med_certs` before rate-limit + credential checks.
- `app/doctor/queue/actions.ts` → `updateStatusAction` gates on `doctorCanReviewService(profile, serviceType, subtype)` for `approved` and `awaiting_script` transitions.
- `declineIntakeAction` gates BEFORE delegating to the canonical decline (a wrong-line doctor cannot trigger refund + email).
- `checkParchmentPrescribingCapability(...)` in `lib/doctor/parchment-prescribing-capability.ts` gates Parchment handoff: `prescribe_s4` is required for every embedded prescribing launch; `prescribe_s8` is required when repeat-script intake answers contain a controlled-medication name.

**Setting capabilities:** `/admin/doctors` exposes a capability UI per doctor (added 2026-05-21). Operator toggles via `updateDoctorCapabilitiesAction` in `app/actions/admin-doctor-capabilities.ts`. Changes are audit-logged with before/after diff under `doctor_capabilities_updated`.

## 3. Parchment linking

Parchment is the external ePrescribing system. Every prescribing doctor needs a Parchment `user_id` linked to their InstantMed profile via `profiles.parchment_user_id`.

### 3.1 Org details

| Field | Production value |
|-------|------------------|
| Parchment Org ID | `650437d7-d8a4-4aca-987a-5f09134792f4` (InstantMed organisation) |
| HPIO | `8003624166773603` |
| CSP # | `8003631566702298` |
| API base URL | `https://api.parchmenthealth.io/external` |

### 3.2 Doctor account setup steps

1. Doctor creates a Parchment account via the Parchment portal (separate signup, not handled by InstantMed).
2. Parchment provisions a `user_id` (UUID) and a `HPII` for the doctor.
3. Operator links the Parchment `user_id` to the InstantMed `profiles.parchment_user_id` via `/admin/ops/parchment` (Phase 7 dashboard remaster surface) or via the admin doctor management page.
4. Verify the link by running the daily Parchment smoke (`/api/cron/parchment-smoke`, daily 7:30am AEST) and checking `/admin/ops/parchment` shows the doctor as linked.

### 3.3 Required environment

Parchment integration runs behind the `parchment_embedded_prescribing` DB feature flag in `/admin/features`. When off, doctors see "Mark Sent Manually" only; when on, they see the embedded Parchment iframe panel.

Production env vars (Vercel, all 7 required when the flag is on):

```
PARCHMENT_API_URL=https://api.parchmenthealth.io/external
PARCHMENT_PARTNER_ID=<partner_id>
PARCHMENT_PARTNER_SECRET=<partner_secret>
PARCHMENT_ORGANIZATION_ID=650437d7-d8a4-4aca-987a-5f09134792f4
PARCHMENT_ORGANIZATION_SECRET=<org_secret>
PARCHMENT_WEBHOOK_SECRET=<webhook_secret>
PARCHMENT_DEFAULT_USER_ID=<default_prescriber_user_id>
```

No sandbox env vars should remain in production. Verify via `vercel env ls` — Parchment vars must appear only in Production environment.

### 3.4 Iframe whitelist

Parchment confirmed `https://instantmed.com.au` and `https://www.instantmed.com.au` as allowed iframe-embedding origins on 2026-05-01. `lib/parchment/embed-policy.ts` defaults must keep both hosts plus local/Vercel preview hosts. If a new production host is added, operator confirms Parchment whitelists it before pointing real traffic.

## 4. Identity completeness gates

A doctor cannot approve into `awaiting_script` (the Parchment handoff state) until their identity is complete. Same patient-snapshot rules that power `/admin/ops/prescribing-identity` apply to the doctor side.

Required identity fields on `profiles`:

- `full_name`, `email`, `phone`
- `date_of_birth`, `sex`
- Structured address: `address_line1`, `suburb`, `state`, `postcode`
- `medicare_number` (for Parchment payload compatibility, stored both plaintext and encrypted per `docs/SECURITY.md` Medicare dual-write policy)
- AHPRA registration: `ahpra_number` (validated format `/^[A-Z]{3}\d{10}$/`)
- Provider number (Medicare provider)
- Signature: `signature_storage_path` (private Supabase Storage upload)
- `parchment_user_id` (from §3)

**Required identity scope** per `lib/request/prescribing-identity.ts` `requiresPrescribingIdentityForRequest`: every service line EXCEPT medical certificates requires the full structured identity bundle. Med certs only need name + DOB + email. Pinned by `lib/__tests__/prescribing-identity-gate-contract.test.ts`.

## 5. Service-line verification gates

Before turning on paid traffic for a new doctor on a service line, follow `docs/SERVICE_LAUNCH_CHECKLISTS.md`:

| Service | Doctor must complete |
|---------|----------------------|
| Medical certificates | Capability `review_med_certs` granted. AHPRA + provider number complete. Signature uploaded. Identity gates clear. First 5 cases reviewed manually with operator QA. |
| Repeat prescriptions | All med-cert gates + `review_repeat_rx` granted + `prescribe_s4` granted + Parchment `user_id` linked + production Parchment smoke green + 10 cases reviewed manually with operator QA. `prescribe_s8` granted ONLY if AHPRA register confirms S8 authority. |
| ED | All repeat-prescription gates + `review_ed` granted + 10 ED cases reviewed manually + nitrate + cardiac contraindication understanding confirmed. |
| Hair loss | All repeat-prescription gates + `review_hair_loss` granted + 10 hair-loss cases reviewed manually + red-flag escalation understanding confirmed. |
| Women's health | All repeat-prescription gates + `review_consults` granted + women's-health scope confirmed: UTI + new/switch pill only, with red-flag, pregnancy-risk, and contraception contraindication escalation understood. |
| Weight loss (when launched) | Gated future. Capability + monitoring infrastructure + Medical Director sign-off required. |

Production paid traffic gates per `docs/SERVICE_LAUNCH_CHECKLISTS.md` apply BEFORE turning on any campaign — these are SHARED across all doctors on a service line, not per-doctor.

## 6. Doctor availability

Doctors control their queue visibility via the availability toggle at `/doctor/settings/identity` (`profiles.doctor_available`). When `doctor_available = false`:

- `getDoctorQueue({ doctorId })` returns empty for that doctor.
- They will not be assigned new intakes.
- Existing claimed intakes remain accessible.

Use this for time off, on-call rotation, or capacity management.

## 7. Suspending or offboarding a doctor

To suspend without removing:

1. Toggle `doctor_available = false`.
2. Optionally revoke capability flags (set each `can_*` to `false`) via `/admin/doctors`. Audit log captures the diff.
3. Doctor cannot approve, decline, or prescribe; existing patient relationships remain visible.

To offboard:

1. Suspend (above).
2. Reassign any active claimed intakes to another doctor or release back to the unclaimed queue.
3. Revoke Parchment `user_id` link (set `profiles.parchment_user_id = NULL`).
4. Do NOT delete the profile or auth user. Clinical records remain linked by `profiles.id` per the data retention schedule (`docs/CLINICAL.md` §Data Retention).
5. Set `role = patient` if you want them to retain a patient account, or close the auth user via Supabase dashboard (see `docs/OPERATIONS.md` §5 Patient account access for the account closure pattern; reuse the principle: never hard-delete a profile with clinical record history).

## 8. Marketing surface rules (relevant to new doctors)

Per CLAUDE.md identity rule:

- **Do NOT advertise** doctor count, individual doctor names, FRACGP, peer review, or team size on public marketing surfaces.
- Use "AHPRA-registered doctors" for service copy.
- Use "AHPRA-registered Medical Director" only where a governance role is necessary (e.g. `/clinical-governance` page).
- Individual doctor full names are OK on cert PDFs, decline messages, dashboard messages, and email signoffs (patient-facing transactional surfaces).
- Stylised signature mark (not readable name) is OK on marketing pages.

## 9. References

| Topic | Doc |
|-------|-----|
| Capability helper API | `lib/auth/staff-capabilities.ts` |
| Capability runtime gating | `app/actions/approve-cert.ts`, `app/doctor/queue/actions.ts` |
| Parchment integration | `lib/parchment/client.ts`, `lib/parchment/sync-patient.ts`, `lib/parchment/embed-policy.ts`, `app/api/webhooks/parchment/route.ts` |
| Identity completeness gate | `lib/request/prescribing-identity.ts`, `lib/__tests__/prescribing-identity-gate-contract.test.ts` |
| Clinical boundaries the doctor must read | `docs/CLINICAL.md` |
| PHI handling the doctor must understand | `docs/SECURITY.md` |
| Service-line launch gates | `docs/SERVICE_LAUNCH_CHECKLISTS.md` |
| Capability flag UI | `/admin/doctors` (admin route) |
| Parchment ops surface | `/admin/ops/parchment` (admin or support route) |
| Identity blocker report | `/admin/ops/prescribing-identity` (admin or support route) |

---

**Last refreshed:** 2026-05-23. Bump on every change to capability flag set, Parchment integration, or onboarding sequence.
