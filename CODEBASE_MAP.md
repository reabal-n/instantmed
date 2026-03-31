# CODEBASE_MAP.md — Quick Reference

> **Load this instead of exploring.** Compact index of every directory, key file, and pattern. For deep dives, see the satellite docs listed in CLAUDE.md.

## Directory Index

### `app/` — 563 files, 144 routes

| Directory | Purpose | Key files |
|-----------|---------|-----------|
| `app/actions/` | Server actions | `unified-checkout.ts` (checkout bridge), `generate-drafts.ts` (AI), `ensure-profile.ts` |
| `app/admin/` | Admin dashboard | `email-hub/`, `features/`, `settings/`, `ops/`, `analytics/` |
| `app/doctor/` | Doctor portal | `queue/` (intake queue), `intakes/[id]/` (review), `scripts/` (Rx tasks), `patients/` |
| `app/patient/` | Patient dashboard | `intakes/` (history + success), `settings/`, `onboarding/`, `documents/` |
| `app/api/` | API routes | `stripe/webhook/`, `cron/`, `ai/`, `health/`, `certificates/`, `intakes/` |
| `app/api/cron/` | Scheduled jobs | `email-dispatcher/` (5min), `daily-audit/`, `queue-monitor/`, `sla-monitor/` |
| `app/api/stripe/webhook/` | Stripe handlers | `handlers/checkout-session-completed.ts` (main payment handler) |
| `app/request/` | Unified intake flow | Single page, step-based wizard |
| `app/(dev)/` | Dev-only routes | Email preview, Sentry test — blocked in production by middleware |
| `app/blog/` | Health articles | ISR 12h, `[slug]/page.tsx` |
| `app/conditions/[slug]/` | SEO: conditions | Programmatic from `lib/seo/data/` |
| `app/symptoms/[slug]/` | SEO: symptoms | Programmatic from `lib/seo/data/` |
| `app/guides/[slug]/` | SEO: guides | Programmatic from `lib/seo/data/` |
| `app/for/[audience]/` | SEO: audience | students, parents, tradies, etc. |
| `app/locations/[city]/` | SEO: location | Australian cities |
| `app/intent/[slug]/` | SEO: high-intent | Search query landing pages |
| `app/compare/[slug]/` | SEO: comparisons | Service comparison pages |

### `components/` — 355 files

| Directory | Count | Purpose |
|-----------|-------|---------|
| `ui/` | 60 | shadcn/Radix primitives (Button, Input, Dialog, etc.) |
| `uix/` | 11 | Abstractions (DataTable, UserCard, StatusBadge, etc.) |
| `shared/` | 31 | Header, Footer, InlineAuthStep, CheckoutButton, LazyOverlays |
| `request/` | 32 | Intake flow: `request-flow.tsx` (orchestrator), `steps/` (per-step components), `store.ts` (Zustand) |
| `marketing/` | 20 | Landing pages, ServiceFunnelPage, testimonials, exit intent |
| `doctor/` | — | IntakeReviewPanel, RepeatPrescriptionChecklist, clinical views |
| `admin/` | — | Admin-specific panels and views |
| `patient/` | — | ReferralCard, CrossSellCard, dashboard components |
| `chat/` | — | AI chat intake (ChatIntake, lazy-loaded) |
| `charts/` | — | LazyAreaChart, LazyBarChart, etc. (dynamic import from recharts) |
| `effects/` | — | Confetti, ShakeAnimation |
| `providers/` | — | PostHogProvider, ThemeProvider, ClerkProvider wrapper |
| `heroes/` | — | Morning Canvas hero variants (Split, Centered, Stats, FullBleed) |
| `ui/morning/` | — | Morning Canvas primitives (MeshGradientCanvas, WordReveal, PerspectiveTiltCard) |
| `ui/skeletons.tsx` | — | TableSkeleton, CardSkeleton, FormSkeleton |

### `lib/` — 324 files

