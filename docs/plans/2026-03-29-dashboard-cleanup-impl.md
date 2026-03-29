# Dashboard Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove dead routes, eliminate duplicate ops pages, centralise format utils, extract inline queries, fix lint violations, and split 4 god files — leaving dashboards lean and maintainable.

**Architecture:** Six sequenced phases — delete dead code first (lowest risk, highest reward), then shared ops components, then format utils, then lib/data extraction, then god file splits. Each phase is independently committable. Phase order matters: nav fixes must come before deletion so nothing breaks mid-commit.

**Tech Stack:** Next.js 15 App Router, TypeScript 5.9 strict, Tailwind v4, Supabase, `pnpm`

---

## Phase 1 — Delete `app/doctor/admin/` and `app/admin/performance/`

### Task 1: Fix nav pointers before deleting routes

**Files:**
- Modify: `components/shared/navbar/mobile-nav.tsx`
- Modify: `components/shared/navbar/mobile-menu-content.tsx`
- Modify: `components/shared/navbar/user-menu.tsx`
- Modify: `components/admin/admin-sidebar.tsx`
- Modify: `app/admin/ops/reconciliation/reconciliation-client.tsx`

**Step 1: Update mobile-nav**

In `components/shared/navbar/mobile-nav.tsx` find the entry with `href: "/doctor/admin"` (around line 94) and change it to `href: "/admin"`.

**Step 2: Update mobile-menu-content**

In `components/shared/navbar/mobile-menu-content.tsx` find `href: "/doctor/admin"` (around line 114) and change to `href: "/admin"`.

**Step 3: Update user-menu**

In `components/shared/navbar/user-menu.tsx` find `router.push("/doctor/admin")` (around line 235) and change to `router.push("/admin")`.

**Step 4: Remove Performance from admin sidebar**

In `components/admin/admin-sidebar.tsx` delete line 70:
```
{ href: "/admin/performance", label: "Performance", icon: Gauge },
```
Also remove the `Gauge` import from lucide-react if it's only used there.

**Step 5: Fix cross-link in admin reconciliation**

In `app/admin/ops/reconciliation/reconciliation-client.tsx` around line 399, change:
```tsx
<Link href={`/doctor/admin/email-outbox?intake_id=${record.intake_id}`}>
```
to:
```tsx
<Link href={`/admin/email-hub?intake_id=${record.intake_id}`}>
```

**Step 6: Typecheck**

```bash
pnpm typecheck
```
Expected: 0 errors.

**Step 7: Commit**

```bash
git add components/shared/navbar/mobile-nav.tsx components/shared/navbar/mobile-menu-content.tsx components/shared/navbar/user-menu.tsx components/admin/admin-sidebar.tsx app/admin/ops/reconciliation/reconciliation-client.tsx
git commit -m "fix: reroute doctor/admin nav links to /admin, remove mock performance page link"
```

---

### Task 2: Delete `app/doctor/admin/` entirely

**Files:**
- Delete: `app/doctor/admin/` (entire directory)

**Step 1: Remove the directory**

```bash
rm -rf /Users/rey/Desktop/instantmed/app/doctor/admin
```

**Step 2: Verify no remaining references**

```bash
grep -r "doctor/admin" app/ components/ lib/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```
Expected: 0 matches. If any remain, fix them before proceeding.

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: remove doctor/admin subtree — doctors use /admin directly"
```

---

### Task 3: Delete `app/admin/performance/`

**Files:**
- Delete: `app/admin/performance/` (entire directory)

**Step 1: Remove the directory**

```bash
rm -rf /Users/rey/Desktop/instantmed/app/admin/performance
```

**Step 2: Verify no remaining references**

```bash
grep -r "admin/performance" app/ components/ lib/ --include="*.tsx" --include="*.ts"
```
Expected: 0 matches.

**Step 3: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: delete mock performance dashboard (100% hardcoded data, no real metrics)"
```

---

## Phase 2 — Shared ops components

The three ops pages (`reconciliation`, `intakes-stuck`, `doctor-ops`) exist as near-identical copies under `/admin/ops/`. We'll move them to `components/shared/ops/` as single parameterised components, then update the admin pages to use them.

### Task 4: Create shared `ReconciliationClient`

**Files:**
- Create: `components/shared/ops/reconciliation-client.tsx`
- Modify: `app/admin/ops/reconciliation/reconciliation-client.tsx`

**Step 1: Create the shared component**

Copy `app/admin/ops/reconciliation/reconciliation-client.tsx` to `components/shared/ops/reconciliation-client.tsx`.

