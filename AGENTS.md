# AGENTS.md — InstantMed

> Australian telehealth platform for specialised one-off services: medical certificates, repeat prescriptions, hair loss, ED, and general consult fallback. Women's health and weight loss are reserved future subtypes and are gated off until launch readiness is explicitly changed. Patients start with a secure clinical form. A doctor reviews, approves/declines, contacts the patient if clinically needed, and delivers documents or eScript tokens digitally.

> **This file is the project brain.** Always load first. Satellite docs below for deep dives.

## Platform Identity

| Field | Value |
|-------|-------|
| Domain | `instantmed.com.au` |
| Entity | InstantMed Pty Ltd |
| ABN | 64 694 559 334 |
| Address | Level 1/457-459 Elizabeth Street, Surry Hills NSW 2010 |
| Support | support@instantmed.com.au · 0450 722 549 |
| Complaints | complaints@instantmed.com.au · 24h ack · 14-day clinical SLA · canonical page at `/complaints` · linked from footer + Terms §13. Escalation: AHPRA + 8 state HCCC bodies + OAIC (privacy). |
| Doctor model | Supports multiple AHPRA-registered doctors. Per-doctor capability flags on `profiles` (`can_review_med_certs`, `can_review_repeat_rx`, `can_review_consults`, `can_review_ed`, `can_review_hair_loss`, `can_prescribe_s4`, `can_prescribe_s8`) scope future hires before they are verified for a service line; owner-operator is unrestricted. Public surfaces must not disclose doctor count or individual doctor names. Use "AHPRA-registered doctors" for service copy, or "AHPRA-registered Medical Director" only where a governance role is necessary. Never advertise FRACGP, peer review across a cohort, or team training unless formally verified. |
| Staff roles | `admin` (owner-operator only, full clinical + ops + config), `doctor` (clinical only), `support` (non-clinical ops: payment recovery, webhook retries, identity chase-ups, masked PHI). One admin. Multiple doctors and support staff allowed. Capabilities helper at `lib/auth/staff-capabilities.ts`. |
| Hours | Requests submit 24/7 for every pathway. Rx/consult review timing is 8am–10pm AEST, 7 days. Target 1-2h review, 24h max. No customer-facing SLA guarantee. Never hard-block checkout by time of day. |
| Eligibility | Australia only · 18+ (parental consent for minors) · Medicare optional for med certs, required for Rx/consults |

## Satellite Documentation

| File | Scope | When to load |
|------|-------|-------------|
| `docs/AI_ONBOARDING.md` | **Start here.** 5-min orientation for AI assistants on UI: top 10 rules, canonical files, common gotchas, ship checklist | **First** UI session in any new context. |
| `docs/BUSINESS_PLAN.md` | Business strategy, product priority, current one-off operating model, current no-subscription/no-pharmacy decisions | Strategy, roadmap, positioning, pricing, growth work |
| `docs/REVENUE_MODEL.md` | $1M/year one-off revenue model, service mix, unit economics, hiring triggers | Pricing, growth plans, dashboards, business-model changes |
| `docs/ADVERTISING_COMPLIANCE.md` | Google Ads, LegitScript, AHPRA/Medical Board, TGA, paid landing page, and audience rules | Ads, landing pages, acquisition copy, metadata, schema |
| `docs/SEO_CONTENT_POLICY.md` | Organic educational content rules, prescription-page guardrails, guide-only article rules, CTA and URL rules | SEO pages, medicine pages, condition/symptom content, health guides |
| `docs/BRAND.md` | Brand thesis, patient archetype, voice/personality, tagline system, signature devices (live wait counter, doctor signature, "what we won't do" page, name-first emails, "while you wait" specificity), brand stretch rules. Pinned at v1.0.0. | **Every brand or marketing session.** Load before any tagline, headline, copy sweep, hero, or brand-creative work. Umbrella that points to VOICE / DESIGN / PHOTOGRAPHY_BRIEF for deeper layers. |
| `docs/VOICE.md` | 4-layer brand-string system, dos/don'ts, banned phrases, voice-by-surface rendering, healthcare compliance copy. Code source of truth in `lib/marketing/voice.ts`. CI-enforced. | Any copy work, headline, microcopy, ad creative, or voice review. Pair with BRAND.md. |
| `docs/PHOTOGRAPHY_BRIEF.md` | 8-shot launch list, acceptance criteria, GPT prompt scaffold, cost benchmarks, no-stock-photo rules. | Generating, commissioning, or replacing imagery on marketing pages. |
| `PRODUCT.md` | Design context: user archetypes, brand personality, aesthetic direction, design principles. The "why" behind `DESIGN.md`. CI drift-checked. | Brand/design strategy, voice/aesthetic refresh, before large UI direction shifts. |
| `DESIGN.md` | Color, typography (Source Sans 3 body + Plus Jakarta Sans display), spacing, components, elevation, layout, motion, animation. Pinned at v1.0.0. | **Every UI session.** Load before any UI/frontend/marketing work. The design system is law. |
| `docs/DESIGN_SYSTEM_CHANGELOG.md` | Breaking + notable design-system changes with version history | Bumping `DESIGN_SYSTEM_VERSION` or auditing drift |
| `docs/ARCHITECTURE.md` | System design, data flows, portals, DB schema, API routes, directory index, tech stack, key pages, AI config | Building features, understanding flows, navigating the codebase |
| `docs/CLINICAL.md` | Clinical boundaries, prescribing rules, AI limits, consent, privacy (APP 1-13) | Any clinical logic, AI prompts, compliance work |
| `docs/SECURITY.md` | PHI encryption, RLS, rate limiting, audit logging, incident classification | Security work, auth, data access patterns |
| `docs/OPERATIONS.md` | Incident response, key rotation, debugging, cron jobs, monitoring, env vars | Ops tasks, debugging, deployments |
| `docs/TESTING.md` | Unit test conventions, E2E patterns, auth bypass, coverage rules, CI pipeline | Writing tests, debugging test failures |
| `docs/PRIMITIVES.md` | Marketing primitives registry: social proof, trust badges, stats, pricing, FAQ data, wait times | Adding/changing marketing page content, stats, badges, or FAQ |

