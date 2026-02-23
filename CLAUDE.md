# CLAUDE.md — InstantMed

## Quick Start

```bash
pnpm install
pnpm dev          # Start dev server (localhost:3000)
pnpm build        # Production build (uses 8GB heap)
pnpm typecheck    # Type-check without emitting
pnpm lint         # ESLint (flat config)
pnpm test         # Vitest unit tests (268 tests)
pnpm e2e          # Playwright E2E (42+ tests, needs PLAYWRIGHT=1)
pnpm ci           # Full CI: install → lint → test → build
```

## Architecture

Next.js 15 App Router · React 19 · TypeScript 5.9 · Tailwind v4 · Supabase PostgreSQL

```
app/                  # Routes (App Router)
  (dev)/              # Dev-only routes (email preview, sentry test)
  admin/              # Admin dashboard (ops, analytics, compliance)
  doctor/             # Doctor portal (queue, intakes, scripts)
  patient/            # Patient dashboard (documents, prescriptions)
  api/                # API routes (webhooks, internal endpoints)
  actions/            # Server actions (approve-cert, submit-intake, etc.)
  auth/               # Auth flows (Clerk-managed)
components/
  ui/                 # shadcn/Radix base components
  shared/             # Header, Footer, dialogs
  request/            # Intake flow step components
  marketing/          # Landing page sections
  admin/ doctor/ patient/  # Portal-specific components
lib/
  clinical/           # Clinical validation, controlled substance checks
  data/               # Supabase queries and data operations
  email/              # Resend email templates
  pdf/                # Certificate PDF generation (pdf-lib)
  security/           # Encryption (AES-256-GCM), rate limiting
  stripe/             # Price mapping, checkout sessions
  request/            # Step registry, validation
  state-machine/      # Workflow state management
  ai/                 # Vercel AI SDK integrations
hooks/                # Custom React hooks
e2e/                  # Playwright E2E tests
supabase/             # Migrations (150+), config
types/                # Shared TypeScript types
```

## Key Services

| Service | Provider | Purpose |
|---------|----------|---------|
| Auth | Clerk | User auth, RBAC (doctor/admin/patient) |
| Database | Supabase PostgreSQL | All data, RLS on every table |
| Payments | Stripe (live) | Payment Intents, tiered pricing |
| Email | Resend | Transactional emails |
| Prescriptions | Parchment (external) | eScript generation |
| Rate Limiting | Upstash Redis | Per-IP, per-endpoint limits |
| Analytics | PostHog | Event tracking, feature flags |
| Errors | Sentry | Error tracking, source maps |
| AI | Vercel AI SDK + OpenAI | Clinical intake assistance |
| Hosting | Vercel | Deployment, cron jobs, edge |

## Code Style

- **Components**: `"use client"` at top for client components; server components are default (no directive)
- **Path alias**: `@/` maps to project root — always use it
- **Styling**: Tailwind utility classes + `cn()` from `lib/utils` for conditional classes
- **UI library**: shadcn/ui + Radix primitives. Use shadcn components for all form elements
- **Toggles**: All yes/no inputs use shadcn `Switch`, not checkboxes
- **Consent**: Uses shadcn `Checkbox` component
- **Variants**: Use CVA (class-variance-authority) for component style variants
- **Icons**: lucide-react exclusively
- **Animations**: Framer Motion via `motion` — respect `useReducedMotion()`
- **Avatars**: DiceBear notionists (`https://api.dicebear.com/7.x/notionists/svg?seed=...`)
- **State**: Zustand for intake flow state; React hooks for local state; SWR for data fetching
- **Forms**: react-hook-form + Zod schema validation + `zodResolver`
- **Server actions**: Return `{ success: boolean; error?: string; data?: T }`
- **Auth checks**: `requireRoleOrNull(["doctor", "admin"])` — returns user or null, non-throwing
- **Cache invalidation**: `revalidatePath("/path")` after mutations
- **No `console.log`**: ESLint errors on `no-console`. Use Sentry for logging

## Testing

```bash
# Unit tests (Vitest)
pnpm test                  # Run all tests
pnpm test:watch            # Watch mode
pnpm test:coverage         # With coverage report

# E2E tests (Playwright)
pnpm e2e                   # All browsers
pnpm e2e:chromium          # Chromium only (fastest)
pnpm e2e:headed            # Visible browser
pnpm e2e:debug             # Step-through debugger
pnpm e2e:ui                # Playwright UI mode
```

