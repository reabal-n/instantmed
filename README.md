# InstantMed

An asynchronous telehealth platform for medical certificates and prescriptions built for the Australian healthcare market.

> **📢 Project Status:** All feature branches have been consolidated into `main`. See [PROJECT_IMPROVEMENTS.md](./PROJECT_IMPROVEMENTS.md) for details on the merge and suggested improvements.

## Tech Stack

- **Frontend:** Next.js 16+ (App Router), Tailwind CSS, shadcn/ui, Lucide React icons
- **Backend/Auth:** Clerk Authentication + Supabase (Postgres Database with RLS)
- **Forms:** React Hook Form + Zod (strict validation)
- **Payments:** Stripe (Payment Intents)
- **Email:** Resend
- **Monitoring:** Sentry (optional)
- **Rate Limiting:** Upstash Redis (recommended for production)

## Features

### Patient Flow
- **Service Selection:** Choose between Medical Certificate or Prescription
- **Multi-step Intake Form:** 
  - Smart symptom selection with red flag detection
  - Date picker with backdating warnings (+$10 fee)
  - Emergency (000) alert for serious symptoms (chest pain, severe breathlessness)
- **Account Creation:** Sunk cost flow - collect medical info before account creation
- **Patient Details:** Medicare number validation with input masking (XXXX XXXXX X format)
- **Stripe Checkout:** Priority review upsell (+$9.95 for 30-min turnaround)

### Doctor Dashboard (/admin/dashboard)
- View all pending consultations
- Priority queue highlighting
- Patient demographics with Medicare details
- Intake data review with red flag keyword highlighting
- Approve/Decline actions with Supabase integration

### SEO & Content (NEW)
- **77+ Programmatic SEO Pages:**
  - 13 intent pages (e.g., "get medical certificate online")
  - 13 medication pages (e.g., antibiotics, pain relief)
  - 8 symptom pages (e.g., cold, flu, UTI)
  - 3 comparison pages
- Dynamic routes: `/telehealth/[slug]` and `/symptoms/[slug]`
- Automated metadata generation with schema.org
- Internal linking engine for SEO

### Compliance & Security
- AHPRA-compliant telehealth flow
- Medicare number validation (Luhn check)
- Row Level Security (RLS) on all tables
- CSRF protection on sensitive API routes
- Stripe webhook handling for payment status
- Structured logging system (no console.log in production)

## Setup

### 1. Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

See [.env.example](./.env.example) for the complete list of required and optional environment variables, including:
- Clerk Authentication (required)
- Supabase Database (required)
- Stripe Payments (required)
- Resend Email (required)
- Sentry Error Tracking (optional)
- Upstash Redis Rate Limiting (optional)

**Quick Start (Minimum Required):**
```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email
RESEND_API_KEY=re_...

# Security
INTERNAL_API_SECRET=your-secure-random-string
```

### 2. Database Setup

The database schema is already applied via Supabase migrations. Key tables:

- `profiles` - Patient information linked to auth.users
- `requests` - Consultation requests (medical certs, prescriptions)
- `request_answers` - JSONB intake form data
- `payments` - Stripe payment records
- `admin_emails` - Whitelist for admin dashboard access

### 3. Webhooks Setup

#### Stripe Webhooks
Configure your Stripe webhook to point to:
```
https://your-domain.com/api/webhooks/stripe
```

Events to handle:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

#### Clerk Webhooks
Configure your Clerk webhook to point to:
```
https://your-domain.com/api/webhooks/clerk
```

Events to handle:
- `user.created`
- `user.updated`
- `user.deleted`

### 4. Run Development Server

```bash
# Install dependencies (using pnpm recommended)
pnpm install

# Run development server
pnpm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
instantmed/
├── app/
│   ├── api/                    # API routes (payments, webhooks, CRUD)
│   ├── doctor/                 # Doctor dashboard and request management
│   ├── patient/                # Patient dashboard and request tracking
│   ├── telehealth/[slug]/      # SEO intent pages (13 pages)
│   ├── symptoms/[slug]/        # SEO symptom pages (8 pages)
│   ├── robots.ts               # Search engine crawling directives
│   └── sitemap.ts              # Dynamic sitemap (77+ pages)
├── components/
│   ├── flow/                   # Multi-step intake form components
│   ├── marketing/              # Landing page components
│   ├── ui/                     # shadcn/ui components
│   └── shared/                 # Shared components (auth, errors, etc.)
├── lib/
│   ├── seo/                    # SEO system (NEW)
│   │   ├── registry.ts         # Centralized SEO content registry
│   │   ├── medications.ts      # 13 medication pages
│   │   ├── symptoms.ts         # 8 symptom pages
│   │   ├── intents.ts          # 13 intent pages
│   │   ├── comparisons.ts      # 3 comparison pages
│   │   ├── linking.ts          # Internal linking engine
│   │   └── metadata-generator.ts # Automated metadata
│   ├── rate-limit/             # Rate limiting with CSRF protection
│   ├── supabase/               # Supabase client and utilities
│   ├── flow/                   # Intake flow logic
│   └── analytics/              # Analytics and tracking
├── docs/
│   ├── COMPREHENSIVE_AUDIT_2026.md          # Security audit report
│   ├── COMPREHENSIVE_SYSTEM_MAP.md          # System architecture
│   ├── PRE_LAUNCH_IMPROVEMENTS.md           # Pre-launch checklist
│   └── PROJECT_IMPROVEMENTS.md              # Branch merge summary
├── .env.example                # Environment variable template
└── package.json                # Dependencies
```

## Pricing

- Medical Certificate: $19.95 AUD
- Repeat Prescription: $29.95 AUD  
- GP Consult (new scripts): $49.95 AUD
- Priority Review: +$10.00 AUD

## Mobile Optimization

- All buttons are 44px+ height for touch targets
- Sticky bottom navigation on mobile
- Toast notifications via Sonner
- Responsive design throughout

## Documentation

- **[PROJECT_IMPROVEMENTS.md](./PROJECT_IMPROVEMENTS.md)** - Branch consolidation summary and suggested improvements
- **[PRE_LAUNCH_IMPROVEMENTS.md](./PRE_LAUNCH_IMPROVEMENTS.md)** - Production readiness checklist
- **[COMPREHENSIVE_AUDIT_2026.md](./COMPREHENSIVE_AUDIT_2026.md)** - Security and code quality audit
- **[COMPREHENSIVE_SYSTEM_MAP.md](./COMPREHENSIVE_SYSTEM_MAP.md)** - System architecture overview
- **[.env.example](./.env.example)** - Environment variable template

## Contributing

This is a private project. All feature branches have been consolidated into `main` as of January 3, 2026.

## License

Private - All rights reserved.
