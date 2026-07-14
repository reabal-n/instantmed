# TESTING.md — InstantMed

> Testing strategy, conventions, and patterns. Load when writing tests or diagnosing test failures.

---

## Overview

| Layer | Framework | Location | Count |
|-------|-----------|----------|-------|
| Unit tests | Vitest | `**/*.test.ts` / `lib/__tests__/**/*.test.ts` | Local run 2026-07-14: **4,370 passed, 0 skipped** across 497 test files. |
| E2E tests | Playwright | `e2e/**/*.spec.ts` | 67 specs — blocking CI currently runs ops/navigation/clinical-input smoke plus focused paid critical flows |

**Coverage threshold:** 80% statements / 70% branches / 80% functions / 80% lines (enforced by Vitest config, scoped to `lib/clinical/`, `lib/security/`, the `lib/stripe/` payment-safety surface, and `lib/data/intake-lifecycle.ts`). The E2E-only Stripe orchestrators (`checkout.ts`, `guest-checkout.ts`, `checkout/stripe-session.ts`, `checkout/persistence.ts`, `checkout/auth-and-profile.ts`, `checkout/retry-payment.ts`, `client.ts`, `referral-coupon.ts`, `post-payment.ts`) are excluded — they're exercised by `e2e/unified-request-flow.spec.ts` / `consult-subtypes.spec.ts` / payment-smoke, not units. **Note:** `lib/state-machine/` was removed from the include list 2026-04-08 because the directory no longer exists — the state-machine logic was consolidated into `lib/clinical/auto-approval-state.ts`.

**Recent additions (2026-04-08 audit sweep):**
- `lib/__tests__/decline-intake.test.ts` — coverage for `app/actions/decline-intake.ts` (actor gate, idempotency, **refund amount math per category** including full refund on declined refundable categories, E2E short-circuit, skipRefund flag)
- `lib/__tests__/doctor-queue-contract.test.ts` — contract coverage for canonical doctor queue actions and retired duplicate doctor decision APIs.
- `e2e/operator.viewport.spec.ts` and `e2e/operator.visual.spec.ts` — compact staff cockpit visual/viewport guardrails for `/admin`, `/admin/ops`, `/admin/intakes`, and the intake review panel at 1440x900.

Prior to these, the canonical refund code had **zero unit coverage** — only the e2e suite exercised it, which gave slow feedback and no per-branch visibility.

**CI pipeline:** `pnpm ci` runs `install → lint → typecheck → test → build` in sequence. The blocking PR E2E gate always runs the current ops/navigation/clinical-input smoke (`e2e/admin.ops-index.spec.ts`, `e2e/marketing-dashboard-nav.spec.ts`, `e2e/dashboard.keyboard-safety.spec.ts`) plus focused paid-flow smoke coverage (`pnpm medcert:readiness:e2e`, `e2e/unified-request-flow.spec.ts`, `e2e/consult-subtypes.spec.ts`, `e2e/intake-terminal-blocks.spec.ts`, `e2e/parchment-webhook.spec.ts`) after a fail-fast required-secret check, then runs `e2e/checkout-resume.spec.ts` as a separate encrypted-answer safety gate with isolated Playwright artifacts. The older broad Playwright suite is not a reliable blocking signal right now; it contains stale routes and product-state assumptions and should be repaired as a dedicated E2E cleanup pass before being restored as a merge gate. Preview deployments run `e2e/preview-smoke.spec.ts`.

**Required CI secrets:** `E2E_SECRET`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are required for ops/admin E2E pages and seeded auth. The paid-flow E2E gate also requires `STRIPE_WEBHOOK_SECRET` (test-mode `whsec_...`) and `PARCHMENT_WEBHOOK_SECRET`; CI fails fast if any required secret is missing so payment/prescribing specs cannot silently skip. The signed guest-resume E2E runs in its own step and derives test-only `INTERNAL_API_SECRET` and `PHI_MASTER_KEY` values from `E2E_SECRET` and `ENCRYPTION_KEY`; it deliberately seeds stale benign plaintext beside encrypted high-stakes truth to prove the route reads authoritative encrypted answers. Focused unit coverage separately proves decrypt failure, disabled reads, malformed envelopes, invalid payloads, Session-replacement/expiry interleaving, exact guest email completion links, and redirect-before-webhook conversion values.

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

