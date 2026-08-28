# Task 5 report — version landing analytics without making PostHog the allocator

Status: **DONE**

## Scope and base

- Task base verified: `c308aa767a74e3270745029d71a7a2fdf0c842a6`
- Implementation commit: `d1e3fe560` (`feat(growth): version specialty landing analytics`)
- No worktree, push, deployment, database migration, Ads mutation, external-system mutation, public copy/layout change, intake-step change, or user-owned `output/` change was made.

## Files

- `lib/hooks/use-landing-analytics.ts`
- `components/marketing/shared/landing-page-shell.tsx`
- `components/marketing/hair-loss-landing.tsx`
- `components/marketing/erectile-dysfunction-landing.tsx`
- `lib/__tests__/specialty-landing-analytics-contract.test.ts`

No additional runtime ownership file was required. Task 4's request/store/draft boundary already normalises fresh tokens and preserves the database-owned marker on restore, so it was reviewed and regression-tested but not changed.

## RED evidence

Before production edits, the new contract was added and this exact command was run:

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-landing-analytics-contract.test.ts
```

It failed as intended: 4 tests failed and 1 existing request-boundary assertion passed. The failures were the absent exported landing-version resolver, controlled request-href builder, and analytics tracker. This demonstrated that the missing Task 5 behavior, rather than a test typo, caused RED.

## GREEN and regression evidence

The required focused command passed after the minimal implementation:

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-landing-analytics-contract.test.ts
```

Result: 1 file, 5 tests passed.

Relevant privacy and attribution regressions also passed:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-landing-analytics-contract.test.ts \
  lib/__tests__/specialty-experience-registry.test.ts \
  lib/__tests__/specialty-experience-attribution-contract.test.ts \
  lib/__tests__/flow-instance-attribution-contract.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts
```

Result: 5 files, 31 tests passed.

Additional verification passed:

```bash
corepack pnpm exec eslint \
  lib/hooks/use-landing-analytics.ts \
  components/marketing/shared/landing-page-shell.tsx \
  components/marketing/hair-loss-landing.tsx \
  components/marketing/erectile-dysfunction-landing.tsx \
  lib/__tests__/specialty-landing-analytics-contract.test.ts

corepack pnpm typecheck
git diff --check
git diff --cached --check
```

## Browser verification

Local dev verification used `http://localhost:3060`.

- Desktop/light: `/hair-loss` rendered with five internal request CTAs carrying `service=consult`, `subtype=hair_loss`, and only `growth_experience_version=spx_h1_20260828`.
- Desktop/light: `/erectile-dysfunction` rendered with four internal request CTAs carrying `service=consult`, `subtype=ed`, and only `growth_experience_version=spx_e1_20260828`.
- The ED page's canonical remained `https://instantmed.com.au/erectile-dysfunction`.
- Mobile (375x800)/dark: `/erectile-dysfunction` rendered with the tagged internal CTA and no browser-reported page errors. Desktop/light was restored and also had no page errors.

## Self-review

- The landing shell validates the supplied service/version against the code-owned active registry. A stale, unknown, wrong-service, or inactive value becomes `null`; PostHog and flags do not participate in ownership.
- The hook emits one best-effort `landing_experience_viewed` per mounted valid version. CTA, FAQ, section, and scroll events use the same opaque version when present.
- Analytics calls are wrapped so synchronous analytics failures cannot interrupt a Link navigation. FAQ analytics records only the stable FAQ index, not question/free-text content.
- The request-href builder operates only on relative `/request` URLs, re-validates the version against the CTA's preserved `service` and `subtype`, and leaves external/public/canonical URLs untouched.
- Hair uses the active H1 and ED uses the active E1 from the registry. Existing Task 4 tests continue to cover an incoming mismatch becoming unassigned and an existing stored cohort remaining authoritative.
- The contract test invokes exported runtime helpers/tracker behavior. It does not inspect source text or rely on regex assertions.

## Concerns

None. This task deliberately does not prove a production PostHog receipt or deploy state; neither was in scope or authorised.

## Fix round 1

### Scope and commit

- Fix commit: `2bf8c981d` (`fix(growth): defer landing view until analytics ready`)
- Files: `lib/hooks/use-landing-analytics.ts`, `components/marketing/shared/landing-page-shell.tsx`, and `lib/__tests__/specialty-landing-analytics-contract.test.ts`.
- No public copy, layout, intake, Ads, database, external system, or `output/` change was made.

### RED evidence

Before the fix, lifecycle and strict-relative-href tests were added to the existing contract and the exact command was run:

```bash
corepack pnpm exec vitest run lib/__tests__/specialty-landing-analytics-contract.test.ts
```

Result: 1 file failed, 2 tests failed, 4 passed. The intended failures were:

- `createLandingExperienceViewLatch` did not exist, exposing that the production hook had no readiness-aware lifecycle seam for `null -> PostHog client -> same client`.
- An absolute `https://instantmed.local/request?...` input was rewritten as a tagged relative URL instead of remaining untouched.

### GREEN and regression evidence

The same focused command passed after the minimal changes: 1 file, 6 tests passed.

The prior privacy/cohort regression set also passed:

```bash
corepack pnpm exec vitest run \
  lib/__tests__/specialty-landing-analytics-contract.test.ts \
  lib/__tests__/specialty-experience-registry.test.ts \
  lib/__tests__/specialty-experience-attribution-contract.test.ts \
  lib/__tests__/flow-instance-attribution-contract.test.ts \
  lib/__tests__/posthog-personless-analytics.test.ts
```

Result: 5 files, 32 tests passed.

Scoped ESLint over the three changed files, `corepack pnpm typecheck`, and `git diff --check` passed.

### Self-review

- The production-used latch now treats a null PostHog context as not-ready, so the first effect does not consume the view. It records exactly one event when the concrete lazy client appears and suppresses a repeat from that same client.
- A concrete capture attempt is still best-effort: a synchronous analytics error is contained and cannot interrupt CTA navigation.
- The CTA helper now rejects every absolute or protocol-relative input before parsing and returns it byte-for-byte unchanged. It also catches parse failures. Only a relative `/request` path may reach the service/subtype version validation.
- The new test invokes the same latch state machine used by the hook rather than simulating calls to the generic tracker. It covers `null -> capture client -> same client`, absolute `http:`/`https:`, protocol-relative, malformed, invalid-query, and valid query/hash preservation behavior.

### Concerns

None. Production PostHog delivery remains intentionally outside this local, non-deployment task.
