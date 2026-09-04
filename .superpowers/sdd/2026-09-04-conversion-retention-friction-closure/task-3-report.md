# Task 3 report — certificate resend production-render seam

## Status

**BLOCKED_DIAGNOSIS**

The faithful local paths are green and the existing Sentry credential returned HTTP 403, so there is still no failing application frame identifying a repairable module. Per the controller gate, no React import, template, builder, wrapper, or production email-path change was made.

## Implementation and diagnosis

- Added a fail-closed production-bundle runner and Playwright config. The runner accepts only `e2e/certificate-resend-render.spec.ts`, requires ports `3060` and `55320`–`55329` to be free, creates a unique per-run alternate-port Supabase project, builds the Webpack production bundle, and starts `next start` on `127.0.0.1:3060`.
- The runner copies the application to a temporary root while excluding `.env`, `.env.local`, `.env.production`, `.env.production.local`, and every other `.env.*` file. Both `next build` and `next start` run from that copy, so Next cannot auto-load credentials from the working checkout. The child environment is allowlisted, Sentry auth/DSN and PostHog keys are explicitly blank, non-GET/HEAD external fetches are rejected, and `api.resend.com` is always answered locally with HTTP 503. Build-time font GETs remain available because they are required by `next/font`; no external mutation is permitted.
- Startup is marked attempted before invoking Supabase. All spawned commands are tracked in their own process groups, SIGINT/SIGTERM terminates only those tracked groups, and idempotent cleanup always attempts to stop the unique run-owned project. Cleanup then queries only the exact `com.supabase.cli.project=<per-run-id>` Docker label: any remaining owned container or volume makes the command fail and retains/logs the temporary workdir; a nonzero CLI stop after partial startup is accepted only when that exact-label check proves nothing remains.
- Added an unmocked render contract covering four distinct entry points with real certificate email components and renderer: a real `executeCertApproval()` call, patient self-resend action, staff resend action, and a separately constructed no-frozen `reconstructEmailContent()` email-hub row. Database, PDF, storage, auth, rate-limit, and provider boundaries are mocked; React, `MedCertPatientEmail`, and `renderEmailToHtml` are not mocked.
- Added action contracts proving patient and staff resend pass the constructed certificate template through to `sendEmail` while retaining the existing reservation/finalisation assertions.
- Added a production Playwright action/bundle/outbox case. It seeds only fabricated data with `exclude_from_reporting: true`, walks the real `pending_payment -> paid -> approved` status transitions, clicks the authenticated staff intake-review `Resend` control, and verifies one finalized resend attempt, one E2E-suppressed durable outbox record, current storage-version binding, no raw storage path, and no render exception.
- The same browser case separately seeds a failed no-frozen outbox row, opens the email hub Queue tab, invokes Retry, verifies reconstruction persisted a frozen encrypted provider payload, and then observes the deliberate local 503 provider block. This exercises reconstruction before the provider boundary without sending externally.
- `/admin/ops` cannot surface a correctly contained `exclude_from_reporting: true` fixture because its production query intentionally applies `filterReportableIntakes`. The browser click therefore uses the staff intake-review resend control, which calls the same `resendCertificateAsStaff` server action and production bundle. Weakening reporting containment to satisfy the original locator would have been incorrect.
- Cleanup explicitly deletes and then verifies zero matching `certificate_resend_attempts`, `email_outbox`, and `intakes` rows. Certificate/audit/profile/service fixtures are also removed. The pre-existing `moirai` stack was left running and untouched.

### Production-seam result

The final production-server run was green:

- staff resend rendered successfully and wrote `skipped_e2e` outbox state;
- exactly one reservation was finalized as sent and linked to that outbox row;
- the no-frozen hub retry reconstructed and froze its provider payload;
- the provider attempt stopped at the local 503 interceptor;
- neither browser/server result contained `React is not defined` or `Template render failed`;
- runner cleanup completed and exited 0.

This proves the current checked-out source and locally built Webpack bundle do not reproduce the Sep 3 incident. It does not prove the historical deployed release was healthy.

## TDD evidence

The new source-level contract was run before any production behavior change and passed 4/4. That green result was treated as diagnosis, not as permission to manufacture a RED. No production behavior was subsequently changed.

The production harness then progressed through genuine harness REDs before reaching the authoritative green result:

