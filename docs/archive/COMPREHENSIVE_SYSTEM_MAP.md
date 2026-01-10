# InstantMed — Comprehensive System Map
**Generated:** 2026-01-03  
**Purpose:** Factual, code-grounded documentation of the InstantMed platform

---

## Executive Summary

InstantMed is an **asynchronous telehealth platform** for the Australian healthcare market that provides:
1. **Medical certificates** (sick leave, carer's leave, fitness certificates)
2. **Repeat prescriptions** (existing medications)
3. **New consultations** (new prescriptions, specialist referrals)

The platform uses **Next.js 16** (App Router), **Clerk** for authentication, **Supabase** (Postgres with RLS) for data, and **Stripe** for payments.

**Key characteristics:**
- Asynchronous (no video calls)
- AHPRA-compliant doctors review requests
- Safety-first with built-in red flag detection
- Medicare-friendly (accepts Medicare numbers)
- Mobile-optimized patient flows

---


## PART 1 — Product & Architecture (FACTS ONLY)

### 1.1 What the Product Is

InstantMed is an **online medical certificate and prescription service** for Australia. Patients complete health questionnaires, pay via Stripe, and receive doctor-reviewed outcomes within hours (typically <1 hour for priority, <24 hours standard).

**Evidence:**
- `README.md` lines 1-4: "An asynchronous telehealth platform for medical certificates and prescriptions built for the Australian healthcare market."
- `app/page.tsx`: Homepage shows 3 core services — medical certificates, prescriptions, and consultations

### 1.2 Primary User Roles

| Role | Entry Point | Authentication | Purpose |
|------|-------------|----------------|---------|
| **Patient** | `/` (marketing)<br>`/start` (intake)<br>`/medical-certificate/new`<br>`/prescriptions` | Clerk auth (email/password)<br>Optional at start, required before payment | Submit requests, pay, receive documents |
| **Doctor** | `/doctor` | Clerk auth + `role='doctor'` in profiles table | Review requests, approve/decline, generate documents |
| **Admin** | `/admin` | Clerk auth + email in admin whitelist OR `role='admin'` | Same as doctor + analytics, settings, bootstrap tools |

**Evidence:**
- `lib/auth.ts` lines 8-31: Clerk authentication with profile lookup
- `supabase/migrations/20240101000000_create_enums.sql` lines 6-9: `user_role` enum with `patient` and `admin`
- `app/admin/page.tsx` lines 11-28: Admin access check via `isAdminEmail()` or `role === 'admin'|'doctor'`
- `app/doctor/page.tsx` lines 11-15: Doctor access via `requireAuth("doctor")`

### 1.3 Core Services Supported

| Service | Price | Route | Status |
|---------|-------|-------|--------|
| Medical Certificate | $19.95 AUD | `/medical-certificate/new` | ✅ Production |
| Repeat Prescription | $29.95 AUD | `/prescriptions` (repeat flow) | ✅ Production |
| New Prescription / Consult | $49.95 AUD | `/prescriptions` (new flow) | ✅ Production |
| Weight Loss Consultation | $49.95 AUD | `/weight-loss` | ✅ Production |
| Priority Review (add-on) | +$10.00 AUD | Upsell at checkout | ✅ Production |

**Evidence:**
- `lib/stripe/client.ts` lines 57-68: Price display function with $19.95, $29.95, $49.95
- `lib/stripe/client.ts` lines 70-71: Priority review = 1000 cents ($10)
- `components/conditions/[slug]/page.tsx`: 15 condition landing pages (UTI, acne, eczema, etc.)

### 1.4 Hard Constraints Embedded in Code

#### A) Eligibility Rules

**Age restriction:**
- Must be 18+ years old
- **File:** `lib/validation/schemas.ts` lines 44-58
```typescript
.refine((date) => {
  const age = (now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  return age >= 18
}, "You must be at least 18 years old")
```

**Medicare validation:**
- 10-digit number with Luhn checksum
- IRN must be 1-9
- Must not be expired
- **File:** `lib/validation/schemas.ts` lines 64-90

**Australian-only:**
- Phone numbers must match AU format: `^(\+61|0)[2-9]\d{8}$|^(\+61|0)4\d{8}$`
- **File:** `lib/validation/schemas.ts` line 33

#### B) Exclusions

**Emergency symptoms (auto-decline):**
- Chest pain or tightness
- Severe difficulty breathing
- Stroke symptoms (face drooping, weakness, speech difficulty)
- Uncontrolled bleeding
- Loss of consciousness
- Severe allergic reaction
- Suicidal thoughts / self-harm
- Severe head injury

**File:** `components/intake/symptom-checker.tsx` lines 21-30
**File:** `lib/flow/safety/rules.ts` lines 7-73

**Schedule 8 / Controlled substances:**
- Cannot prescribe opioids, stimulants, or S8 medications via telehealth
- **File:** `lib/flow/safety/rules.ts` lines 171-182
```typescript
{
  id: 'rx_controlled_substance',
  description: 'Request for S8 or controlled medication',
  outcome: 'DECLINE',
  patientMessage: 'Controlled substances (Schedule 8) cannot be prescribed through telehealth...'
}
```

**Pregnancy-related exclusions:**
- Weight loss medications not safe during pregnancy/breastfeeding
- **File:** `lib/flow/configs.ts` lines 394-404

**Mental health:**
- Medical certificates can be issued for mental health days
- NOT for ongoing mental health treatment (requires in-person GP)
- **File:** `lib/seo/pages.ts` lines 289-293

#### C) Payment Constraints

**Payment before doctor review:**
- Requests with `payment_status='pending_payment'` are NOT shown to doctors
- **File:** `lib/data/requests.ts` lines 119: `.eq("payment_status", "paid")`

**Refund policy:**
- Tracked in `requests.refund_amount_cents`
- **File:** `supabase/migrations/20241217000002_add_refund_fields.sql`

**Stripe idempotency:**
- Prevents duplicate charges
- **File:** `supabase/migrations/20241215000003_stripe_idempotency.sql`

#### D) Compliance Constraints

**Backdating limits (medical certificates):**
- Backdating >3 days requires phone consultation
- **File:** `lib/flow/safety/rules.ts` lines 82-102

**Duration limits (medical certificates):**
- Certificates >5 days require additional information
- **File:** `lib/flow/safety/rules.ts` lines 103-144

**State machine enforcement:**
- Transitions tracked via `status` enum
- Constraints prevent invalid state changes
- **File:** `supabase/migrations/20241228_state_machine_constraints.sql`

### 1.5 Authentication & Authorization Stack

#### Technology Used

**Primary auth: Clerk**
- Email/password authentication
- User management via Clerk dashboard
- **Files:** 
  - `package.json` line 15: `"@clerk/nextjs": "^6.36.5"`
  - `app/layout.tsx` line 4: `import { ClerkProvider } from "@clerk/nextjs"`
  - `lib/auth.ts` line 8: `import { auth, currentUser } from '@clerk/nextjs/server'`

**Data layer: Supabase (Postgres with RLS)**
- User profiles stored in `profiles` table
- Row Level Security (RLS) policies enforce access control
- **Files:**
  - `supabase/migrations/20240101000001_create_profiles.sql`
  - `supabase/migrations/20241215000002_rls_hardening.sql`

#### How Auth is Enforced

**1) Server-side protection:**
```typescript
// lib/auth.ts
export async function getAuthenticatedUserWithProfile()
```
- Used in page.tsx server components
- Returns null if not authenticated
- **Example:** `app/admin/page.tsx` lines 10-15

