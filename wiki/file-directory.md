# File Directory

Important files and folders referenced by the root docs and current architecture docs. Read the critical entries first; use useful and optional entries only when the task touches that domain.

| Path | Purpose | When Claude should read it | Priority |
|------|---------|----------------------------|----------|
| `CLAUDE.md` | Project brain: product rules, stack pins, workflows, gotchas, doc policy | First file for every non-trivial session | Critical |
| `AGENTS.md` | Codex projection of `CLAUDE.md` | Only to verify sync or understand Codex-specific wording | Useful |
| `wiki/index.md` | First navigation layer after `CLAUDE.md` | Before scanning app folders | Critical |
| `wiki/context-map.md` | Domain and data-flow map | Any feature, audit, or refactor task | Critical |
| `wiki/file-directory.md` | Important file/folder lookup | When choosing what to read next | Critical |
| `wiki/architecture.md` | Current high-level repo structure | Architecture, onboarding, or context-reset tasks | Useful |
| `wiki/code-hygiene-audit.md` | Current hygiene findings and guardrails | Cleanup/refactor tasks | Useful |
| `wiki/refactor-plan.md` | Deferred safe refactor sequence | Before starting code hygiene work | Useful |
| `PRODUCT.md` | Users, brand personality, aesthetic direction, design principles | Product, UI, brand, and patient-flow work | Critical |
| `DESIGN.md` | Visual system, typography, motion, layout, component rules | Any UI/frontend/styling work | Critical |
| `docs/AI_ONBOARDING.md` | UI assistant quick start and canonical primitives | First UI session in a new context | Critical |
| `docs/ARCHITECTURE.md` | Canonical system architecture and implementation index | Feature work, flow tracing, data-flow questions | Critical |
| `docs/CLINICAL.md` | Clinical rules, AI boundaries, prescribing and consent policy | Clinical, AI, prescribing, safety, consent | Critical |
| `docs/SECURITY.md` | PHI encryption, RLS, auth, audit logging, kill switches | Security, PHI, auth, RLS, env changes | Critical |
| `docs/OPERATIONS.md` | Incidents, cron jobs, env vars, deploy, monitoring | Ops, cron, deploy, incidents, production checks | Critical |
| `docs/TESTING.md` | Vitest, Playwright, CI, coverage and E2E seams | Any test work or verification choice | Critical |
| `docs/BUSINESS_PLAN.md` | Business strategy and non-negotiable service model | Strategy, pricing, growth, service expansion | Critical |
| `docs/REVENUE_MODEL.md` | $1M one-off revenue model and unit economics | Pricing, growth, operator dashboards | Useful |
| `docs/ADVERTISING_COMPLIANCE.md` | Google/AHPRA/TGA paid acquisition rules | Ads, landing pages, metadata, schema, public claims | Critical |
| `docs/SEO_CONTENT_POLICY.md` | Organic health content and guide-only rules | SEO, health guides, medicine/condition pages | Critical |
| `docs/BRAND.md` | Brand spine, voice, taglines, signature devices | Brand, copy, hero, marketing creative | Critical |
| `docs/VOICE.md` | Voice layers, banned phrases, compliance copy rules | Copy/microcopy/headline changes | Critical |
| `docs/PHOTOGRAPHY_BRIEF.md` | Launch imagery rules and generation brief | Generating or replacing visuals | Useful |
| `docs/PRIMITIVES.md` | Marketing primitive registry | Marketing stats, trust badges, FAQ, pricing data | Useful |
| `docs/ROADMAP.md` | Current phase, active priorities, deferred backlog | Roadmap or next-step questions | Useful |
| `docs/DOCTOR_ONBOARDING.md` | Capability flags, AHPRA, Parchment and identity gates | Doctor onboarding or capability changes | Useful |
| `docs/bookkeeping/file-map.md` | Canonical doc surface map and count rules | Adding, moving, or deleting docs | Critical |
| `app/request/page.tsx` | Canonical intake page | Intake routing and initial props | Critical |
| `components/request/README.md` | Intake flow implementation guide | Before editing request steps | Critical |
| `components/request/request-flow.tsx` | Request-flow orchestrator | Intake state/navigation changes | Critical |
| `components/request/step-router.tsx` | Step component loader | Adding/removing step components | Critical |
| `components/request/store.ts` | Zustand persisted request draft | Draft, recovery, state bugs | Critical |
| `components/request/steps/*` | Service-specific intake steps | Field, copy, validation, UX changes | Critical |
| `lib/request/step-registry.ts` | Service step definitions and skip logic | Any intake sequence change | Critical |
| `lib/request/consult-subtypes.ts` | Specialty/gated subtype launch state | ED, hair loss, women's health, weight loss | Critical |
| `app/actions/unified-checkout.ts` | Request flow to checkout bridge | Checkout creation from intake | Critical |
| `lib/stripe/checkout.ts` | Authenticated checkout orchestration | Payment, safety, idempotency, Stripe changes | Critical |
| `lib/stripe/guest-checkout.ts` | Guest checkout orchestration | Guest payment/account-linking work | Critical |
| `lib/stripe/price-mapping.ts` | Stripe price mapping | Pricing or line-item changes | Critical |
| `app/api/stripe/webhook/route.ts` | Stripe webhook entry | Payment state, webhook, DLQ changes | Critical |
| `app/api/stripe/webhook/handlers/*` | Event-specific Stripe handlers | Adding/removing webhook event handling | Useful |
| `lib/safety/evaluate.ts` | Safety completeness and rule evaluation | Checkout safety, clinical blocks | Critical |
| `lib/safety/rules.ts` | Safety rule definitions | Service eligibility or safety logic | Critical |
| `lib/safety/audit-log.ts` | PHI-safe safety audit logging | Safety outcome logging | Critical |
| `components/operator/README.md` | Staff cockpit doctrine | Admin/doctor/support UI work | Critical |
| `components/operator/*` | Staff shell and cockpit primitives | Staff page UI changes | Critical |
| `lib/dashboard/routes.ts` | Canonical staff route constants | Staff navigation or redirects | Critical |
| `lib/dashboard/staff-navigation.ts` | Role-aware staff nav | Staff role/nav changes | Critical |
| `lib/dashboard/revalidate-staff.ts` | Staff cache invalidation helper | Staff-visible mutations | Critical |
| `app/dashboard/*` | Canonical staff dashboard surface | Staff cockpit entry changes | Critical |
| `app/admin/ops/*` | Support/admin recovery cockpit | Ops visibility, recovery, support role | Critical |
| `app/admin/features/*` | Admin operational controls | Feature flags and kill switches | Useful |
| `app/admin/intakes/*` | Intake ledger | Staff ledger, refunds, admin case list | Useful |
| `app/doctor/intakes/[id]/*` | Doctor intake review | Clinical review, document builder | Critical |
| `app/doctor/patients/*` | Doctor patient surfaces | Patient summary or prescribing identity work | Useful |
| `app/patient/*` | Patient dashboard routes | Patient portal changes | Critical |
| `components/patient/*` | Patient portal components | Patient UI and dashboard cards | Useful |
| `lib/data/intakes/*` | Intake query/mutation layer | Queue, ledger, lifecycle, case data | Critical |
| `lib/data/issued-certificates.ts` | Certificate storage/read model | Certificate verification or delivery | Critical |
| `lib/clinical/execute-cert-approval.ts` | Certificate approval pipeline | Cert approval and PDF delivery | Critical |
| `lib/clinical/auto-approval-state.ts` | Auto-approval CAS state transitions | Auto-approval lock/state work | Critical |
| `lib/clinical/auto-approval-pipeline.ts` | Auto-approval orchestrator | Auto-approval cron/pipeline work | Critical |
| `lib/pdf/template-renderer.ts` | PDF overlay renderer | Certificate PDF output | Critical |
| `lib/parchment/*` | Parchment client, sync, embed policy | Embedded prescribing and webhook work | Critical |
| `components/doctor/parchment-prescribe-panel.tsx` | Embedded prescribing panel | Parchment UI/handoff changes | Critical |
| `app/actions/parchment.ts` | Parchment server actions | Prescribing panel actions | Critical |
| `app/api/webhooks/parchment/route.ts` | Parchment webhook | eScript completion integration | Critical |
| `lib/email/*` | Email rendering, outbox, dispatcher helpers | Email, notification, template work | Useful |
| `app/api/cron/email-dispatcher/route.ts` | Email dispatcher cron | Email delivery operations | Useful |
| `lib/analytics/*` | Attribution, Google Ads, PostHog, reporting | Acquisition, profitability, conversion work | Critical |
| `instrumentation-client.ts` | Client telemetry init | Sentry/PostHog client startup | Critical |
| `instrumentation.ts` | Server Sentry init | Server observability startup | Useful |
| `middleware.ts` | Supabase session, protected routes, dev-route blocks, attribution cookies | Auth, route protection, middleware behavior | Critical |
| `next.config.mjs` | Redirects, rewrites, headers, image config, webpack tweaks | Route aliases, retirements, security headers | Critical |
| `vercel.json` | Cron schedules and Vercel redirect | Cron or deployment config | Critical |
| `.github/workflows/ci.yml` | Main CI gate | Release, verification, CI changes | Critical |
| `scripts/check-orphaned-files.sh` | Dead/retired file guard | Route cleanup or legacy deletion | Critical |
| `scripts/check-route-conflicts.sh` | Next route conflict guard | Route tree changes | Critical |
| `scripts/doc-audit.sh` | Doc surface and pinning guard | Doc additions/removals | Critical |
| `scripts/sync-agent-doc.sh` | `CLAUDE.md` -> `AGENTS.md` generator | Any CLAUDE edit | Critical |
| `vitest.config.ts` | Unit test config and coverage scope | Test coverage/config changes | Useful |
| `playwright.config.ts` | Main E2E config | E2E work | Useful |
| `content/blog/*` | MDX health guide articles | Blog/guide edits | Useful |
| `lib/blog/*` | Blog parser, registry, visuals | Blog rendering or visual registry work | Useful |
| `lib/seo/*` | Programmatic SEO data and helpers | Condition/symptom/location/intent pages | Useful |
| `supabase/migrations/*` | Database schema changes | DB, RLS, status transition, column changes | Critical |
| `types/db.ts` | Supabase generated/custom types | DB type or query typing work | Critical |
| `public/templates/*` | Static certificate PDF templates | PDF template work | Optional |
| `public/images/blog/*` | Generated guide visuals | Health guide visual work | Optional |
