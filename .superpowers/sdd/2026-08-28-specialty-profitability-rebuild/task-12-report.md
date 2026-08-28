# Task 12 Report: Compliance, Regression, and Release Verification

## Status

**BRANCH-SCOPE PASS; REPOSITORY RELEASE HOLD.**

Final verified HEAD: `f70dde20e1caaa5e0c17abb5b56678c1d861a7c0`

Final review base: `5ec9d6490`

The specialty rebuild is green within its branch scope. The repository-wide release command remains red for one stale assertion inherited before this branch, and the additive attribution migration still requires its local-only database harness because Docker/Colima is unavailable. Neither limitation was hidden with an unrelated test edit or a remote database fallback.

## Independent Review

- Broad branch re-review: **KEEP**, no P0-P2 findings.
- Marketing-compliance re-review: **KEEP**, no P0-P2 findings.
- Confirmed boundaries: no new intake step, question, field, consent, identity requirement, price, clinical rule, medicine promotion, guarantee, no-call/turnaround claim, employer outreach, Ads mutation, deployment, payment, or patient-data analytics.
- Final corrections made before KEEP: inactive/future tokens rejected at fresh trust boundaries; authoritative null and query-error draft slots remain unassigned; pending/unavailable landings remain operable but untagged; enabled landings and analytics share H1/E1; the Weight URL hydration race no longer skips Medical History.

## Static and Unit Verification

| Gate | Result |
|---|---|
| Focused final union | PASS — 20 files, 334 tests |
| Full `corepack pnpm test` | RELEASE HOLD — 6,467 passed, 1 inherited failure |
| `corepack pnpm lint` | PASS |
| `corepack pnpm typecheck` | PASS |
| `corepack pnpm build` | PASS — 488/488 pages, pinned Next 15.5.21/Webpack |
| `corepack pnpm content:audit` | PASS — 107 guides, 0 issues |
| `corepack pnpm doc:audit` | PASS — 10 files/120 tests, 123 docs |
| `git diff --check 5ec9d6490..HEAD` | PASS |

The sole full-suite failure is `lib/__tests__/portfolio-art-direction-contract.test.ts:33`. The test file has no branch diff, commit `4b3649f0b` is already an ancestor of `5ec9d6490`, and the base already moved the links to `BRANDED_SEARCH_LINKS`. This is an inherited stale source-shape assertion and was intentionally not mixed into the specialty branch.

## Final-SHA Browser Verification

The final run used:

- `playwright.preview.config.ts`;
- a dedicated local app at `127.0.0.1:3064`;
- pinned Playwright 1.60.0 Chromium revision 1223 from `/tmp/instantmed-task12-pw.TtqIXG/browsers`;
- one worker and zero retries;
- localhost or non-routable vendor endpoints only;
- a read-only localhost Supabase REST stub returning only `disable_consults=false` for deterministic feature-flag proof.

Final exact slice: **7/7 PASS in 21.9 seconds**.

1. ED E1 leads with the private one-off outcome.
2. ED unavailable state uses neutral copy and operable Contact links.
3. Hair H1 leads with the qualified one-off outcome.
4. Hair unavailable state uses neutral copy and operable Contact links.
5. Weight Assessment advances to Medical History, not Review/Pay.
6. ED safe guest flow reaches enabled Review/Pay.
7. Hair safe guest flow reaches enabled Review/Pay.

The first diagnostic pass proved both guest flows functionally reached Review/Pay but recorded the intentionally unavailable local feature-flag database as a browser error. Repeating against the narrow read-only local flag stub made both flows and the complete seven-test slice pass. Pay was never clicked.

Evidence root: `/tmp/instantmed-final-pw.f70d.9RQHXI/artifacts-final`

All servers and the local stub were stopped; ports 3064 and 54321 had no listeners afterward. No real patient data was used or accessed.

## Database Gate

`docker info` failed because the Colima daemon is unavailable. The following local-only pre-apply gates therefore remain required before applying the migration:

```bash
corepack pnpm dlx supabase@2.72.7 start
corepack pnpm dlx supabase@2.72.7 db reset --local
corepack pnpm db:test:specialty-attribution
corepack pnpm dlx supabase@2.72.7 db lint --local --schema public,extensions --fail-on error
```

No remote database fallback was used.

## Release Boundary

- Branch implementation and branch-owned verification: PASS.
- Merge/deploy/apply migration: HOLD until the inherited portfolio assertion is corrected on its owning base and the local SQL harness passes.
- Live Ads changes: not performed and not authorised by this plan.
- H2/H3/E2/E3: remain inactive. Their later activation still requires the opening/closing receipts, directional floor, one-variable window, and fresh exact approval defined in Tasks 13-14.
- Employer outreach remains excluded.

## Workspace Receipt

- Final HEAD remained `f70dde20e` throughout verification.
- Tracked worktree clean.
- Only pre-existing `?? output/` remained; it was not touched.
- No remote Supabase/vendor/payment/deployment/Ads/external mutation occurred.

## Skill and Review Influence

- `instantmed-marketing-compliance-review` forced availability, claim, identity, and contact semantics to be reviewed independently from implementation.
- `instantmed-checkout-payment-review` kept experiment attribution outside clinical answers and made database-owned null/error state authoritative through authenticated and guest checkout.
- `instantmed-clinical-safety-review` preserved the Hair reproductive terminal and the ED/Weight safety sequence without adding intake friction.
- `instantmed-ui-browser-verification` required exact final-SHA browser execution, console/error classification, no-payment proof, and separation of local infrastructure from product behavior.
- `verification-before-completion` prevented branch-green evidence from being presented as repository release-green while the inherited unit test and local SQL harness remain unresolved.
