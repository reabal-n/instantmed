# Shared Addressfinder Primitive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inconsistent address entry with one Addressfinder-only primitive used across patient intake, patient profile/settings, staff patient editing, and prescribing identity.

**Architecture:** Address entry should become a single reusable contract: Addressfinder search first, Addressfinder metadata when selected, manual structured fallback only after search/details failure, and profile-level provenance columns. The API routes own provider behavior; UI surfaces consume a shared component and persist the same normalized fields.

**Tech Stack:** Next.js 15.5 App Router, React 18.3, TypeScript 5.9, Tailwind v4, shadcn/Radix form primitives, Supabase migrations, Vitest.

## Global Constraints

- Do not upgrade Next, React, Tailwind, Framer Motion, or any pinned stack package.
- Do not add Google Places fallback; Addressfinder is the single address-search source for this rebuild.
- Manual address entry appears only after Addressfinder returns no result, errors, or details cannot be parsed.
- Manual and legacy unknown structured addresses can proceed with a warning; missing structured fields or invalid postcode/state block.
- Existing profile addresses remain `unknown`; no proactive cleanup dashboard.
- Do not store raw provider payloads in v1.
- Use shared primitives; do not hardcode address behavior separately in individual forms.

---

## File Structure

- Modify `app/api/places/autocomplete/route.ts`: remove Google fallback path and return Addressfinder-only outcomes.
- Modify `app/api/places/details/route.ts`: remove Google details path and return Addressfinder-only outcomes.
- Modify `lib/google-places/provider-telemetry.ts`: rename or constrain provider telemetry so it no longer treats Google as a supported runtime fallback.
- Modify `lib/request/address-metadata.ts`: define profile/intake metadata semantics around `addressfinder`, `manual`, and `unknown`.
- Modify `components/ui/address-autocomplete.tsx`: make failure-to-manual behavior explicit and reusable.
- Modify `components/request/steps/patient-details-step.tsx`: consume the shared primitive and persist metadata in answers.
- Modify `app/patient/settings/settings-client.tsx`: use the same address primitive and metadata contract.
- Modify `app/doctor/patients/add-patient-dialog.tsx`: use the same address primitive and metadata contract.
- Modify `app/doctor/patients/[id]/edit-patient-dialog.tsx`: use the same address primitive and metadata contract.
- Modify `lib/doctor/prescribing-identity-update.ts`: validate manual/unknown/Addressfinder structured states consistently.
- Create migration `supabase/migrations/20260626090000_add_profile_address_metadata.sql`: add profile metadata columns.
- Update tests in `lib/__tests__/places-routes.test.ts`, `lib/__tests__/address-metadata.test.ts`, `lib/__tests__/patient-snapshot.test.ts`, `lib/__tests__/doctor-add-patient-validation.test.ts`, and `lib/__tests__/prescribing-identity-update.test.ts`.

## Task 1: Make Addressfinder The Only Search Provider

**Files:**
- Modify `app/api/places/autocomplete/route.ts`
- Modify `app/api/places/details/route.ts`
- Modify `lib/__tests__/places-routes.test.ts`

**Interfaces:**
- Consumes: `mapAddressFinderAutocompleteResponse`, `mapAddressFinderMetadataToParsedAddress`, `normalizeAddressSearchInput`, `normalizePlaceId`
- Produces: `/api/places/autocomplete` and `/api/places/details` return Addressfinder results only

- [ ] **Step 1: Add failing route tests**

Add tests asserting that no Google request is made when Addressfinder returns zero results, errors, or is not configured.

```ts
it("does not fall back to Google when Addressfinder returns no predictions", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ completions: [] }), { status: 200 }))

  const response = await GET(new NextRequest("https://instantmed.test/api/places/autocomplete?input=8%20Josephine"))
  const body = await response.json()

  expect(body).toMatchObject({ predictions: [], status: "ZERO_RESULTS", provider: "addressfinder" })
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain("api.addressfinder.io")
})
```

- [ ] **Step 2: Run route tests and verify failure**

Run: `pnpm test -- lib/__tests__/places-routes.test.ts`

Expected: fails because the route currently falls back to Google.

- [ ] **Step 3: Remove Google fallback from autocomplete route**

