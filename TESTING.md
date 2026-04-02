# TESTING.md — InstantMed

> Testing strategy, conventions, and patterns. Load when writing tests or diagnosing test failures.

---

## Overview

| Layer | Framework | Location | Count |
|-------|-----------|----------|-------|
| Unit tests | Vitest | `lib/__tests__/**/*.test.ts` | 921+ |
| E2E tests | Playwright | `e2e/**/*.spec.ts` | 43+ |

**Coverage threshold:** 40% (enforced by Vitest config).

**CI pipeline:** `pnpm ci` runs `install → lint → typecheck → test → build` in sequence. E2E runs separately in `e2e-preview.yml` against Vercel preview deployments.

---

## Unit Tests (Vitest)

### Environment

Node environment — not jsdom. Do not import browser APIs, React components, or Next.js server internals directly in unit tests.

### Commands

```bash
pnpm test               # Run all unit tests
pnpm test:watch         # Watch mode
pnpm test:coverage      # With coverage report (40% threshold)
```

### Conventions

- Test files: `lib/__tests__/**/*.test.ts` — mirrors `lib/` directory structure
- One test file per source file (`lib/clinical/intake-validation.ts` → `lib/__tests__/clinical/intake-validation.test.ts`)
- Test descriptions: plain English, no prefixes like "should" (`"blocks Schedule 8 substances"` not `"should block Schedule 8 substances"`)
- No mocking of the database — if a test needs DB behavior, write an integration test or restructure the code to be testable without it
- Do not mock Supabase clients — structure functions to accept data as arguments where possible

### What to Unit Test

- **Clinical logic:** `lib/clinical/` — every validation rule, every Schedule 8 block, all eligibility checks
- **Business logic:** `lib/stripe/`, `lib/security/`, `lib/pdf/` utilities
- **Validation schemas:** Zod schemas in `lib/validation/` — valid inputs, invalid inputs, edge cases
- **Pure functions:** date utilities, formatters, mappers, transformers
- **Rate limit logic:** `lib/rate-limit/` — in-memory fallback behavior

### What NOT to Unit Test

- React components (use E2E for UI behavior)
- Next.js server actions directly (integration concerns)
- Supabase queries (use real DB in E2E, or restructure to pure logic)
- Stripe API calls (mock at the HTTP boundary only if unavoidable)

---

## E2E Tests (Playwright)

### Environment

Runs against a real Next.js dev/preview server with a real Supabase test instance. Requires `PLAYWRIGHT=1` env var.

### Commands

```bash
pnpm e2e                # All browsers (needs PLAYWRIGHT=1)
pnpm e2e:chromium       # Chromium only — fastest for local dev
pnpm e2e:headed         # Visible browser for debugging
pnpm e2e:debug          # Step-through debugger
```

### Auth Bypass

E2E tests bypass Clerk auth using a test cookie:

```ts
// Set in test setup (e2e/helpers/auth.ts)
await context.addCookies([{
  name: '__e2e_auth_user_id',
  value: testUserId,
  domain: 'localhost',
  path: '/',
}])
// Requires PLAYWRIGHT=1 env var — middleware checks this before accepting the cookie
```

**Never** use real Clerk credentials in E2E. The auth bypass is the only supported pattern.

### Test Data

E2E tests auto-seed and teardown test data. Helpers in `e2e/helpers/`:
- `seed.ts` — creates test intakes, profiles, payments
- `teardown.ts` — cleans up test records after each spec
- `auth.ts` — sets auth bypass cookie

Always clean up in `afterEach` or `afterAll`. Do not leave test records in the database.

### E2E Seams

When `PLAYWRIGHT=1` is set:
- **Resend emails:** skipped, logged as `skipped_e2e` in `email_outbox`
- **Stripe:** use test mode keys — no real charges
- **Rate limiting:** Redis TTLs may need manual reset between tests if hitting limits
- **Auth:** bypass cookie accepted by middleware
- **Intake status reset:** use `e2e_reset_intake_status()` RPC (see below) — direct status updates are blocked by the state machine trigger