| Directory | Purpose | Key files |
|-----------|---------|-----------|
| `lib/auth.ts` | Auth helpers | `getAuthenticatedUserWithProfile()`, `requireRoleOrNull()` |
| `lib/constants.ts` | App constants | PRICING, SYSTEM_AUTO_APPROVE_ID, CONTACT_EMAIL |
| `lib/env.ts` | Env validation | Zod schemas, `getAppUrl()` |
| `lib/format.ts` | Date formatting | All AEST, `formatDateLong()`, `addDays()` |
| `lib/utils.ts` | Utilities | `cn()` (class merger) |
| `lib/ai/` | AI integration | `provider.ts` (model profiles), prompts, clinical note generation |
| `lib/cert/` | Certificate pipeline | `execute-approval.ts` (9-step approval), PDF → storage → email |
| `lib/clinical/` | Clinical logic | `auto-approval.ts` (eligibility), `auto-approval-pipeline.ts` (orchestrator), `intake-validation.ts` (Schedule 8 blocking), `triage-rules-engine.ts` |
| `lib/data/` | Supabase queries | `intakes.ts`, `issued-certificates.ts`, `documents.ts`, `intake-answers.ts` — all use `createServiceRoleClient()` |
| `lib/email/` | Email system | `send-email.ts` (1505 lines, dispatcher), `email-dispatcher.ts` (cron processor) |
| `lib/flow/` | Intake flow logic | `safety/` (safety rules), `draft/` (localStorage drafts) |
| `lib/pdf/` | PDF generation | `template-renderer.ts` (pdf-lib overlay on static templates in `/public/templates/`) |
| `lib/rate-limit/` | Rate limiting | `redis.ts` (Upstash), `doctor.ts` (auto-approval limits). Fallback: in-memory Map |
| `lib/request/` | Step registry | `step-registry.ts` (step definitions), `validation.ts` (per-step Zod schemas) |
| `lib/security/` | Encryption | `phi-encryption.ts` (AES-256-GCM), `phi-field-wrappers.ts` (data layer wrappers) |
| `lib/stripe/` | Payments | `checkout.ts`, `guest-checkout.ts`, `price-mapping.ts`, `client.ts` |
| `lib/seo/data/` | SEO content | `conditions.ts`, `symptoms.ts`, `guides.ts` — drive programmatic pages |
| `lib/blog/articles/` | Blog content | Article data (13,768 lines total) |
| `lib/notifications/` | Alerts | `telegram.ts` (ops alerts), `service.ts` (payment notifications) |
| `lib/observability/` | Logging/monitoring | `logger.ts` (structured logger), `sentry.ts` (helpers) |
| `lib/feature-flags.ts` | Feature flags | DB-backed via `feature_flags` table, `getFeatureFlags()` |
| `lib/posthog-server.ts` | Server analytics | `getPostHogClient()`, funnel tracking, safety outcome tracking |
| `lib/validation/` | Validation schemas | `med-cert-schema.ts`, `repeat-script-schema.ts` |

### Other top-level

| File/Dir | Purpose |
|----------|---------|
| `middleware.ts` | Auth (Clerk), route protection, E2E bypass, prod route blocking |
| `instrumentation.ts` | Sentry server init |
| `instrumentation-client.ts` | PostHog + Sentry client init |
| `types/db.ts` | Supabase generated types + custom interfaces |
| `types/certificate-template.ts` | PDF template field definitions |
| `hooks/` | 5 custom hooks (useMediaQuery, useMounted, etc.) |
| `e2e/` | 43 Playwright specs, `helpers/` (seed/teardown, auth bypass) |
| `supabase/migrations/` | 178 SQL migrations |
| `public/templates/` | Static PDF templates for certificate generation |

## Key Patterns

### Auth
```
getAuthenticatedUserWithProfile()  → { user, profile } or null (non-throwing)
requireRoleOrNull(["doctor"])      → role check, returns null if unauthorized
verifyCronRequest(request)         → cron auth via CRON_SECRET header
```

### Data Access
```
createServiceRoleClient()          → Supabase with service role (server-only, 177 files)
createClient()                     → Supabase with user session (client-side)
```

### Server Action Return Shape
```typescript
{ success: boolean; error?: string; data?: T }
```

### Intake Flow
```
/request?service=<type> → step-registry.ts defines steps → Zustand store → checkout → webhook → queue
```

### Certificate Pipeline
```
Doctor approves → executeCertApproval() → PDF render → Supabase Storage → email with dashboard link
```

### Auto-Approval Pipeline
```
AI draft generated → attemptAutoApproval() → eligibility check → claim intake → build review data → executeCertApproval()
Feature-flagged (ai_auto_approve_enabled), rate-limited, dry-run mode available
```

## File Size Reference (largest client components)

| File | Size | Notes |
|------|------|-------|
| `components/marketing/med-cert-landing.tsx` | 38KB | Dynamic imports for testimonials/exit-intent |
| `app/admin/features/features-list.tsx` | 35KB | Feature flag admin |
| `components/request/request-flow.tsx` | 31KB | Intake flow orchestrator |
| `app/admin/settings/templates/template-studio-client.tsx` | 28KB | PDF template editor |
| `app/patient/intakes/[id]/client.tsx` | 28KB | Patient intake detail |
| `app/doctor/queue/queue-table.tsx` | 27KB | Doctor queue table |
| `lib/email/send-email.ts` | 1505 lines | Email dispatcher (server) |