1. Runner type contract rejected a partial `ProcessEnv`; corrected by declaring `NODE_ENV` in the allowlisted environment.
2. Runner initially assumed a repository-local Supabase binary; corrected to use the installed CLI from the allowlisted `PATH`.
3. Production instrumentation correctly rejected a fake `sk_test_...` placeholder; corrected to a non-test-shaped, unusable local placeholder. No Stripe call is made by this spec.
4. The database state machine rejected direct insertion as `approved`; corrected to real `pending_payment -> paid -> approved` transitions.
5. Reporting containment correctly hid the excluded fixture from `/admin/ops`; the action integration moved to the staff intake-review control without changing production queries.
6. A fresh migration stack lacked `intake_answers.answers_encrypted`; a narrow `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` compatibility shim was applied only inside the disposable runner-owned database. No repository migration or application fallback was added.
7. The E2E outbox seam intentionally omits the caller idempotency key, so the assertion was corrected to select the unique intake/email row and retain metadata/reservation linkage checks.
8. The seeded hub retry appeared on the Overview tab while the locator targeted Queue markup; the test now selects Queue before finding the ledger row.
9. Review identified that running Next in the repository could still auto-load dotenv credentials despite a sanitized process environment. Both build and start were moved to a sanitized temporary application copy.
10. The first sanitized-copy build rejected all external traffic and therefore blocked required `next/font` GETs. The final guard permits GET/HEAD reads but rejects external mutating fetches and always intercepts Resend. Blank Sentry DSN/auth values keep the build wrapper/source-map uploader off; the E2E-mode SDK has no DSN transport.
11. A refreshed hub row caused the deliberate provider-block message to appear three times and tripped Playwright strict mode. The assertion is now scoped to the notification region.
12. One final verification attempt hit a transient Supabase Edge Runtime health-check 502 during partial startup, and the CLI stop returned nonzero. Exact ownership-label inspection found zero containers and zero volumes, demonstrating that the stack was already gone; cleanup now encodes that proof rule instead of treating the CLI exit alone as resource state. A fresh authoritative run then passed.

The final green is the observed behavior of the faithful production bundle. Because the historical frame remains unavailable, the task stops at `BLOCKED_DIAGNOSIS`.

## Verification

```text
corepack pnpm exec vitest run lib/__tests__/certificate-email-entrypoints.test.tsx
PASS — 1 file, 4 tests

corepack pnpm exec vitest run \
  lib/__tests__/certificate-email-entrypoints.test.tsx \
  lib/__tests__/certificate-delivery-actions.test.ts \
  lib/__tests__/certificate-resend-transaction-contract.test.ts \
  lib/__tests__/certificate-resend-dispatcher-finalization.test.ts \
  lib/__tests__/email-reconstruct-contract.test.ts \
  lib/__tests__/email-dispatcher-reconstruct-parity-contract.test.ts
PASS — 6 files, 51 tests, 1.08s

corepack pnpm typecheck
PASS

corepack pnpm exec eslint playwright.production.config.ts e2e/certificate-resend-render.spec.ts lib/__tests__/certificate-email-entrypoints.test.tsx lib/__tests__/certificate-delivery-actions.test.ts
PASS

corepack pnpm e2e:production -- --spec=e2e/certificate-resend-render.spec.ts
PASS — production Webpack build completed; Playwright 1/1 passed in 8.7s; exact-label isolated Supabase cleanup exited 0

git diff --check
PASS
```

The production runner's build emitted the repository's existing OpenTelemetry dynamic-dependency warnings. The staff page also logged a non-fatal fresh-schema `patient_notes.created_by_name` mismatch and local Redis fail-open messages; neither was a certificate render failure.

## Files changed

- `playwright.production.config.ts`
- `scripts/run-production-e2e.ts`
- `e2e/certificate-resend-render.spec.ts`
- `lib/__tests__/certificate-email-entrypoints.test.tsx`
- `lib/__tests__/certificate-delivery-actions.test.ts`
- `package.json`
- `docs/TESTING.md`
- `.superpowers/sdd/2026-09-04-conversion-retention-friction-closure/task-3-report.md`

No production action, template, renderer, email dispatcher, schema migration, package version, or lockfile was changed.

## Self-review

- Privacy: all fixture names, addresses, identifiers, and email addresses are synthetic; no request bodies, recipients, production storage URLs, credentials, or patient data are written to the report.
- External effects: no live Resend/Stripe/Supabase write path is reachable from the runner. Direct resend is intercepted by the existing E2E seam; reconstructed retry reaches only the local fetch interceptor.
- Isolation: explicit loopback coordinates are validated; occupied ports cause a closed failure; the runner never stops a pre-existing stack or kills an unknown port owner.
- Transactional invariants: resend caps, reservation/finalisation, storage-version binding, audit behavior, and E2E suppression remain production-owned and unchanged. The browser case asserts their durable outputs.
- Scope: no guessed repair or diagnostic instrumentation was added. The harness compatibility ALTER is disposable and exists only because checked-in migrations do not recreate a column the application expects.

## Concerns / follow-up

1. **Prominent schema drift:** checked-in migrations create `intake_answers.answers_enc`, while current reads select `answers_encrypted`; fresh local stacks therefore cannot render the staff intake route without the disposable shim. The same route logs a separate missing `patient_notes.created_by_name` column because duplicate `CREATE TABLE IF NOT EXISTS` definitions do not converge its shape. These require a separate schema diagnosis and must not be silently adopted as part of this incident repair.
2. The Sep 3 Sentry event frame is still unavailable because the existing token returned HTTP 403. A credential with `event:read`, or a PHI-safe frame/export from that exact release, is required before choosing a production repair.
3. `/admin/ops` intentionally excludes `exclude_from_reporting` synthetics. The staff intake-review UI provides equivalent action/bundle coverage, but this is a documented deviation from the original route instruction.
4. The reproduction is local Webpack/`next start` evidence for the current checkout, not deployed-release proof. Release SHA, runtime packaging, and environment differences remain possible causes.
