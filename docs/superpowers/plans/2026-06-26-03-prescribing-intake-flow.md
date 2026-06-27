# Prescribing Intake Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use one shared prescribing identity step for all prescribing and specialty services, while keeping clinical questions service-specific.

**Architecture:** Identity is a reusable intake primitive. Repeat scripts, ED, hair loss, women’s health, and future prescribing services consume the same identity contract; each service owns only its clinical questions and service-specific safety rules.

**Tech Stack:** Next.js 15.5 App Router, React 18.3, Zustand intake store, TypeScript 5.9, Zod-style validation helpers, Vitest.

## Global Constraints

- Medical certificates require first and last name but do not require Medicare.
- Prescribing services require full prescribing identity: first/last, DOB, sex, phone, Medicare-or-IHI, structured address.
- IHI-only remains valid.
- Medicare path requires number and IRN. **Expiry is NOT required** (locked decision 2026-06-26; this line previously said "expiry" and contradicted plan-02 + the shipped code — `sync-patient.ts` omits `medicare_valid_to` when absent, `types.ts` marks it `.optional()`, migration `20260430000005`). Do not reintroduce an expiry mandate.
- If a Medicare number is provided, the number + IRN must be complete (expiry still optional).
- Repeat-script medication packet fields are mandatory only for repeat prescriptions.
- Do not force repeat-script dose/frequency fields onto ED, hair loss, UTI, pill, or future specialty services.

---

## File Structure

- Modify `components/request/steps/patient-details-step.tsx`: convert to or wrap with shared identity primitive.
- Modify `lib/request/prescribing-identity.ts`: keep service gate central.
- Modify `lib/request/step-registry.ts`: ensure every prescribing service uses the shared identity step.
- Modify `lib/request/unified-checkout.ts`: enforce prescribing identity before checkout.
- Modify `lib/stripe/prescribing-profile-fields.ts`: persist complete prescribing profile fields.
- Modify `app/actions/profile-todo.ts`, `app/patient/onboarding/actions.ts`, and patient settings actions if they duplicate identity logic.
- Update tests in `lib/__tests__/prescribing-identity-gate-contract.test.ts`, `lib/__tests__/unified-intake-regressions.test.ts`, `lib/__tests__/prescribing-profile-fields.test.ts`, and `lib/__tests__/canonical-prescription-routes.test.ts`.

## Task 1: Define Shared Prescribing Identity Field Contract

**Files:**
- Modify `lib/request/prescribing-identity.ts`
- Add or modify tests in `lib/__tests__/prescribing-identity-gate-contract.test.ts`

**Interfaces:**
- Produces:
  - `requiresPrescribingIdentityForRequest({ category, serviceType, subtype }): boolean`
  - field contract for prescribing identity

- [ ] **Step 1: Add contract tests**

Assert:

- med cert does not require Medicare/IHI
- repeat prescription requires prescribing identity
- consult subtypes require prescribing identity
- retired/future consult subtypes inherit prescribing identity when active through consult service type

- [ ] **Step 2: Keep gate centralized**