**2) API route protection:**
```typescript
// app/api/doctor/update-request/route.ts
const { profile } = await requireAuth("doctor")
```

**3) Database-level protection (RLS):**
- Patients can only see their own `requests`
- Admins can see all `requests`
- **File:** `supabase/migrations/20240101000003_create_intakes.sql` lines 140-191

#### Role Separation

**Patient role:**
- Can create requests
- Can view own requests only
- Can update draft/pending_payment requests
- **RLS policy:** `supabase/migrations/20240101000003_create_intakes.sql` lines 144-169

**Admin/Doctor role:**
- Can view all paid requests
- Can update request status
- Can approve/decline
- **RLS policy:** `supabase/migrations/20240101000003_create_intakes.sql` lines 172-191
- **Check:** `lib/env.ts` has `isAdminEmail()` function for email whitelist

**Role assignment:**
- Stored in `profiles.role` (enum: 'patient' | 'admin')
- Also checks `profiles.role = 'doctor'` (legacy, treated as admin)
- **File:** `supabase/migrations/20240101000001_create_profiles.sql` line 30

---


## PART 2 — Patient Intake Flow & Questionnaire Logic

### 2.1 Entry Points

| Entry Point | Route | Component | Purpose |
|-------------|-------|-----------|---------|
| Generic intake | `/start` | `components/intake/enhanced-intake-flow.tsx` | Multi-service selector |
| Med cert direct | `/medical-certificate/new` | `app/medical-certificate/new/client.tsx` | Medical certificate only |
| Prescription direct | `/prescriptions` | TBD | Prescription flow |
| Condition pages | `/conditions/[slug]` | 15 hardcoded conditions | SEO → conversion |

