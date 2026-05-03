# TESTING.md — InstantMed

> Testing strategy, conventions, and patterns. Load when writing tests or diagnosing test failures.

---

## Overview

| Layer | Framework | Location | Count |
|-------|-----------|----------|-------|
| Unit tests | Vitest | `**/*.test.ts` / `lib/__tests__/**/*.test.ts` | **1,855** passing (148 Vitest files, local 2026-05-03; 144 under `lib/__tests__`) |
| E2E tests | Playwright | `e2e/**/*.spec.ts` | 50 specs — blocking CI currently runs ops smoke plus focused paid critical flows |

**Coverage threshold:** 80% statements / 70% branches / 80% functions / 80% lines (enforced by Vitest config, scoped to `lib/clinical/` and `lib/security/`). **Note:** `lib/state-machine/` was removed from the include list 2026-04-08 because the directory no longer exists — the state-machine logic was consolidated into `lib/clinical/auto-approval-state.ts`.

**Recent additions (2026-04-08 audit sweep):**
- `lib/__tests__/decline-intake.test.ts` — 19 tests covering `app/actions/decline-intake.ts` (actor gate, idempotency, **refund amount math per category** including 50% partial refund for consults, E2E short-circuit, skipRefund flag)
- `lib/__tests__/doctor-queue-contract.test.ts` — contract coverage for canonical doctor queue actions and retired duplicate doctor decision APIs.

Prior to these, the canonical refund code had **zero unit coverage** — only the e2e suite exercised it, which gave slow feedback and no per-branch visibility.

**CI pipeline:** `pnpm ci` runs `install → lint → typecheck → test → build` in sequence. The blocking PR E2E gate runs the current ops smoke (`e2e/admin.ops-index.spec.ts`) plus focused paid-flow smoke coverage (`e2e/payment-smoke.spec.ts`, `e2e/stripe-webhook.spec.ts`, `e2e/parchment-webhook.spec.ts`) when `vars.E2E_ENABLED == 'true'`. The older broad Playwright suite is not a reliable blocking signal right now; it contains stale routes and product-state assumptions and should be repaired as a dedicated E2E cleanup pass before being restored as a merge gate. Preview deployments run `e2e/preview-smoke.spec.ts`.

**Required CI secrets:** `ENCRYPTION_KEY` for ops/admin E2E pages that decrypt PHI-backed fields. `E2E_ENABLED=true` variable required to gate the e2e job. The paid-flow E2E gate requires `STRIPE_WEBHOOK_SECRET` (test-mode `whsec_...`) and `PARCHMENT_WEBHOOK_SECRET`; CI fails fast if those are missing so payment/prescribing specs cannot silently skip.

---

## Unit Tests (Vitest)

### Environment

Node environment — not jsdom. Do not import browser APIs, React components, or Next.js server internals directly in unit tests.

### Commands

```bash
pnpm test               # Run all unit tests
pnpm test:watch         # Watch mode
pnpm test:coverage      # With coverage report (80/70/80/80 thresholds)
```

### Conventions

- Test files: `lib/__tests__/**/*.test.ts` — mirrors `lib/` directory structure
- One test file per source file (`lib/clinical/intake-validation.ts` → `lib/__tests__/clinical/intake-validation.test.ts`)
- Test descriptions: plain English, no prefixes like "should" (`"blocks Schedule 8 substances"` not `"should block Schedule 8 substances"`). **Known debt:** ~25% of unit tests (203/816) still use "should" prefix — fix opportunistically, not in bulk
- Supabase is globally mocked in `lib/__tests__/setup.ts` (`createClient` and `createServiceRoleClient` return chainable mocks). This is intentional for unit tests — they test business logic, not DB queries
- For tests that need real DB behavior, use E2E tests against the real Supabase instance
- Prefer structuring functions to accept data as arguments where possible, reducing the need for mock setup

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

E2E tests bypass auth via a server endpoint that sets auth cookies:

```ts
// e2e/helpers/auth.ts — loginAsTestUser()
await page.request.post(`${BASE_URL}/api/test/login`, {
  headers: {
    "X-E2E-SECRET": E2E_SECRET,
    "Content-Type": "application/json",
  },
  data: { userType },  // "operator" | "doctor" | "patient"
})
// Server sets __e2e_auth_user_id + __e2e_auth_user_type + __e2e_auth_role cookies
// Requires PLAYWRIGHT=1 env var — middleware checks this before accepting the cookies
```

**Never** use real auth credentials in E2E. The auth bypass is the only supported pattern.

### Test Data

E2E tests auto-seed and teardown test data. Seed/teardown scripts in `scripts/e2e/`, invoked by `e2e/global-setup.ts` and `e2e/global-teardown.ts`. Helpers in `e2e/helpers/`:
- `auth.ts` — `loginAsTestUser()` / `logoutTestUser()` via `/api/test/login` endpoint
- `db.ts` — database helpers for test data
- `test-utils.ts` — shared test utilities
- `sentry.ts` — Sentry test helpers

