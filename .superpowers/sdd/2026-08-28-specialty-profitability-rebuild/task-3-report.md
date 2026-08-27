# Task 3 report — specialty experience registry

## Files

- `lib/growth/specialty-experiences.ts`
- `lib/__tests__/specialty-experience-registry.test.ts`

The registry defines the dated opaque approach IDs `spx_h1_20260828`,
`spx_h2_20260828`, `spx_h3_20260828`, `spx_e1_20260828`, `spx_e2_20260828`,
and `spx_e3_20260828`. Hair H1 and ED E1 are the only active landing
versions. Later, not-yet-run approaches are retained as inactive baseline
records.

## RED

Command:

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-experience-registry.test.ts
```

Expected RED before implementation:

```text
❯ lib/__tests__/specialty-experience-registry.test.ts (0 test)
Error: Cannot find package '@/lib/growth/specialty-experiences'
```

## GREEN

Command:

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-experience-registry.test.ts
```

Result:

```text
Test Files  1 passed (1)
Tests  6 passed (6)
```

Additional verification:

```bash
corepack pnpm exec eslint lib/growth/specialty-experiences.ts lib/__tests__/specialty-experience-registry.test.ts
# clean, 0 errors and 0 warnings

corepack pnpm exec tsc --noEmit --pretty false
# passed

git diff --check
# passed
```

## Self-review

- Normalisation is allowlisted and returns `null` for non-strings, malformed or overlong values, unknown IDs, wrong service/surface, and inactive values.
- A supplied flow start time is checked against the registry activation/retirement window; the default is the current runtime time.
- Module-load validation fails closed if a service has more than one active material version.
- IDs contain no patient, medicine, query, or clinician meaning.
- No intake steps/questions, clinical rules, pricing, payment, Ads, external systems, or employer outreach changed.
- The test exercises runtime behavior through the exported registry and normaliser; it is not a source-text detector.

## Commit

Implementation commit: `4252cf0bb`

## Concerns

The binding spec gives `spx_h1_20260828` as an example but does not enumerate the complete approved ID table or define a baseline ID. This implementation therefore uses the consistent H1–H3/E1–E3 dated sequence and marks later, not-yet-activated approaches as baseline/inactive with no activation timestamp. Confirm those identifiers before downstream persistence or landing-token work treats them as immutable canonical values.

## Fix round 1

### Findings addressed

- Future, not-yet-run H2/H3/E2/E3 records now use `baseline`; `retired` is reserved for a version with a real activation-to-retirement interval.
- Added a pure `isSpecialtyExperienceAvailableAt` helper and behavior coverage for a test-only retired definition: a flow started inside its prior window is retained, while starts at or after retirement are rejected.

### Files

- `lib/growth/specialty-experiences.ts`
- `lib/__tests__/specialty-experience-registry.test.ts`
- `.superpowers/sdd/2026-08-28-specialty-profitability-rebuild/task-3-report.md`

### RED

Command:

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-experience-registry.test.ts
```

Result after adding the focused test first:

```text
Test Files  1 failed (1)
Tests  7 (5 passed, 2 failed)
```

The intended failures were the missing baseline records and missing
`isSpecialtyExperienceAvailableAt` export.

### GREEN

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-experience-registry.test.ts
```

```text
Test Files  1 passed (1)
Tests  7 passed (7)
```

Additional required checks:

```bash
corepack pnpm exec eslint lib/growth/specialty-experiences.ts lib/__tests__/specialty-experience-registry.test.ts
# passed with 0 errors and 0 warnings

corepack pnpm exec tsc --noEmit --pretty false
# passed

git diff --check
# passed
```

### Self-review

- The production registry contains no fabricated retired approach; all future approaches remain baseline/inactive.
- Retirement-window semantics are exercised using an isolated test definition, without mutating the production allowlist.
- The normalizer remains fail-closed for baseline/inactive values and continues to accept only current matching active landing versions by default.
- No clinical, intake, payment, pricing, Ads, copy, external, or employer-outreach behavior changed.

### Commit

Pending fix commit SHA.
