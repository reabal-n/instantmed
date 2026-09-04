# Task 2 report — hermetic hosted Stripe guest-checkout proof

## Status

**IMPLEMENTED_STATICALLY — REAL PROVIDER RUN BLOCKED**

The production-bundle runner, two genuine browser journeys, isolation controls,
privacy-safe evidence contract, manual workflow, and documentation are
implemented and locally verified. The real hosted Stripe/browser execution was
not run because this checkout has no fresh dedicated Stripe test credential or
matching dedicated test Price IDs. The known cached Stripe CLI credential is
expired and was neither loaded nor used. No live credential, production
service, Vercel deployment, or Moirai-owned local service was touched.

## Implementation

- Added a fail-closed preflight that accepts only a dedicated `sk_test_*` or
  `rk_test_*` credential, exact production-lane flags, matching loopback app and
  local Supabase origins, absent Vercel markers, and the Task 1 test-webhook
  policy. It retrieves all ten configured Stripe Prices through an injectable
  transport and requires the expected ID, test mode, active state, AUD amount,
  and one-time type while suppressing provider response bodies.
- Added a runner-owned Supabase overlay on ports 55320–55329 (API 55321,
  database 55322, Mailpit 55324) with a unique project ID. Occupied ports fail
  closed. Startup, migration reset, health checks, exact-label Docker cleanup,
  process-group shutdown, signals, and zero-survivor assertions belong to the
  runner; it never stops or kills an unknown owner.
- The runner accepts Docker only through a verified local Unix or Windows named
  pipe endpoint, then forces that exact endpoint into every Supabase and Docker
  command. Remote TCP, SSH, and HTTP daemons fail before local infrastructure
  starts, even when inherited Docker context configuration points at them.
- The runner copies the application into a temporary dotenv-free directory,
  excludes every `.env*`, links the existing dependencies without changing the
  lockfile, constructs a minimal child environment, validates every Price,
  captures a real-shaped `whsec_` from `stripe listen` without printing it,
  builds the Webpack production bundle, starts `next` on 127.0.0.1:3060, and
  invokes a dedicated one-worker Chromium configuration with no shared global
  setup or `webServer`.
- Source is accepted only from a clean Git worktree. The runner captures the
  40-character revision before copying, then requires the same clean revision
  after both browser journeys and runner-owned cleanup before placing it in the
  receipt; a dirty tree or concurrent commit cannot be mislabelled as
  commit-bound proof, including source loaded dynamically during cleanup.
- The dedicated test key is supplied to the Stripe listener through its scoped
  `STRIPE_API_KEY` environment rather than process arguments. Successful
  receipts live in the exactly ignored `.artifacts/hosted-stripe-e2e/`
  directory, so one successful run cannot dirty and block the next run.
- The repeat-prescription case completes the real intake with current clinical
  safety questions plus prescribing identity, medication strength, dose, and
  current directions. It reaches `checkout.stripe.com`, pays with Stripe's test
  card, returns through `/auth/complete-account`, chooses `Continue without an
  account`, lands on confirmation, and requires a null profile `auth_user_id`
  and no Supabase Auth user.
- The medical-certificate case completes the real intake, pays through hosted
  Checkout, asks for the passwordless link, reads only its run-specific
  fabricated recipient from local Mailpit, follows the actual local Supabase
  magic link, and requires the linked profile, verified email timestamp, one
  Auth user, and the owned intake in the patient dashboard.
- Both cases require an open test-mode Checkout Session before payment, then the
  current stored session ID, a succeeded PaymentIntent, exact AUD amount and
  currency, paid payment state, paid intake state, and one processed
  `checkout.session.completed` webhook row bound to that session and intake.
  No status inference, auth bypass, synthetic provider response, or stale
  Checkout Session can satisfy the assertions.
- Test records use two deterministic run-scoped fabricated recipients and are
  marked `exclude_from_reporting: true` at the owning intake before payment.
  Cleanup removes intake-linked payment, event, webhook, audit, follow-up,
  consent, draft, outbox, notification, partial-intake, profile, and Auth state,
  then counts every owned scope again after app/listener shutdown. Survivor
  counts project an actual scoped column rather than assuming every table has
  an `id` key; this covers `partial_intakes`, whose primary key is `session_id`.
- Browser evidence is private to the temporary directory. Only after browser,
  database/Auth, process, Mailpit, and exact Docker cleanup succeeds does the
  runner atomically write a mode-0600 receipt. Its exact schema permits only a
  hashed run ID, Git SHA, timestamps, Stripe event type/mode, booleans, and
  aggregate counts; identifiers, email addresses, tokens, session IDs, and
  clinical data are rejected by construction.
