# CLAUDE.md — InstantMed

> Australian telehealth platform. Patients request medical certificates, prescriptions, and consultations online. A doctor reviews asynchronously, approves/declines, and delivers documents digitally. Pre-launch.

> **This file is the project brain.** Always load first. Satellite docs below for deep dives.

## Platform Identity

| Field | Value |
|-------|-------|
| Domain | `instantmed.com.au` |
| Entity | InstantMed Pty Ltd |
| ABN | 64 694 559 334 |
| Address | Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010 |
| Support | support@instantmed.com.au · 0450 722 549 |
| Complaints | complaints@instantmed.com.au (14-day SLA, AHPRA escalation) |
| Doctor model | Supports multiple doctors. Do not expose individual doctor names on marketing pages. |
| Hours | 8am–10pm AEST, 7 days. Target 1-2h review, 24h max. No customer-facing SLA guarantee. |
| Eligibility | Australia only · 18+ (parental consent for minors) · Medicare optional for med certs, required for Rx/consults |

## Satellite Documentation

| File | Scope | When to load |
|------|-------|-------------|
| `DESIGN_SYSTEM.md` | Color, typography, spacing, components, elevation, layout, voice, brand | **Every UI session.** Load before any UI/frontend/marketing work. The design system is law. |
| `INTERACTIONS.md` | Motion, animation, easing curves, Framer Motion patterns, UI states, loading sequences | **Load alongside DESIGN_SYSTEM.md** for any UI/frontend work. |
| `ARCHITECTURE.md` | System design, data flows, portals, DB schema, API routes, directory index, tech stack, key pages, AI config | Building features, understanding flows, navigating the codebase |
| `CLINICAL.md` | Clinical boundaries, prescribing rules, AI limits, consent, privacy (APP 1-13) | Any clinical logic, AI prompts, compliance work |
| `SECURITY.md` | PHI encryption, RLS, rate limiting, audit logging, incident classification | Security work, auth, data access patterns |
| `OPERATIONS.md` | Incident response, key rotation, debugging, cron jobs, monitoring, env vars | Ops tasks, debugging, deployments |
| `TESTING.md` | Unit test conventions, E2E patterns, auth bypass, coverage rules, CI pipeline | Writing tests, debugging test failures |

---

## Quick Start

```bash
pnpm install
pnpm dev              # Dev server (localhost:3000)
pnpm build            # Production build (8GB heap)
pnpm typecheck        # Type-check without emitting
pnpm lint             # ESLint (flat config)
pnpm test             # Vitest unit tests
pnpm e2e              # Playwright E2E (needs PLAYWRIGHT=1)
pnpm ci               # Full CI: install → lint → test → build
```

- Unit tests: `lib/__tests__/**/*.test.ts` — Node environment, not jsdom. Coverage: 80% statements, 70% branches, 80% functions, 80% lines (scoped to `lib/clinical/`, `lib/state-machine/`, `lib/security/`).
- E2E tests: `e2e/**/*.spec.ts` — auto-seeds/tears down test data. Auth bypass: `PLAYWRIGHT=1` + `__e2e_auth_user_id` cookie.

## Tech Stack

Next.js 16 App Router · React 19 · TypeScript 5.9 (strict) · Tailwind v4 · Supabase PostgreSQL · Node 20 · Vercel Pro · Clerk v7 auth · Stripe v22 payments · Resend email · PostHog analytics · Sentry errors · Upstash Redis rate limiting · Anthropic Claude AI · Framer Motion v12

## Code Conventions

### Components & Styling
- `"use client"` at top for client components; server components default (no directive)
- `@/` path alias for all imports — always use it
- Tailwind utility classes + `cn()` from `lib/utils` for conditional classes
- shadcn/ui + Radix primitives for all form elements
- CVA (class-variance-authority) for component style variants
- lucide-react exclusively for icons
- Framer Motion via `motion` — always respect `useReducedMotion()`
- DiceBear notionists for avatars (`https://api.dicebear.com/7.x/notionists/svg?seed=...`)

### Form Inputs
- **Yes/no toggles**: shadcn `Switch` (NOT checkboxes)
- **Consent acknowledgments**: shadcn `Checkbox`
- **Form validation**: react-hook-form + Zod schema + `zodResolver`

### State & Data
- Zustand for intake flow state (persisted to localStorage, 24h expiry)
- React hooks for local component state
- `revalidatePath("/path")` after server mutations

### Server Actions
- Return shape: `{ success: boolean; error?: string; data?: T }`
- Auth: `requireRoleOrNull(["doctor", "admin"])` — returns user or null, non-throwing
- No `console.log` — ESLint errors on `no-console`. Use Sentry for logging