### 2.2 Flow Structure

**Steps (simplified 3-step model):**
1. **Questions** — Service-specific health questions + safety screening
2. **Details** — Patient demographics (name, DOB, Medicare, etc.)
3. **Checkout** — Review + Stripe payment

**File:** `lib/flow/configs.ts` lines 7-11

**State management:**
- Client-side: Zustand store (`lib/flow/store.ts`)
- Draft persistence: LocalStorage + optional server backup (`lib/flow/draft/`)
- Server persistence: `intake_drafts` table after payment

### 2.3 Questionnaire Logic

**Where questions are defined:**
- `lib/flow/configs.ts` (756 lines) — Full questionnaire definitions
- Each service has a `QuestionnaireConfig` with:
  - `eligibilityFields` (emergency screening)
  - `groups` (question groups)
  - `fields` (individual questions with validation)

**Example (medical certificate):**
```typescript
const medCertQuestionnaire: QuestionnaireConfig = {
  id: 'med_cert_v3',
  version: '3.0',
  eligibilityFields: [emergencyScreening], // Red flag detection
  groups: [
    { id: 'absence', title: 'Absence details', fields: [...] },
    { id: 'reason', title: 'Your condition', fields: [...] },
    { id: 'medical_quick', title: 'Quick medical check', fields: [...] },
  ]
}
```
**File:** `lib/flow/configs.ts` lines 42-174

**Branching / conditional logic:**
- `showIf` property on fields
- **Example:** `lib/flow/configs.ts` line 82
```typescript
{
  id: 'start_date',
  type: 'date',
  showIf: { fieldId: 'absence_dates', operator: 'equals', value: 'multi_day' }
}
```

**Red flag detection:**
- Emergency symptoms checked via `components/intake/symptom-checker.tsx`
- Auto-decline with 000 guidance if critical symptoms detected
- Yellow flags (fever, severe pain) allowed but flagged for priority review

**Safety rules engine:**
- 403 lines of rules in `lib/flow/safety/rules.ts`
- Evaluator in `lib/flow/safety/evaluate.ts`
- Outcomes: `ALLOW`, `DECLINE`, `REQUIRES_CALL`, `REQUEST_MORE_INFO`

### 2.4 Validation

**Client-side:**
- React Hook Form + Zod schemas
- **File:** `lib/validation/schemas.ts`
- Real-time validation on blur/change

**Server-side:**
- API routes re-validate with same Zod schemas
- **Example:** `app/api/med-cert/submit/route.ts`

### 2.5 Data Persistence

**Tables:**
1. `intake_drafts` — Auto-save during questionnaire (every field change)
2. `requests` — Final submitted request after payment
3. `profiles` — Patient demographics

**Linking:**
- `requests.patient_id` → `profiles.id`
- `requests` stores JSONB answers in columns like `answers_json`

**File:** `supabase/migrations/20240101000003_create_intakes.sql`

### 2.6 UX Characteristics

**Friction points:**
- ✅ Long forms for complex cases (weight loss = 20+ questions)
- ✅ Medicare number entry (10 digits + IRN + expiry)
- ✅ Repeated email/password entry if not authenticated early

**Warnings:**
- ❌ Backdating fees (+$10 for >3 days) — shown in flow
- ❌ Emergency symptoms → "Call 000" modal blocks continuation

**Upsells:**
- Priority review (+$9.95) offered at checkout
- NOT FOUND: After-hours pricing (exists in code but not shown in UI)

**Scaling blockers:**
- ⚠️ Questionnaires are hardcoded in TypeScript (not CMS-driven)
- ⚠️ Adding new services requires code changes
- ⚠️ Conditional logic deeply nested (hard to test/maintain)

---

## PART 3 — Doctor & Admin Dashboards

### 3.1 Dashboard Routes

| Route | Purpose | Access |
|-------|---------|--------|
| `/doctor` | Main doctor dashboard | `role='doctor'` or `role='admin'` |
| `/doctor/queue` | Request queue (pending) | Doctor |
| `/doctor/patients` | Patient list | Doctor |
| `/doctor/analytics` | Stats & charts | Doctor |
| `/admin` | Admin dashboard (same as doctor + settings) | Admin whitelist OR `role='admin'` |
| `/admin/settings` | Feature flags, config | Admin |
| `/admin/bootstrap` | Initial setup tools | Admin |

### 3.2 What Doctors Can Do

