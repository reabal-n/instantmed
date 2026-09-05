# Task 1 report — isolated Stripe test-webhook policy

## Outcome

- Added a pure, fail-closed policy for signed Stripe test events.
- Preserved the existing Playwright development/test lane.
- Added a separately gated production-bundle lane that requires exact opt-in,
  Playwright, loopback, a Stripe test key, no Vercel markers, and matching local
  Supabase identity derived from configured URLs.
- The webhook route applies the policy only after signature verification and
  only to non-admin `livemode=false` events. Rejections retain the existing
  acknowledged-discard response and happen before service-role client creation.
- Live signed events and authenticated admin replays retain their existing paths.
- Added the policy and route integration suites to the permanent med-cert
  readiness gate.

## Strict TDD evidence

### RED

1. `corepack pnpm exec vitest run lib/__tests__/stripe-test-webhook-policy.test.ts`
   failed because `@/lib/stripe/test-webhook-policy` did not exist.
2. Before route integration, `corepack pnpm exec vitest run lib/__tests__/stripe-test-webhook-route.test.ts`
   ran five tests with one failure: the opted-in local production-bundle case
   never created the service client or reached its handler.

### GREEN

- `corepack pnpm exec vitest run lib/__tests__/stripe-test-webhook-policy.test.ts lib/__tests__/stripe-test-webhook-route.test.ts`
  — 2 files, 41 tests passed.
- Focused Stripe/env regression set — 7 files, 92 tests passed.
- `MEDCERT_READINESS_BROWSER=0 bash scripts/check-medcert-readiness.sh` — lint,
  typecheck, and 28 files / 645 tests passed; browser phase intentionally skipped.
- `corepack pnpm typecheck` — passed.
- Scoped ESLint for the route, policy, tests, and env schema — passed.
- `corepack pnpm doc:audit` — 10 files / 124 tests passed; full audit passed.
- `bash -n scripts/check-medcert-readiness.sh` and `git diff --check` — passed.
- Existing `e2e/payment-smoke.spec.ts`, `e2e/stripe-webhook.spec.ts`, and the CI
  workflow were not edited or weakened.

### Independent-review hardening

An independent P1 review identified that treating every syntactically valid
hosted Supabase project except the current production ref as non-production was
denylist evidence. An adversarial test was changed first to require `unknown`:
`corepack pnpm exec vitest run lib/__tests__/stripe-test-webhook-policy.test.ts`
then failed 1 of 36 tests because the arbitrary hosted ref was still classified
`non_production`. The classifier and production-bundle policy now allow local
Supabase only; the focused policy/route run is green at 2 files / 41 tests, the
current Stripe/env regression is green at 7 files / 92 tests, and scoped ESLint
passes. A repeated full static readiness run stopped at lint only because five
concurrent Task 5 files had import-sort warnings; no Task 1 file was implicated,
and those unrelated files were neither edited nor staged here.

## Browser proof boundary

The networked/browser payment readiness command was not run. The only checkout
environment discoverable from this worktree falls back to production Supabase,
so Playwright global setup could seed or mutate production state. Task 2 owns a
run-scoped isolated hosted harness; this task deliberately does not bypass that
precondition or use live credentials.

## Security notes

- `E2E_ISOLATED_SUPABASE` is ignored by the policy and cannot confer authority.
- Every hosted Supabase project (including the known production project), custom
  domains, malformed URLs, mismatched targets, non-loopback requests,
  live/unknown Stripe keys, unknown Node environments, and any defined Vercel
  marker fail closed.
- `SUPABASE_URL` is documented as an optional server endpoint, not exposed to
  the browser. No secrets or patient data were added to tests or logs.
