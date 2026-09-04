# Schema convergence implementation report

## Status

Implemented the bounded local schema-convergence prerequisite. No linked Supabase project, production database, patient record, provider, or payment system was accessed or mutated. Production application of `20260904160000_converge_runtime_schema_contracts.sql` remains unverified.

## TDD evidence

RED was recorded before the migration or runtime-probe changes:

```text
corepack pnpm exec vitest run \
  lib/__tests__/runtime-schema-convergence-migration-contract.test.ts \
  lib/__tests__/schema-validation.test.ts

Test Files  2 failed (2)
Tests       4 failed | 1 passed (5)
```

The failures named the missing migration, missing `intake_answers.answers_encrypted` / `encryption_metadata` startup probes, and missing `patient_notes.created_by_name` startup probe.

GREEN after the minimal implementation:

```text
corepack pnpm exec vitest run \
  lib/__tests__/runtime-schema-convergence-migration-contract.test.ts \
  lib/__tests__/schema-validation.test.ts \
  lib/__tests__/project-docs-drift-contract.test.ts

Test Files  3 passed (3)
Tests       34 passed (34)
```

## Changes

- Added the forward-only, idempotent migration `20260904160000_converge_runtime_schema_contracts.sql`.
- Added nullable JSONB `intake_answers.answers_encrypted` and `intake_answers.encryption_metadata`.
- Added a partial expression index on `answers_encrypted->>'keyId'` for non-null authoritative envelopes.
- Added nullable TEXT `patient_notes.created_by_name`.
- Added column comments that preserve `answers_encrypted` as the authoritative payment-safety envelope when present and `created_by` as authoritative note authorship.
- Kept legacy `intake_answers.answers_enc` intact. The migration contains no data update, backfill, rename, drop, default, or not-null change.
- Extended startup validation and the read-only backend smoke map with the runtime-critical columns.
- Extended `types/db.ts` with nullable `answers_encrypted`, `encryption_metadata`, and retained nullable `answers_enc` fields.
- Removed the disposable Task 3 `ALTER TABLE` compatibility shim so fresh migration replay owns the schema.
- Split newest-on-disk migration truth from latest-applied production truth in canonical docs and updated filesystem counts.

## Verification

```text
corepack pnpm exec vitest run \
  lib/__tests__/intake-answers-payment-safety.test.ts \
  lib/__tests__/patient-management-actions-contract.test.ts \
  lib/__tests__/future-doctor-scope-contract.test.ts \
  lib/__tests__/patient-directory-degraded.test.ts \
  lib/__tests__/certificate-email-entrypoints.test.tsx

Test Files  5 passed (5)
Tests       28 passed (28)
```

```text
corepack pnpm e2e:production -- --spec=e2e/certificate-resend-render.spec.ts

Fresh isolated Supabase replay: passed on ports 55320-55329
Production Webpack build: completed with pre-existing OpenTelemetry warnings
Playwright: 1 passed
Startup schema validation: passed, 5 tables checked, 0 warnings
Cleanup: runner-owned stack stopped; the pre-existing Moirai stack on 5432x remained running
```

```text
corepack pnpm typecheck
exit 0

corepack pnpm doc:audit
10 test files passed, 124 tests passed; doc count and plan-reference checks passed

corepack pnpm exec eslint <changed TypeScript files> --max-warnings 0 --no-warn-ignored
exit 0

git diff --check
exit 0
```

## Remaining boundary

The new migration exists and has replayed successfully only in the disposable local stack. There is no claim that it is present in linked or production migration history. Applying it to production requires a separately authorised production migration step and post-apply metadata verification.

## Review correction

A fresh review found that the backend smoke map listed the new columns but still treated `intake_answers` as optional, allowing `request_answers` to mask a failed encrypted-column probe. A focused process-level contract first reproduced the false pass against a local fake PostgREST boundary:

```text
corepack pnpm exec vitest run lib/__tests__/smoke-backend-schema-contract.test.ts

Test Files  1 failed (1)
Tests       1 failed (1)
Reason      backend smoke exited 0 after swallowing the missing intake_answers column
```

The corrected smoke now requires `intake_answers`; only `request_answers` remains optional. The same behavioural contract was retained in `runtime-schema-convergence-migration-contract.test.ts` and passes after the fix:

```text
corepack pnpm exec vitest run lib/__tests__/runtime-schema-convergence-migration-contract.test.ts

Test Files  1 passed (1)
Tests       4 passed (4)
```