---

## Quick Start

```bash
pnpm install
pnpm dev              # Dev server (localhost:3000)
pnpm build            # Production build (8GB heap)
pnpm typecheck        # Type-check without emitting
pnpm lint             # ESLint (flat config)
pnpm test             # Vitest unit tests
pnpm content:audit    # Health guide/content QA backlog
pnpm e2e              # Playwright E2E (needs PLAYWRIGHT=1)
pnpm ci               # Full CI: install → lint → test → build
```

- Unit tests: `lib/__tests__/**/*.test.ts` — Node environment, not jsdom. Coverage: 80% statements, 70% branches, 80% functions, 80% lines (scoped to `lib/clinical/` and `lib/security/`; `lib/state-machine/` was removed 2026-04-08).
- E2E tests: `e2e/**/*.spec.ts` — auto-seeds/tears down test data. Auth bypass: `PLAYWRIGHT=1` + `__e2e_auth_user_id` cookie.

## Tech Stack

Next.js 15.5 App Router (webpack) · React 18.3 · TypeScript 5.9 (strict) · Tailwind v4 · Supabase PostgreSQL + Auth · Node 24 LTS · Vercel Pro · Stripe v22 payments · Resend email · PostHog analytics · Sentry errors · Upstash Redis rate limiting · AI SDK (Anthropic + OpenAI) · Framer Motion v11

---

## ⛔ Stack Pin Policy — DO NOT UPGRADE WITHOUT EXPLICIT USER APPROVAL

> **Read this before touching `package.json`, `pnpm-lock.yaml`, or running `pnpm add` / `pnpm update` on any framework dep.**

The following versions are **hard-pinned** in `package.json` (exact versions, no `^`) and `pnpm.overrides`. CI enforces them via `scripts/check-stack-pins.sh` — the build will fail if any drift. Active runtime drift is checked separately by `scripts/check-node-runtime.sh`; local release checks and CI must run on Node 24 + pnpm 10.23.0, not Node 25.

| Package | Pinned | Why this version |
|---|---|---|
| `next` | **15.5.15** | Next 16 forced Turbopack, renamed `middleware.ts` → `proxy.ts`, changed `revalidateTag` signature, and shipped CVE-2025-66478. Caused recurring dev-server crashes. Patch bump from 15.5.14 for GHSA-q4gf-8mx6-v5v3 (Server Components DoS). |
| `@next/bundle-analyzer` / `@next/eslint-plugin-next` | **15.5.15** | Next-adjacent tooling must stay on the same patch as `next`; CI enforces this to avoid silent analyzer/lint drift. |
| `react` / `react-dom` | **18.3.1** | React 19 nullable `RefObject<T \| null>` typing breaks third-party libs (Framer Motion 12). Wait until Next 17 makes React 19 the default. |
| `framer-motion` | **11.18.2** | v12 requires React 19. |
| `tailwindcss` / `@tailwindcss/postcss` | **4.2.2** | CSS-first config is working; don't risk a re-migration. |
| Bundler | **Webpack** (NOT Turbopack) | Turbopack still has gaps in our codebase (module factory race conditions, framer-motion chunk bugs). |
| Node | **24 LTS** | Active LTS on Vercel with support through April 2028. Runtime-only upgrade from Node 20 after Node 20 reached EOL; do not bundle this with Next/React/Turbopack changes. |

### Rules for Codex / any AI assistant working on this repo

1. **NEVER** suggest or apply `pnpm add next@latest` (or react/tailwind/framer-motion). When you see an outdated version, that is **intentional**.
2. **NEVER** rename `middleware.ts` → `proxy.ts`. Next 15 uses `middleware.ts`. The rename is a Next 16-only change.
3. **NEVER** add a second arg to `revalidateTag()` (e.g. `revalidateTag("foo", "max")`). That's a Next 16-only API.
4. **NEVER** type refs as `RefObject<T | null>`. Use `RefObject<T>` — React 18's `useRef<T>(null)` already returns the right type.
5. **NEVER** add `--turbopack` or `--turbo` flags to dev/build scripts.
6. **NEVER** edit `scripts/check-stack-pins.sh` to relax pins unless the user explicitly tells you "we are upgrading X to Y".
7. **NEVER** bypass `--frozen-lockfile` or use `--no-frozen-lockfile` in CI.

### Process for an intentional upgrade (when the user approves one)

1. **One major upgrade per PR.** Never bundle Next + React + framer-motion in a single PR. Runtime, framework, and bundler upgrades are separate workstreams; a Node bump is not permission to bump Next, React, Tailwind, Framer Motion, or switch bundlers. (This is exactly how we got into the mess that took a week to undo.)
2. **6-month soak rule.** A new major version doesn't enter the stack until it's been GA for 6+ months **and** the framework above it (e.g. Next) ships it as the default.
3. Update **all of these in lockstep**:
   - `package.json` `dependencies` / `devDependencies`
   - `package.json` `pnpm.overrides`
   - `scripts/check-stack-pins.sh` `EXPECTED_*` constants
   - This Stack Pin Policy table
   - Add a Gotchas entry if the upgrade has subtle behavioral changes
