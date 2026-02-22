# InstantMed

An asynchronous telehealth platform for medical certificates and prescriptions built for the Australian healthcare market. Designed with a premium, solarpunk-inspired aesthetic — warm, hopeful, and human.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), Tailwind CSS, shadcn/ui, Lucide React icons
- **Backend/Auth:** Supabase (Auth, Postgres Database with RLS)
- **Forms:** React Hook Form + Zod (strict validation)
- **Payments:** Stripe (Payment Intents)

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

### Compliance & Security
- AHPRA-compliant telehealth flow
- Medicare number validation (Luhn check)
- Row Level Security (RLS) on all tables
- Stripe webhook handling for payment status

## Setup

### 1. Environment Variables

Create a `.env.local` file based on `.env.example`:

```bash
cp .env.example .env.local
```

Then fill in your credentials. See `.env.example` for detailed documentation of each variable.

Required variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database Setup

The database schema is already applied via Supabase migrations. Key tables:

- `profiles` - Patient information linked to auth.users
- `requests` - Consultation requests (medical certs, prescriptions)
- `request_answers` - JSONB intake form data
- `payments` - Stripe payment records
- `admin_emails` - Whitelist for admin dashboard access

### 3. Admin Access

Add your email to the `admin_emails` table to access `/admin/dashboard`:

```sql
INSERT INTO admin_emails (email) VALUES ('your-email@example.com');
```

### 4. Stripe Webhooks

Configure your Stripe webhook to point to:
```
https://your-domain.com/api/webhooks/stripe
```

Events to handle:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`

### 5. Run Development Server

```bash
npm install
npm run dev
```

## Project Structure

```
src/
├── app/
│   ├── admin/dashboard/    # Doctor review panel
│   ├── api/
│   │   ├── create-payment-intent/
│   │   └── webhooks/stripe/
│   ├── auth/callback/      # Supabase auth callback
│   ├── checkout/           # Stripe checkout
│   ├── dashboard/          # Patient dashboard
│   ├── login/              # Authentication
│   └── start/              # Onboarding wizard
├── components/
│   ├── onboarding/         # Multi-step wizard components
│   │   ├── EmergencyAlert.tsx
│   │   ├── StepIndicator.tsx
│   │   └── steps/
│   └── ui/                 # shadcn/ui components
└── lib/
    ├── supabase/           # Supabase client setup
    ├── types.ts            # TypeScript types
    ├── utils.ts            # Utility functions
    └── validations.ts      # Zod schemas
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

## License

Private - All rights reserved.