Update `app/api/places/autocomplete/route.ts` so Addressfinder is the only provider. If `ADDRESSFINDER_KEY` is missing, return `{ predictions: [], status: "ERROR", provider: "addressfinder", error: "Address provider not configured" }`. If Addressfinder returns zero predictions, return `{ predictions: [], status: "ZERO_RESULTS", provider: "addressfinder" }`. If Addressfinder fetch fails, return `{ predictions: [], status: "ERROR", provider: "addressfinder" }`.

- [ ] **Step 4: Remove Google fallback from details route**

Update `app/api/places/details/route.ts` so only `af:` place IDs are accepted. Non-Addressfinder place IDs return `{ status: "INVALID_REQUEST", provider: "addressfinder", error: "Addressfinder place ID required" }`. Addressfinder details failures return `ZERO_RESULTS` or `ERROR` without attempting Google.

- [ ] **Step 5: Run route tests**

Run: `pnpm test -- lib/__tests__/places-routes.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/places/autocomplete/route.ts app/api/places/details/route.ts lib/__tests__/places-routes.test.ts
git commit -m "refactor: make address search addressfinder only"
```

## Task 2: Add Profile Address Metadata Columns

**Files:**
- Create `supabase/migrations/20260626090000_add_profile_address_metadata.sql`
- Modify generated DB types if this repo requires manual type updates
- Modify `lib/request/address-metadata.ts`
- Modify `lib/__tests__/address-metadata.test.ts`

**Interfaces:**
- Produces profile columns:
  - `address_source text check (address_source in ('addressfinder', 'manual'))`
  - `address_provider_place_id text`
  - `address_verified_at timestamptz`

- [ ] **Step 1: Add metadata tests**

Add tests for `addressfinder`, `manual`, and legacy `unknown`.

```ts
expect(buildAddressAuditMetadata({
  addressLine1: "8 Josephine Avenue",
  addressVerified: true,
  addressProviderPlaceId: "af:address-id",
})).toMatchObject({
  address_verified: true,
  address_provider_place_id: "af:address-id",
  address_provider: "addressfinder",
})
```

- [ ] **Step 2: Add migration**

Create a migration with:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address_source text,
  ADD COLUMN IF NOT EXISTS address_provider_place_id text,
  ADD COLUMN IF NOT EXISTS address_verified_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_address_source_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_address_source_chk
  CHECK (address_source IS NULL OR address_source IN ('addressfinder', 'manual'));

COMMENT ON COLUMN public.profiles.address_source IS 'Address provenance: addressfinder for verified Addressfinder selection, manual for structured fallback, null for legacy unknown.';
COMMENT ON COLUMN public.profiles.address_provider_place_id IS 'Addressfinder provider ID when selected from Addressfinder.';
COMMENT ON COLUMN public.profiles.address_verified_at IS 'Timestamp when the current address was verified through Addressfinder.';
```

- [ ] **Step 3: Update metadata helper semantics**

Keep intake metadata compatibility but ensure profile semantics distinguish:

```ts
export type AddressSource = "addressfinder" | "manual" | "unknown"
```

Use `unknown` as derived UI state only; do not store `"unknown"` in the database.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/address-metadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations lib/request/address-metadata.ts lib/__tests__/address-metadata.test.ts
git commit -m "feat: add address provenance metadata"
```

## Task 3: Refactor Shared Address UI Contract

**Files:**
- Modify `components/ui/address-autocomplete.tsx`

**Interfaces:**
- Produces callback events:
  - `onAddressSelect(address: AddressComponents)`
  - `onManualEntry()`
  - `onVerificationChange(isVerified: boolean)`
- Manual entry becomes available only after failed search/details.

- [ ] **Step 1: Add behavior tests if component test infrastructure exists**

If this repo has no DOM component test harness for this component, add contract coverage through source-level tests already used in `lib/__tests__/doctor-add-patient-contract.test.ts`.

- [ ] **Step 2: Make failure states explicit**

Update the component so it has distinct states for:

- `idle`
- `searching`
- `selecting`
- `verified`
- `failed_search`
- `failed_details`
- `manual`

Only `failed_search` and `failed_details` show `Enter address manually`.

- [ ] **Step 3: Keep the component provider-neutral at prop level**

The component should not expose Google terminology. Rename copy and internal labels from "place" where user-visible to "address" where practical, while keeping API compatibility if lower-level client types still use `place_id`.

- [ ] **Step 4: Run focused tests**

