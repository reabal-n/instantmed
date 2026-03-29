# Dashboard Cleanup & Dead Code Removal

**Date:** 2026-03-29
**Scope:** All three portals (admin, doctor, patient) + shared components + lib/data + lib/format

---

## Problem

- `app/doctor/admin/` duplicates 6 admin routes that only one user (the admin-doctor) ever visits. Regular doctors can't be admins, so this whole subtree is dead for everyone else and a maintenance burden.
- `app/admin/performance/` is 320 lines of hardcoded mock data with a fake loading spinner. Not connected to real metrics.
- 3 ops pages (`reconciliation`, `intakes-stuck`, `doctor-ops`) are copy-pasted between `/admin/ops/` and `/doctor/admin/ops/` — only URL strings differ.
- 10+ dashboard files define their own inline format functions (`formatCurrency`, `formatTimeAgo`, `formatAge`, `formatMinutes`) instead of using `lib/format`.
- `admin/business-kpi/page.tsx` has 19 raw Supabase queries inline (321 lines) — should be in `lib/data/`.
- `console.error` in `lib/data/profiles.ts` violates ESLint no-console rule.
- 4 god files (1000–1131 lines each) mixing rendering, data transformation, and business logic.

---

## Design

### 1. Delete dead routes

- Delete `app/doctor/admin/` entirely (all 6 sub-routes + layout + page)
- Delete `app/admin/performance/` entirely
- Remove "Performance" from admin sidebar nav
- Update nav pointers: mobile-nav, mobile-menu-content, user-menu → `/doctor/admin` becomes `/admin`
- Fix cross-link in `admin/ops/reconciliation` line 399: `doctor/admin/email-outbox` → `/admin/email-hub`

### 2. Shared ops components

Create `components/shared/ops/` with three parameterised components accepting `basePath`:

```
components/shared/ops/
  reconciliation-client.tsx
  intakes-stuck-client.tsx
  doctor-ops-client.tsx
```

Admin ops pages pass `basePath="/admin/ops"`. Duplicate doctor copies deleted.

### 3. Format utilities

Add to `lib/format.ts`:
- `formatCurrency(cents: number): string`
- `formatTimeAgo(dateStr: string): string`
- `formatAge(minutes: number): string`
- `formatMinutes(minutes: number): string`

Remove inline copies from all dashboard files, import from `@/lib/format`.

### 4. Move business-kpi queries to lib/data

Create `lib/data/business-kpi.ts` with `getBusinessKPIData()`.
`app/admin/business-kpi/page.tsx` becomes ~30 lines.

### 5. Fix console.error

`lib/data/profiles.ts:282, 351` — replace `console.error` with `createLogger("profiles")` log calls.

### 6. Split god files

**`app/doctor/intakes/[id]/intake-detail-client.tsx` (1131L)**
→ `intake-detail-header.tsx`, `intake-detail-drafts.tsx`, `intake-detail-answers.tsx`, orchestrator shell

**`app/doctor/queue/queue-client.tsx` (1091L)**
→ `queue-filters.tsx`, `queue-table.tsx`, orchestrator shell

**`app/actions/generate-drafts.ts` (1086L)**
→ `app/actions/drafts/generate-clinical-note.ts`, `generate-med-cert.ts`, `generate-repeat-rx.ts`, `generate-consult.ts`, `shared.ts`; entry point re-exports `generateDraftsForIntake`

**`app/admin/features/features-client.tsx` (1018L)**
→ `features-list.tsx`, `feature-flag-form.tsx`, orchestrator shell

---

## Success Criteria

- `app/doctor/admin/` does not exist
- `app/admin/performance/` does not exist
- Zero duplicate ops client implementations
- Zero inline format function definitions in dashboard files
- `lib/data/business-kpi.ts` contains all KPI queries
- No `console.error` in `lib/data/`
- No file in the portal/action dirs exceeds ~300 lines
- `pnpm typecheck` and `pnpm lint` pass clean
- All existing tests pass
