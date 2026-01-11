# Lumen Health Developer Guide

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- Supabase CLI
- Stripe CLI (for webhook testing)

### Environment Setup

1. **Clone and install dependencies:**
```bash
git clone https://github.com/reabal-n/lumen-health.git
cd lumen-health
pnpm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Required variables:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Lumen Health <noreply@lumenhealth.com.au>
```

3. **Start development server:**
```bash
pnpm dev
```

4. **Run Supabase locally (optional):**
```bash
supabase start
supabase db push
```

---

## Project Structure

```
lumen-health/
├── app/                    # Next.js App Router
│   ├── (marketing)/        # Public pages (home, about, etc.)
│   ├── patient/            # Patient dashboard & flows
│   ├── doctor/             # Doctor dashboard & review
│   ├── admin/              # Admin panel
│   ├── api/                # API routes
│   └── auth/               # Authentication pages
├── components/
│   ├── ui/                 # Base UI components (shadcn/ui style)
│   ├── shared/             # Shared components (navbar, footer)
│   ├── effects/            # Visual effects (particles, confetti)
│   └── a11y/               # Accessibility components
├── lib/
│   ├── supabase/           # Supabase client setup
│   ├── stripe/             # Stripe checkout & webhooks
│   ├── email/              # Email templates & sending
│   ├── notifications/      # In-app notification service
│   ├── hooks/              # Custom React hooks
│   ├── analytics/          # Web Vitals & tracking
│   ├── a11y/               # Accessibility utilities
│   └── rate-limit/         # API rate limiting
├── supabase/
│   └── migrations/         # Database migrations
├── types/                  # TypeScript types
└── public/                 # Static assets
```

---

## Key Concepts

### Authentication Flow
1. User signs up via email/password or Google OAuth
2. Profile created in `profiles` table
3. Patients complete onboarding (contact, address, Medicare)
4. Session managed via Supabase Auth + cookies

### Request Flow
1. Patient fills questionnaire
2. Payment via Stripe Checkout
3. Webhook updates request status to "pending"
4. Doctor reviews and approves/declines
5. Document generated (PDF)
6. Patient notified via email + in-app notification

### Real-time Updates
- Doctor dashboard uses Supabase Realtime
- Hook: `useRealtimeRequests` in `/lib/hooks/`
- Subscribes to `requests` table changes

---

## Common Tasks

### Adding a New API Route
```typescript
// app/api/example/route.ts
import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit/limiter"

export async function GET(request: Request) {
  // Auth check using Clerk
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Rate limiting
  const rateLimitResult = await rateLimit(userId, '/api/your-route')
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    )
  }

  // Your logic here
  return NextResponse.json({ data: "example" })
}
```

> **Note:** As of June 2025, authentication is handled by Clerk, not Supabase Auth.
> Supabase is used only for database operations. Always use `auth()` from Clerk
> for authentication checks in server-side code.

### Adding a Database Migration
```bash
# Create migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql

# Apply migrations
supabase db push
```

### Sending Emails
```typescript
import { sendMedCertReadyEmail } from "@/lib/email/resend"

await sendMedCertReadyEmail({
  to: patient.email,
  patientName: patient.full_name,
  pdfUrl: documentUrl,
  requestId: request.id,
})
```

### Creating Notifications
```typescript
import { createNotification, notifyRequestStatusChange } from "@/lib/notifications/service"

// Simple notification
await createNotification({
  userId: patientId,
  type: "document_ready",
  title: "Your document is ready!",
  message: "Download it from your dashboard.",
  actionUrl: `/patient/requests/${requestId}`,
})

// Status change (handles email + in-app)
await notifyRequestStatusChange({
  requestId,
  patientId,
  patientEmail,
  patientName,
  requestType: "medical_certificate",
  newStatus: "approved",
  documentUrl,
})
```

---

## Testing

### Running Tests
```bash
# Unit tests
pnpm test

# E2E tests (Playwright)
pnpm test:e2e

# Type checking
pnpm typecheck
```

### Testing Stripe Webhooks
```bash
# Start Stripe CLI listener
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

---

## Deployment

### Vercel (Recommended)
1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to `main`

### Database Migrations
```bash
# Push migrations to production
supabase db push --linked

# For medical certificates, ensure med_cert_drafts table exists
psql $SUPABASE_DB_URL -f scripts/024_med_cert_drafts.sql
```

---

## Troubleshooting

### Common Issues

**"No such price" Stripe error:**
- Check that `STRIPE_PRICE_*` env vars match your Stripe account
- Test mode prices don't work with live mode keys

**Profile not found after OAuth:**
- Check that `ensureProfile` action is called in auth callback
- Verify RLS policies allow profile creation

**Webhook not processing:**
- Check `STRIPE_WEBHOOK_SECRET` matches your endpoint
- Verify webhook is registered in Stripe dashboard
- Check Supabase service role key is set

**Rate limiting in development:**
- Rate limits are in-memory, restart server to reset
- Or increase limits in `/lib/rate-limit/index.ts`

---

## Architecture Decisions

### Why Next.js App Router?
- Server Components for better performance
- Built-in streaming and suspense
- Simplified data fetching with server actions

### Why Supabase?
- PostgreSQL with real-time subscriptions
- Built-in auth with RLS
- Edge functions for serverless compute

### Why Stripe?
- Industry-standard payment processing
- Webhook-driven architecture
- Strong Australia/healthcare compliance

---

## Contributing

1. Create feature branch from `main`
2. Make changes with tests
3. Run `pnpm build` to verify
4. Submit PR with description

### Code Style
- Use TypeScript strict mode
- Prefer server components where possible
- Use `logger` utility instead of `console.log`
- Follow existing patterns for new features