**View requests:**
- Filter by status: pending / approved / declined / awaiting_payment
- **Component:** `app/doctor/doctor-dashboard-client.tsx`
- **Data:** `lib/data/requests.ts` → `getAllRequestsByStatus()`

**Review intake data:**
- Patient details (name, DOB, Medicare)
- Questionnaire answers (symptoms, medications, etc.)
- Red flags highlighted

**Approve:**
- Mark status as `approved`
- Generate medical certificate PDF or e-script
- **API:** `app/api/admin/approve/route.ts`

**Decline:**
- Mark status as `declined`
- Provide reason (free text or AI-suggested)
- **API:** `app/api/admin/decline/route.ts`

**Edit drafts:**
- Medical certificates: Edit patient name, dates, reason
- **Component:** `components/med-cert/` (React-PDF templates)

### 3.3 What Admins Can Do

Same as doctors, PLUS:
- Toggle feature flags (`/admin/settings`)
- Make users doctors (`/api/admin/make-doctor/route.ts`)
- View analytics dashboard
- Bootstrap initial data

### 3.4 Request Lifecycle

**Statuses:**
```
draft → pending_payment → paid → in_review → approved/declined → completed
```

**File:** `supabase/migrations/20240101000000_create_enums.sql` lines 23-35

**Status enums:**
- `draft` — Started but not submitted
- `pending_payment` — Submitted, awaiting Stripe
- `paid` — Payment received, in queue for doctor
- `in_review` — Doctor actively reviewing
- `pending_info` — Doctor requested more info
- `approved` — Doctor approved, document generated
- `declined` — Doctor declined
- `completed` — Fully delivered
- `cancelled` — Patient cancelled
- `expired` — SLA breached

**Transition enforcement:**
- State machine constraints in `supabase/migrations/20241228_state_machine_constraints.sql`
- Validation in `lib/data/request-lifecycle.ts`

### 3.5 Safety & Correctness

**Invariant enforcement:**
- ❌ NOT FOUND: Double-approval protection (same request reviewed twice)
- ✅ Status transitions validated server-side
- ✅ RLS prevents patients from seeing other patients' data

**Audit logging:**
- `admin_actions` table tracks every doctor action
- **File:** `supabase/migrations/20240101000008_create_admin_actions.sql`

**Known risks:**
- ⚠️ Race condition: Two doctors could claim same request (no locking)
- ⚠️ Manual document generation could fail silently
- ⚠️ No "undo" for approvals/declines

### 3.6 Operational Bottlenecks

- ⚠️ Queue doesn't auto-assign (doctors must manually claim)
- ⚠️ No filters for SLA urgency
- ⚠️ No bulk actions (approve multiple at once) — UPDATE: exists in `app/api/doctor/bulk-action/route.ts`

---


## PART 4 — Route & Landing Page Inventory

### All Routes (86 pages total)