In the new file, add a `basePath` prop to the component interface and replace all hardcoded `/admin/ops/reconciliation` strings with `${basePath}/reconciliation`, and `/admin/ops` back-links with `basePath`:

Find the component signature (around line 140) and update:
```tsx
interface ReconciliationClientProps {
  // ... existing props
  basePath?: string
}

export function ReconciliationClient({ ..., basePath = "/admin/ops" }: ReconciliationClientProps) {
```

Then replace:
- `router.push(\`/admin/ops/reconciliation?...)` → `router.push(\`${basePath}/reconciliation?...)`
- `href="/admin/ops"` → `href={basePath}`
- `href={\`/doctor/admin/email-outbox?intake_id=...}` → `href={\`/admin/email-hub?intake_id=...}` (already fixed in Task 1 for admin copy, fix here too)

**Step 2: Replace admin reconciliation-client with a re-export**

Replace the entire contents of `app/admin/ops/reconciliation/reconciliation-client.tsx` with:
```tsx
export { ReconciliationClient } from "@/components/shared/ops/reconciliation-client"
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add components/shared/ops/reconciliation-client.tsx app/admin/ops/reconciliation/reconciliation-client.tsx
git commit -m "refactor: extract ReconciliationClient to shared/ops with basePath prop"
```

---

### Task 5: Create shared `IntakesStuckClient`

**Files:**
- Create: `components/shared/ops/intakes-stuck-client.tsx`
- Modify: `app/admin/ops/intakes-stuck/intakes-stuck-client.tsx`

**Step 1: Create the shared component**

Copy `app/admin/ops/intakes-stuck/intakes-stuck-client.tsx` to `components/shared/ops/intakes-stuck-client.tsx`.

Add `basePath` prop (default `"/admin/ops"`) and replace:
- `router.push(\`/admin/ops/intakes-stuck?...)` → `router.push(\`${basePath}/intakes-stuck?...)`
- `router.push("/admin/ops/intakes-stuck")` → `router.push(\`${basePath}/intakes-stuck\`)`
- `href="/admin/ops"` → `href={basePath}`

Also remove the `Snippet` import if it's only in the admin version (the doctor copy didn't have it — use `Badge` or whatever was in the doctor version for that section).

Check what `Snippet` was used for:
```bash
grep -n "Snippet" app/admin/ops/intakes-stuck/intakes-stuck-client.tsx
```
If it's for displaying intake IDs, replace with `<code className="font-mono text-xs">`.

**Step 2: Replace admin file with re-export**

```tsx
export { IntakesStuckClient } from "@/components/shared/ops/intakes-stuck-client"
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add components/shared/ops/intakes-stuck-client.tsx app/admin/ops/intakes-stuck/intakes-stuck-client.tsx
git commit -m "refactor: extract IntakesStuckClient to shared/ops with basePath prop"
```

---

### Task 6: Create shared `DoctorOpsClient`

**Files:**
- Create: `components/shared/ops/doctor-ops-client.tsx`
- Modify: `app/admin/ops/doctors/doctor-ops-client.tsx`

**Step 1: Create the shared component**

Copy `app/admin/ops/doctors/doctor-ops-client.tsx` to `components/shared/ops/doctor-ops-client.tsx`.

Add `basePath` prop (default `"/admin/ops"`) and replace:
- `router.push(\`/admin/ops/doctors?...)` → `router.push(\`${basePath}/doctors?...)`
- `href="/admin/ops"` → `href={basePath}`

**Step 2: Replace admin file with re-export**

```tsx
export { DoctorOpsClient } from "@/components/shared/ops/doctor-ops-client"
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add components/shared/ops/doctor-ops-client.tsx app/admin/ops/doctors/doctor-ops-client.tsx
git commit -m "refactor: extract DoctorOpsClient to shared/ops with basePath prop"
```

---

## Phase 3 — Format utilities

`lib/format.ts` already exports `formatCurrency(cents)` and `formatRelative(date)`. We need to add `formatAUD`, `formatTimeAgo`, `formatAge`, and `formatMinutes`, then remove inline copies from all dashboard files.

### Task 7: Add missing format functions to `lib/format.ts`

**Files:**
- Modify: `lib/format.ts`

**Step 1: Add the functions**

Append to `lib/format.ts`:

```ts
/**
 * Format a whole-dollar AUD amount for display (e.g. 12345 → "$12,345").
 * Use this for revenue/KPI dashboards. For exact invoice amounts use formatCurrency(cents).
 */
export function formatAUD(dollars: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars)
}

/**
 * Format a past timestamp as a human-readable relative string.
 * e.g. "2 minutes ago", "3 hours ago", "2 days ago"
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
}

/**
 * Format a duration in minutes as a short age string.
 * e.g. 45 → "45 min", 90 → "1h 30 min"
 */
export function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes} min` : `${hours}h`
}