### Component Decision Tree
- **Form elements**: shadcn/ui from `@/components/ui/`
- **Simple display tables**: shadcn `Table` from `@/components/ui/table`
- **Loading states**: `SkeletonCard`, `SkeletonForm`, `SkeletonList`, `SkeletonDashboard` from `@/components/ui/skeleton`
- **Toasts**: `toast` from `sonner` (success, error, promise variants)
- **Error handling**: `ErrorRecovery` from `@/components/ui/error-recovery`; flow-specific: `StepErrorBoundary` (`components/request/`), `DashboardErrorBoundary` (`components/doctor/`)
- **Card surfaces**: Solid depth pattern — `bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]`. See DESIGN_SYSTEM.md §5

## Pricing

All prices in `lib/constants.ts` (`PRICING`). Stripe IDs mapped in `lib/stripe/price-mapping.ts`.

| Service | Price | Stripe Env Var |
|---------|-------|----------------|
| Med cert (1 day) | $19.95 | `STRIPE_PRICE_MEDCERT` |
| Med cert (2 day) | $29.95 | `STRIPE_PRICE_MEDCERT_2DAY` |
| Med cert (3 day) | $39.95 | `STRIPE_PRICE_MEDCERT_3DAY` |
| Repeat prescription | $29.95 | `STRIPE_PRICE_REPEAT_SCRIPT` |
| New prescription | $49.95 | Uses `STRIPE_PRICE_CONSULT` (routed via consult flow) |
| General consult | $49.95 | `STRIPE_PRICE_CONSULT` |
| ED consult | $39.95 | `STRIPE_PRICE_CONSULT_ED` |
| Hair loss | $39.95 | `STRIPE_PRICE_CONSULT_HAIR_LOSS` |
| Women's health | $59.95 | `STRIPE_PRICE_CONSULT_WOMENS_HEALTH` |
| Weight loss | $79.95 | `STRIPE_PRICE_CONSULT_WEIGHT_LOSS` |
| Priority fee (Express Review) | $9.95 | `STRIPE_PRICE_PRIORITY_FEE` |
| Repeat Rx subscription | $19.95/mo | `STRIPE_PRICE_REPEAT_RX_MONTHLY` |
| Referral letter | $29.95 | — (display only, not yet Stripe-mapped) |
| Pathology request | $29.95 | — (display only, not yet Stripe-mapped) |

## Key Workflows

**Intake flow:** Step-based wizard at `/request?service=<type>`. Managed by `lib/request/step-registry.ts`. Steps are React components in `components/request/steps/`. See ARCHITECTURE.md for full step sequences.

**Prescription workflow:** Patient submits → Doctor reviews in portal → Doctor inputs into Parchment (external eScript) → Doctor toggles "Script Sent" → Patient notified via email.

**Repeat Rx subscription:** $19.95/mo via Stripe subscription. "Subscribe & Save" toggle on checkout (default ON for repeat scripts). Webhook handlers: `invoice.payment_succeeded` (reset credits), `customer.subscription.deleted` (mark cancelled). Subscription record created in `checkout.session.completed`. Patient dashboard shows subscription card with Stripe Customer Portal link.

**Priority fee (Express Review):** $9.95 add-on toggle on checkout. Adds second line item to Stripe session. Sets `is_priority` on intake → doctor queue sorts priority-first.

**Certificate pipeline:** Doctor approves → PDF generated → Uploaded to private Supabase Storage → Patient emailed dashboard link (not attachment). See ARCHITECTURE.md for 9-step generation flow.

**Phone number:** Required for prescriptions + consults + specialized pathways. NOT for med certs.

**Safety consent:** Merged INTO the review step (not a standalone step).

**Guest checkout:** Creates profile without `clerk_user_id` → Stripe checkout → redirects to `/auth/complete-account` for Clerk account linking.

**Referrals:** $5 credit to both parties. Patient shares `?ref=` link. UI: `components/patient/referral-card.tsx`.

---

## Gotchas

- **Build needs 8GB heap**: `NODE_OPTIONS='--max-old-space-size=8192'` set in build/typecheck scripts
- **Controlled substances**: `isControlledSubstance(name)` in `lib/clinical/intake-validation.ts` detects Schedule 8 via regex patterns; UI passes the flag to `validateIntake()` which blocks progression. Both form and chat paths enforce this — no override
- **PHI encryption**: AES-256-GCM field-level. Controlled by `PHI_ENCRYPTION_*` env vars. See SECURITY.md
- **Rate limiting fallback**: Two systems — Redis (general API): fails open when unavailable. Doctor actions (DB-backed): falls back to in-memory `Map` with half limits
- **Certificate IDs**: `crypto.randomInt()` not `Math.random()` — security requirement
- **Name validation**: Unicode-aware `/^[\p{L}\s'-]+$/u` for international names
- **AHPRA validation**: Format check `/^[A-Z]{3}\d{10}$/` only — not a real AHPRA lookup
- **No template editor**: Certificates use static PDF templates in `/public/templates/` with `pdf-lib` text overlay — not a WYSIWYG editor
- **GP comparisons**: Kept but subtle — `text-xs text-muted-foreground`, no crossed-out prices
- **Curated testimonials**: 47 realistic testimonials with real Australian locations/occupations — not inflated, not user-submitted
- **Doctor model**: System supports multiple doctors but currently operates with one. Don't advertise team size beyond what's real
- **Dev routes blocked in prod**: Middleware blocks `/api/test/*`, `/email-preview*`, `/sentry-test*` in production/preview (exception: `PLAYWRIGHT=1`). Note: `(dev)` route group files (e.g. `app/(dev)/cert-preview`) resolve to `/cert-preview` and are **not** blocked by middleware
- **Supabase migrations**: Squashed to 1 baseline (was 191). Use `supabase db push`. May need `supabase migration repair` for drift
- **Tailwind v4**: CSS-first config. Custom morning spectrum colors (sky, dawn, ivory)
- **Route group conflicts**: Never place `page.tsx` inside a route group `(name)/` if the parent dir also has `page.tsx` — both resolve to the same URL and Vercel's build tracer will fail with ENOENT. CI runs `scripts/check-route-conflicts.sh` to catch this

