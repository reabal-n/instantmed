# Task 3 report: truthful directory sorting and ledger saturation

## Status

Complete. Patient-directory sorting is database-global and URL-mirrored for `newest` and `name` only. Admin ledger patient search now fails closed when the 250-profile candidate query is saturated and renders explicit narrow-search guidance without a partial total or empty ledger.

## Changes

- Added a client-safe patient-directory sort contract with tolerant parsing, URL construction, and database order mapping.
- Wired both `/admin/patients` and `/doctor/patients` through the same normalized sort.
- Applied `created_at DESC, id DESC` for newest and `full_name ASC, id ASC` for name before `.range(...)`.
- Added the existing shadcn `Select` beside the patient search field on larger screens and below it on mobile. The trigger is `min-h-11`; search and sort changes reset to page 1, and pagination preserves `q` and `sort`.
- Kept recent-request, recent-script, request-type, Smart, and client-row sorting retired.
- Added `patientSearchSaturated` to the ledger result/page/client contract. At 250 profile candidates the query returns before creating intake count/data queries, with `total: null` and no rows.
- The saturated UI retains search/filter controls, shows narrow-search guidance, and suppresses the ledger table and pagination/total. Candidate searches below the cap retain the all-history intake window.
- Preserved support behavior: support never runs the patient-profile candidate query and continues to use the existing masked, non-clinical ledger projection.

## TDD evidence

### RED

1. `pnpm test run lib/__tests__/patient-directory-sort.test.ts`
   - Failed because `@/lib/data/patient-directory-sort` did not exist.
2. `pnpm test run lib/__tests__/patient-directory-sort.test.ts`
   - Parser passed; URL preservation failed with `buildPatientDirectoryHref is not a function`.
3. `pnpm test run lib/__tests__/patient-directory-ordering.test.ts`
   - Both cases failed: newest lacked the stable ID tie-break and name still used `created_at DESC`.
4. `pnpm test run lib/__tests__/patient-directory-ux-contract.test.ts lib/__tests__/doctor-add-patient-contract.test.ts`
   - Failed because neither route parsed/passed sort and the UI control did not exist.
5. `pnpm test run lib/__tests__/admin-ledger-search-saturation.test.ts`
   - Failed: the 250-candidate path queried `profiles`, then both `intakes` count/data queries.
6. `pnpm test run lib/__tests__/admin-ledger-server-contract.test.ts`
   - Failed because the saturation state was not threaded or rendered.

### GREEN

- `pnpm test run lib/__tests__/patient-directory-sort.test.ts lib/__tests__/patient-directory-ordering.test.ts`
  - 2 files, 4 tests passed.
- `pnpm test run lib/__tests__/patient-directory-ux-contract.test.ts lib/__tests__/doctor-add-patient-contract.test.ts lib/__tests__/patient-directory-sort.test.ts lib/__tests__/patient-directory-ordering.test.ts`
  - 4 files, 15 tests passed.
- `pnpm test run lib/__tests__/admin-ledger-search-saturation.test.ts`
  - 2 tests passed: 250 stops after `profiles`; 249 proceeds to both intake queries with no 30-day `gte` bound.
- `pnpm test run lib/__tests__/admin-ledger-server-contract.test.ts lib/__tests__/admin-ledger-search-saturation.test.ts lib/__tests__/admin-ledger-filters.test.ts lib/__tests__/admin-ledger-projection.test.ts`
  - 4 files, 15 tests passed.

## Final verification

- Focused and adjacent directory/ledger/navigation/privacy contracts: 16 files, 127 tests passed.
- `pnpm typecheck`: passed.
- Targeted ESLint across every changed TypeScript/TSX file: passed with zero warnings.
- `git diff --check`: passed before staging; staged diff checked again before commit.
- No dependency, lockfile, environment, migration, Parchment, or dashboard-history files changed.
- Browser verification was intentionally left to Task 5's integrated desktop/mobile staff-surface proof; this task's responsive and accessible control contract is covered statically, not claimed as browser proof.

## Self-review

- The sort implementation is server-owned and applied before pagination; no page-local row sort exists.
- Invalid and retired sort values fail safely to `newest`.
- The ledger boundary distinguishes backend degradation from a broad-but-valid saturated search.
- Saturation cannot render a numeric zero or partial total, and cannot query intake data with a partial candidate list.
- No PHI, credentials, production identifiers, or new telemetry were added.

## Concerns

- None blocking. Visual/browser interaction proof remains for the integrated Task 5 verification lane.