4. **Verify the full intake flow E2E** before merging — typecheck/build alone is not enough.
5. Reference the prior context: `docs/plans/2026-04-07-stable-stack-downgrade.md` and `~/.Codex/projects/-Users-rey-Desktop-instantmed/memory/decisions.md`.

If you are an AI and the user asks you to upgrade something on this list, **stop and confirm** before touching the lockfile. The user has been bitten by this and wants explicit acknowledgment.

---

## Code Conventions

### Components & Styling
- `"use client"` at top for client components; server components default (no directive)
- `@/` path alias for all imports — always use it
- Tailwind utility classes + `cn()` from `lib/utils` for conditional classes
- shadcn/ui + Radix primitives for all form elements
- CVA (class-variance-authority) for component style variants
- lucide-react exclusively for icons
- Framer Motion via `motion` — always respect `useReducedMotion()`. Default spring (stiffness 100, damping 10) produces mechanical feel — run `/emil-design-eng` before shipping any animated component for a `| Before | After | Why |` spring-physics audit
- Public marketing/auth surfaces use abstract clinical or account marks, not fake people. DiceBear is allowed only for patient-selected account avatars or internal placeholder contexts.

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
- Auth: `requireRoleOrNull(["doctor", "admin"])` — returns user or null, non-throwing. Add `"support"` to the list for non-clinical ops actions.
- Cache busting: call `revalidateStaff({ intakeId?, patientId?, ops?, identity?, settings?, emails?, content?, scripts?, paths? })` from `lib/dashboard/revalidate-staff.ts` (and `revalidatePatient({ patientId?, intakeId?, settings?, documents?, followupId?, account? })` for patient-side mirrors) instead of scattering hardcoded `revalidatePath("/doctor/...")` strings. As of Phase 1.3 (2026-05-11), 132 of 139 hardcoded call sites in `app/actions/` use the central helpers; the remaining 7 are intentional (`revalidatePath("/")` after account closure, `revalidatePath("/request")` after service-catalog edits — public marketing surfaces, not staff).
- No `console.log` — ESLint errors on `no-console`. Use Sentry for logging

### Component Decision Tree
- **Form elements**: shadcn/ui from `@/components/ui/`
- **Simple display tables**: shadcn `Table` from `@/components/ui/table`
- **Loading states**: `SkeletonCard`, `SkeletonForm`, `SkeletonList`, `SkeletonDashboard` from `@/components/ui/skeleton`
- **Toasts**: `toast` from `sonner` (success, error, promise variants)
- **Error handling**: `ErrorRecovery` from `@/components/ui/error-recovery`; flow-specific: `StepErrorBoundary` (`components/request/`), `DashboardErrorBoundary` (`components/doctor/`)
- **Card surfaces**: Solid depth pattern — `bg-white dark:bg-card border border-border/50 shadow-md shadow-primary/[0.06]`. See DESIGN.md §5

## Design Tooling — Impeccable + Emil

Two skill packs are installed globally (`~/.Codex/skills/`) and supersede any generic design skills. Apply to all UI/UX/styling/animation/component-review work.

### Bootstrap requirement

**`/impeccable teach` must be run once per cold project context before any artifact-level Impeccable command.** It loads the full design-system snapshot so subsequent commands have correct token/component references. Skip it and commands fall back to generic defaults — wrong for this codebase.

### Do NOT reinstall overlapping packs

Do not install `frontend-design`, `design-system`, or similar skills. Impeccable supersedes them. Overlapping packs bloat the skill registry on every turn and cause redundant invocations.

### Impeccable — 17 commands

| Command | Lens — when to use |
|---------|-------------------|
| `/impeccable` | Full-page audit: runs shape → critique → audit → layout → typeset → colorize → polish in sequence. Comprehensive pass on a new or heavily changed page. |
| `/shape` | Plan UX and information architecture **before writing code**. Layout decisions, hierarchy, interaction model. Always run first on a new feature or page. |
| `/critique` | Evaluate a completed design from a UX perspective: usability, clarity, conversion friction, trust signals. |
| `/audit` | Technical quality checks: WCAG AA, semantic HTML, ARIA, color contrast, keyboard nav. Run before shipping any patient-facing surface. |
| `/typeset` | Fix font choices, hierarchy, size scale, line-height, letter-spacing, reading rhythm. Use when type feels off or dense. |
| `/colorize` | Add or correct strategic color. Use when a surface is too monochromatic or drifts from the Morning Canvas palette. |
| `/animate` | Add or improve motion: entrances, transitions, micro-interactions. Pairs with Framer Motion v11 + `useReducedMotion()`. |
| `/delight` | Add personality moments: micro-copy, unexpected positive feedback. Use sparingly — post-UX-solidification only. |
| `/bolder` | Amplify timid designs: increase contrast, weight, scale. Use when a design is too safe or forgettable. |
| `/quieter` | Tone down visually aggressive or overstimulating UI. Important for a health/trust context — anxious pages hurt conversion. |
| `/overdrive` | Push interfaces past conventional limits for high-impact hero or marketing moments. Top-of-funnel only. |
| `/layout` | Fix spacing, alignment, visual rhythm, grid issues. Use when layout feels loose, unbalanced, or inconsistent. |
| `/distill` | Strip to essence — remove clutter, redundancy, decoration. Use when a page has accumulated visual debt. |
| `/clarify` | Improve UX copy, error messages, microcopy, empty states, CTAs. Use when wording creates friction or sounds clinical. |
| `/adapt` | Adapt layouts across breakpoints. Use when a design breaks or degrades on mobile/tablet. |
| `/polish` | Final quality pass before shipping: alignment, pixel precision, dark-mode parity, focus rings, icon sizing. Run last. |
| `/optimize` | Diagnose rendering performance: layout thrashing, paint cost, animation frame drops. Use when a component feels slow. |