---

## Operator Persona

Technical co-founder, 15+ years in health/medtech startups (AU + international). YC methodology — build fast, talk to users, iterate. Revenue and traction over perfection. Call out hills not worth dying on.

**Regulatory:** TGA/SaMD, AHPRA obligations, Medicare/telehealth rules, medico-legal risk. Know the lines; use them as advantage. No moralizing, no unsolicited caveats.

**Code standards:** TypeScript always. Zod on all API inputs. Flag PHI/RLS issues unprompted. Clean > clever. Errors to Sentry, analytics to PostHog. E2E tests non-optional for auth, payment, document flows.

**Communication:** Lead with the answer. Short sentences. Numbers over qualifiers. Bold key decisions. Flag bad ideas directly — don't soften it.

---

## Doc Maintenance Policy

**Rule: update the relevant .md file in the same commit as any platform change.** If a change isn't in the docs, the next dev/AI will make the same discovery from scratch.

| Change type | File to update | What to change |
|-------------|---------------|---------------|
| New API route | `ARCHITECTURE.md` | Add to API Routes table |
| New DB table or column | `ARCHITECTURE.md` | Core Tables + PHI inventory if applicable |
| New cron job | `OPERATIONS.md` | Cron Jobs Reference table |
| New or changed env var | `OPERATIONS.md` + `SECURITY.md` | Env vars list + Secret Management |
| New kill switch | `SECURITY.md` | Kill Switches table + Emergency Runbook |
| New RLS policy | `SECURITY.md` | Table Policies section |
| New auth pattern | `SECURITY.md` | Auth Patterns table |
| New clinical rule | `CLINICAL.md` | Relevant section |
| Consent or privacy change | `CLINICAL.md` | Consent Requirements or APP table |
| New service type or pricing | `CLAUDE.md` | Pricing table + Key Workflows |
| New intake step | `ARCHITECTURE.md` | Intake System step table |
| New E2E helper / test seam | `TESTING.md` | E2E Seams or relevant section |
| New component pattern | `ARCHITECTURE.md` | Component Patterns section |
| Supabase migration applied | `CLAUDE.md` | Increment migration count |
| AI model or temperature change | `ARCHITECTURE.md` | AI Configuration table |
| Refund or billing logic change | `ARCHITECTURE.md` | Decline & Refund Flow |
| New third-party processor | `CLINICAL.md` | Third-Party Data Processors table |
| Security incident or breach | `SECURITY.md` + `OPERATIONS.md` | Incident classification + response runbook |

**Shortcut:** Not sure which file? Ask: "Which satellite doc covers this domain?" The answer is in the Satellite Documentation table at the top of this file.

---

## Discovery Protocol

Before any non-trivial task, run a discovery phase. Read relevant code/docs first — recommendations must be grounded in what exists, not assumptions.

**Task tiers:**
- **Tier 1 (Trivial):** Single-file, obvious fix, explicit instruction. Skip discovery. → Sonnet 4.6
- **Tier 2 (Clear):** Scoped with some choices. Ask ≤3 targeted questions, brief plan, execute. → Sonnet 4.6
- **Tier 3 (Ambiguous):** Multi-faceted, vague, touches UX/architecture/strategy. Full discovery — structured plan, wait for approval. → Opus 4.6

If in doubt, tier up. "Make it better" / "fix this" without a clear definition of done = Tier 3 automatically.

**Lead with your recommendation** before asking questions. Every question must include your preferred answer first, marked "(Recommended)".

**Pushback levels:** Soft flag (product/UX/arch preference — state once, defer if overruled) · Hard stop (security/PHI/legal — don't proceed until resolved).

**Tier 3 plan format:** Goal · Approach · Decisions · Out of scope · Risks. Wait for approval before executing.

**Modes:** Advisor (strategic questions → recommendation + rationale, no code unless asked) · Executor (build/fix → read first, let the diff speak).

**Anti-patterns:** Don't paraphrase the task as a question. Don't present equally valid options when you prefer one. Don't start coding while planning to ask. Don't hedge without giving an actual recommendation.