Do not add per-flow hardcoded checks in components. Components ask the central helper.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- lib/__tests__/prescribing-identity-gate-contract.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/request/prescribing-identity.ts lib/__tests__/prescribing-identity-gate-contract.test.ts
git commit -m "test: lock prescribing identity service gate"
```

## Task 2: Update Intake Identity Validation

**Files:**
- Modify `components/request/steps/patient-details-step.tsx`
- Modify `lib/request/unified-checkout.ts`
- Modify `lib/stripe/prescribing-profile-fields.ts`
- Modify tests in `lib/__tests__/unified-intake-regressions.test.ts` and `lib/__tests__/prescribing-profile-fields.test.ts`

**Interfaces:**
- Consumes answers:
  - `firstName`
  - `lastName`
  - `dob`
  - `sex`
  - `phone`
  - `identityMethod`
  - `medicareNumber`
  - `medicareIrn`
  - `medicareExpiry` (optional — NOT a required field; locked decision 2026-06-26)
  - `ihiNumber`
  - `addressLine1`
  - `suburb`
  - `state`
  - `postcode`
  - address metadata

- [ ] **Step 1: Add failing checkout tests**

Add tests:

- prescribing checkout allows Medicare without expiry (expiry is optional — locked decision 2026-06-26)
- prescribing checkout allows IHI-only
- med cert checkout requires first and last name but not Medicare
- prescribing checkout blocks missing first or last name

- [ ] **Step 2: Update validation**

Implement the shared Medicare/IHI rule in checkout validation and profile-field persistence.

- [ ] **Step 3: Update UI field behavior**

Show Medicare vs IHI choice consistently. Medicare fields are required only for Medicare path; IHI field is required for IHI path. If both are present, Medicare must be complete.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/unified-intake-regressions.test.ts lib/__tests__/prescribing-profile-fields.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/request/steps/patient-details-step.tsx lib/request/unified-checkout.ts lib/stripe/prescribing-profile-fields.ts lib/__tests__
git commit -m "fix: enforce shared prescribing identity in intake"
```

## Task 3: Apply Shared Identity Step Across Prescribing Services

**Files:**
- Modify `lib/request/step-registry.ts`
- Modify any subtype-specific step definitions that duplicate identity fields
- Modify `lib/__tests__/canonical-prescription-routes.test.ts`

**Interfaces:**
- Produces one identity step for repeat scripts, ED, hair loss, women’s health, and future prescribing consults.

- [ ] **Step 1: Add route/step tests**

Assert active prescribing flows include the shared identity step exactly once.

- [ ] **Step 2: Remove duplicate identity collection**

Service-specific steps should not ask for name, Medicare/IHI, phone, or address unless they are rendering the shared primitive.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- lib/__tests__/canonical-prescription-routes.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/request/step-registry.ts lib/__tests__/canonical-prescription-routes.test.ts
git commit -m "refactor: reuse prescribing identity step across prescribing flows"
```

## Task 4: Align Patient Onboarding And Settings

**Files:**
- Modify `app/patient/onboarding/onboarding-flow.tsx`
- Modify `app/patient/onboarding/actions.ts`
- Modify `app/patient/settings/settings-client.tsx`
- Modify `app/actions/profile-todo.ts`
- Modify `lib/__tests__/profile-todo-actions.test.ts`
- Modify `lib/__tests__/prescribing-profile-fields.test.ts`
- Modify `lib/__tests__/profile-completeness-meter.test.tsx` if the profile completeness UI displays prescribing identity fields

**Interfaces:**
- Produces same Medicare vs IHI choice outside intake.

- [ ] **Step 1: Add validation tests**

Add tests for patient profile/onboarding updates:

- Medicare expiry is optional (NOT required — locked decision 2026-06-26).
- IHI-only passes.
- First/last required.
- Address metadata persists.

- [ ] **Step 2: Update forms**

Use the same identity labels and requiredness as intake.

- [ ] **Step 3: Run profile and onboarding tests**

Run:

```bash
pnpm test -- lib/__tests__/profile-todo-actions.test.ts lib/__tests__/prescribing-profile-fields.test.ts lib/__tests__/profile-completeness-meter.test.tsx
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/patient/onboarding app/patient/settings app/actions/profile-todo.ts lib/__tests__
git commit -m "refactor: align patient profile identity with prescribing intake"
```

## Verification

- Run `pnpm typecheck`.
- Run `pnpm test -- lib/__tests__/prescribing-identity-gate-contract.test.ts lib/__tests__/unified-intake-regressions.test.ts lib/__tests__/prescribing-profile-fields.test.ts lib/__tests__/canonical-prescription-routes.test.ts`.
- Run `pnpm lint`.
- Browser verify repeat script, ED, hair loss, women’s health identity flows on `http://localhost:3060`.