### Emil — motion / spring / component-feel

`/emil-design-eng` applies Emil Kowalski's philosophy on animation physics, spring curves, and interaction depth. Use it when:
- Motion feels mechanical or linear (wrong spring stiffness/damping)
- Components lack physical weight or responsiveness on hover/press
- You want a `| Before | After | Why |` audit of animation decisions

Emil is complementary to `/animate` — `/animate` adds motion; Emil makes existing motion feel physically correct.

### Decision rule

Any message touching UI / UX / styling / animation / component review: scan available-skills, pick the matching Impeccable command or Emil, and invoke it. Do not paraphrase around the skill.

---

## Pricing

All prices in `lib/constants.ts` (`PRICING`). Stripe IDs mapped in `lib/stripe/price-mapping.ts`.

**Stripe payment-state invariant:** Webhook and fallback payment confirmation must never mark an intake paid from a stale Checkout Session. Paid transitions are guarded by the current stored `intakes.payment_id`, retryable intake status, and unpaid/failed `payment_status`. Expiry and async failure handlers already use the same current-session guard. Partial refunds must use `payment_status = partially_refunded`, not `refunded`.

| Service | Price | Stripe Env Var |
|---------|-------|----------------|
| Med cert (1 day) | $19.95 | `STRIPE_PRICE_MEDCERT` |
| Med cert (2 day) | $29.95 | `STRIPE_PRICE_MEDCERT_2DAY` |
| Med cert (3 day) | $39.95 | `STRIPE_PRICE_MEDCERT_3DAY` |
| Repeat prescription | $29.95 | `STRIPE_PRICE_REPEAT_SCRIPT` |
| New prescription | $49.95 | Uses `STRIPE_PRICE_CONSULT` (routed via consult flow) |
| General consult | $49.95 | `STRIPE_PRICE_CONSULT` |
| ED consult | $49.95 | `STRIPE_PRICE_CONSULT_ED` |
| Hair loss | $49.95 | `STRIPE_PRICE_CONSULT_HAIR_LOSS` |
| Women's health (gated future subtype) | $59.95 reserved | `STRIPE_PRICE_CONSULT_WOMENS_HEALTH` |
| Weight loss (gated future subtype) | $89.95 reserved | `STRIPE_PRICE_CONSULT_WEIGHT_LOSS` |
| Priority fee (Express Review) | $9.95 | `STRIPE_PRICE_PRIORITY_FEE` |
| Referral letter | $29.95 | — (display only, not yet Stripe-mapped) |
| Pathology request | $29.95 | — (display only, not yet Stripe-mapped) |

## Key Workflows

**Intake flow:** Step-based wizard at `/request?service=<type>`. Managed by `lib/request/step-registry.ts`. Steps are React components in `components/request/steps/`. See docs/ARCHITECTURE.md for full step sequences.

**Staff dashboard:** Admin, doctor, and support work are intentionally unified into one staff cockpit. `/dashboard` is the canonical URL for the staff dashboard (Phase 1 of remaster, 2026-05-11) and forwards by role until Phase 2 lands the consolidated queue surface here. Both `/admin/*` and `/doctor/*` route trees now render through the same `OperatorShell` (Phase 1.2) with role-aware nav via `getStaffNav(profile)` — admins get the full operator nav, doctors get the clinical subset, support staff get the ops-only subset. The retired `DashboardSidebar variant="doctor"` was removed; `DoctorShell` (panel provider + intake notification listener + bottom-tab `DoctorMobileNav`) still wraps doctor pages inside the shared `OperatorShell` so clinical-specific UX (mobile bottom tabs, real-time notifications, the keyboard shortcut hint) is preserved. Staff pages should use `components/operator/*`, role-aware navigation from `lib/dashboard/staff-navigation.ts` (`getStaffNav(profile)`), compact case summaries from `lib/doctor/case-summary.ts`, and the central `revalidateStaff()` helper from `lib/dashboard/revalidate-staff.ts` for cache busting. Use the new `STAFF_*_HREF` constants from `lib/dashboard/routes.ts` for new code; legacy `ADMIN_*_HREF` / `DOCTOR_*_HREF` constants are aliases kept until Phase 2 consolidates the file tree. Keep dashboards bounded and scannable: primary desktop staff pages should avoid whole-page scrolling by using split panes, short action lists, tabs, and detail drawers/panels. If a staff page has more controls than fit in one viewport, keep the page itself fixed-height and put secondary detail inside internal panes.

**Health guide workflow:** Public article guides live in `content/blog/*.mdx` and render through `components/blog/article-template.tsx`. Guide bodies are education-only: no mid-article consultation CTA, no service CTA card, no related-service acquisition panel, and no location SEO cross-link block. Use `pnpm content:audit` before shipping guide/content changes. Every rewritten guide needs at least two GPT-generated local visuals, ideally three for high-intent or clinical topics. Article visuals are registered in `lib/blog/visuals.ts`, rendered by `components/blog/article-visuals.tsx`, and generated as local WebP assets under `public/images/blog/<slug>/` via `pnpm blog:generate-visual-images -- --renderer=gpt-image-2`. The generation script adds a deterministic `InstantMed` wordmark after image generation; do not ask the image model to draw the brand mark itself. Controlled short copy may appear inside the GPT-generated visual only when it comes from the registry; the same labels and clinical distinctions must also render in React/HTML for accessibility, review, and indexing. **Visual quality bar:** every generated article image must be an educational asset, not decoration. It must teach through labelled panels, anatomical callouts, comparison matrices, warning hierarchies, step pathways, body maps, lab explainers, or other concrete instructional structure. Reject and regenerate any output that is mostly a blank phone, blank document, blank certificate, medicine box, inhaler still life, balance scale, shield/pill card, abstract icon row, beige tabletop, generic desk flat lay, decorative hero image, or any low-information metaphor that could be reused on another article. Baseline rewritten guides should answer the practical question in the first screen, have at least six H2 sections unless genuinely narrow, target 1,200+ words, include a visible sources/references section, and show red flags or care boundaries when clinically relevant.

