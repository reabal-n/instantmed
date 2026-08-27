# Task 8 Report: Prescribing Identity Truth and Canon Sweep

## Status

DONE

Implementation commit: `ae5ea4ceb617b6238c9016d53036a5d7fd1c1d5d`

Task base verified before implementation: `e0109637e0b7b183dd279f52fac56e4fbe270a95`

## Outcome

The public and canonical definition of prescribing identity now matches the existing runtime rule:

- date of birth
- sex
- phone
- structured Australian address
- either a valid Medicare number plus IRN or a valid IHI

Repeated public prescribing surfaces use the approved concise claim:

> Medicare or IHI, plus an Australian address, is required for prescribing.

The exact medical-certificate trust-badge claim `No Medicare required` remains unchanged. No validator, identity field, required answer, intake step, skip rule, eScript/Parchment workflow, clinical decision, or payment behavior changed.

## Strict TDD Evidence

### RED

The contract changes landed before production copy or canon changes.

Command:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/project-docs-drift-contract.test.ts \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/unified-intake-regressions.test.ts
```

Witnessed result:

- `marketing-copy-contract.test.ts` failed because `prescribing_identity_required` did not yet exist and stale active surfaces still used Medicare-only wording.
- `project-docs-drift-contract.test.ts` failed because the canonical prescribing-identity definition was absent from `CONTEXT.md`, `CLAUDE.md`/`AGENTS.md`, and `docs/CLINICAL.md`.
- `unified-intake-regressions.test.ts` passed immediately, proving the existing runtime already required the complete identity bundle and accepted either Medicare plus IRN or IHI.

The expanded mirror inventory then produced a second intended RED on `app/compare/[slug]/page.tsx` until that active mirror consumed the approved claim. The same contract found and covered the location and Telehealth Australia mirrors.

### GREEN

Focused command after implementation:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/marketing-copy-contract.test.ts \
  lib/__tests__/project-docs-drift-contract.test.ts \
  lib/__tests__/unified-intake-regressions.test.ts
```

Result: 3 test files passed, 79 tests passed.

Broader safety and compliance command covered prescribing identity, structured address, identity blockers and updates, can-skip behavior, unified intake, women's-health validation, marketing copy, approved claims, voice, paid claims, and advertising compliance.

Result: 17 test files passed, 171 tests passed.

## Canon and Copy Repair

Canonical ownership:

- `CONTEXT.md` now owns the `Prescribing Identity` definition.
- `CLAUDE.md` and generated `AGENTS.md` use the same complete definition in eligibility and prescription-workflow canon.
- `docs/CLINICAL.md` distinguishes medical-certificate identity from the Medicare-or-IHI prescribing route.
- `lib/marketing/approved-claims.ts` owns the concise patient-facing high-repetition claim.

Stale active mirrors repaired:

- Hair loss
- Erectile dysfunction (already accurate, consolidated onto the approved claim)
- Prescriptions and online prescriptions
- Women's health hub, UTI, and contraception
- Men's health
- Request hub and Medicare help tooltip
- ED, men's-health, online-prescriptions, and prescription FAQs
- Homepage, `/for`, `/how-it-works`, `/pricing`, and symptom pages
- Compare, location, and Telehealth Australia pages found by the expanded contract

`app/online-doctor-australia/page.tsx` was already Medicare-or-IHI accurate. It is now scanned by the mirror contract and was left unchanged.

## Task 4 Documentation Follow-through

The branch contains Task 4 migration `20260828090000_specialty_experience_attribution.sql` from commit `391487a36`. It was not present at the pre-series base `5ec9d6490`, so the resulting migration-inventory failure was branch-owned rather than inherited.

The mandatory doc-drift workflow repaired only the canonical inventory:

- `CLAUDE.md` and generated `AGENTS.md`: 133 migrations, latest on disk set to the Task 4 migration, explicitly still unapplied.
- `docs/ARCHITECTURE.md`: 133 migration files and the same latest-on-disk boundary.
- `wiki/architecture.md`: 133 migrations, latest-on-disk description, and current `lib/` inventory corrected to 1,300 files.
- `project-docs-drift-contract.test.ts`: strengthened to pin the Task 4 latest-on-disk migration and non-clinical growth-attribution description.

No database or external system was accessed or mutated.

## Generated Documentation and Audit Evidence