| Route | Purpose | Service Category | Indexable | Notes |
|-------|---------|------------------|-----------|-------|
| `/` | Homepage | Marketing | ✅ Yes | Main entry, SEO-optimized |
| `/pricing` | Pricing page | Marketing | ✅ Yes | Service comparison |
| `/how-it-works` | Process explanation | Marketing | ✅ Yes | Educational |
| `/faq` | FAQ | Marketing | ✅ Yes | SEO value |
| `/reviews` | Testimonials | Marketing | ✅ Yes | Social proof |
| `/contact` | Contact form | Marketing | ✅ Yes | |
| `/privacy` | Privacy policy | Legal | ✅ Yes | Required |
| `/terms` | Terms of service | Legal | ✅ Yes | Required |
| **Medical Certificates** |
| `/medical-certificate` | Med cert landing | SEO / Conversion | ✅ Yes | Primary service |
| `/medical-certificate/new` | Intake flow | Conversion | ❌ No | Transactional |
| `/medical-certificate/[slug]` | Condition-specific | SEO | ✅ Yes | 15 conditions |
| `/medical-certificate/location/[suburb]` | Location pages | SEO | ✅ Yes | Programmatic |
| **Prescriptions** |
| `/prescriptions` | Prescription landing | SEO / Conversion | ✅ Yes | Primary service |
| `/prescriptions/request` | Intake flow | Conversion | ❌ No | Transactional |
| `/repeat-prescription` | Repeat RX landing | SEO | ✅ Yes | |
| **Conditions** (15 total) |
| `/conditions/uti` | UTI treatment | SEO / Condition | ✅ Yes | Schema.org markup |
| `/conditions/acne` | Acne treatment | SEO / Condition | ✅ Yes | |
| `/conditions/eczema` | Eczema treatment | SEO / Condition | ✅ Yes | |
| `/conditions/hay-fever` | Hay fever | SEO / Condition | ✅ Yes | |
| `/conditions/acid-reflux` | GERD treatment | SEO / Condition | ✅ Yes | |
| `/conditions/high-blood-pressure` | BP medication | SEO / Condition | ✅ Yes | |
| `/conditions/high-cholesterol` | Cholesterol meds | SEO / Condition | ✅ Yes | |
| `/conditions/erectile-dysfunction` | ED treatment | SEO / Condition | ✅ Yes | Men's health |
| `/conditions/hair-loss` | Hair loss | SEO / Condition | ✅ Yes | Men's health |
| `/conditions/contraception` | Birth control | SEO / Condition | ✅ Yes | Women's health |
| `/conditions/weight-loss` | Weight management | SEO / Condition | ✅ Yes | |
| `/conditions/cold-and-flu` | Cold/flu | SEO / Condition | ✅ Yes | |
| `/conditions/sinus-infection` | Sinusitis | SEO / Condition | ✅ Yes | |
| `/conditions/conjunctivitis` | Pink eye | SEO / Condition | ✅ Yes | |
| `/conditions/thrush` | Thrush treatment | SEO / Condition | ✅ Yes | Women's health |
| **Audience Pages** (4 total) |
| `/for/students` | Student-focused | SEO / Audience | ✅ Yes | Niche targeting |
| `/for/tradies` | Tradies/workers | SEO / Audience | ✅ Yes | Niche targeting |
| `/for/corporate` | Corporate clients | SEO / Audience | ✅ Yes | B2B |
| `/for/shift-workers` | Shift workers | SEO / Audience | ✅ Yes | Niche targeting |
| **Health Verticals** |
| `/mens-health` | Men's health hub | SEO | ✅ Yes | Aggregate page |
| `/womens-health` | Women's health hub | SEO | ✅ Yes | Aggregate page |
| `/weight-loss` | Weight loss program | SEO / Service | ✅ Yes | Premium service |
| **Locations** |
| `/locations` | Location index | SEO | ✅ Yes | City list |
| `/locations/[city]` | City-specific | SEO | ✅ Yes | Programmatic, thin? |
| **Patient Area** |
| `/patient` | Patient dashboard | Dashboard | ❌ No | Auth required |
| `/patient/requests/[id]` | Request details | Dashboard | ❌ No | Auth required |
| `/patient/settings` | Profile settings | Dashboard | ❌ No | Auth required |
| `/patient/payment-history` | Invoice history | Dashboard | ❌ No | Auth required |
| **Doctor/Admin Area** |
| `/doctor` | Doctor dashboard | Dashboard | ❌ No | Auth required |
| `/doctor/queue` | Request queue | Dashboard | ❌ No | Auth required |
| `/doctor/analytics` | Analytics | Dashboard | ❌ No | Auth required |
| `/admin` | Admin dashboard | Dashboard | ❌ No | Auth required |
| `/admin/settings` | Admin settings | Dashboard | ❌ No | Auth required |
| **Auth** |
| `/sign-in` | Login page | Auth | ❌ No | Transactional |
| `/sign-up` | Register page | Auth | ❌ No | Transactional |
| `/auth/callback` | OAuth callback | Auth | ❌ No | Disallowed in robots.txt |

**File references:**
- Main routes: `app/` directory structure (86 page.tsx files)
- Conditions: `app/conditions/[slug]/page.tsx` lines 32-714 (hardcoded object)
- Sitemap: `app/sitemap.ts`
- Robots: `app/robots.ts`

### SEO Analysis

**Strong:**
- ✅ 15 condition pages with schema.org markup
- ✅ Unique content per condition (symptoms, FAQs, pricing)
- ✅ Clean URL structure
- ✅ Canonical tags set

**Weak:**
- ⚠️ Location pages may be thin content (need to verify city data)
- ⚠️ No blog or content hub (all transactional)
- ⚠️ Internal linking limited (related conditions exist but manual)

**Missing:**
- ❌ No medication database pages (e.g., `/medications/[drug-name]`)
- ❌ No procedure/treatment guides beyond conditions
- ❌ No symptom checker tool (exists in flow but not standalone SEO page)

**Doorway/thin content risk:**
- ⚠️ `/locations/[city]` if content is just templated with city name

---

## PART 5 — UI Component Audit

### Component Libraries in Use

