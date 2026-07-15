# Context Map

This map names the main domains, entry points, and files to open first.

## Product Surface

| Domain | Current shape | Entry points |
|--------|---------------|--------------|
| Public marketing | Homepage, active service pages, legal/trust pages, and regulated acquisition copy | `app/page.tsx`, `app/medical-certificate`, `app/prescriptions`, `app/erectile-dysfunction`, `app/hair-loss`, `components/marketing/*` |
| SEO content | Programmatic condition/symptom/guide/location/intent pages plus MDX health guides | `app/blog/[slug]`, `content/blog/*`, `lib/blog/*`, `lib/seo/*` |
| Intake | One canonical `/request` flow with service-specific steps | `app/request/page.tsx`, `components/request/request-flow.tsx`, `components/request/steps/*`, `lib/request/step-registry.ts`, `lib/request/initial-url-seeding.ts` |
| Patient portal | Patient dashboard, intakes, documents, settings, messages, prescriptions, payment history | `app/patient/*`, `components/patient/*`, `lib/data/patient-*` |
| Staff cockpit | Unified admin, doctor, and support experience. `/dashboard` is canonical; support lands on `/admin/ops` | `app/dashboard`, `app/admin/*`, `app/doctor/*`, `components/operator/*`, `lib/dashboard/*` |

## Core Flows

| Flow | Path | Important files |
|------|------|-----------------|
| Intake to checkout | `/request` -> server action -> Stripe Checkout -> webhook | `app/actions/unified-checkout.ts`, `lib/stripe/checkout.ts`, `lib/stripe/guest-checkout.ts`, `app/api/stripe/webhook/route.ts` |
| Patient request updates | Authenticated server projection -> patient-specific cache invalidation -> visibility-aware structural/status poll -> patient-safe refresh | `app/api/patient/intake-status/route.ts`, `components/patient/intake-status-listener.tsx`, `components/patient/global-intake-notifications.tsx`, `lib/patient/intake-status-polling.ts` |
| Safety gate | Answers saved -> safety completeness -> safety rules -> audit log | `lib/safety/evaluate.ts`, `lib/safety/rules.ts`, `lib/safety/audit-log.ts`, `lib/stripe/checkout/*` |
| Medical certificate | Doctor approval -> PDF render -> private storage -> patient email/dashboard | `lib/clinical/execute-cert-approval.ts`, `lib/pdf/template-renderer.ts`, `lib/data/issued-certificates.ts`, `app/doctor/intakes/[id]/document/*` |
| Auto-approval | Paid med cert -> draft readiness -> cron -> CAS state transition -> cert or doctor queue | `lib/clinical/auto-approval-state.ts`, `lib/clinical/auto-approval-pipeline.ts`, `app/api/cron/retry-auto-approval/route.ts` |
| Prescribing | Doctor approval -> identity gate -> Parchment panel -> webhook -> patient notification | `lib/parchment/*`, `components/doctor/parchment-prescribe-panel.tsx`, `app/actions/parchment.ts`, `app/api/webhooks/parchment/route.ts` |
| Email outbox | Template render -> outbox row -> dispatcher cron -> Resend webhook | `lib/email/*`, `app/api/cron/email-dispatcher/route.ts`, `app/api/webhooks/resend/route.ts` |
| Attribution | URL/cookie/session capture -> intake columns -> client and server conversion uploads | `lib/analytics/attribution.ts`, `lib/analytics/server-attribution.ts`, `lib/analytics/google-ads-post-payment.ts`, `app/api/cron/google-ads-conversions/route.ts` |

## Data And Enforcement

| Area | Source of truth |
|------|-----------------|
| DB schema | `supabase/migrations/*`, `types/db.ts` |
| Intake status transitions | `lib/data/intake-lifecycle.ts` plus the DB trigger migration |
| Staff roles/capabilities | `lib/auth/staff-capabilities.ts`, `lib/dashboard/staff-navigation.ts` |
| Service catalog | `lib/services/service-catalog.ts`, `lib/constants/index.ts`, `lib/stripe/price-mapping.ts` |
| Feature flags and kill switches | `lib/feature-flags.ts`, `lib/operational-controls/*`, `docs/SECURITY.md` |
| Route aliases and retirements | `next.config.mjs`, `middleware.ts`, `scripts/check-orphaned-files.sh` |
| PHI encryption and RLS | `docs/SECURITY.md`, `lib/security/*`, relevant migrations |
| Patient status projection | Server-authenticated, newest-100 polling allowlist only; no browser `intakes` Realtime/table queries |

## Verification Map

| Surface | Useful checks |
|---------|---------------|
| Docs and wiki | `pnpm doc:audit`, `git diff --check` |
| Route/file cleanup | `bash scripts/check-route-conflicts.sh`, `bash scripts/check-orphaned-files.sh` |
| Clinical/safety/checkout | Focused Vitest contract tests, `pnpm typecheck`, `pnpm lint` |
| Patient/staff UI | Focused Playwright spec or browser check at port `3060` |
| Content | `pnpm content:audit`, `pnpm content:audit:images` |
| Release | `pnpm release:check` |