### E2E Intake Reset RPC

The `validate_intake_status_transition` trigger blocks terminal-state resets (e.g. `approved → paid`), which breaks E2E test cleanup that needs to reuse intakes across test runs.

**Solution:** `e2e_reset_intake_status(p_intake_id UUID, p_status TEXT)` — a Supabase RPC that bypasses the trigger using a transaction-local flag.

```ts
// Call via service role client only — not from browser/patient context
const { error } = await supabase.rpc('e2e_reset_intake_status', {
  p_intake_id: intakeId,
  p_status: 'paid',
})
```

**Security:** `service_role` only. `authenticated` and `anon` are explicitly revoked. The bypass flag (`app.e2e_reset`) is transaction-local — it expires at transaction end and cannot leak across requests. Migration: `20260402000003_add_e2e_intake_reset_rpc.sql`.

### What to E2E Test

Critical paths only — every flow that touches money, auth, or clinical data:

| Flow | Coverage required |
|------|------------------|
| Intake submission (all service types) | Form → checkout → success |
| Stripe payment | Checkout session → webhook → intake status update |
| Doctor approval → certificate generation | Approve → PDF → email outbox |
| Doctor decline → refund | Decline → Stripe refund → patient email |
| Auth flows | Sign in, sign up, guest checkout → account link |
| Document download | Auth required, ownership verified, signed URL |
| Patient portal | Dashboard, intake detail, prescription history |

### What NOT to E2E Test

- Marketing pages (no auth, no data — snapshot test if needed)
- Admin UI flows (covered by unit tests on underlying logic)
- Email template rendering (use `/admin/email-test` in dev)

---

## Certificate Pipeline — Test Domains

The certificate pipeline has strict idempotency and security requirements. These domains must have explicit test coverage:

| Domain | What to Verify |
|--------|----------------|
| Template versioning | New save creates version; old versions immutable; single active constraint |
| Issuance locking | Template + clinic snapshots captured at approval time; old certs use original snapshot |
| Doctor gating | Approval blocked without provider number or AHPRA number; intake reverts on failure |
| Idempotency | Double-approve creates single certificate and single email |
| Secure downloads | Auth required; ownership verified; signed URLs expire (5 min); revoked certs blocked |
| Verification | Rate limited (10/min, stricter after 3 failures); patient name masked; no sensitive data in response |
| Input sanitization | SQL injection and XSS attempts rejected; whitespace trimmed |
| Audit trail | Events logged for issuance, download, verification, email; IP and actor captured |

---

## Coverage Rules

- **Global threshold:** 40% line coverage (Vitest config enforces this — build fails below threshold)
- **Critical paths must exceed threshold:** clinical validation, PHI encryption, checkout logic, certificate pipeline
- Run `pnpm test:coverage` to see per-file breakdown
- Flag any file in `lib/clinical/`, `lib/security/`, or `lib/cert/` below 60% — these are high-risk

---

## CI

```yaml
# .github/workflows/ci.yml
steps:
  - pnpm install
  - pnpm lint
  - pnpm typecheck
  - pnpm test          # Unit tests + coverage check
  - pnpm build         # Production build (8GB heap)

# .github/workflows/e2e-preview.yml
# Runs against Vercel preview deployment
steps:
  - pnpm e2e:chromium  # E2E against preview URL
```

E2E does not run on every push — only on preview deployments. Unit tests and type checks run on every push to main and all PRs.

---

## Debugging Failing Tests

**Unit test fails:**
1. Run `pnpm test:watch` and focus the failing file
2. Check if the test is importing browser APIs (wrong environment — tests run in Node)
3. Check if the test depends on env vars — Vitest loads `.env.test` if present

**E2E test fails:**
1. Run `pnpm e2e:headed` to see the browser
2. Run `pnpm e2e:debug` to step through
3. Check `email_outbox` table for `skipped_e2e` status if email-related
4. Check if `PLAYWRIGHT=1` is set — auth bypass won't work without it
5. Check for leftover test data from a previous failed run — teardown may not have completed
