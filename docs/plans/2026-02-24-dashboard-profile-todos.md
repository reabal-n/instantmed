# Dashboard Profile Todos Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the onboarding gate with an in-dashboard todo checklist that lets patients complete their profile (phone, address, medicare) via DrawerPanel forms.

**Architecture:** Remove the `onboarding_completed` redirect from `requireRole()`, pass profile data from the server page to the dashboard client component, render a `ProfileTodoCard` at the top of the dashboard with progress bar and tickable items. Each item opens a `DrawerPanel` with a focused mini-form. Three new server actions handle individual field saves with existing validation + PHI encryption. Add a "Back to InstantMed.com.au" link in the sidebar footer.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind v4, Supabase, Framer Motion, shadcn/ui, DrawerPanel (existing panel system), AES-256-GCM encryption

---

## Task 1: Remove Onboarding Gate

**Files:**
- Modify: `lib/auth.ts:345-348`
- Modify: `app/patient/layout.tsx:17`

**Step 1: Remove the onboarding redirect from `requireRole()`**

In `lib/auth.ts`, delete lines 345-348:
```typescript
// DELETE THESE LINES:
// Check onboarding for patients (unless explicitly allowed)
if (userRole === "patient" && !options?.allowIncompleteOnboarding && !authUser.profile.onboarding_completed) {
  redirect("/patient/onboarding")
}
```

**Step 2: Simplify the patient layout**

In `app/patient/layout.tsx`, remove the `allowIncompleteOnboarding` option since the gate no longer exists:
```typescript
// BEFORE:
const authUser = await requireRole(["patient"], { allowIncompleteOnboarding: true })
// AFTER:
const authUser = await requireRole(["patient"])
```

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS (the `allowIncompleteOnboarding` option type should still be valid, just unused)

**Step 4: Commit**

```bash
git add lib/auth.ts app/patient/layout.tsx
git commit -m "feat: remove onboarding gate — patients go straight to dashboard"
```

---

## Task 2: Create Profile Todo Server Actions

**Files:**
- Create: `app/actions/profile-todo.ts`

**Step 1: Create the server action file with three actions**

Create `app/actions/profile-todo.ts` with:
- `updatePhoneAction(profileId, phone)` — validates Australian phone, encrypts, saves
- `updateAddressAction(profileId, data)` — validates postcode-state, verifies via Google Geocoding, saves
- `updateMedicareAction(profileId, data)` — validates Medicare number, encrypts, saves with IRN + expiry + MyHR consent

Each action:
1. Authenticates user via `auth()`
2. Verifies profile ownership
3. Validates input using existing validators (`validateAustralianPhone`, `validatePostcodeState`, `validateMedicareNumber`)
4. Encrypts PHI via `encryptIfNeeded()`
5. Updates Supabase profile
6. Calls `revalidatePath("/patient")`
7. Returns `{ success: boolean; error?: string; fieldErrors?: Record<string, string> }`

Reuses imports from `app/patient/onboarding/actions.ts`:
- `validateAustralianPhone` from `@/lib/validation/australian-phone`
- `validatePostcodeState` from `@/lib/validation/australian-address`
- `validateMedicareNumber` from `@/lib/validation/medicare`
- `verifyAddress` from `@/lib/addressfinder/server`
- `encryptIfNeeded` from `@/lib/security/encryption`

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add app/actions/profile-todo.ts
git commit -m "feat: add individual profile field update server actions"
```

---

## Task 3: Create ProfileTodoCard Component

**Files:**
- Create: `components/patient/profile-todo-card.tsx`

**Step 1: Create the todo card component**

A `"use client"` component that:
- Accepts `profileData` prop with current profile state (phone, address fields, medicare fields)
- Calculates which items are complete vs pending
- Renders a card with:
  - Title: "Complete your profile"
  - Subtitle: "X of 3 complete" with progress bar
  - Three todo items: Phone, Address, Medicare (optional)
  - Each item shows check icon when complete, circle when pending
  - Click handler on each calls `onOpenDrawer(type)` callback prop
- Card is hidden with `AnimatePresence` when all items complete
- Uses `motion.div` for enter/exit animations
- Medicare item shows "(optional)" label and "Needed for prescriptions & referrals" hint

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add components/patient/profile-todo-card.tsx
git commit -m "feat: add ProfileTodoCard checklist component"
```