| Library | Usage | Files |
|---------|-------|-------|
| **shadcn/ui** | Primary UI components | `components/ui/` (109 files) |
| **HeroUI** | Alternative React components | Limited usage |
| **Radix UI** | Primitives (headless components) | Via shadcn |
| **Framer Motion** | Animations | Extensive (hero sections, modals) |
| **Lucide React** | Icons | Throughout |
| **Recharts** | Analytics charts | Doctor dashboard |

**Evidence:**
- `package.json` lines 23-40: Radix UI primitives
- `package.json` line 17: `"@heroui/react": "^2.8.6"`
- `package.json` line 55: `"framer-motion": "^11.18.2"`
- `components.json`: shadcn configuration (New York style)

### Layout Primitives

**Used extensively:**
- `Card` — Everywhere (patient flow, doctor dashboard)
- `Button` — Primary CTA, secondary actions
- `Input`, `Textarea` — Forms
- `Dialog` / `AlertDialog` — Modals, confirmations
- `Badge` — Status indicators
- `Tabs` — Doctor dashboard navigation

### Animation Usage

**Framer Motion patterns:**
- Page transitions (`<motion.div>` with fadeIn/slideUp)
- Hero section animations (`components/ui/animated-hero.tsx`)
- Mobile menu (`components/ui/animated-mobile-menu.tsx`)
- Card hover effects

**Performance risk:**
- ⚠️ Heavy animations on mobile (page transitions)

### Typography, Spacing, Color

**Fonts:**
- Sans: Inter (body text)
- Heading: Lora (serif for headings)
- Mono: JetBrains Mono (code, reference numbers)
- Handwritten: Caveat (decorative)

**File:** `app/layout.tsx` lines 17-41

**Color system:**
- Primary: `#00E2B5` (teal/mint green)
- Background: `#0A0F1C` (dark navy)
- Defined via CSS variables in `app/globals.css`

**Spacing:**
- Tailwind utility classes (consistent)
- Custom `premium-mesh` background

### Inconsistencies

**Found:**
- ⚠️ Mix of shadcn Button vs HeroUI Button (rare but exists)
- ⚠️ Some forms use custom styles, others use shadcn
- ⚠️ Doctor dashboard uses different card styles than patient flow

### 21st.dev / HeroUI Pro Integration Points

**Safe to replace (low medical risk):**
- ✅ Marketing homepage hero (`components/marketing/hero.tsx`)
- ✅ Service picker cards (`components/marketing/service-picker.tsx`)
- ✅ FAQ accordion (`components/marketing/faq-section.tsx`)
- ✅ Footer (`components/shared/footer.tsx`)
- ✅ Doctor dashboard analytics cards

**Replace with caution:**
- ⚠️ Patient intake form components (validation logic embedded)
- ⚠️ Symptom checker (safety-critical)
- ⚠️ Payment flow components (Stripe integration)

**Do NOT replace:**
- ❌ Medical certificate PDF generator (`components/med-cert/`)
- ❌ Safety rules engine (`lib/flow/safety/`)
- ❌ Database query functions (`lib/data/`)

---

## PART 6 — SEO, Metadata & Analytics

### Metadata Implementation

**Per-page metadata:**
- 56 of 86 pages have custom metadata
- Defined in `page.tsx` via `export const metadata: Metadata`
- **Example:** `app/conditions/[slug]/page.tsx` lines 720-742

**Shared config:**
- `lib/seo/metadata.ts` — Helper function for consistent metadata
- Root layout sets default: `app/layout.tsx` lines 43-106

**Templates:**
- ✅ Title template: `"%s | InstantMed"`
- ✅ Open Graph images per page
- ✅ Twitter cards configured

### Structured Data (Schema.org)

**Used on:**
- Conditions pages: `FAQPage` + `MedicalCondition` schemas
- Homepage: `Organization` + `AggregateRating` schemas

**Example (conditions):**
```typescript
// app/conditions/[slug]/page.tsx lines 757-774
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: condition.faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a }
  }))
}
```

**File:** `components/seo/healthcare-schema.tsx`

**Missing:**
- ❌ No `MedicalBusiness` schema with operating hours
- ❌ No `Offer` schema with pricing
- ❌ No breadcrumb schema

### Sitemap Generation

**Type:** Static
**File:** `app/sitemap.ts`

**Includes:**
- Static pages (20 routes)
- Condition pages (15 via `getAllSlugs('conditions')`)
- Certificate pages (via `getAllSlugs('certificates')`)
- Benefit pages (via `getAllSlugs('benefits')`)
- Resource pages (via `getAllSlugs('resources')`)

**Problem:**
- ⚠️ `getAllSlugs()` is NOT FOUND — function doesn't exist in `lib/seo/pages.ts`
- ⚠️ Sitemap may be generating 404s

