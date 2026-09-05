# Architecture Map

This is a compact current map. `docs/ARCHITECTURE.md` remains the canonical deep reference.

## Live Inventory

| Area | Current count |
|------|---------------|
| `app/` | 571 files |
| Route-like files under `app/` | 249 |
| API route files under `app/api/` | 94 |
| Cron route files under `app/api/cron/` | 29 |
| `components/` | 407 files |
| `lib/` | 1,372 files |
| E2E TypeScript files under `e2e/` | 83 (70 specs) |
| Health guide MDX files under `content/blog/` | 107 |
| SQL migrations under `supabase/migrations/` | 141 |

Newest on-disk and applied/verified production migration is `20260905120001_converge_delivery_tracking_runtime.sql`. It converges the legacy delivery-tracking shape without rewriting rows; live schema lint passes. The preceding `20260905120000_refill_reminder_funnel.sql` contains only aggregate refill cohorts and indexes. Runtime-schema convergence, preference ordering (`1100`), shared Resend receipts (`1150`), and refill reporting (`1200`) were applied in order on 2026-09-05. Live metadata confirmed nullable columns, enabled preference triggers, invoker RPCs executable only by service_role, and zero SECURITY DEFINER ACL violations. Linked migration history is aligned through `20260905120001`. No historical repair, identity-trigger replacement, or patient send was executed. Earlier recovery-email migration `20260903120000_recovery_email_engagement.sql` remains applied. The immediately preceding applied migration is `20260902090000_converge_fraud_flag_review_state.sql`, which converges legacy boolean fraud-review state to the app-owned `open|reviewed|dismissed` model; it is also applied and verified. Live recovery metadata confirmed a nullable `timestamptz` column with no default, its enabled preservation trigger, and its `SECURITY INVOKER` function with `EXECUTE` denied to `PUBLIC`, `anon`, and `authenticated`; the migration backfilled no markers. The prior `20260828090000_specialty_experience_attribution.sql` adds bounded, nullable, non-clinical `growth_experience_version` columns with set-once draft and immutable intake semantics. Live metadata confirmed both nullable `text` columns, both validated constraints, both enabled triggers, and both `SECURITY INVOKER` trigger functions with `EXECUTE` denied to `PUBLIC`, `anon`, and `authenticated`. The immediately preceding `20260825073433_scope_profiles_realtime_policy_to_authenticated.sql` is also applied; all three `is_doctor()` policies have roles exactly `{authenticated}`. The additive `20260827210500_twilio_voice_callback_requests.sql` is applied and verified in production: the encrypted queue was empty at release, service-role access succeeded, `anon` table/RPC access was denied, and the live SECURITY DEFINER ACL checker returned zero violations. The earlier refund-recovery migration, `20260816101752_harden_stripe_refund_recovery.sql`, also passed its linked DB lint and ACL gates; detailed database receipts live in `docs/ARCHITECTURE.md`.

## Runtime Shape

InstantMed is a Next.js App Router app with a Supabase/Postgres backend, Stripe payments, Resend email, PostHog analytics, Sentry observability, Upstash rate limiting, Parchment prescribing, and Vercel cron/runtime hosting.

The current stack is pinned: Next.js 15.5, React 18.3, Tailwind v4, Framer Motion v11, Node 24, pnpm 10.23.0, and Webpack. Do not upgrade or switch bundlers without explicit approval.

## Main Route Families

| Family | Purpose |
|--------|---------|
| `app/request` | Sole canonical patient intake flow |
| `app/admin` | Admin and support operations surfaces |
| `app/doctor` | Doctor review/detail/settings surfaces under shared staff shell |
| `app/dashboard` | Canonical staff dashboard entry |
| `app/patient` | Patient portal |
| `app/api` | API, webhook, cron, health, and internal reporting routes |
| `app/blog`, `app/conditions`, `app/symptoms`, `app/guides`, `app/locations`, `app/intent`, `app/compare`, `app/for` | SEO and educational surfaces |
| Marketing/legal top-level routes | Homepage, service pages, legal/trust/about/contact surfaces |

## Core Data Flow

```text
Patient /request
  -> Zustand draft + step registry
  -> unified checkout action
  -> safety + operational gates
  -> intakes + intake_answers
  -> Stripe Checkout
  -> Stripe webhook
  -> paid intake queue
  -> bounded protocol issuance for clean 1-3 day work/study/carer requests
     OR doctor review for concerning, uncertain, or prescribing requests
  -> certificate / eScript / decline refund
  -> email + patient dashboard
```

## Key Boundaries

| Boundary | Rule |
|----------|------|
| Intake | `/request` is canonical. Do not reintroduce `/flow` or alias page trees. |
| Staff | `/dashboard` is canonical for staff. Use `components/operator/*` and `STAFF_*_HREF`. |
| Safety | Authenticated, guest, and retry-payment checkout must all run safety completeness before rule evaluation. |
| Status | Intake status transitions live in app code and DB trigger. Keep both layers in sync. |
| Prescribing | Doctor identity and prescribing identity gates must pass before Parchment handoff. |
| Docs | Platform changes update the relevant canonical doc in the same commit. |
| AGENTS | `AGENTS.md` is generated from `CLAUDE.md`; never hand-edit it. |

## Important Guardrails

- `scripts/check-orphaned-files.sh` protects retired routes, dead intake steps, old subscription surfaces, and copied artifacts.
- `scripts/check-route-conflicts.sh` protects App Router path collisions.
- `pnpm doc:audit` protects assistant docs, doc count, plan refs, and pinning contracts.
- `scripts/check-stack-pins.sh` protects framework/runtime package pins.
- `scripts/verify-tokens.sh` protects design token usage.
- `scripts/check-portal-no-legacy-classes.sh` protects staff/patient portal design drift.

## Canonical Deep References

| Topic | Canonical doc |
|-------|---------------|
| Architecture and data flows | `docs/ARCHITECTURE.md` |
| Clinical and AI boundaries | `docs/CLINICAL.md` |
| Security and PHI | `docs/SECURITY.md` |
| Operations, cron, incidents | `docs/OPERATIONS.md` |
| Tests and CI | `docs/TESTING.md` |
| Design system | `DESIGN.md` |
| Product and brand posture | `PRODUCT.md`, `docs/BRAND.md`, `docs/VOICE.md` |
| Business and growth | `docs/BUSINESS_PLAN.md`, `docs/REVENUE_MODEL.md`, `docs/ADVERTISING_COMPLIANCE.md` |
