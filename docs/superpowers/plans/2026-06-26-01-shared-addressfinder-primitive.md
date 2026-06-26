# Shared Address Primitive — QOL + Consolidation Implementation Plan

> **REVISED 2026-06-26 after operator review.** Original plan removed Google Places and added profile provenance columns. Operator decisions: **KEEP the Google fallback** (Addressfinder primary, Google safety net), **no migration / no provenance columns** (derive verified-vs-manual at read), and **allow manually-typed addresses for prescribing, flagged for the doctor** (no hard `requireVerified` block). This plan reflects that.

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One consistent Addressfinder-first address input across every surface, with a never-stranded manual escape and provider-neutral status labels — no schema change.

**Architecture:** `components/ui/address-autocomplete.tsx` is the single address primitive. Addressfinder is primary; Google remains the silent server-side fallback in `app/api/places/*`. Manual entry is always reachable. Verified-vs-manual is derived at read time from existing answer/profile data (`lib/request/address-metadata.ts`); no new DB columns.

**Tech Stack:** Next.js 15.5 App Router, React 18.3, TypeScript 5.9, Tailwind v4, shadcn/Radix, Vitest, PostHog (telemetry already wired).

## Global Constraints

- **Do NOT remove the Google Places fallback** or the `ADDRESSFINDER_KEY || NEXT_PUBLIC_ADDRESSFINDER_KEY` resolution in `app/api/places/*`.
- **No migration, no `profiles` provenance columns.** Derive verified/manual/unknown at read.
- Manual address entry must be reachable at all times (not only after a zero-result search).
- Prescribing allows a manually-typed address; surface it to the doctor as "Manually entered" — do not hard-block checkout on verification.
- Provider names ("Google" / "Addressfinder") must not leak to patients; show "Verified address" / "Manually entered".
- Do not upgrade any pinned stack package.

## Already done — do NOT redo

- Staff add/edit patient dialogs, patient onboarding, profile drawers, and patient intake **already use** `AddressAutocomplete`. Only patient **Settings** still uses a raw input.
- AF-vs-Google telemetry **already exists**: `trackAddressProviderLookup` → PostHog `address_provider_lookup` (`used_google_fallback`, `provider`, `outcome`). No telemetry code needed.
- Addressfinder IDs already carry the `af:` prefix, so `deriveAddressProvider` labels verified AF selections correctly.

## File Structure

- Modify `components/ui/address-autocomplete.tsx`: always-available manual-entry affordance; keep provider terminology out of user-visible copy.
- Modify `app/patient/settings/settings-client.tsx`: replace the raw street-address input with `AddressAutocomplete` + manual fallback (mirror `patient-details-step.tsx`).
- Modify `lib/request/address-metadata.ts`: expose a provider-neutral status label ("Verified address" / "Manually entered") for patient/doctor surfaces.
- Modify the address-status render sites that currently surface `providerLabel` (Google/Addressfinder) to use the neutral status instead.
- Update/extend tests: `lib/__tests__/address-metadata.test.ts` and any address-autocomplete contract test.

## Task 1: Always-reachable manual entry + provider-neutral copy

- [ ] **Step 1:** In `address-autocomplete.tsx`, add an always-visible "Enter address manually" text button beneath the field (in addition to the existing post-no-results button), wired to the existing `handleManualEntry`. Hidden once `isManualEntry` or `isVerified`.
- [ ] **Step 2:** Ensure manual entry is reachable during a slow/in-flight search (don't gate the affordance on `!isSearching`).
- [ ] **Step 3:** Keep all user-visible copy provider-neutral ("address", "verified", "manual"). No "Google"/"Addressfinder" strings in the component.
- [ ] **Step 4:** Add/extend a contract test asserting the manual-entry affordance is always rendered and `onManualEntry` fires.
- [ ] **Step 5:** Commit.

## Task 2: Consolidate patient Settings onto the shared primitive

- [ ] **Step 1:** Replace the raw `Street Address` `<Input>` in `settings-client.tsx` with `AddressAutocomplete`, mirroring the manual-fallback pattern in `patient-details-step.tsx` (suburb/state/postcode stay structured inputs, revealed/used for manual entry).
- [ ] **Step 2:** Preserve the existing save payload shape (`address_line1`, `suburb`, `state`, `postcode`). Persist `addressVerified`/`providerPlaceId` into the same answer/profile path the intake uses if it is already wired; otherwise just keep structured fields.
- [ ] **Step 3:** Verify dirty-state/save-enable logic still works.
- [ ] **Step 4:** Commit.

## Task 3: Provider-neutral status label at read

- [ ] **Step 1:** In `address-metadata.ts`, add a neutral `statusLabel` consumer helper (reuse `getAddressReviewSummary.statusLabel` = "Verified"/"Manual") and a display string "Verified address" / "Manually entered".
- [ ] **Step 2:** Update the render sites that show `providerLabel` (Google/Addressfinder) to the neutral status. Doctor surfaces may keep a subtle "manually entered" flag so a manual prescribing address is visible.
- [ ] **Step 3:** Update `address-metadata.test.ts`.
- [ ] **Step 4:** Commit.

## Verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test -- lib/__tests__/address-metadata.test.ts`.
- Browser on `http://localhost:3060`:
  - Intake + Settings: address search returns Addressfinder results; manual entry reachable at all times; selecting fills line1/suburb/state/postcode.
  - Doctor patient profile shows "Verified address" / "Manually entered", no provider name leak.
  - Confirm (PostHog) `address_provider_lookup` shows Addressfinder serving (low `used_google_fallback`).