- Unit tests in `lib/__tests__/**/*.test.ts` — Node environment, not jsdom
- E2E tests in `e2e/**/*.spec.ts` — auto-seeds/tears down test data
- E2E auth bypass: `PLAYWRIGHT=1` env + `__e2e_auth_user_id` cookie (dev/test only)
- Coverage thresholds: 40% statements/branches/functions/lines

## Environment

Required env vars are validated at startup via Zod in `lib/env.ts`. Key groups:

- **Supabase**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
- **Clerk**: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Stripe**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (8 price IDs)
- **Email**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **Security**: `PHI_MASTER_KEY`, `ENCRYPTION_KEY`, `PHI_ENCRYPTION_ENABLED`
- **Redis**: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **AI**: `OPENAI_API_KEY`, `VERCEL_AI_GATEWAY_API_KEY`

## Pricing & Stripe

All prices defined in `lib/constants.ts` under `PRICING` object. Stripe price IDs mapped in `lib/stripe/price-mapping.ts`.

| Service | Price | Stripe Env Var |
|---------|-------|----------------|
| Med cert (1 day) | $19.95 | `STRIPE_PRICE_MEDCERT` |
| Med cert (2 day) | $29.95 | `STRIPE_PRICE_MEDCERT_2DAY` |
| Med cert (3 day) | $39.95 | `STRIPE_PRICE_MEDCERT_3DAY` |
| Prescription | $29.95 | `STRIPE_PRICE_PRESCRIPTION` |
| General consult | $49.95 | `STRIPE_PRICE_CONSULT` |
| ED consult | $49.95 | `STRIPE_PRICE_CONSULT_ED` |
| Hair loss | $49.95 | `STRIPE_PRICE_CONSULT_HAIR_LOSS` |
| Women's health | $59.95 | `STRIPE_PRICE_CONSULT_WOMENS_HEALTH` |
| Weight loss | $79.95 | `STRIPE_PRICE_CONSULT_WEIGHT_LOSS` |

## Intake Flow

Step-based wizard managed by `lib/request/step-registry.ts`. Each service type has a defined step sequence. Steps are React components in `components/request/steps/`.

- **Med cert**: details → certificate → review → checkout → confirmation
- **Prescription**: details → medication → review → checkout → confirmation
- **ED consult**: details → ed-safety → ed-assessment → review → checkout → confirmation
- **Phone number**: Required for prescriptions + consults + specialized pathways. NOT for med certs.
- **Safety consent**: Merged INTO the review step (not a standalone step)

## Gotchas

- **Build needs 8GB heap**: `NODE_OPTIONS='--max-old-space-size=8192'` is set in build/typecheck scripts
- **Controlled substances**: `lib/clinical/intake-validation.ts` blocks Schedule 8 medications — hard block with no override
- **PHI encryption**: AES-256-GCM encrypts patient health data at field level. Controlled by `PHI_ENCRYPTION_*` env vars
- **Rate limiting fallback**: If Redis fails, falls back to in-memory `Map` with 100 actions/hour
- **Certificate IDs**: Use `crypto.randomInt()` not `Math.random()` for security
- **Name validation**: Unicode-aware regex `/^[\p{L}\s'-]+$/u` for international names
- **AHPRA validation**: Simple format check `/^[A-Z]{3}\d{10}$/` — not a real lookup
- **Prescription workflow**: Patient submits → Doctor reviews in portal → Doctor inputs into Parchment (external) → Doctor toggles "Script Sent"
- **No template editor**: Certificate templates are static PDFs in `/public/templates/`
- **GP comparisons**: Kept but subtle — `text-xs text-muted-foreground`, no crossed-out prices
- **Fabricated stats**: Wait times and patient counts are realistic for a small pre-launch clinic (not inflated)
- **Solo doctor**: System supports one doctor — don't advertise team size, don't name fake doctors
- **E2E routes blocked in prod**: Middleware blocks `/api/test/*` and `/(dev)/*` in production/preview
- **Supabase migrations**: 150+ migrations. Use `supabase db push` to apply. May need `supabase migration repair` if remote/local drift
- **Tailwind v4**: Uses new CSS-first config. Custom morning spectrum colors (sky, dawn, ivory)
