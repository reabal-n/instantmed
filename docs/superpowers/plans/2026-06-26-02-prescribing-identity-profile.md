# Prescribing Identity And Patient Profile — Implementation Plan (REVISED)

> **REVISED 2026-06-26 after operator review.** Operator decisions: **split first/last name inputs EVERYWHERE** (staff add/edit dialogs + patient onboarding + patient settings + the domain validators); **enhance the existing edit-patient dialog** as the identity-repair surface (no second editor); **Medicare expiry is NOT required** (Parchment-confirmed — keep it optional); **no backfill migration**.

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. TDD on the validators first.

**Goal:** Make patient profile the canonical prescribing identity with explicit first/last names entered at the source (not auto-split), and clearer per-facet status — without a schema change.

## What is ALREADY done — do NOT redo

- **Medicare-or-IHI + optional expiry is already correct** in `lib/doctor/prescribing-identity-update.ts:208-235`: Medicare = number + IRN, IHI-only valid, expiry validated only if present. **Task 3 (require expiry) is dropped — no code change.**
- **`profiles.first_name`/`last_name` exist and are backfilled** (`types/db.ts:406-407`, baseline). **No backfill migration.**
- **Server actions already write the split**: `app/doctor/patients/actions.ts:169-171,406-408` consume `validation.value.firstName/lastName/fullName`. Keep `validateDoctorPatientCreateInput` returning `fullName` (derived) + `firstName` + `lastName` so these callers are unchanged.
- **Statuses are already separated** on `patient-detail-client.tsx` (Identity item L416, Parchment item L429, address via the Plan 01 snapshot). Task 4 is relabel + surface address, not a rebuild.

## Global Constraints

- Validators keep producing a derived `fullName` (`${firstName} ${lastName}`) so DB writes + duplicate lookups + Parchment are unchanged.
- Do not add a second validation path; reuse `prescribing-identity-update.ts`.
- Do not require Medicare expiry. Keep IHI-only valid.
- No DB migration.

## Tasks

### Task 1 — Validators → first/last (TDD)
- `lib/doctor/doctor-patient-create.ts`: `DoctorPatientCreateInput` gets `firstName`/`lastName` (drop editable `fullName`); require both; derive `fullName`. Keep `ValidDoctorPatientCreateInput` shape (`fullName`+`firstName`+`lastName`).
- `lib/doctor/manual-patient.ts`: `ManualPatientFormValues` gets `firstName`/`lastName`; derive `full_name`; set `first_name`/`last_name` directly; duplicate-lookup name key = `${firstName} ${lastName}`.
- Update `lib/__tests__/doctor-add-patient-validation.test.ts` + `lib/__tests__/manual-patient.test.ts` to the first/last contract (red → green). Preserve their source-grep assertions (`actionBody`, `patientDetailClientSource` strings).

### Task 2 — Forms → first/last
- `app/doctor/patients/add-patient-dialog.tsx` + `app/doctor/patients/[id]/edit-patient-dialog.tsx`: replace the single "Full name" input with First name + Last name; `INITIAL_FORM`/`patientFormValue` seed from `first_name`/`last_name` (fall back to a one-time split of `full_name` for legacy rows). Server actions unchanged.
- `app/actions/manual-patient.ts`: build the form input from first/last (only if a manual-patient form feeds it — confirm caller).
- `app/patient/onboarding/onboarding-flow.tsx` + `actions.ts`: collect First/Last; derive `full_name`.
- `app/patient/settings/settings-client.tsx` (Personal tab) + save path: First/Last; derive `full_name`.

### Task 3 — Status polish + expired-card QOL
- `patient-detail-client.tsx`: relabel "Details complete" → "Prescribing identity complete"; ensure the address status (Plan 01) renders in the same strip; calm-chrome.
- Non-blocking "Medicare card expired" flag when `medicare_expiry` is present and past (doctor-only signal; never blocks checkout). Likely in `patient-snapshot.ts`.

### Out of scope (handled elsewhere)
- **Intake name field → first/last is Plan 03** (the shared intake identity step). Flag it there so the flow is consistent.

## Verification
- `pnpm test` (doctor-add-patient-validation, manual-patient, patient-snapshot, prescribing-identity-update). `pnpm typecheck`, `pnpm lint`.
- Browser: staff add/edit patient, onboarding, settings collect First/Last and save; patient detail shows separated identity/Parchment/address statuses.
