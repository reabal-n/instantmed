# Clerk Email/Password Authentication Setup Guide

## Issue: Email/Password Fields Not Showing on Sign-In Page

If the sign-in page doesn't show email/password fields, it's likely because email/password authentication is not enabled in your Clerk Dashboard.

## Quick Fix: Enable Email/Password in Clerk Dashboard

### Step 1: Access Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Sign in with your Clerk account
3. Select your InstantMed application

### Step 2: Enable Email/Password Authentication

1. Navigate to **User & Authentication** → **Email, Phone, Username**
2. Under **Email address**, ensure:
   - ✅ **"Email address"** is enabled
   - ✅ **"Email address verification"** is enabled (recommended)
3. Under **Password**, ensure:
   - ✅ **"Password"** is enabled
   - ✅ **"Password strength requirements"** is configured (recommended: Medium or Strong)

### Step 3: Verify Sign-In Options

1. Navigate to **User & Authentication** → **Sign-in options**
2. Ensure these are enabled:
   - ✅ **"Sign in with email"**
   - ✅ **"Sign in with password"**
   - ✅ **"Sign in with email address"** (if separate option exists)

### Step 4: Check Environment Variables

Ensure these environment variables are set in your Vercel dashboard (for production) or `.env.local` (for development):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...  # Use pk_live_ for production, pk_test_ for development
CLERK_SECRET_KEY=sk_live_...  # Use sk_live_ for production, sk_test_ for development
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

**Important:** Make sure you're using the correct keys for your environment:
- **Production**: Use keys from the **Production** environment in Clerk Dashboard
- **Development**: Use keys from the **Development** environment in Clerk Dashboard

### Step 5: Verify Configuration

1. After enabling email/password in Clerk Dashboard, wait 1-2 minutes for changes to propagate
2. Clear your browser cache or use incognito mode
3. Visit `/sign-in` on your live website
4. You should now see:
   - Email input field
   - Password input field
   - "Sign in" button
   - OAuth buttons (if enabled) above the email/password form

## Troubleshooting

### Still Not Showing Email/Password Fields?

1. **Check Browser Console**:
   - Open DevTools (F12) → Console tab
   - Look for Clerk-related errors
   - Check for network errors loading Clerk scripts

2. **Verify Clerk Keys**:
   - Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` starts with `pk_live_` (production) or `pk_test_` (development)
   - Ensure `CLERK_SECRET_KEY` starts with `sk_live_` (production) or `sk_test_` (development)
   - Keys must match the environment (production vs development)

3. **Check Clerk Dashboard Environment**:
   - Ensure you're checking settings in the correct environment (Production vs Development)
   - Email/password must be enabled separately for each environment

4. **Restart Application**:
   - After changing Clerk Dashboard settings, restart your Next.js application
   - If using Vercel, trigger a new deployment

5. **Check Clerk Status**:
   - Visit [Clerk Status Page](https://status.clerk.com) to check for service outages

### Common Issues

**Issue**: Only OAuth buttons showing, no email/password fields
- **Solution**: Email/password authentication is disabled in Clerk Dashboard. Follow Step 2 above.

**Issue**: Clerk component not loading at all
- **Solution**: Check that `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly and the page is using `"use client"` directive

**Issue**: "Invalid publishable key" error
- **Solution**: Verify the publishable key matches your Clerk application and environment

## Testing

After enabling email/password:

1. Visit `/sign-in`
2. You should see email and password input fields
3. Try signing in with an existing account
4. Try signing up with a new email address
5. Verify redirect works after sign-in

## Additional Resources

- [Clerk Email/Password Documentation](https://clerk.com/docs/authentication/configuration/sign-up-sign-in-options)
- [Clerk Troubleshooting Guide](https://clerk.com/docs/troubleshooting)
- [Clerk Status Page](https://status.clerk.com)