### Internal Linking

**Patterns:**
- Related conditions: Manual array in each condition config
- **Example:** `app/conditions/[slug]/page.tsx` line 86: `relatedConditions: ["thrush", "contraception"]`
- Footer links to main services
- ❌ No automated link graph

### Tracking & Analytics

**Tools used:**
- Vercel Analytics: `@vercel/analytics`
- **File:** `app/layout.tsx` line 6
- Web Vitals tracking: `lib/analytics/web-vitals.tsx`

**Events:**
- ❌ NOT FOUND: Custom event tracking for conversions
- ❌ NOT FOUND: Google Analytics gtag

**Missing:**
- No funnel tracking (start → questions → payment → completion)
- No A/B testing infrastructure

---

## PART 7 — Readiness & Gap Analysis

### Fully Production-Ready ✅

1. **Core intake flow** — Medical certificates and prescriptions work end-to-end
2. **Payment processing** — Stripe integration robust with webhooks
3. **Database schema** — Comprehensive with RLS, constraints, audit logging
4. **Authentication** — Clerk + Supabase profiles working
5. **Doctor dashboard** — Functional review workflow
6. **Mobile optimization** — Responsive design throughout
7. **Safety screening** — Red flag detection prevents dangerous scenarios

### Works but Has UX Debt ⚠️

1. **Intake forms too long** — Weight loss flow = 20+ questions (consider progressive disclosure)
2. **Doctor queue management** — No auto-assignment, manual claiming only
3. **No bulk actions** — UPDATE: Exists in API but may not be exposed in UI
4. **Medicare entry friction** — 10 digits + IRN + expiry is tedious
5. **Draft resume unclear** — Users may not know they can continue incomplete forms
6. **No patient notifications** — Email sent but no in-app notification system visible

### Missing for Large-Scale SEO Expansion ❌

1. **Content Management System**
   - Questionnaires hardcoded in TypeScript
   - Condition pages hardcoded (not database-driven)
   - **Blocker:** Adding 50 more conditions requires code deployment

2. **Programmatic Page Generation**
   - Location pages exist but data source unclear
   - No medication database for `/medications/[drug-name]` pages
   - **Blocker:** Sitemap calls `getAllSlugs()` which doesn't exist

3. **Structured Data Gaps**
   - Missing `MedicalBusiness`, `Offer`, breadcrumb schemas
   - **Impact:** Reduced rich snippets in search results

4. **Internal Linking System**
   - Related content manually defined
   - **Blocker:** Doesn't scale to 100+ pages

5. **Blog / Content Hub**
   - All pages are transactional (no educational content)
   - **Blocker:** No way to rank for "how to treat UTI" (informational queries)

### Missing for High-Conversion Landing Pages ❌

1. **A/B Testing Infrastructure**
   - No split testing tool integrated
   - **Blocker:** Can't optimize conversion rates scientifically

2. **Social Proof**
   - Trustpilot widget exists but not on all landing pages
   - No real-time "X people got certified today" counter

3. **Exit Intent Modals**
   - No abandonment recovery

4. **Live Chat**
   - Widget exists (`components/shared/live-chat-widget.tsx`) but may not be connected

### Missing for Design System Unification 🎨

1. **Component Documentation**
   - No Storybook or component library docs
   - **Blocker:** Designers/devs don't know what components exist

2. **HeroUI Integration Incomplete**
   - Library included but barely used
   - **Decision needed:** Fully adopt or remove

3. **Animation Performance**
   - Heavy Framer Motion usage may hurt mobile performance
   - **Action:** Audit and optimize

### Missing for Intake Flow Optimization 📝

1. **Smart Defaults**
   - Could pre-fill location from IP geolocation
   - Could suggest medications based on common prescriptions

2. **Conditional Question Hiding**
   - Exists but could be more aggressive (hide irrelevant questions)

3. **Progress Saving UX**
   - Draft persistence works but not surfaced in UI
   - **Action:** Add "Continue where you left off" banner

4. **Multi-Language Support**
   - All English (Australian market only for now)

### Missing for Doctor/Admin Efficiency 🩺

1. **Request Auto-Assignment**
   - Doctors must manually claim requests
   - **Action:** Round-robin or load-balancing algorithm

2. **SLA Urgency Filters**
   - No way to see "expires in 1 hour" requests first

3. **Batch Approval**
   - API exists (`/api/doctor/bulk-action`) but UI may not expose it

4. **Document Templates**
   - Medical certificates use fixed template
   - **Enhancement:** Allow doctors to customize wording