/**
 * Format a nullable duration in minutes as a compact string.
 * e.g. null → "—", 45 → "45m", 90 → "1h 30m", 1500 → "1d 1h"
 */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return "—"
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.round(minutes % 60)
  if (hours < 24) return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}
```

**Step 2: Typecheck**

```bash
pnpm typecheck
```

**Step 3: Commit**

```bash
git add lib/format.ts
git commit -m "feat: add formatAUD, formatTimeAgo, formatAge, formatMinutes to lib/format"
```

---

### Task 8: Remove inline format copies from dashboard files

**Files to update** (remove inline functions, add imports from `@/lib/format`):

| File | Functions to remove | Import to add |
|------|--------------------|----|
| `app/admin/business-kpi/business-kpi-client.tsx` | `formatCurrency`, `formatMinutes` | `formatAUD`, `formatMinutes` |
| `app/admin/finance/finance-client.tsx` | `formatCurrency` | `formatAUD` |
| `app/admin/finance/revenue/page.tsx` | inline `formatAUD` arrow | `formatAUD` |
| `app/admin/emails/analytics/email-analytics-client.tsx` | `formatTimeAgo` | `formatTimeAgo` |
| `app/admin/email-hub/email-hub-client.tsx` | `formatRelativeTime` | `formatTimeAgo` (rename usages) |
| `app/admin/errors/errors-client.tsx` | `formatTimeAgo` | `formatTimeAgo` |
| `app/admin/ops/reconciliation/reconciliation-client.tsx` (now shared) | `formatAge`, `formatCategory` (keep `formatCategory` — it's domain-specific) | `formatAge` |
| `app/admin/ops/intakes-stuck/intakes-stuck-client.tsx` (now shared) | `formatAge` | `formatAge` |
| `app/admin/ops/doctors/doctor-ops-client.tsx` (now shared) | `formatMinutes` | `formatMinutes` |
| `app/doctor/intakes/[id]/intake-detail-client.tsx` | `formatConsultSubtype` (keep — domain specific) | — |
| `app/admin/doctors/performance/performance-client.tsx` | `formatResponseTime` (keep — domain specific wrapper) | `formatMinutes` as base |

For each file:
1. Find the inline function definition
2. Delete it
3. Add the import: `import { formatAUD, formatTimeAgo, formatAge, formatMinutes } from "@/lib/format"` (only what's needed)
4. Update any call sites that used `formatCurrency(dollars)` to use `formatAUD(dollars)` — note the existing `formatCurrency` in lib/format takes **cents**, so only use it where the value is in cents.

**Step 1: Process each file** (work through the table above one file at a time)

**Step 2: Typecheck after all changes**

```bash
pnpm typecheck
```

**Step 3: Lint**

```bash
pnpm lint
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove inline format function copies, use lib/format throughout"
```

---

## Phase 4 — Extract business-kpi queries to lib/data

### Task 9: Create `lib/data/business-kpi.ts`

**Files:**
- Create: `lib/data/business-kpi.ts`
- Modify: `app/admin/business-kpi/page.tsx`

**Step 1: Create the data module**

Create `lib/data/business-kpi.ts` with `import "server-only"` at the top.

Move all 19 Supabase query blocks from `app/admin/business-kpi/page.tsx` into a single exported function:

```ts
import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface BusinessKPIData {
  // Mirror exactly what page.tsx currently builds from Promise.allSettled results
  revenueThisMonth: number
  revenueLastMonth: number
  // ... (derive from what results[0..18] currently produce)
}

export async function getBusinessKPIData(): Promise<BusinessKPIData> {
  const supabase = createServiceRoleClient()
  const now = new Date()
  // ... move all date setup and Promise.allSettled block here
  // return the assembled object
}
```

The exact shape of `BusinessKPIData` should mirror what `page.tsx` currently passes as props to `BusinessKPIClient`.

**Step 2: Simplify page.tsx**

Replace the entire body of `app/admin/business-kpi/page.tsx` with:

```tsx
import { getBusinessKPIData } from "@/lib/data/business-kpi"
import { BusinessKPIClient } from "./business-kpi-client"

export const dynamic = "force-dynamic"
export const metadata = { title: "Business KPIs" }