### Test Integrity

- Declare environment or browser capability gates as `test.skip(condition, reason)` before test side effects.
- Authentication, fixture seeding, and required UI failures must fail the test; do not convert them into runtime skips.
- Do not commit always-true assertions, conditional tests with no required assertion, or tests that pass when the behavior named in the title is absent.

### Local Ports

- InstantMed's dedicated manual/Codex Browser Use port is `3060` (`pnpm dev` -> `http://localhost:3060`).
- Playwright's isolated web server still defaults to `3001` for deterministic E2E runs unless `PLAYWRIGHT_PORT` or `E2E_PORT` is set.
- Moirai uses `3010` and Reabal uses `3055`; do not reuse those ports for InstantMed sessions.

### Local Exploratory Browser Checks

Codex Browser Use is part of the local UI review stack for exploratory hover, click, scroll, and visual inspection on `http://localhost:3060`. It is a human-in-the-loop quality layer, not the release gate.

- Use Browser Use after material UI changes to inspect the rendered page, visible copy, focus/hover feel, and obvious layout defects.
- Keep Playwright as the authenticated release gate for doctor/admin flows because it owns the E2E auth bypass, seeded data, first-click assertions, and no-PHI-prefetch network checks.
- Keep Gemini + Claude video review for qualitative design/motion critique after Playwright passes.
- Do not add AutoExplore to the default stack; it is intentionally excluded for cost.

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

Every active `/api/test/*` endpoint must use the same local/CI seam: `PLAYWRIGHT=1` or `NODE_ENV=test`, allowed host, and `X-E2E-SECRET`. Vercel production and preview deployments block these endpoints before the route handler, regardless of `PLAYWRIGHT`; do not add a test endpoint that relies on host/test-mode checks alone.

The client auth provider also treats the readable `__e2e_auth_role` cookie as a minimal signed-in browser user. Server-side authorization still resolves through the httpOnly `__e2e_auth_user_id` cookie, but public client surfaces such as the marketing nav can render signed-in UI in Playwright without creating a real Supabase browser session.

**Never** use real auth credentials in E2E. The auth bypass is the only supported pattern.

Do not use public inboxes such as Mailinator for staff, admin, privileged, or PHI-like test accounts. Manual patient smoke accounts may use disposable addresses only when they contain fabricated data and no privileged role; otherwise use the seeded E2E auth bypass or a controlled private test inbox.

### Test Data

E2E tests auto-seed and teardown test data. Seed/teardown scripts in `scripts/e2e/`, invoked by `e2e/global-setup.ts` and `e2e/global-teardown.ts`. Paid-flow fixtures use deterministic patient IDs registered in `lib/data/seeded-e2e-data.ts`, and every direct E2E intake insert must set `exclude_from_reporting: true`. The canonical auth/profile/intake fixtures are preserved by default during teardown; only transient child records are cleared unless `E2E_TEARDOWN_RESET_FIXTURES=1` is set for a deliberate full fixture reset. CI serializes the blocking E2E job across branches because those shared fixtures point at the same Supabase project. Helpers in `e2e/helpers/`:
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
| Persisted terminal safety state | Scoped draft → reload/resume/back/edit → matching block and explicit correction path |
| Stripe payment | Checkout session → webhook → intake status update |
| Doctor approval → certificate generation | Approve → PDF → email outbox |
| Doctor decline → refund | Decline → Stripe refund → patient email |
| Auth flows | Sign in, sign up, guest checkout → account link |
| Document download | Auth required, ownership verified, app-streamed PDF |
| Patient portal | Dashboard, intake detail, prescription history |
| Staff cockpit | Admin/doctor operator pages stay compact, navigable, and visually stable at desktop staff viewport |

The med-cert auto-approval E2E contract uses `/api/test/medcert-immediate-auto-approve` to bypass the production retry-cron delay. That route is test-only, requires `PLAYWRIGHT=1` + `E2E_SECRET`, and must not be treated as the production approval timing path.

### What NOT to E2E Test

- Marketing pages (no auth, no data — snapshot test if needed)
- Broad admin UI browsing (keep E2E to critical operational recovery paths)
- Email template rendering (use `/admin/emails/templates` for admin review or `/email-preview/*` in dev)

