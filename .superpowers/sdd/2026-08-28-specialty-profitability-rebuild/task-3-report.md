# Task 3 report — specialty experience registry

## Files

- `lib/growth/specialty-experiences.ts`
- `lib/__tests__/specialty-experience-registry.test.ts`

The registry defines the dated opaque approach IDs `spx_h1_20260828`,
`spx_h2_20260828`, `spx_h3_20260828`, `spx_e1_20260828`, `spx_e2_20260828`,
and `spx_e3_20260828`. Hair H1 and ED E1 are the only active landing
versions. Later approaches are retained as inactive retired records.

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

The binding spec gives `spx_h1_20260828` as an example but does not enumerate the complete approved ID table or define a baseline ID. This implementation therefore uses the consistent H1–H3/E1–E3 dated sequence and marks later, not-yet-activated approaches as retired/inactive with no activation timestamp. Confirm those identifiers/status semantics before downstream persistence or landing-token work treats them as immutable canonical values.