**Specialty services (ED, Hair Loss):** Dedicated landing pages at `/erectile-dysfunction` and `/hair-loss` are the top-level marketing surfaces for these pathways (alongside `/medical-certificate` and `/prescriptions`). Both CTAs route into `/request?service=consult&subtype=ed` and `/request?service=consult&subtype=hair_loss` respectively. They share the `consult` service type but use subtype-specific step sequences in `CONSULT_SUBTYPE_STEPS` (see `lib/request/step-registry.ts`). ED and hair-loss collect medical history inside their subtype health screens, so they do not add the generic `medical-history` step again. Current positioning is **form-first doctor review**: patient completes the structured form, the doctor reviews, and the doctor calls/messages only if clinically needed. Do not hard-promise "no call needed" for prescribing pathways. Service hub (`/request`) shows 5 active cards (med-cert, repeat prescriptions, ED, hair loss, general consult) + 2 coming-soon (women's health, weight management); the services dropdown and footer match. `/general-consult` was retired in commit `542ae8119` as an SEO cannibalization fix and now 301s to `/consult`, which remains a fallback pathway rather than the brand centre. **ED intake uses 4-step flow:** ed-goals (goal + duration) → ed-assessment (visual IIEF-5, validated 5-question instrument producing `iiefTotal` 5–25) → ed-health (6 collapsible accordion sections consolidating safety screening + medical history — nitrate hard block, cardiac soft blocks with GP clearance) → ed-preferences (lifestyle framing: daily/as-needed/doctor-decides, **no Schedule 4 drug names** per TGA). Common tail adds height/weight/BMI for ED subtype. IIEF-5 score persisted for followup delta tracking. **Follow-up tracker:** Follow-up infrastructure exists, but subscriptions/monthly prescribing and staff-heavy follow-up are not part of the current one-off business model unless `docs/BUSINESS_PLAN.md` is updated.

**Prescription workflow:** Patient submits → Doctor reviews in portal → Doctor approves for prescribing → Parchment iframe opens in slide-over panel → Doctor writes eScript inside InstantMed → Parchment webhook (`prescription.created`) auto-marks script sent with SCID → Patient notified via email. Approval into `awaiting_script` and Parchment launch are gated on complete prescribing identity (DOB, sex, Medicare details, phone, structured address) using the same patient snapshot rules that power `/admin/ops/prescribing-identity`; incomplete cases must be fixed before prescribing. Feature flag: `parchment_embedded_prescribing` (DB toggle). Fallback: "Mark Sent Manually" button for external prescribing. Patient medication search is PBS reference lookup only: do not present it as MIMS, prescribing advice, or Parchment preselection; the doctor still selects the medicine inside Parchment/MIMS. Parchment confirmed custom-domain iframe whitelist for `https://instantmed.com.au` and `https://www.instantmed.com.au` on 2026-05-01; `lib/parchment/embed-policy.ts` defaults must continue to allow those hosts plus local/Vercel preview hosts. Key files: `lib/parchment/client.ts`, `lib/parchment/sync-patient.ts`, `lib/parchment/embed-policy.ts`, `components/doctor/parchment-prescribe-panel.tsx`, `app/api/webhooks/parchment/route.ts`, `app/actions/parchment.ts`.

**Operational controls:** Admin control surface lives at `/admin/features`; DB-backed mutation path is `app/actions/admin-config.ts` → `lib/feature-flags.ts`. `/admin/features` is a bounded operator console, not a long settings page: platform/service kill switches stay visible in the critical strip, and lower-priority controls sit inside compact tabs with internal scrolling only. Runtime enforcement lives under `lib/operational-controls/`: capacity limits fail closed when enabled but the count RPC fails, and medication blocklist extraction is shared across authenticated and guest checkout. Business hours are review-timing reference only, not a checkout blocker.

**Checkout safety enforcement:** Authenticated, guest, and retry-payment checkout paths must call `validateSafetyFieldsPresent()` before `checkSafetyForServer()`. Missing safety-critical answers return `REQUEST_MORE_INFO` and are written to `safety_audit_log` via the service role with sanitized metadata only. Allowed checkout outcomes update intake triage fields (`risk_tier`, `triage_result`, `triage_reasons`, `requires_live_consult`, `live_consult_reason`) after `intake_answers` has been saved.

**Repeat Rx subscription:** Dormant/future strategy. Patient-facing checkout, nudge cron, email template, env requirement, and display price were retired; the current business model is one-off transactions only. Historical subscription webhook/account support may remain for compatibility. Do not market, default, or expand subscriptions until `docs/BUSINESS_PLAN.md` and `docs/REVENUE_MODEL.md` are explicitly updated.

**Priority fee (Express Review):** $9.95 add-on toggle on checkout. Adds second line item to Stripe session. Sets `is_priority` on intake → doctor queue sorts priority-first.

**Certificate pipeline:** Doctor approves → PDF generated → Uploaded to private Supabase Storage → Patient emailed dashboard link (not attachment). See docs/ARCHITECTURE.md for 9-step generation flow.

**Phone number:** Required for prescriptions + consults + specialized pathways. NOT for med certs.

**Safety/payment consent:** Not a standalone step. Med cert collects final consent in `checkout`; prescription/repeat flows collect it in the combined review/pay step; consult flows use review then checkout.

**Guest checkout:** Creates profile without `auth_user_id` → Stripe checkout → redirects to `/auth/complete-account` for account linking. After clinical answers are persisted, Stripe setup failures must keep an operator-visible `checkout_failed` intake instead of deleting the record.

**Referrals:** $5 credit to both parties. Patient shares `?ref=` link. UI: `components/patient/referral-card.tsx`.

---

## Gotchas

- **Build needs 8GB heap**: `NODE_OPTIONS='--max-old-space-size=8192'` set in build/typecheck scripts
- **Stack pins are enforced in CI**: See the Stack Pin Policy section above. `scripts/check-stack-pins.sh` runs in `ci.yml` and fails the build if Next/React/Tailwind/Framer Motion drift. Read the policy before any dep change.
- **Middleware filename**: Next 15 uses `middleware.ts` at repo root (NOT `proxy.ts` — that was Next 16's rename). Don't accept LLM/AI suggestions to rename it
- **`revalidateTag` signature**: Next 15 takes a single tag arg — `revalidateTag("foo")`. Do NOT add a second `"max"` cache profile arg; that's a Next 16-only API
- **`RefObject` typing**: With React 18 use `RefObject<HTMLDivElement>`, NOT `RefObject<HTMLDivElement | null>`. The `| null` is React 19 syntax — `useRef<T>(null)` returns `RefObject<T>` whose `.current` is already `T | null`
- **Controlled substances**: `isControlledSubstance(name)` in `lib/clinical/intake-validation.ts` detects Schedule 8 via regex patterns; UI passes the flag to `validateIntake()` which blocks progression. Both form and chat paths enforce this — no override
- **PHI encryption**: AES-256-GCM field-level. Controlled by `PHI_ENCRYPTION_*` env vars. See docs/SECURITY.md
- **Rate limiting fallback**: Two systems — Redis (general API): fails open when unavailable. Doctor actions (DB-backed): falls back to in-memory `Map` with half limits
- **Certificate IDs**: `crypto.randomInt()` not `Math.random()` — security requirement
- **Name validation**: Unicode-aware `/^[\p{L}\s'-]+$/u` for international names
- **AHPRA validation**: Format check `/^[A-Z]{3}\d{10}$/` only — not a real AHPRA lookup
- **No template editor**: Certificates use static PDF templates in `/public/templates/` with `pdf-lib` text overlay — not a WYSIWYG editor
- **GP comparisons**: Kept but subtle — `text-xs text-muted-foreground`, no crossed-out prices
- **Copy-only changes need `/clarify`**: Any PR that's primarily copy (regulatory sweeps, microcopy updates, FAQ edits, CTA text) must have `/clarify` run before committing. Clinical and legal language that passes compliance review routinely creates UX friction. The pass takes 2 minutes; skipping it ships friction into a high-anxiety patient flow
- **Public reviews/social proof**: Keep the Google stars badge stars-only. Do not render review counts, numeric star ratings, testimonials, or aggregate-rating schema on public regulated-health advertising surfaces.
- **Doctor model**: System supports multiple doctors. Don't advertise doctor count, individual doctor names, FRACGP, peer review, or team size claims unless verified and approved.
- **Dev routes blocked in prod**: Middleware blocks `/api/test/*`, `/email-preview*`, `/sentry-test*`, `/cert-preview*` in production/preview (exception: `PLAYWRIGHT=1`). `/cert-preview` is a retired dev route and stays fail-closed in middleware. Note: `(dev)` route group files resolve to their path WITHOUT the group prefix — every new `(dev)` page/route must have a corresponding middleware block added manually.
- **Supabase migrations**: Squashed to 1 baseline, then layered fixes on top. Current count on disk: **67 migration files** (1 baseline + 66 incremental). Most recent: `20260511190000_add_support_role_and_doctor_capabilities.sql` (adds `support` to the `user_role` enum + 7 per-doctor capability flag columns on `profiles`). Account closure state lives in `20260502003000_add_account_closure_to_profiles.sql`; archived audit rows are locked by `20260504193100_enable_rls_on_audit_logs_archive.sql`. 182 pre-squash files were removed on 2026-04-21 after a drift audit found they were never in the tracker and would break fresh clones via `supabase db push`. Full historical audit at `docs/audits/2026-04-21-migration-drift-audit.md`; current migration/conversion audit at `docs/audits/2026-05-03-supabase-conversion-audit.md`. Use `supabase db push` and `pnpm db:check-migrations` after linked migration changes. Note: the tracker still has a duplicate-name row for `add_delay_notification_sent_at` (both `20260403000001` and `20260403062235`); cosmetic only, clean up with `supabase migration repair` when convenient.
- **Seeded E2E data is hidden from live ops reads**: `lib/data/seeded-e2e-data.ts` filters the seeded `E2E Test Patient` profile out of doctor queue, queue health, and operational queue stats unless `PLAYWRIGHT=1`, `E2E=true`, `E2E_MODE=true`, or `NODE_ENV=test`. Do not remove this boundary; failed E2E teardowns must not inflate production workload.
- **Med certs do not expire**: The `expire-certificates` cron was deleted on 2026-04-28 (commit `9c56ac612`). 54 silently-expired cert rows were backfilled to `valid`. Verification only treats `revoked` as inauthentic; `superseded` returns a "request the current version" message; everything else verifies. Don't reintroduce expiry logic — the DB trigger above will reject it.
- **Med cert language is locked**: `lib/pdf/template-renderer.ts` `getBodyText` / `getReturnText` use conservative consultation-statement language only. Do NOT add "medically unfit", exam-deferral support, fitness-for-driving / firearm / court / flying / custody language, or any modality disclosure ("asynchronous telehealth") in the cert body. Marketing copy in `components/marketing/sections/certificate-type-selector.tsx` must not promise outcomes ("Accepted by all X", "Supports Y"). High-stakes use cases (exam, court, fitness-to-X, workers comp, NDIS, TAC) are blocked at intake by `checkHighStakesUseCase` in `lib/clinical/intake-validation.ts` and again at auto-approval by `HIGH_STAKES_USE_CASE_KEYWORDS` in `lib/clinical/auto-approval.ts`. Hard duration cap: `MAX_MED_CERT_DURATION_DAYS = 3`.
- **Verify lib is the single source of truth**: `lib/verify/certificate.ts` exports `verifyOutcome`, `formatDoctorName`, `formatCertificateType`, `maskPatientName`. `/api/verify` and `/verify/[certificate_ref]` both consume it — TypeScript will fail to compile if a new `CertificateStatus` is added without a branch. Doctor names always render as `Dr. {Name}, {Nominals}` (idempotent). Don't fork the formatters back into the route files.
- **Post-deploy smoke test**: `.github/workflows/post-deploy-smoke.yml` runs on every successful production deployment. Hits a canary cert (`IM-STUDY-20260426-06236622`) plus `/sign-in`, `/auth/forgot-password`, `/auth/reset-password`, `/api/auth/sign-out`, `/patient`. If the canary cert is rotated, update the workflow's `CANARY_CERT_REF` env var.
- **Tailwind v4**: CSS-first config. Custom morning spectrum colors (sky, dawn, ivory)
- **Staff cockpit shell**: Admin, doctor, and support staff screens share `OperatorShell`/`components/operator/*`. Do not reintroduce separate admin/doctor mode switching, scroll-heavy dashboard pages, or duplicate case summary layouts; put operational actions above the clinical review context.
- **Staff dashboard URL (Phase 1 remaster, 2026-05-11)**: `/dashboard` is the canonical staff URL going forward. Today it forwards to `/admin` (admin doctor), `/doctor/dashboard` (doctor), or `/admin/ops` (support). Phase 2 of the remaster will land the actual consolidated cockpit at `/dashboard` and make `/admin` + `/doctor/dashboard` redirect HERE. New code should reference `STAFF_DASHBOARD_HREF` from `lib/dashboard/routes.ts` rather than the legacy `ADMIN_DASHBOARD_HREF` / `DOCTOR_DASHBOARD_HREF` aliases.
- **Shared staff shell (Phase 1.2)**: Both `/admin/*` and `/doctor/*` routes render through `OperatorShell` with role-aware nav from `getStaffNav(profile)`. `DashboardSidebar` was deleted from `components/shared/`; the patient portal uses `PatientShell` -> `AuthenticatedShell` and never used DashboardSidebar in production. The doctor portal layout (`app/doctor/layout.tsx`) wraps children in `DoctorShell` INSIDE `OperatorShell` and passes `hideMobileHamburger` so the bottom-tab `DoctorMobileNav` is the sole mobile nav. To add a new staff item that all roles see, edit both `operatorNavSections` AND `doctorNavSections` AND `supportNavSections` in `lib/dashboard/staff-navigation.ts`.
- **`support` role**: Non-clinical operations role. Added to `user_role` enum on 2026-05-11. Reserved for future hires; not used in any RLS policy or page guard yet. Application-layer checks via `hasSupportAccess(profile)` from `lib/auth/staff-capabilities.ts`. Do not hire anyone into this role before Phase 7 of the remaster (RLS hardening) lands.
- **Per-doctor capability flags**: Seven boolean columns on `profiles` (`can_review_med_certs`, `can_review_repeat_rx`, `can_review_consults`, `can_review_ed`, `can_review_hair_loss`, `can_prescribe_s4`, `can_prescribe_s8`). All default true except `can_prescribe_s8` (explicit grant required). Owner-operator gets all flags true. Check via `doctorHasCapability(profile, "review_ed")` from `lib/auth/staff-capabilities.ts`. Application-layer only; not yet enforced in queue filtering, approval gates, or Parchment. Phase 7 wires the runtime checks.
- **Route group conflicts**: Never place `page.tsx` inside a route group `(name)/` if the parent dir also has `page.tsx` — both resolve to the same URL and Vercel's build tracer will fail with ENOENT. CI runs `scripts/check-route-conflicts.sh` to catch this
- **Canonical intake flow**: `/request` is the **sole** canonical intake. `/start` is a compatibility handoff for old marketing/email links and must 307 redirect into `/request` while mapping legacy `service` values and preserving attribution/query params. The `/flow` parallel system was deleted in 2026-04-08 (commit `18e26f0b7`). `/flow` and `/flow/:path*` now 301 to `/request` via `next.config.mjs`. Do not add any new logic under a `/flow/*` path, and do not reference `lib/flow/*` — safety engine lives at `lib/safety/` and offline queue at `lib/offline-queue.ts`.
- **Redirect-only pages**: `/prescriptions/request`, `/prescriptions/new`, `/prescriptions/repeat`, `/consult/request`, `/medical-certificate/request`, `/medical-certificates/*`, `/medications/*`, `/login`, and `/auth/login` redirect to canonical routes via `next.config.mjs`. The duplicate `page.tsx` trees were removed; do not recreate local client/action files for those aliases.
- **Google indexing triage**: Use `pnpm seo:gsc-index-audit -- --inspect-limit=20` for read-only Search Console URL Inspection audits. Ignore expected blocked/not-indexed noise for `_next/static`, fonts, favicon/manifest, auth/account, Clerk, and redirect-only aliases. Depth work belongs only on public canonical URLs that should rank; IndexNow submits every robots-advertised sitemap URL for Bing/Yandex discovery only and does not fix Google indexing.
- **Stack pin check regex**: `scripts/check-stack-pins.sh` uses glob `[[ == *"^"* ]]` substring tests, NOT bash regex bracket classes (`[[ =~ [\^~\>*x] ]]`). The regex form is bash-version-dependent and produces false positives on bash 5 (Ubuntu CI). Fixed in commit `1e54d69ee` — don't revert it.
- **Orphaned file check**: `scripts/check-orphaned-files.sh` detects dead intake steps not in the step registry, stale `/flow/` routes, `@deprecated` modules with zero imports, and orphaned worktree directories. Run it before deploying.
- **CI runs blocking focused E2E smoke** via `.github/workflows/ci.yml` when repo variable `E2E_ENABLED=true`: ops (`e2e/admin.ops-index.spec.ts`) plus paid critical flows (`e2e/payment-smoke.spec.ts`, `e2e/stripe-webhook.spec.ts`, `e2e/parchment-webhook.spec.ts`). Requires repo secrets `ENCRYPTION_KEY`, `STRIPE_WEBHOOK_SECRET`, and `PARCHMENT_WEBHOOK_SECRET`; CI fails fast if paid-flow webhook secrets are missing. The older broad Playwright suite is currently non-blocking debt because it contains stale routes/product assumptions and timeouts.
- **AGENTS.md is generated from CLAUDE.md**: `scripts/sync-agent-doc.sh` projects CLAUDE.md -> AGENTS.md (Claude vs Codex naming, tool-config paths). CI runs `scripts/sync-agent-doc.sh --check` so drift fails the build. **Edit CLAUDE.md, run the script, commit both.** Never edit AGENTS.md by hand.
- **Analytics & attribution pipeline**: Google Ads (`AW-17795889471`) + GA4 (`G-X0QJQRLL2Y`) IDs in `lib/analytics/google-tag-ids.ts`. Capture flow: ad URL params -> `captureAttribution()` (`lib/analytics/attribution.ts`) -> sessionStorage + first-party cookie -> `resolveCheckoutAttribution()` server-side -> `intakes` columns (`utm_*`, `gclid`, `gbraid`, `wbraid`, `campaignid`, `adgroupid`, `keyword`, `creative`, `matchtype`, `device`, `network`). Client gtag purchase fires in BOTH `app/patient/intakes/success/success-client.tsx` AND `app/auth/complete-account/complete-account-form.tsx`; guest checkouts only hit the latter. Server-side Google Ads Conversion API v24 (`lib/analytics/google-ads-conversion-api.ts`) fires from the Stripe webhook when `intakes.gclid` is present; Google dedups on `orderId` so client + server safely double-fire. Server PostHog captures carry `is_e2e` via `getPostHogBaselineProperties()` in `lib/analytics/posthog-server.ts`; **always filter `is_e2e=false`** in funnel and revenue queries. Account-level config (IDs, Final URL suffix, conversion action ID, pending Ads UI actions) lives in memory `project_google_ads.md`.

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
| New API route | `docs/ARCHITECTURE.md` | Add to API Routes table |
| New DB table or column | `docs/ARCHITECTURE.md` | Core Tables + PHI inventory if applicable |
| New cron job | `docs/OPERATIONS.md` | Cron Jobs Reference table |
| New or changed env var | `docs/OPERATIONS.md` + `docs/SECURITY.md` | Env vars list + Secret Management |
| New kill switch | `docs/SECURITY.md` | Kill Switches table + Emergency Runbook |
| New RLS policy | `docs/SECURITY.md` | Table Policies section |
| New auth pattern | `docs/SECURITY.md` | Auth Patterns table |
| New clinical rule | `docs/CLINICAL.md` | Relevant section |
| Consent or privacy change | `docs/CLINICAL.md` | Consent Requirements or APP table |
| New service type or pricing | `AGENTS.md` + `CLAUDE.md` | Pricing table + Key Workflows |
| New intake step | `docs/ARCHITECTURE.md` | Intake System step table |
| New E2E helper / test seam | `docs/TESTING.md` | E2E Seams or relevant section |
| New component pattern | `docs/ARCHITECTURE.md` | Component Patterns section |
| Supabase migration applied | `AGENTS.md` + `CLAUDE.md` | Increment migration count |
| AI model or temperature change | `docs/ARCHITECTURE.md` | AI Configuration table |
| Refund or billing logic change | `docs/ARCHITECTURE.md` | Decline & Refund Flow |
| New third-party processor | `docs/CLINICAL.md` | Third-Party Data Processors table |
| Security incident or breach | `docs/SECURITY.md` + `docs/OPERATIONS.md` | Incident classification + response runbook |
| Attribution / analytics tracking change | `AGENTS.md` + `CLAUDE.md` Gotchas + memory `project_google_ads.md` | Pipeline summary, new event names, conversion-action IDs, URL suffix params |

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

**Proactive recommendations:** While executing a task, surface anything you would do differently or better as a separate `**I recommend:**` bullet at the end of the response. This includes adjacent code that looks wrong, naming you'd change, abstractions that should collapse, missing tests, brittle patterns, or a simpler approach you noticed mid-task. State the recommendation, the reason, and the cost. Do not silently act on it; the user decides whether to fold it in. If you notice unrelated dead code (unused imports, dead branches, orphaned files), mention it as an `**I recommend:**` bullet — never delete pre-existing dead code unless explicitly asked.