---

## Task 4: Create Profile Drawer Forms

**Files:**
- Create: `components/patient/profile-drawers.tsx`

**Step 1: Create the drawer forms component**

A `"use client"` file with three components:
- `PhoneDrawer` — single phone input with Australian format hint, save button
- `AddressDrawer` — AddressAutocomplete + suburb input + state pill grid + postcode input
- `MedicareDrawer` — Medicare number segmented input (5 boxes × 2 digits) + IRN pill selector (1-5) + expiry (month/year grids) + MyHR consent Switch + DataSecurityStrip

Each drawer:
- Uses `DrawerPanel` wrapper with appropriate title
- Has its own form state (useState)
- Pre-fills from existing profile data
- Calls the corresponding server action from Task 2
- Shows inline validation errors
- Shows loading state on save button (`ButtonSpinner`)
- Closes the panel on successful save
- Uses `usePanel()` for `closePanel()`

Form components reused from existing codebase:
- `AddressAutocomplete` from `@/components/ui/address-autocomplete`
- `DataSecurityStrip` from `@/components/checkout/trust-badges`
- `Input` from `@/components/ui/input`
- `Button` from `@/components/uix`
- `Switch` from `@/components/ui/switch`

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add components/patient/profile-drawers.tsx
git commit -m "feat: add phone, address, medicare drawer forms"
```

---

## Task 5: Wire Todo Card into Dashboard

**Files:**
- Modify: `app/patient/page.tsx`
- Modify: `components/patient/panel-dashboard.tsx`

**Step 1: Pass profile data from server page**

In `app/patient/page.tsx`, add profile fields to the `PanelDashboard` props:
```typescript
return (
  <PanelDashboard
    fullName={authUser.profile.full_name || "Patient"}
    patientId={patientId}
    intakes={intakesResult.data || []}
    prescriptions={prescriptionsResult.data || []}
    error={fetchError}
    profileData={{
      profileId: patientId,
      phone: authUser.profile.phone,
      addressLine1: authUser.profile.address_line1,
      suburb: authUser.profile.suburb,
      state: authUser.profile.state,
      postcode: authUser.profile.postcode,
      medicareNumber: authUser.profile.medicare_number,
      medicareIrn: authUser.profile.medicare_irn,
      medicareExpiry: authUser.profile.medicare_expiry,
      consentMyhr: authUser.profile.consent_myhr,
    }}
  />
)
```

**Step 2: Add ProfileTodoCard to PanelDashboard**

In `components/patient/panel-dashboard.tsx`:
1. Add `profileData` to the `PatientDashboardProps` interface
2. Import `ProfileTodoCard` and the drawer components
3. Add drawer open handlers using `usePanel()` + `DrawerPanel`
4. Render `<ProfileTodoCard>` between the welcome section and the error state section

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 4: Commit**

```bash
git add app/patient/page.tsx components/patient/panel-dashboard.tsx
git commit -m "feat: wire profile todo card into patient dashboard"
```

---

## Task 6: Add Home Link to Sidebar

**Files:**
- Modify: `components/shell/left-rail.tsx`

**Step 1: Add "Back to InstantMed.com.au" link**

In `components/shell/left-rail.tsx`, add an external link in the footer section (before the copyright line):

```typescript
{isExpanded && (
  <div className="p-4 border-t border-border shrink-0">
    <a
      href="https://instantmed.com.au"
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      Back to InstantMed.com.au
    </a>
    <p className="text-xs text-muted-foreground text-center">
      InstantMed © {new Date().getFullYear()}
    </p>
  </div>
)}
```

Import `ExternalLink` from lucide-react at the top.

When sidebar is collapsed, show just the icon with a tooltip (title attribute).

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

**Step 3: Commit**

```bash
git add components/shell/left-rail.tsx
git commit -m "feat: add 'Back to InstantMed.com.au' link in sidebar"
```

---

## Task 7: Final Verification

**Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: PASS with no errors

**Step 2: Run tests**

Run: `pnpm test`
Expected: All 268+ tests pass

**Step 3: Final commit (if any uncommitted changes)**

```bash
git status
```
