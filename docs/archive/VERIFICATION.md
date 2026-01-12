# InstantMed Verification Checklist

Use this checklist to verify all features are working correctly locally and on Vercel.

## Prerequisites

### Environment Variables

Ensure these are set in `.env.local` (local) and Vercel dashboard (production):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or https://your-domain.vercel.app
```

---

## A) Service Landing Pages

### Routes to Test

| Route | Expected Content |
|-------|-----------------|
| `/medical-certificates` | Medical certificates landing page with hero, how-it-works, eligibility, pricing, FAQ |
| `/weight-loss` | Weight management landing page |
| `/mens-health` | Men's health landing page |
| `/common-scripts` | Prescription renewals landing page |
| `/prescriptions` | Prescriptions landing page (alias) |

### Test Steps

- [ ] Visit each service landing page
- [ ] Verify hero section loads with correct image
- [ ] Verify "Get Started" CTA routes to `/start?service=<flowSlug>`
- [ ] Verify FAQ accordion expands/collapses
- [ ] Verify all sections render (hero, proof strip, how-it-works, eligibility, pricing, FAQ, final CTA)
- [ ] Test mobile responsiveness (resize browser or use DevTools)
- [ ] Verify no console errors

### CTA Routing Test

For each page, click the primary CTA and verify:

| Page | Expected URL |
|------|-------------|
| Medical Certificates | `/start?service=medical-certificate` |
| Weight Loss | `/start?service=weight-management` |
| Men's Health | `/start?service=mens-health` |
| Common Scripts | `/start?service=common-scripts` |
| Prescriptions | `/start?service=common-scripts` |

---

## B) Onboarding Flow

### Test Scenarios

#### 1. Fresh Start (No Draft)

- [ ] Visit `/start`
- [ ] Verify ServiceStep renders with 5 service options
- [ ] Select a service → Should auto-advance to Questions step
- [ ] Verify URL updates to include `?service=<slug>`

#### 2. Service Pre-selection

- [ ] Visit `/start?service=medical-certificate`
- [ ] Verify flow starts at Questions step (skips service selection)
- [ ] Verify correct questionnaire loads

#### 3. Questions Step

- [ ] Complete safety screening section
- [ ] Verify accordion sections expand/collapse
- [ ] Verify progress bar updates as sections complete
- [ ] Verify "Continue" button enables when all required fields are complete
- [ ] Test inline validation - leave required field empty and try to continue

#### 4. Details Step

- [ ] Verify personal info form renders
- [ ] Verify Google OAuth button works (see Auth section)
- [ ] Verify email/OTP flow works
- [ ] Verify consent checkboxes are required
- [ ] Verify "Continue to Payment" enables when complete

#### 5. Draft Persistence

- [ ] Start a new request, fill some fields
- [ ] Refresh the page
- [ ] Verify resume prompt appears
- [ ] Click "Continue" → Should restore progress
- [ ] Test "Start Fresh" → Should reset

#### 6. Autosave

- [ ] Open browser DevTools → Network tab
- [ ] Fill fields in questionnaire
- [ ] Verify POST/PATCH requests to `/api/flow/drafts`
- [ ] Verify save indicator shows "Saving..." then "Saved"

#### 7. Mobile Testing

- [ ] Test on mobile viewport (375px width)
- [ ] Verify touch targets are large enough
- [ ] Verify keyboard doesn't obscure inputs
- [ ] Verify sticky CTA is visible

---

## C) Authentication

### Google OAuth Setup

#### Supabase Configuration

1. Go to Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider
3. Add these redirect URLs:
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.vercel.app/auth/callback`