5. **Clinical Notes AI**
   - API endpoint exists (`/api/ai/clinical-note`) but usage unclear

---

## Concrete Code-Level Checklist

### Immediate (< 1 week)

- [ ] **Fix sitemap** — `getAllSlugs()` function missing, sitemap may generate 404s
  - **File:** `lib/seo/pages.ts`
  - **Action:** Implement or remove calls in `app/sitemap.ts`

- [ ] **Add Google Analytics** — No GA4 tracking found
  - **File:** `app/layout.tsx`
  - **Action:** Add gtag script

- [ ] **Expose bulk actions in doctor UI** — API exists but not in UI
  - **File:** `app/doctor/doctor-dashboard-client.tsx`
  - **Action:** Add "Select multiple" checkbox mode

- [ ] **Add breadcrumbs schema** — Improves SEO
  - **File:** `components/seo/healthcare-schema.tsx`
  - **Action:** Generate breadcrumb JSON-LD

### Short-term (1-4 weeks)

- [ ] **Build CMS for conditions** — Move hardcoded conditions to database
  - **Tables:** `conditions`, `condition_faqs`, `condition_symptoms`
  - **Action:** Migrate data from `app/conditions/[slug]/page.tsx`

- [ ] **Implement auto-assignment** — Doctors shouldn't hunt for requests
  - **File:** `lib/data/requests.ts`
  - **Action:** Add `assignNextRequest()` function with fair distribution

- [ ] **Add SLA urgency indicator** — Visual countdown in doctor queue
  - **Component:** `app/doctor/queue/`
  - **Action:** Show "Expires in 47 minutes" with red badge

- [ ] **Optimize mobile animations** — Heavy Framer Motion usage
  - **Files:** All `components/ui/animated-*.tsx`
  - **Action:** Use `prefers-reduced-motion` and lighter animations on mobile

- [ ] **Add exit intent recovery** — Capture abandoning users
  - **Component:** `components/marketing/exit-intent-modal.tsx`
  - **Action:** Offer discount or fast-track

### Medium-term (1-3 months)

- [ ] **Build medication database** — SEO play for `/medications/[drug-name]`
  - **API:** Use NCTS (AMT) data
  - **Action:** Create programmatic pages with dosage info, side effects

- [ ] **Implement A/B testing** — Use Vercel Edge Config or third-party
  - **Framework:** Vercel Edge Middleware for split tests
  - **Action:** Test hero CTA wording, pricing display

- [ ] **Add blog/content hub** — Rank for informational queries
  - **Route:** `/health/guides/[slug]`
  - **Action:** CMS-driven blog with author bylines

- [ ] **Build notification system** — In-app + email
  - **Table:** `notifications` (already exists in migrations)
  - **Action:** Connect to UI with toast notifications

- [ ] **Component library docs** — Storybook or custom docs site
  - **Tool:** Storybook 7 with Tailwind
  - **Action:** Document all `components/ui/` components

### Long-term (3-6 months)

- [ ] **Multi-tenancy for clinics** — White-label solution
  - **Schema:** Add `organizations` table
  - **Action:** Rebrand UI per org

- [ ] **Symptom checker standalone tool** — SEO + lead gen
  - **Route:** `/symptom-checker`
  - **Action:** Extract from intake flow, make public

- [ ] **Telehealth video calls** — For complex cases
  - **Tech:** Twilio Video or Zoom API
  - **Action:** Add "Upgrade to video consult" option

- [ ] **Insurance integrations** — Beyond Medicare
  - **Partners:** Bupa, Medibank, HCF
  - **Action:** Direct billing API integrations

---

## Summary

InstantMed is a **production-ready asynchronous telehealth platform** with solid foundations:
- ✅ Robust auth (Clerk + Supabase RLS)
- ✅ Safe intake flows (red flag detection)
- ✅ Functional doctor workflow
- ✅ Strong SEO base (15 condition pages with schema.org)

**Primary gaps:**
1. **Scalability:** Hardcoded questionnaires and conditions block rapid expansion
2. **SEO:** Missing programmatic pages (medications, guides) and internal linking
3. **UX:** Forms too long, no draft resume UI, no auto-assignment for doctors
4. **Analytics:** No funnel tracking or A/B testing

**Recommended next steps:**
1. Fix sitemap (immediate)
2. Build CMS for conditions (1 month)
3. Implement doctor auto-assignment (2 weeks)
4. Launch medication database (3 months)

---

**End of System Map**
*Generated: 2026-01-03*
*Repository: reabal-n/instantmed*
*Branch: copilot/create-system-map-documentation*

