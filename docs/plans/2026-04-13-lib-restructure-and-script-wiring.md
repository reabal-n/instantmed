# Lib Restructure + Script Wiring Plan

**Date:** 2026-04-13
**Status:** Pending approval
**Scope:** Consolidate lib/ single-file directories, organize loose files, wire orphaned scripts, add CI gaps

---

## Part A: Consolidate Single-File lib/ Directories

11 directories contain exactly 1 file. These create navigation overhead without organizational benefit. Consolidate into logical parent directories.

### Moves

| Current Path | Move To | Rationale |
|-------------|---------|-----------|
| `lib/approval/invariants.ts` | `lib/clinical/approval-invariants.ts` | Approval rules are clinical logic |
| `lib/cache/index.ts` | `lib/data/cache.ts` | Caching is a data-layer concern |
| `lib/cert/execute-approval.ts` | `lib/clinical/execute-cert-approval.ts` | Certificate approval is clinical workflow |
| `lib/consent/versioning.ts` | `lib/clinical/consent-versioning.ts` | Consent is a clinical concern |
| `lib/cron/doctor-session-timeout.ts` | `lib/doctor/session-timeout.ts` | Doctor-domain logic |
| `lib/documents/retry-queue.ts` | `lib/data/document-retry-queue.ts` | Document delivery is data-layer |
| `lib/experiments/ab-test.ts` | `lib/analytics/ab-test.ts` | A/B testing belongs with analytics |
| `lib/fraud/detector.ts` | `lib/security/fraud-detector.ts` | Fraud detection is security |
| `lib/pbs/client.ts` | `lib/clinical/pbs-client.ts` | PBS (Pharmaceutical Benefits) is clinical |
| `lib/schema/validation.ts` | `lib/validation/schema-validation.ts` | Already have a validation directory |
| `lib/user/returning-user.ts` | `lib/auth/returning-user.ts` | User identification is auth-adjacent |

**After:** 11 empty directories deleted. lib/ drops from 59 entries to 48.

### Also consider consolidating these 2-file directories

| Current Path | Move To | Rationale |
|-------------|---------|-----------|
| `lib/ahpra/` (2 files) | `lib/clinical/ahpra-*.ts` | AHPRA validation is clinical |
| `lib/constants/` (2 files) | Keep as-is | Constants are a valid top-level concern |
| `lib/crypto/` (2 files) | `lib/security/crypto-*.ts` | Crypto belongs with security |
| `lib/google-places/` (2 files) | Keep as-is | Third-party integration, fine standalone |
| `lib/motion/` (2 files) | Keep as-is | Design system concern, clearly scoped |
| `lib/offline/` (2 files) | `lib/data/offline-*.ts` | Offline queue is data-layer |
| `lib/config/` (2 files) | Keep as-is, absorb loose config files |

---

## Part B: Organize Loose lib/ Files

9 files sit directly in lib/ without a subdirectory. Group them:

| Current Path | Move To | Rationale |
|-------------|---------|-----------|
| `lib/auth.ts` | `lib/auth/index.ts` or `lib/auth/helpers.ts` | Auth has enough surface for its own dir |
| `lib/env.ts` | `lib/config/env.ts` | Config concern |
| `lib/errors.ts` | `lib/errors/index.ts` | Error handling utility |
| `lib/feature-flags.ts` | `lib/config/feature-flags.ts` | Config concern |
| `lib/status.ts` | `lib/data/status.ts` | Data-layer status mapping |
| `lib/storage.ts` | `lib/supabase/storage.ts` | Supabase storage helper |
| `lib/test-mode.ts` | `lib/config/test-mode.ts` | Config concern |
| `lib/time-of-day.ts` | `lib/utils/time-of-day.ts` | General utility |
| `lib/utils.ts` | Keep as-is | Canonical utility belt, too many imports to move safely |

**After:** lib/ root has only `utils.ts` as a loose file. Everything else is in a directory.

---

## Part C: Wire Orphaned Scripts

### Add npm scripts for useful orphaned scripts

```jsonc
// Add to package.json "scripts":
"smoke:stripe": "tsx scripts/stripe-smoke-test.ts",
"keys:rotate": "tsx scripts/rotate-keys.ts",
"test:templates": "tsx scripts/test-all-templates.ts",
"seo:generate": "tsx scripts/seo-generator.ts"
```

### Delete truly dead scripts (already done in Phase 1)
- `set_admin_role_clerk.sql` -- deleted
- `fix-jocash-cert.ts` -- deleted
- `codemod-motion-to-m.mjs` -- deleted
- `migrate-gp-consult-to-consult.sql` -- deleted

---

## Part D: CI Gaps

### Add `check-orphaned-files.sh` to CI

In `.github/workflows/ci.yml`, add after the existing `check-stack-pins.sh` and `check-route-conflicts.sh` steps:

```yaml
- name: Check orphaned files
  run: bash scripts/check-orphaned-files.sh
```

---

## Execution Strategy

### Phase 1: Consolidate single-file directories (lowest risk)
1. Move each file to its new location
2. Update ALL imports codebase-wide (grep + replace for each moved path)
3. Delete empty directories
4. `pnpm typecheck` + `pnpm build`

### Phase 2: Organize loose files
1. Move each file
2. Update imports
3. `pnpm typecheck` + `pnpm build`

### Phase 3: Wire scripts + CI
1. Add npm scripts to package.json
2. Add CI step
3. Verify CI passes

### Import Update Strategy

For each moved file:
1. `grep -rl "old/path" --include="*.ts" --include="*.tsx"` to find all importers
2. Bulk replace import paths
3. Verify no broken imports with `pnpm typecheck`

**Important:** `lib/utils.ts` stays put -- it has too many importers and is already the canonical location.

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Broken imports | `pnpm typecheck` after every move |
| Barrel file confusion | Only add barrel files for directories with 3+ exports |
| Git blame lost | Each move is a single commit with clear message |
| Merge conflicts with in-flight work | Execute in one focused session |

---

## What This Does NOT Cover

- Type centralization (moving scattered types to `/types/`) -- separate, larger effort
- Import boundary enforcement (ESLint rules) -- post-restructure
- Barrel file additions for components/ -- separate effort
- README.md creation -- separate task