```bash
scripts/sync-agent-doc.sh
scripts/sync-agent-doc.sh --check
corepack pnpm doc:audit
```

Results:

- `AGENTS.md` regenerated from `CLAUDE.md`; it was never hand-edited.
- Sync check passed.
- `doc:audit` passed: 10 doc-pinning files, 120 tests, canonical document count and plan-reference checks green.

## Browser Evidence

Local Next.js development server at `http://localhost:3060`; no authentication, PHI, form filling, or submission.

- `/hair-loss`, 1440 x 900, light mode: approved claim rendered in the practical-facts eligibility card; no browser errors.
- `/prescriptions`, 375 x 812, dark mode: approved claim rendered in the hero eligibility row; `scrollWidth === innerWidth === 375`; no browser errors.
- `/request`, 375 x 812, dark mode: both the medical-certificate no-Medicare sentence and the approved prescribing claim rendered; `scrollWidth === innerWidth === 375`; no browser errors.

Temporary local screenshots:

- `/tmp/task8-hair-desktop-light.png`
- `/tmp/task8-prescriptions-mobile-dark.png`
- `/tmp/task8-request-mobile-dark.png`

The request-footer claim wraps across three compact lines at 375 px but remains legible, balanced, and free of clipping or overlap.

## Static Verification

- Scoped ESLint over every changed TypeScript/TSX file: passed.
- `corepack pnpm typecheck`: passed.
- `git diff --check`: passed.
- Marketing, voice, paid-claims, and advertising-compliance guards: passed in the broader 171-test run.

## Exact Implementation Files

- `AGENTS.md`
- `CLAUDE.md`
- `CONTEXT.md`
- `app/compare/[slug]/page.tsx`
- `app/for/page.tsx`
- `app/how-it-works/page.tsx`
- `app/locations/[city]/page.tsx`
- `app/pricing/pricing-content.tsx`
- `app/symptoms/[slug]/page.tsx`
- `app/telehealth-australia/page.tsx`
- `components/marketing/contraceptive-pill-assessment-landing.tsx`
- `components/marketing/erectile-dysfunction-landing.tsx`
- `components/marketing/hair-loss-landing.tsx`
- `components/marketing/mens-health-landing.tsx`
- `components/marketing/online-prescriptions-landing.tsx`
- `components/marketing/prescriptions-landing.tsx`
- `components/marketing/uti-assessment-landing.tsx`
- `components/marketing/womens-health-landing.tsx`
- `components/request/help-tooltip.tsx`
- `components/request/service-hub-screen.tsx`
- `docs/ARCHITECTURE.md`
- `docs/CLINICAL.md`
- `lib/__tests__/marketing-copy-contract.test.ts`
- `lib/__tests__/project-docs-drift-contract.test.ts`
- `lib/__tests__/unified-intake-regressions.test.ts`
- `lib/data/ed-faq.ts`
- `lib/data/mens-health-faq.ts`
- `lib/data/online-prescriptions-faq.ts`
- `lib/data/prescription-faq.ts`
- `lib/marketing/approved-claims.ts`
- `lib/marketing/homepage.ts`
- `wiki/architecture.md`

## Self-review

- The runtime assertions exercise the actual server-side validator with valid Medicare-plus-IRN and valid-IHI paths, then independently remove date of birth, phone, sex, each structured address component, and both identifiers.
- Public copy names neither medicines nor guaranteed prescribing outcomes.
- Medicare and IHI are expressed as alternatives, never cumulative requirements.
- The concise public claim does not replace the full canonical bundle in docs or runtime contracts.
- Medical-certificate copy remains separately scoped and accurate.
- No new friction, steps, questions, fields, eligibility rules, or downstream workflow changes were introduced.

## Concerns

No blocking concerns. Browser evidence is representative rather than an exhaustive visual pass across every mirror; deterministic source contracts cover the complete active mirror inventory changed here.

## Independent Review Follow-up

Follow-up implementation commit: `5e4def7b83449b1a1a8e40010f51fab0c2028bee`

This follow-up supersedes the earlier wording and mirror-status notes where they differ. The approved repeated claim is now:

> For prescribing, you need either Medicare details or a valid IHI, plus an Australian address.

### Review RED evidence

