# Clerk OAuth Setup Guide

This guide explains how to enable OAuth providers (Google, etc.) in your Clerk dashboard so they appear on the sign-in page.

## Quick Setup Steps

### 1. Enable OAuth Providers in Clerk Dashboard

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **User & Authentication** → **Social Connections**
4. Enable the providers you want (e.g., Google, GitHub, etc.)
5. For each provider:
   - Click on the provider (e.g., "Google")
   - Enable it
   - Configure the OAuth credentials:
     - **Google**: You'll need to create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
     - Add authorized redirect URIs:
       - Development: `http://localhost:3000`
       - Production: `https://instantmed.com.au`
   - Copy the Client ID and Client Secret to Clerk

### 2. Verify Environment Variables

Ensure these are set in your `.env.local` (development) or Vercel environment variables (production):

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### 3. Test OAuth Sign-In

1. Visit `/sign-in` in your application
2. You should now see OAuth provider buttons (e.g., "Continue with Google")
3. Click the button and complete the OAuth flow
4. Verify you're redirected back to your application after authentication

## Troubleshooting

### OAuth buttons not showing?

If Google is enabled in Clerk Dashboard but buttons aren't appearing:

1. **Verify Provider Settings in Clerk Dashboard**:
   - Go to **User & Authentication** → **Social Connections** → **Google**
   - Ensure **"Enable for sign-up and sign-in"** is toggled ON
   - If using custom credentials, verify Client ID and Client Secret are correct
   - Check that the provider shows as "Active" or "Enabled"

2. **Check Browser Console**:
   - Open browser DevTools (F12) → Console tab
   - Look for any Clerk-related errors
   - Check for network errors when loading the sign-in page

3. **Verify Environment Variables**:
   - Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly
   - Ensure `CLERK_SECRET_KEY` is set correctly
   - Restart your development server after changing env variables

4. **Clear Browser Cache**:
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Or try incognito/private browsing mode

5. **Check Clerk Dashboard Environment**:
   - Ensure you're checking the correct environment (Development vs Production)
   - OAuth providers must be enabled separately for each environment

6. **Verify Redirect URIs**:
   - In Clerk Dashboard → **Paths** → Check that your sign-in path matches `/sign-in`
   - In Google Cloud Console, ensure redirect URIs match Clerk's requirements

### OAuth redirect not working?

- **Check Redirect URIs**: Ensure your application URL is added to Clerk's allowed redirect URIs
- **Check Environment**: Make sure you're using the correct Clerk keys for your environment (test vs. production)
- **Verify Google Cloud Console**: Ensure authorized redirect URIs include your domain

## Code Configuration

The code is already configured to support OAuth providers:

- **Sign-In Page**: `/app/sign-in/[[...sign-in]]/page.tsx` - Uses Clerk's `<SignIn>` component
- **Sign-Up Page**: `/app/sign-up/[[...sign-up]]/page.tsx` - Uses Clerk's `<SignUp>` component
- **Layout**: `/app/layout.tsx` - Wraps app with `<ClerkProvider>`

OAuth providers will automatically appear once enabled in the Clerk dashboard. No code changes are needed.

## Additional Resources

- [Clerk OAuth Documentation](https://clerk.com/docs/authentication/social-connections)
- [Google OAuth Setup Guide](https://clerk.com/docs/authentication/social-connections/google)