- Added `corepack pnpm e2e:stripe-hosted` and a `workflow_dispatch`-only GitHub
  workflow. The workflow documents dedicated environment-secret names, exposes
  them only to the hosted-run step (not checkout, installs, or setup actions),
  and does not configure values or schedule execution.

## Genuine TDD evidence

The harness was developed through these observed RED states before the final
green:

1. The preflight contract failed because the module did not exist.
2. Source ownership failed because the dedicated spec, Playwright config, and
   manual workflow did not exist (1 failed, 28 passed).
3. Lifecycle tests failed because no owned cleanup helper existed.
4. The expanded source contract again failed on the missing spec/config/workflow
   seam (1 failed, 31 passed).
5. Isolation tests rejected arbitrary `HOSTED_STRIPE_E2E_*` inheritance and a
   spec that delegated its load-bearing provider wait (2 failed).
6. Receipt validation accepted a false assertion and incomplete counts (1
   failed).
7. A final source-to-UI contract caught the med-cert case targeting the step
   registry label instead of the rendered heading (1 failed, 33 passed); the
   locator now follows the actual `What do you need covered?` heading.
8. Independent review caught the survivor counter selecting a nonexistent
   `partial_intakes.id`; the regression failed before the counter selected the
   run-scoped `email` column.
9. Independent isolation review added two RED tests for remote Docker endpoints
   and dirty/changing Git source; both now fail closed before receipt creation.
10. The final repeatability/hardening contract failed until the exact receipt
    directory was ignored and the Stripe listener stopped placing the test key
    in its process arguments.
11. Workflow scoping failed until every dedicated Stripe secret moved from the
    job environment to the single hosted-run step.

After the corresponding implementation changes, the focused Task 2 suite is
green at 36/36. The payment-policy/linkage regression set is re-run after each
independent-review correction.

## Verification

```text
corepack pnpm exec vitest run lib/__tests__/stripe-hosted-e2e-preflight.test.ts
PASS — 1 file, 36 tests

corepack pnpm exec vitest run \
  lib/__tests__/stripe-hosted-e2e-preflight.test.ts \
  lib/__tests__/stripe-test-webhook-policy.test.ts \
  lib/__tests__/stripe-test-webhook-route.test.ts \
  lib/__tests__/guest-account-linkage.test.ts
PASS — 4 files, 82 tests

corepack pnpm exec eslint --no-ignore \
  scripts/hosted-stripe-e2e-preflight.ts \
  scripts/run-hosted-stripe-e2e.ts \
  playwright.hosted-stripe.config.ts \
  e2e/helpers/hosted-stripe.ts \
  e2e/helpers/mailpit.ts \
  e2e/hosted-stripe-guest-journey.spec.ts \
  lib/__tests__/stripe-hosted-e2e-preflight.test.ts
PASS

corepack pnpm typecheck
PASS

corepack pnpm doc:audit
PASS — 10 files, 124 tests; documentation surface and references passed

git diff --check
PASS

env -u HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY ... corepack pnpm e2e:stripe-hosted
EXPECTED FAIL-CLOSED — requires HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY before
starting Supabase, Docker, Stripe listener, Next, or a browser
```

The production build was deliberately not run outside the faithful runner. A
successful runner build must follow provider Price validation with the real
dedicated test inputs; substituting fake inputs would weaken the acceptance
boundary without proving the journey.

## Exact remaining boundary

Provide a fresh dedicated `HOSTED_STRIPE_E2E_STRIPE_SECRET_KEY` with a test-mode
`sk_test_*` or `rk_test_*` value and all ten matching
`HOSTED_STRIPE_E2E_STRIPE_PRICE_*` test Price IDs, then run:

```bash
corepack pnpm e2e:stripe-hosted
```

Until that command exits zero, the code has **not** proved a real Checkout
Session, test payment, signed webhook delivery, optional-account skip, local
magic-link linkage, linked dashboard, or post-run receipt in an actual provider
session. The implementation and its fail-closed contracts are proven; the
provider/browser outcome remains explicitly unverified.

## Files changed

- `.github/workflows/hosted-stripe-e2e.yml`
- `playwright.hosted-stripe.config.ts`
- `scripts/hosted-stripe-e2e-preflight.ts`
- `scripts/run-hosted-stripe-e2e.ts`
- `e2e/helpers/hosted-stripe.ts`
- `e2e/helpers/mailpit.ts`
- `e2e/hosted-stripe-guest-journey.spec.ts`
- `lib/__tests__/stripe-hosted-e2e-preflight.test.ts`
- `package.json`
- `docs/ARCHITECTURE.md`
- `docs/OPERATIONS.md` (hosted-checkout credential section only)
- `docs/TESTING.md`
- `.superpowers/sdd/2026-09-04-conversion-retention-friction-closure/task-2-report.md`

No production application behavior, clinical validator, migration, dependency,
lockfile, deployment configuration value, or scheduled workflow was changed.
