# Clerk Dashboard Redirect Configuration

## Required Configuration for Sign-In Redirect Fix

After updating the sign-in flow to redirect through `/auth/callback`, you need to ensure Clerk Dashboard allows this redirect URL.

### Step 1: Update Account Portal Redirects

Based on your current Clerk Dashboard configuration, you need to update the **fallback redirect URLs**:

1. Go to **Account Portal** → **Redirects** tab in Clerk Dashboard
2. Update the following fields:

   **After sign-up fallback:**
   ```
   https://instantmed.com.au/auth/callback
   ```
   *(Currently set to: `instantmed.com.au/patient/onboarding`)*

   **After sign-in fallback:**
   ```
   https://instantmed.com.au/auth/callback
   ```
   *(Currently set to: `instantmed.com.au/patient`)*

   **After logo click:** (Optional - can leave as is)
   ```
   https://instantmed.com.au/home
   ```
   *(This is fine as-is)*

**Why this change?**
- The current fallbacks hardcode `/patient` and `/patient/onboarding`, which won't work for doctors
- By redirecting to `/auth/callback`, our callback route can check the user's role and redirect appropriately:
  - Patients → `/patient` or `/patient/onboarding`
  - Doctors → `/doctor`

### Step 2: Configure Allowed Redirect URLs (if needed)

Some Clerk configurations also require adding URLs to an "Allowed redirect URLs" list:

1. Navigate to **Paths** → **Redirect URLs** (or **Settings** → **Redirect URLs**)
2. Ensure these URLs are in the **Allowed redirect URLs** list:

   **For Development:**
   ```
   http://localhost:3000/auth/callback
   ```

   **For Production:**
   ```
   https://instantmed.com.au/auth/callback
   ```

### Step 3: Verify Custom Domain Configuration (if applicable)

If you're using a custom Clerk domain (`accounts.instantmed.com.au`):

1. Go to **Domains** in Clerk Dashboard
2. Ensure your custom domain is properly configured
3. Verify that redirects from the custom domain to your main app are allowed

### Step 3: Check Environment Variables (Optional)

The environment variables `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` are no longer critical since we're handling redirects through `/auth/callback`, but you can update them for consistency:

```env
# These are now handled by /auth/callback, but you can set them to:
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/auth/callback
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/auth/callback
```

**Note:** These environment variables are mainly used by Clerk's default redirect behavior. Since we're explicitly setting redirect URLs in the code, they're less critical, but updating them won't hurt.

### Step 4: Test the Flow

After configuring redirect URLs:

1. Visit `/sign-in` on your app
2. Sign in with an existing account
3. You should be redirected to:
   - **Patients**: `/patient` dashboard (or `/patient/onboarding` if not completed)
   - **Doctors**: `/doctor` dashboard

### Troubleshooting

**Issue**: Redirect to `/auth/callback` fails with "Invalid redirect URL"

**Solution**: 
- Check that `/auth/callback` is in the allowed redirect URLs list in Clerk Dashboard
- Ensure you're checking the correct environment (Development vs Production)
- Wait 1-2 minutes after adding URLs for changes to propagate

**Issue**: Users are redirected but see an error page

**Solution**:
- Check that the `/auth/callback` route is accessible (not blocked by middleware)
- Verify the route file exists at `app/auth/callback/route.ts`
- Check server logs for any errors in the callback route

**Issue**: Users are redirected to wrong dashboard

**Solution**:
- Verify user profiles have the correct `role` field set in your database
- Check that the callback route is properly fetching the profile role
- Ensure `onboarding_completed` is set correctly for patients

## Summary

**Required Actions:**

1. ✅ **Update Account Portal Redirects** (MOST IMPORTANT):
   - Change "After sign-up fallback" from `instantmed.com.au/patient/onboarding` → `instantmed.com.au/auth/callback`
   - Change "After sign-in fallback" from `instantmed.com.au/patient` → `instantmed.com.au/auth/callback`

2. ✅ **Add to Allowed Redirect URLs** (if this section exists in your Clerk Dashboard):
   - Add `https://instantmed.com.au/auth/callback` to the allowed list

**Optional Action**: Update environment variables for consistency (not strictly required since we're handling redirects explicitly in code).