Run: `pnpm test -- lib/__tests__/doctor-add-patient-contract.test.ts lib/__tests__/address-metadata.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/address-autocomplete.tsx lib/__tests__/doctor-add-patient-contract.test.ts
git commit -m "refactor: standardize address autocomplete fallback"
```

## Task 4: Wire Address Metadata Through All Profile And Intake Surfaces

**Files:**
- Modify `components/request/steps/patient-details-step.tsx`
- Modify `app/patient/settings/settings-client.tsx`
- Modify `app/doctor/patients/add-patient-dialog.tsx`
- Modify `app/doctor/patients/[id]/edit-patient-dialog.tsx`
- Modify `app/doctor/patients/actions.ts`
- Modify `lib/doctor/prescribing-identity-update.ts`

**Interfaces:**
- Consumes: shared address component callbacks
- Produces: normalized address fields plus profile metadata columns

- [ ] **Step 1: Write failing validation tests**

Add cases:

- Addressfinder address saves `address_source = "addressfinder"`, provider ID, verified timestamp.
- Manual fallback saves `address_source = "manual"`, provider ID null, verified timestamp null.
- Legacy existing structured address with null metadata remains allowed.

- [ ] **Step 2: Update staff add/edit forms**

Persist `address_source`, `address_provider_place_id`, and `address_verified_at` through server actions. When user manually edits a field after selecting Addressfinder, clear provider ID and mark source manual only after manual fallback has been explicitly opened.

- [ ] **Step 3: Update patient intake**

Continue storing `addressVerified` and `addressProviderPlaceId` in answers. Manual fallback stores `addressVerified = false` and empty provider ID.

- [ ] **Step 4: Update patient settings**

Replace standalone manual address inputs with the shared Addressfinder-first primitive and manual fallback behavior.

- [ ] **Step 5: Run focused tests**

Run: `pnpm test -- lib/__tests__/doctor-add-patient-validation.test.ts lib/__tests__/prescribing-identity-update.test.ts lib/__tests__/patient-snapshot.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/request/steps/patient-details-step.tsx app/patient/settings/settings-client.tsx app/doctor/patients app/doctor/patients/actions.ts lib/doctor/prescribing-identity-update.ts lib/__tests__
git commit -m "feat: persist address provenance across identity surfaces"
```

## Task 5: Update Snapshot And Preflight Address Readiness

**Files:**
- Modify `lib/doctor/patient-snapshot.ts`
- Modify `lib/parchment/sync-patient.ts`
- Modify tests in `lib/__tests__/patient-snapshot.test.ts` and `lib/__tests__/parchment-sync-patient.test.ts`

**Interfaces:**
- Produces address states:
  - `addressfinder`: allow
  - `manual`: allow with warning
  - `unknown`: allow with warning if structured
  - `incomplete`: block
  - `invalid`: block

- [ ] **Step 1: Add readiness tests**

Cover Addressfinder, manual, legacy unknown, incomplete, and postcode/state mismatch.

- [ ] **Step 2: Implement readiness derivation**

Do not require provider verification for Parchment. Require structured line 1, suburb, state, postcode, and local postcode/state validity.

- [ ] **Step 3: Render warning labels**

Patient/profile surfaces should show `Addressfinder`, `Manual`, `Unknown`, or `Incomplete`.

- [ ] **Step 4: Run tests**

Run: `pnpm test -- lib/__tests__/patient-snapshot.test.ts lib/__tests__/parchment-sync-patient.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/doctor/patient-snapshot.ts lib/parchment/sync-patient.ts lib/__tests__/patient-snapshot.test.ts lib/__tests__/parchment-sync-patient.test.ts
git commit -m "feat: classify address readiness for prescribing"
```

## Verification

- Run `pnpm typecheck`.
- Run `pnpm test -- lib/__tests__/places-routes.test.ts lib/__tests__/address-metadata.test.ts lib/__tests__/patient-snapshot.test.ts lib/__tests__/parchment-sync-patient.test.ts lib/__tests__/prescribing-identity-update.test.ts`.
- Run `pnpm lint`.
- Browser check on `http://localhost:3060`:
  - Patient intake address search success.
  - Patient intake Addressfinder failure reveals manual fields.
  - Staff edit patient Addressfinder success.
  - Staff edit patient Addressfinder failure reveals manual fields.
  - Profile shows Addressfinder/manual/unknown status accurately.