---

## Certificate Pipeline — Test Domains

The certificate pipeline has strict idempotency and security requirements. These domains must have explicit test coverage:

| Domain | What to Verify |
|--------|----------------|
| Template versioning | New save creates version; old versions immutable; single active constraint |
| Issuance locking | Template + clinic snapshots captured at approval time; old certs use original snapshot |
| Doctor gating | Approval blocked without provider number or AHPRA number; intake reverts on failure |
| Idempotency | Double-approve creates single certificate and single email |
| Secure downloads | Auth required; ownership verified; storage signed URLs stay server-side and expire quickly; revoked certs blocked |
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
      - official GitHub actions pinned to Node 24-compatible releases
      - actions/setup-node with node-version-file: .nvmrc
      - bash scripts/check-node-runtime.sh  # Fails if the active executable is not Node 24 + pinned pnpm
      - pnpm install --frozen-lockfile
      - bash scripts/check-stack-pins.sh  # Fails if Next + tooling/React/Tailwind/FM/runtime drift
      - pnpm dedupe --check               # Fails if the lockfile can be collapsed
      - pnpm audit --audit-level=high     # Was: critical (tightened 2026-04-08)
      - pnpm lint
      - pnpm typecheck                    # Explicit TypeScript gate
      - pnpm test --run --coverage        # Unit tests + coverage check
      - bash scripts/check-route-conflicts.sh
      - pnpm build:release                # Production build, captured output, 180s target / 210s warning budget
  lighthouse:
    needs: build
    steps:
      - pnpm build                        # With real Supabase + Stripe secrets (not placeholders)
      - lhci autorun                      # Category-score assertions only (no recommended preset)
  e2e:
    needs: build
    steps:
      - verify E2E_SECRET + Supabase + ENCRYPTION_KEY + STRIPE_WEBHOOK_SECRET + PARCHMENT_WEBHOOK_SECRET are present
      - playwright test --project=chromium e2e/admin.ops-index.spec.ts e2e/marketing-dashboard-nav.spec.ts e2e/dashboard.keyboard-safety.spec.ts
      - pnpm medcert:readiness:e2e
      - playwright test --project=chromium e2e/unified-request-flow.spec.ts e2e/consult-subtypes.spec.ts e2e/intake-terminal-blocks.spec.ts e2e/parchment-webhook.spec.ts
      - playwright test --project=chromium e2e/checkout-resume.spec.ts

# .github/workflows/e2e-preview.yml
# Runs deployment smoke against Vercel preview deployment
steps:
  - playwright test --config=playwright.preview.config.ts e2e/preview-smoke.spec.ts
```

**E2E runs in two places:** (1) `ci.yml` on push/PR to main as required Chromium ops/navigation/clinical-input smoke plus blocking paid critical flows; (2) `e2e-preview.yml` against Vercel preview deployments for deploy health plus an active `/request` route smoke. Protected Vercel preview E2E requires the GitHub secret `VERCEL_AUTOMATION_BYPASS_SECRET`; without it, the preview readiness check fails fast on the expected `401`. Preview smoke requires `410 Gone` from `/api/test/login` because `/api/test/*` is always blocked on Vercel production and preview deployments, including when `PLAYWRIGHT=1` is accidentally configured. Unit tests and lint run on every push to main and all PRs.

**Monthly stack health:** `.github/workflows/stack-drift.yml` runs on the first day of each month and can be triggered manually. It verifies active Node 24, stack pins, lockfile dedupe, high-severity audit, and writes a non-blocking outdated-package report to the workflow summary. Framework upgrades remain separate planned windows, not opportunistic dependency bumps.

**Lighthouse gates** (commit `99fc1c843`, updated 2026-06-05): PR CI blocks on accessibility, SEO, FCP, and CLS. LCP and TBT are warning-only in the general PR Lighthouse config because simulated throttling on GitHub runners is too noisy for untouched marketing pages. The dedicated mobile `/request` Lighthouse gate hard-gates stable paid-intake metrics (FCP ≤2s, TBT ≤300ms, CLS ≤0.05) while keeping composite performance score and simulated LCP warning-only.

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