export default async function BusinessKPIDashboardPage() {
  const data = await getBusinessKPIData()
  return <BusinessKPIClient {...data} />
}
```

**Step 3: Typecheck**

```bash
pnpm typecheck
```

**Step 4: Commit**

```bash
git add lib/data/business-kpi.ts app/admin/business-kpi/page.tsx
git commit -m "refactor: move business-kpi Supabase queries to lib/data/business-kpi"
```

---

## Phase 5 — Fix console.error violations

### Task 10: Replace console.error in `lib/data/profiles.ts`

**Files:**
- Modify: `lib/data/profiles.ts`

**Step 1: Check if a logger already exists in the file**

```bash
grep -n "createLogger\|const log" lib/data/profiles.ts | head -5
```

If not present, add at the top (after imports):
```ts
import { createLogger } from "@/lib/observability/logger"
const log = createLogger("profiles")
```

**Step 2: Replace line 282**

Find:
```ts
console.error("Error updating profile:", error)
```
Replace with:
```ts
log.error("Error updating profile", {}, error instanceof Error ? error : new Error(String(error)))
```

**Step 3: Replace line 351**

Find:
```ts
console.error("Error completing onboarding:", error)
```
Replace with:
```ts
log.error("Error completing onboarding", {}, error instanceof Error ? error : new Error(String(error)))
```

**Step 4: Lint**

```bash
pnpm lint
```
Expected: 0 errors/warnings.

**Step 5: Commit**

```bash
git add lib/data/profiles.ts
git commit -m "fix: replace console.error with logger in lib/data/profiles"
```

---

## Phase 6 — Split god files

### Task 11: Split `generate-drafts.ts` (1086L → 5 files)

**Files:**
- Create: `app/actions/drafts/shared.ts`
- Create: `app/actions/drafts/generate-clinical-note.ts`
- Create: `app/actions/drafts/generate-med-cert.ts`
- Create: `app/actions/drafts/generate-repeat-rx.ts`
- Create: `app/actions/drafts/generate-consult.ts`
- Modify: `app/actions/generate-drafts.ts`

**Step 1: Create `app/actions/drafts/shared.ts`**

Move these helpers from `generate-drafts.ts` (lines 1–199 roughly):
- `"use server"` directive
- All imports
- `AIUsage` interface
- `getUsage()` (line 40)
- `getServiceClient()` (line 50)
- `GenerateDraftsResult` interface (line 54)
- `sanitizeAnswerValue()` (line 923)
- `formatIntakeContext()` (line 937)

Export all of them.

**Step 2: Create `app/actions/drafts/generate-clinical-note.ts`**

Move `generateClinicalNoteDraft()` (lines 371–523) into this file. Import shared helpers from `./shared`.

**Step 3: Create `app/actions/drafts/generate-med-cert.ts`**

Move `generateMedCertDraft()` (lines 524–674).

**Step 4: Create `app/actions/drafts/generate-repeat-rx.ts`**

Move `generateRepeatRxDraft()` (lines 675–798).

**Step 5: Create `app/actions/drafts/generate-consult.ts`**

Move `generateConsultDraft()` (lines 799–922).

**Step 6: Update `app/actions/generate-drafts.ts`**

The entry file keeps only `generateDraftsForIntake()` (lines 200–370) and imports the four sub-generators. Everything else deleted.

**Step 7: Typecheck**

```bash
pnpm typecheck
```
No errors expected — all exports are preserved.

**Step 8: Run tests**

```bash
pnpm test
```

**Step 9: Commit**

```bash
git add app/actions/generate-drafts.ts app/actions/drafts/
git commit -m "refactor: split generate-drafts into focused per-type modules"
```

---

### Task 12: Split `queue-client.tsx` (1091L → 3 files)

**Files:**
- Create: `app/doctor/queue/queue-filters.tsx`
- Create: `app/doctor/queue/queue-table.tsx`
- Modify: `app/doctor/queue/queue-client.tsx`

**Step 1: Read the file to identify section boundaries**

```bash
grep -n "return\|function\|const [A-Z]\|// ---\|\/\* " app/doctor/queue/queue-client.tsx | head -40
```

**Step 2: Create `queue-filters.tsx`**

Extract the filter/search/sort bar section into a `QueueFilters` component. It should accept filter state + setter callbacks as props, or use a shared context if state is complex. Export `QueueFilters`.

Keep `"use client"` at top.

**Step 3: Create `queue-table.tsx`**

Extract the table rendering section into a `QueueTable` component. Accepts `intakes`, `isLoading`, `onSelect` props. Export `QueueTable`.

Keep `"use client"` at top.

**Step 4: Slim down `queue-client.tsx`**

`QueueClient` becomes the orchestrator: holds state, fetches/filters data, renders `<QueueFilters>` and `<QueueTable>`. Target: under 200 lines.

**Step 5: Typecheck**

```bash
pnpm typecheck
```

**Step 6: Run tests**

```bash
pnpm test
```

**Step 7: Commit**

```bash
git add app/doctor/queue/
git commit -m "refactor: split queue-client into QueueFilters + QueueTable sub-components"
```

---

### Task 13: Split `intake-detail-client.tsx` (1131L → 4 files)

**Files:**
- Create: `app/doctor/intakes/[id]/intake-detail-header.tsx`
- Create: `app/doctor/intakes/[id]/intake-detail-drafts.tsx`
- Create: `app/doctor/intakes/[id]/intake-detail-answers.tsx`
- Modify: `app/doctor/intakes/[id]/intake-detail-client.tsx`

**Step 1: Read the file to map sections**

```bash
grep -n "return\|\/\/ ---\|{\/\* \|<div\|<section\|<Card" "app/doctor/intakes/[id]/intake-detail-client.tsx" | head -50
```

**Step 2: Create `intake-detail-header.tsx`**

Extract: patient info card, status badge, action buttons (approve/decline/request info), date correction panel. Props: `intake`, `profile`, `onAction` callbacks. Export `IntakeDetailHeader`.

**Step 3: Create `intake-detail-drafts.tsx`**

Extract: the AI draft review panel (draft display, approve/reject draft, regenerate). Props: `drafts`, `intakeId`, `onDraftAction`. Export `IntakeDetailDrafts`.

**Step 4: Create `intake-detail-answers.tsx`**

Extract: the intake answers display section (question/answer pairs, flags). Props: `answers`, `flags`. Export `IntakeDetailAnswers`.

**Step 5: Slim down `intake-detail-client.tsx`**

Shell renders `<IntakeDetailHeader>`, `<IntakeDetailAnswers>`, `<IntakeDetailDrafts>` with shared state. Target: under 200 lines. Keep `formatDraftAsNote`, `findClinicalNoteDraft`, `formatConsultSubtype` in the file that uses them or in a local `utils.ts`.

**Step 6: Typecheck**

```bash
pnpm typecheck
```

**Step 7: Run tests**

```bash
pnpm test
```

**Step 8: Commit**

```bash
git add "app/doctor/intakes/[id]/"
git commit -m "refactor: split intake-detail-client into header, drafts, answers sub-components"
```

---

### Task 14: Split `features-client.tsx` (1018L → 3 files)

**Files:**
- Create: `app/admin/features/features-list.tsx`
- Create: `app/admin/features/feature-flag-form.tsx`
- Modify: `app/admin/features/features-client.tsx`

**Step 1: Read the file to map sections**

```bash
grep -n "return\|function\|const [A-Z]\|Dialog\|form\|<Table" app/admin/features/features-client.tsx | head -40
```

**Step 2: Create `features-list.tsx`**

Extract the feature flags table (list of flags, toggle switches, edit/delete buttons). Props: `flags`, `onEdit`, `onDelete`, `onToggle`. Export `FeaturesList`.

**Step 3: Create `feature-flag-form.tsx`**

Extract the create/edit dialog form (flag name, description, rollout %, targeting). Props: `open`, `flag` (null for create), `onSubmit`, `onClose`. Export `FeatureFlagForm`.

**Step 4: Slim down `features-client.tsx`**

Shell holds state (selected flag, dialog open), renders `<FeaturesList>` and `<FeatureFlagForm>`. Target: under 150 lines.

**Step 5: Typecheck**

```bash
pnpm typecheck
```

**Step 6: Run tests**

```bash
pnpm test
```

**Step 7: Final full check**

```bash
pnpm typecheck && pnpm lint && pnpm test
```
Expected: 0 errors, 0 warnings, all tests pass.

**Step 8: Commit**

```bash
git add app/admin/features/
git commit -m "refactor: split features-client into FeaturesList + FeatureFlagForm sub-components"
```

---

## Final Verification

```bash
# No doctor/admin routes remain
ls app/doctor/admin 2>&1 | grep "No such"

# No performance page remains
ls app/admin/performance 2>&1 | grep "No such"

# No console.error in lib/data
grep -r "console\." lib/data/ --include="*.ts"

# No inline format functions in dashboard files
grep -rn "function formatCurrency\|function formatTimeAgo\|function formatAge\|function formatMinutes\|function formatRelativeTime" app/admin/ app/doctor/ app/patient/

# All files under 400 lines
find app/admin app/doctor app/patient app/actions components/admin components/doctor components/patient -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -10

# Full suite
pnpm typecheck && pnpm lint && pnpm test
```
