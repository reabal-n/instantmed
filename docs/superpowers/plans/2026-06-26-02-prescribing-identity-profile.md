# Prescribing Identity And Patient Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make patient profile identity the canonical current identity for prescribing and Parchment, with explicit first/last names, complete Medicare-or-IHI rules, and a focused prescribing identity editor.

**Architecture:** Profiles own current identity. Intake answers are historical evidence only. Parchment sync reads only the canonical profile identity, never a hidden blend of profile and request answers.

**Tech Stack:** Next.js 15.5 App Router, React 18.3, TypeScript 5.9, Supabase migrations/actions, Zod-style validation helpers, Vitest.

## Global Constraints

- IHI remains a valid prescribing identifier.
- Medicare is valid only when number, IRN, and expiry are complete if any Medicare field is present.
- First and last name are required for all patient-facing clinical services, including medical certificates.
- `full_name` is derived display/search/backcompat data only.
- Do not create an identity merge wizard or per-field intake/profile merge UI.
- Do not overwrite existing split names during backfill.

---

## File Structure

- Modify `lib/doctor/doctor-patient-create.ts`: accept explicit first/last names.
- Modify `lib/doctor/manual-patient.ts`: align manual patient creation with explicit first/last.
- Modify `lib/doctor/prescribing-identity-update.ts`: enforce Medicare expiry and split names.
- Modify `lib/doctor/patient-snapshot.ts`: include profile identity, Parchment readiness, address status labels.
- Modify `app/doctor/patients/add-patient-dialog.tsx`: replace full name input.
- Modify `app/doctor/patients/[id]/edit-patient-dialog.tsx`: replace full name input.
- Modify `app/doctor/patients/[id]/patient-detail-client.tsx`: replace vague `Details complete` status.
- Modify `app/doctor/patients/actions.ts`: persist split names and derived `full_name`.
- Modify `app/patient/onboarding/onboarding-flow.tsx`, `app/patient/onboarding/actions.ts`, `app/patient/settings/settings-client.tsx`, and profile actions that write identity.
- Create migration `supabase/migrations/20260626091000_backfill_profile_split_names.sql`.
- Update tests in `lib/__tests__/doctor-add-patient-validation.test.ts`, `lib/__tests__/manual-patient.test.ts`, `lib/__tests__/patient-snapshot.test.ts`, `lib/__tests__/prescribing-identity-update.test.ts`, and intake/profile contract tests.

## Task 1: Enforce Split Name Inputs In Domain Validation

**Files:**
- Modify `lib/doctor/doctor-patient-create.ts`
- Modify `lib/doctor/manual-patient.ts`
- Modify `lib/__tests__/doctor-add-patient-validation.test.ts`
- Modify `lib/__tests__/manual-patient.test.ts`

**Interfaces:**
- Produces:
  - `firstName: string`
  - `lastName: string`
  - `fullName: string` derived as `${firstName} ${lastName}`

- [ ] **Step 1: Add failing tests**

Add tests that reject missing first or last name and derive `full_name`.

```ts
const result = validateDoctorPatientCreateInput({
  firstName: "Teck",
  lastName: "Xian Ung",
  email: "patient@example.com",
  dateOfBirth: "1997-05-23",
  sex: "M",
  phone: "0426274141",
  medicareNumber: "3574339996",
  medicareIrn: "3",
  medicareExpiry: "2030-06",
  ihiNumber: "",
  addressLine1: "8 Josephine Avenue",
  suburb: "Mount Waverley",
  state: "VIC",
  postcode: "3149",
})

expect(result.success).toBe(true)
expect(result.value?.firstName).toBe("Teck")
expect(result.value?.lastName).toBe("Xian Ung")
expect(result.value?.fullName).toBe("Teck Xian Ung")
```

- [ ] **Step 2: Run tests and verify failure**

Run: `pnpm test -- lib/__tests__/doctor-add-patient-validation.test.ts lib/__tests__/manual-patient.test.ts`

Expected: FAIL because validation still expects `fullName`.

- [ ] **Step 3: Update validation input types**

Replace editable `fullName` with `firstName` and `lastName`. Keep derived `fullName` in normalized output.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/doctor-add-patient-validation.test.ts lib/__tests__/manual-patient.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/doctor/doctor-patient-create.ts lib/doctor/manual-patient.ts lib/__tests__/doctor-add-patient-validation.test.ts lib/__tests__/manual-patient.test.ts
git commit -m "refactor: require split patient names"
```

## Task 2: Add Conservative Split Name Backfill

**Files:**
- Create `supabase/migrations/20260626091000_backfill_profile_split_names.sql`

**Interfaces:**
- Consumes existing `profiles.full_name`
- Produces missing `first_name` and `last_name` only when safe

- [ ] **Step 1: Create migration**

Use a conservative SQL update:

```sql
UPDATE public.profiles
SET
  first_name = split_part(trim(full_name), ' ', 1),
  last_name = trim(substr(trim(full_name), length(split_part(trim(full_name), ' ', 1)) + 2))
WHERE
  (first_name IS NULL OR trim(first_name) = '')
  AND (last_name IS NULL OR trim(last_name) = '')
  AND full_name IS NOT NULL
  AND trim(full_name) ~ '^[A-Za-z][A-Za-z''-]*( [A-Za-z][A-Za-z''-]*)+$';