#### Google Cloud Console

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Add Authorized redirect URIs:
   - `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase

### Auth Test Scenarios

#### 1. Google OAuth (Login Page)

- [ ] Visit `/auth/login`
- [ ] Click "Continue with Google"
- [ ] Complete Google sign-in
- [ ] Verify redirect to `/patient` or redirect URL

#### 2. Google OAuth (Onboarding Flow)

- [ ] Start a request at `/start`
- [ ] Progress to Details step
- [ ] Click "Continue with Google"
- [ ] Verify draft is preserved after OAuth
- [ ] Verify redirect back to flow continues

#### 3. Email/OTP Flow

- [ ] Visit `/auth/login` or Details step
- [ ] Enter email and click continue
- [ ] Check email for OTP
- [ ] Enter OTP → Verify sign-in completes

#### 4. Session Persistence

- [ ] Sign in
- [ ] Close browser completely
- [ ] Reopen and visit `/account`
- [ ] Verify still signed in (session persisted)

---

## D) Stripe Integration

### Test Mode Setup

1. Use Stripe test keys (starting with `sk_test_` and `pk_test_`)
2. For webhooks:
   - Local: Use Stripe CLI with `stripe listen --forward-to localhost:3000/src/app/api/webhooks/stripe/route`
   - Production: Configure webhook endpoint in Stripe Dashboard

### Test Cards

| Scenario | Card Number |
|----------|------------|
| Success | 4242424242424242 |
| Declined | 4000000000000002 |
| Requires Auth | 4000002500003155 |

### Test Scenarios

#### 1. Checkout Flow

- [ ] Complete onboarding to payment step
- [ ] Click "Continue to Payment"
- [ ] Verify Stripe Checkout loads
- [ ] Use test card `4242424242424242`
- [ ] Complete payment
- [ ] Verify redirect to `/checkout/success`

#### 2. Webhook Verification

- [ ] Make a test payment
- [ ] Check server logs for webhook events
- [ ] Verify intake status updated to `paid`
- [ ] Verify `sla_deadline` is set

#### 3. Account Status

- [ ] After payment, visit `/account`
- [ ] Verify request shows with "paid" status
- [ ] Click request → Should show details

#### 4. Payment Failure

- [ ] Use declined card `4000000000000002`
- [ ] Verify error message displayed
- [ ] Verify intake status shows `failed`

### Webhook Testing (Local)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/src/app/api/webhooks/stripe

# Note the webhook secret (whsec_xxx) and add to .env.local
```

---

## E) RBAC Admin Guard

### Test Scenarios

#### 1. Unauthorized Access

- [ ] Sign in as a patient (role=patient)
- [ ] Try to visit `/doctor` or `/admin`
- [ ] Verify "Access Denied" page shows
- [ ] Verify redirect buttons work

#### 2. Authorized Access

- [ ] Sign in as admin (role=admin)
- [ ] Visit `/doctor` → Should load
- [ ] Visit admin routes → Should load

#### 3. Role Check

```sql
-- Check your user's role in Supabase
SELECT role FROM profiles WHERE auth_user_id = 'your-user-id';

-- Update to admin for testing
UPDATE profiles SET role = 'admin' WHERE auth_user_id = 'your-user-id';
```

---

## F) Common Issues & Solutions

### OAuth Redirect Mismatch

**Error**: "redirect_uri_mismatch"

**Solution**: 
- Verify redirect URLs match exactly in Supabase and Google Cloud Console
- Check for trailing slashes
- Ensure protocol matches (http vs https)

### Webhook Signature Failed

**Error**: "Invalid signature"

**Solution**:
- Use correct webhook secret for environment
- Local: Use Stripe CLI webhook secret
- Production: Use Stripe Dashboard webhook secret

### Draft Not Resuming

**Possible causes**:
1. Session ID mismatch
2. Draft expired
3. localStorage cleared

**Debug**:
```javascript
// Check localStorage
console.log(localStorage.getItem('instantmed-flow'))

// Check for drafts
fetch('/api/flow/drafts?sessionId=xxx')
```

### Hydration Errors

**Error**: "Text content does not match server-rendered HTML"

**Solution**:
- Wrap client-only content in `useEffect`
- Use `suppressHydrationWarning` for timestamps
- Check for browser-only APIs used in SSR

---

## G) Production Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel
- [ ] Stripe webhook configured with production URL
- [ ] Google OAuth configured with production redirect URL
- [ ] Test complete flow end-to-end on Vercel preview
- [ ] Check all images load (verify Unsplash URLs work)
- [ ] Test on real mobile device
- [ ] Verify emails send (configure email provider)
- [ ] Enable RLS policies in Supabase if not already

---

## File Tree (New/Modified Files)

```
src/
├── lib/
│   └── marketing/
│       └── services.ts              # Service landing page configs
├── components/
│   ├── marketing/
│   │   ├── service-landing-page.tsx # Service page template
│   │   └── index.ts                 # Updated exports
│   ├── flow/
│   │   ├── flow-cta.tsx             # Improved intelligent CTA
│   │   └── steps/
│   │       └── auth-step.tsx        # Added Google OAuth
│   ├── admin/
│   │   └── admin-guard.tsx          # RBAC guard component
│   └── icons/
│       └── google-icon.tsx          # Google icon (existing)
app/
├── medical-certificates/
│   └── page.tsx                     # Medical certs service page
├── weight-loss/
│   └── page.tsx                     # Weight loss service page
├── mens-health/
│   └── page.tsx                     # Men's health service page
├── common-scripts/
│   └── page.tsx                     # Common scripts service page
├── prescriptions/
│   └── page.tsx                     # Prescriptions service page
├── account/
│   └── page.tsx                     # Account status page
└── start/
    ├── page.tsx                     # Updated to use unified flow
    └── unified-flow-client.tsx      # Flow client component
```

---

## Support

If you encounter issues:

1. Check browser console for errors
2. Check server logs (Vercel Functions logs)
3. Verify environment variables
4. Test in incognito mode (clear cache/cookies)