Always clean up in `afterEach` or `afterAll`. Do not leave test records in the database.

### E2E Seams

When `PLAYWRIGHT=1` is set:
- **Resend emails:** skipped, logged as `skipped_e2e` in `email_outbox`
- **Stripe:** use test mode keys — no real charges
- **Rate limiting:** Redis TTLs may need manual reset between tests if hitting limits
- **Auth:** bypass cookie accepted by middleware
- **Intake status reset:** use `e2e_reset_intake_status()` RPC (see below) — direct status updates are blocked by the state machine trigger
- **Seeded queue data:** the fixed `E2E Test Patient` seed is hidden from live operational queue reads unless an E2E/test env flag is set

### E2E Intake Reset RPC

The `validate_intake_status_transition` trigger blocks terminal-state resets (e.g. `approved → paid`), which breaks E2E test cleanup that needs to reuse intakes across test runs.

**Solution:** `e2e_reset_intake_status(p_intake_id UUID, p_status TEXT)` — a Supabase RPC that bypasses the trigger using a transaction-local flag and keeps terminal timestamps coherent when moving test intakes into or out of `cancelled` / `completed`.

```ts
// Call via service role client only — not from browser/patient context
const { error } = await supabase.rpc('e2e_reset_intake_status', {
  p_intake_id: intakeId,
  p_status: 'paid',
})
```

**Security:** `service_role` only. `authenticated` and `anon` are explicitly revoked. The bypass flag (`app.e2e_reset`) is transaction-local — it expires at transaction end and cannot leak across requests. Original migration: `20260402000003_add_e2e_intake_reset_rpc.sql`; timestamp hardening: `20260501124500_harden_e2e_intake_reset.sql`.

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
- Broad admin UI browsing (keep E2E to critical operational recovery paths)
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

- **Scoped thresholds** (Vitest config): 80% statements, 70% branches, 80% functions, 80% lines — applied to `lib/clinical/` and `lib/security/` only
- `lib/state-machine/` was removed from the include list 2026-04-08 (directory no longer exists; state-machine logic lives in `lib/clinical/auto-approval-state.ts` which IS covered)
- Run `pnpm test:coverage` to see per-file breakdown
- Other directories are not gated but critical paths (checkout, certificate pipeline, decline/refund) are tested via focused unit tests (`decline-intake.test.ts`, queue/action contract tests) and the full e2e suite

---

## CI

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    steps:
      - pnpm install --frozen-lockfile
      - bash scripts/check-stack-pins.sh  # Fails if Next/React/Tailwind/FM drift
      - pnpm audit --audit-level=high     # Was: critical (tightened 2026-04-08)
      - pnpm lint
      - pnpm typecheck                    # Explicit TypeScript gate
      - pnpm test --run --coverage        # Unit tests + coverage check
      - bash scripts/check-route-conflicts.sh
      - pnpm build                        # Production build (includes typecheck, 8GB heap)
  lighthouse:
    needs: build
    steps:
      - pnpm build                        # With real Supabase + Stripe secrets (not placeholders)
      - lhci autorun                      # Category-score assertions only (no recommended preset)
  e2e:                                    # Gated by vars.E2E_ENABLED == 'true'
    needs: build
    steps:
      - playwright test --project=chromium e2e/admin.ops-index.spec.ts
      - verify STRIPE_WEBHOOK_SECRET + PARCHMENT_WEBHOOK_SECRET are present
      - playwright test --project=chromium e2e/payment-smoke.spec.ts e2e/stripe-webhook.spec.ts e2e/parchment-webhook.spec.ts

# .github/workflows/e2e-preview.yml
# Runs deployment smoke against Vercel preview deployment
steps:
  - playwright test --config=playwright.preview.config.ts e2e/preview-smoke.spec.ts
```

**E2E runs in two places:** (1) `ci.yml` on push/PR to main, gated by `vars.E2E_ENABLED == 'true'` (Chromium ops smoke); (2) `e2e-preview.yml` against Vercel preview deployments for deploy health plus an active `/request` route smoke. Protected Vercel preview E2E requires the GitHub secret `VERCEL_AUTOMATION_BYPASS_SECRET`; without it, the preview readiness check fails fast on the expected `401`. Preview smoke accepts `410 Gone` from `/api/test/login` because `/api/test/*` is intentionally blocked on Vercel production/preview unless `PLAYWRIGHT=1` is configured on the deployed app itself. Unit tests and lint run on every push to main and all PRs.

**Lighthouse gates** (commit `99fc1c843`, updated 2026-05-02): PR CI blocks on accessibility, SEO, FCP, and CLS. LCP and TBT are warning-only in PR CI because simulated throttling on GitHub runners is too noisy for untouched marketing pages. The scheduled production Lighthouse workflow remains stricter for performance, including TBT.

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