Before changing the money-page contract, the following command witnessed the reviewer-reported stale assertions:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/money-page-narrative-compression-contract.test.ts
```

Result: 1 file failed, with 4 failed and 2 passed tests. The four failures were the retired Medicare-only literals for prescriptions, ED, hair loss, and women's health.

After strengthening the marketing and project-doc contracts but before repairing public copy and canon, the focused run produced the intended RED:

- `marketing-copy-contract.test.ts` failed because the registry still contained the superseded approved claim.
- `project-docs-drift-contract.test.ts` failed because the scoped CLAUDE/AGENTS identity-gate paragraph did not contain the complete canonical definition.
- The updated money-page contract already passed because those four pages consumed the shared approved claim.

The approved-claim source receipt was also added before its registry correction. Its isolated RED was 1 failed / 7 passed because the claim did not cite `lib/request/prescribing-identity.ts`; after the registry change it passed 8/8.

### Follow-up repair

- Replaced stale literal assertions in the prescriptions, ED, hair-loss, and women's-health money-page contracts with direct ownership assertions for `getApprovedClaim("prescribing_identity_required")`.
- Added `/consult` to the prescribing-mirror sweep and repaired its Medicare-only sentence.
- Added the imported NSW deep-city content to the sweep so `/locations/sydney` cannot receive a false green from scanning only its route file.
- Consolidated `/online-doctor-australia` and the Sydney Medicare FAQ onto the approved claim, including its Australian-address requirement.
- Corrected the CLAUDE identity-gate paragraph to the exact date-of-birth, sex, phone, structured-address, and Medicare-plus-IRN-or-IHI bundle; regenerated `AGENTS.md` only through `scripts/sync-agent-doc.sh`.
- Strengthened the project-doc contract to inspect that specific identity-gate paragraph and reject the two former Medicare-only shorthands even if correct wording appears elsewhere.
- Replaced the approved claim's source receipt with the canonical gate owner, `lib/request/prescribing-identity.ts`, and pinned that ownership in the approved-claims contract.

Exact follow-up implementation files:

- `AGENTS.md`
- `CLAUDE.md`
- `app/consult/page.tsx`
- `app/online-doctor-australia/page.tsx`
- `lib/__tests__/approved-claims-contract.test.ts`
- `lib/__tests__/marketing-copy-contract.test.ts`
- `lib/__tests__/money-page-narrative-compression-contract.test.ts`
- `lib/__tests__/project-docs-drift-contract.test.ts`
- `lib/marketing/approved-claims.ts`
- `lib/seo/data/deep-city-content/nsw.ts`

### Follow-up GREEN evidence

- Focused review suite: 4 files passed, 63 tests passed.
- Broader prescribing identity/address/can-skip/unified intake/women's-health/marketing/approved-claims/voice/paid/advertising suite: 18 files passed, 178 tests passed.
- `scripts/sync-agent-doc.sh --check`: passed.
- `corepack pnpm doc:audit`: passed, including 10 doc-pinning files / 120 tests, 123-document count, and plan-reference checks.
- Scoped ESLint across every changed TypeScript/TSX file: passed.
- `corepack pnpm typecheck`: passed.
- `git diff --check`: passed.

### Follow-up browser evidence

No authentication, PHI, form filling, or submission was used.

- `/consult`, 1440 x 900 light: revised claim rendered, no horizontal overflow, no browser errors. Screenshot: `/tmp/task8-review-consult-desktop-light.png`.
- `/online-doctor-australia`, 375 x 812 dark: revised claim rendered, `scrollWidth === innerWidth === 375`, no browser errors. Screenshot: `/tmp/task8-review-online-doctor-mobile-dark.png`.
- `/locations/sydney`, 1280 px: the collapsed Medicare FAQ was expanded and the revised claim rendered, no horizontal overflow, no browser errors.

The reviewed placements were natural and legible; no cramped or awkward claim usage was found.

### Follow-up self-review and concerns

The committed diff changes only copy, canon, the approved-claim registry/source receipt, and their contracts. It does not change validators, intake steps, required answers, identity fields, eScript/Parchment behavior, clinical decisions, or payment logic. The exact medical-certificate claim `No Medicare required` remains unchanged. No medicine names, employer outreach, external mutation, database mutation, deployment, or `output/` changes were introduced.

No blocking concerns. Browser coverage is representative; deterministic contracts cover the active prescribing mirrors in scope.
