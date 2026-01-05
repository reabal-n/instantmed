# Production Setup Verification Guide

## 1. Google Search Console Verification Code

**How to get your verification code:**

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Click "Add Property" → "URL prefix"
3. Enter your domain: `https://www.instantmed.com.au`
4. Choose verification method: **HTML tag**
5. Copy the `content` value from the meta tag (looks like: `abc123def456ghi789`)
6. Update `app/layout.tsx` line 105:
   ```typescript
   verification: {
     google: "abc123def456ghi789", // Your actual code
   }
   ```

**Alternative:** If you've already verified via DNS or file upload, you can remove the verification meta tag entirely.

---

## 2. PostHog vs GA4

**Answer: You don't need GA4 if using PostHog**

PostHog provides:
- ✅ Pageview tracking
- ✅ Event tracking
- ✅ Funnel analysis
- ✅ Session recordings
- ✅ Feature flags
- ✅ A/B testing

**Recommendation:** Use PostHog only. It's more comprehensive and privacy-friendly.

**To add PostHog:**
1. Install: `pnpm add posthog-js`
2. Create `lib/analytics/posthog.ts`
3. Initialize in `app/layout.tsx`

---

## 3. Supabase Migrations

**To apply migrations to production:**

```bash
# Link to production Supabase project
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push

# Or apply specific migration
supabase migration up
```

**Verify migrations applied:**
```sql
-- Run in Supabase SQL Editor
SELECT 
  name,
  version,
  applied_at
FROM supabase_migrations.schema_migrations
ORDER BY applied_at DESC;
```

---

## 4. Set Admin Role

**Option 1: SQL Script (Recommended)**
```sql
-- Run in Supabase SQL Editor
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-admin-email@instantmed.com.au';
```

**Option 2: API Endpoint (Dev only)**
- Use `/api/admin/make-doctor?email=your-email` (only works in dev/preview)

**Option 3: Create script**
- See `scripts/set_admin_role_clerk.sql`

---

## 5. Verify Sentry

**Check Sentry is working:**
1. Go to Sentry dashboard
2. Check if project is linked to Vercel
3. Trigger a test error (add `throw new Error("test")` temporarily)
4. Verify error appears in Sentry

**Required env vars:**
- `NEXT_PUBLIC_SENTRY_DSN` ✅
- `SENTRY_ORG` ✅
- `SENTRY_PROJECT` ✅

---

## 6. Verify Rate Limiting

**Test Upstash Redis:**
```bash
# Check env vars are set
echo $UPSTASH_REDIS_REST_URL
echo $UPSTASH_REDIS_REST_TOKEN

# Test Redis connection (in Node.js)
node -e "
const { Redis } = require('@upstash/redis');
const redis = Redis.fromEnv();
redis.ping().then(console.log).catch(console.error);
"
```

**Expected:** `PONG` response

---

## 7. Verify Sitemap

**Test sitemap generation:**
```bash
# Build and test locally
pnpm build
pnpm start

# Visit: http://localhost:3000/sitemap.xml
```

**Or test in production:**
- Visit: `https://www.instantmed.com.au/sitemap.xml`
- Should return valid XML with all routes

---

## 8. Security Headers Verification

**Test headers:**
```bash
curl -I https://www.instantmed.com.au | grep -E "Content-Security-Policy|X-Frame-Options|Strict-Transport"
```

**Or use online tool:**
- https://securityheaders.com
- Enter your domain
- Should get A+ rating

---

## 9. Critical Flows Testing

### Patient Sign-up Flow
1. Visit `/sign-up`
2. Sign up with email
3. Verify email
4. Complete onboarding
5. ✅ Should redirect to `/patient`

### Google OAuth
1. Visit `/sign-up`
2. Click "Continue with Google"
3. Complete OAuth
4. ✅ Should create profile and redirect

### Medical Certificate Flow
1. Visit `/medical-certificate/new`
2. Complete intake form
3. Enter payment details
4. ✅ Should create request and redirect to Stripe

### Stripe Checkout
1. Complete intake form
2. Click "Continue to Payment"
3. Use test card: `4242 4242 4242 4242`
4. ✅ Should complete payment and redirect

### Webhook Processing
1. After payment, check Supabase `requests` table
2. ✅ `payment_status` should be `paid`
3. ✅ Request should be visible in doctor dashboard

### Doctor Dashboard
1. Login as doctor/admin
2. Visit `/doctor`
3. ✅ Should see pending requests
4. Click request → Review → Approve
5. ✅ Should generate PDF and send email

### PDF Generation
1. Approve a medical certificate
2. ✅ PDF should be generated
3. ✅ PDF URL should be in `documents` table
4. ✅ Patient should receive email with PDF link

### Email Notifications
1. Check Resend dashboard
2. ✅ Should see sent emails
3. ✅ Patient should receive:
   - Payment confirmation
   - Approval notification (with PDF)
   - Decline notification (if declined)