```

This leaves one-token and suspicious names untouched.

- [ ] **Step 2: Add migration comment**

Document that this is a one-time safety backfill and does not overwrite existing split values.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations
git commit -m "chore: backfill safe split patient names"
```

## Task 3: Require Medicare Expiry When Medicare Is Used

**Files:**
- Modify `lib/doctor/prescribing-identity-update.ts`
- Modify `lib/doctor/patient-snapshot.ts`
- Modify `lib/parchment/sync-patient.ts`
- Modify `lib/stripe/prescribing-profile-fields.ts`
- Modify `lib/request/unified-checkout.ts`
- Modify tests in `lib/__tests__/prescribing-identity-update.test.ts`, `lib/__tests__/patient-snapshot.test.ts`, `lib/__tests__/parchment-sync-patient.test.ts`, `lib/__tests__/prescribing-profile-fields.test.ts`

**Interfaces:**
- Medicare complete means number + IRN + expiry.
- IHI-only is valid.
- Both present means Medicare must be complete.

- [ ] **Step 1: Add failing tests**

Add cases:

- Medicare number + IRN without expiry is blocked.
- IHI-only passes.
- Medicare incomplete plus IHI present is blocked because incomplete Medicare cannot silently ride along.

- [ ] **Step 2: Update validation helpers**

In each prescribing identity validator, calculate:

```ts
const hasAnyMedicare = Boolean(medicareNumber || medicareIrn || medicareExpiry)
const hasCompleteMedicare = Boolean(validMedicareNumber && validIrn && validExpiry)
const hasValidIhi = Boolean(normalizeValidIhiNumber(ihiNumber))
const prescribingIdentifierValid = hasCompleteMedicare || (!hasAnyMedicare && hasValidIhi)
```

- [ ] **Step 3: Update Parchment payload builder**

Send Medicare fields only when complete. If any Medicare field is present but incomplete, return local issues before payload creation.

- [ ] **Step 4: Run focused tests**

Run: `pnpm test -- lib/__tests__/prescribing-identity-update.test.ts lib/__tests__/patient-snapshot.test.ts lib/__tests__/parchment-sync-patient.test.ts lib/__tests__/prescribing-profile-fields.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/doctor lib/parchment lib/stripe lib/request lib/__tests__
git commit -m "fix: require complete medicare details when used"
```

## Task 4: Replace Patient Profile Status Labels

**Files:**
- Modify `app/doctor/patients/[id]/patient-detail-client.tsx`
- Modify `lib/doctor/patient-snapshot.ts`
- Modify tests in `lib/__tests__/patient-snapshot.test.ts`

**Interfaces:**
- Produces separate status concepts:
  - `profileIdentityStatus`
  - `parchmentStatus`
  - `addressStatus`

- [ ] **Step 1: Add snapshot tests**

Assert labels for complete, incomplete, manual address, unknown address, and Parchment states.

- [ ] **Step 2: Update snapshot model**

Return structured labels rather than one `completenessLabel`.

- [ ] **Step 3: Update UI**

Replace `Details complete` with status cards/chips:

- `Profile identity: Complete/Incomplete`
- `Parchment: Ready/Synced/Needs resync/Rejected`
- `Address: Addressfinder/Manual/Unknown/Incomplete`

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/patient-snapshot.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/doctor/patients/[id]/patient-detail-client.tsx lib/doctor/patient-snapshot.ts lib/__tests__/patient-snapshot.test.ts
git commit -m "refactor: split patient identity readiness statuses"
```

## Task 5: Build Focused Prescribing Identity Editor

**Files:**
- Create `components/doctor/prescribing-identity-editor.tsx`
- Modify `app/doctor/patients/[id]/patient-detail-client.tsx`
- Modify `components/doctor/parchment-prescribe-panel.tsx`
- Modify request review components that open patient identity repair

**Interfaces:**
- Editor fields:
  - first name
  - last name
  - DOB
  - sex
  - phone
  - Medicare vs IHI
  - Medicare number, IRN, expiry
  - IHI
  - shared address primitive

- [ ] **Step 1: Extract existing form state**

Do not invent a second validation path. Reuse `prescribing-identity-update.ts` for server validation.

- [ ] **Step 2: Route repair actions into editor**

Open this editor from:

- `Edit patient details`
- `Resync identity`
- local preflight blockers
- Parchment rejection state

- [ ] **Step 3: Keep request answers read-only**

If request answers differ, show small helper text only. Do not add merge controls.

- [ ] **Step 4: Browser verify**

Run local app on `http://localhost:3060` and verify editor opens from patient profile and request review.

- [ ] **Step 5: Commit**

```bash
git add components/doctor/prescribing-identity-editor.tsx app/doctor/patients/[id]/patient-detail-client.tsx components/doctor/parchment-prescribe-panel.tsx
git commit -m "feat: add focused prescribing identity editor"
```

## Verification

- Run `pnpm typecheck`.
- Run `pnpm test -- lib/__tests__/doctor-add-patient-validation.test.ts lib/__tests__/manual-patient.test.ts lib/__tests__/prescribing-identity-update.test.ts lib/__tests__/patient-snapshot.test.ts lib/__tests__/parchment-sync-patient.test.ts`.
- Run `pnpm lint`.
- Browser check patient profile and request review on `http://localhost:3060`.
