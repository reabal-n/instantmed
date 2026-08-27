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
