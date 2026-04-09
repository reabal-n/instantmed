# Clerk to Supabase Auth Migration

**Date:** 2026-04-09
**Status:** Design approved, implementation pending
**Timeline:** 8-10 days across 4 PRs
**Risk:** Medium (auth touches everything, but DB layer already supports Supabase Auth)

---

## Motivation

1. **Data sovereignty** — PHI-adjacent user data stays entirely within Supabase (AU servers)
2. **Vendor consolidation** — one fewer third-party vendor to manage; consistent with operator's other business
3. **RLS restoration** — baseline schema uses `auth.uid() = auth_user_id` for RLS; Clerk bypassed this entirely (service role everywhere). Migration restores proper defense-in-depth
4. **Cost** — eliminate Clerk billing; Supabase Auth is included in current plan
5. **Pre-launch timing** — zero production users means zero data migration risk

## Key Discovery

The database was **originally built for Supabase Auth**. Clerk was added later via migration `20250120000001_add_clerk_user_id.sql`:

- `auth_user_id UUID REFERENCES auth.users(id)` — original FK, used by all RLS policies
- `handle_new_user()` trigger — auto-creates profile on `auth.users` insert (still exists)
- `clerk_user_id TEXT` — added as parallel column, made `auth_user_id` nullable
- RLS policies patched to support both: `auth.uid() = auth_user_id OR clerk_user_id = requesting_clerk_user_id()`

**This is a migration BACK, not a migration TO.** The DB layer is ready.

---

## Auth Method

**Primary:** Email magic link via `supabase.auth.signInWithOtp()`
**Secondary:** Google OAuth via `supabase.auth.signInWithOAuth({ provider: 'google' })`
**No passwords.** Zero friction for health patients. No forgot-password flow to build.

---

## Architecture

```
Before:  Browser -> ClerkProvider -> Clerk API -> clerk_user_id -> profiles (via service role)
After:   Browser -> SupabaseAuthProvider -> Supabase Auth -> auth_user_id -> profiles (via auth client + RLS)
```

### Session Management

- `@supabase/ssr` for cookie-based sessions in Next.js App Router
- Middleware refreshes tokens on every request (same as Clerk did)
- `createServerClient()` in server components/actions reads session from cookies
- `createBrowserClient()` in client components for real-time auth state

### Auth Abstraction Layer

`lib/auth.ts` is the chokepoint — ~30 API routes and all server actions call:
- `requireRole()` / `requireRoleOrNull()` — redirecting/non-redirecting role checks
- `getApiAuth()` / `requireApiAuth()` / `requireApiRole()` — API route auth
- `getAuthenticatedUserWithProfile()` — core function, cached per render
- `getOrCreateAuthenticatedUser()` — onboarding/first-login flow
- `getCurrentUser()` — lightweight auth check without profile

All of these currently call `clerkAuth()` + `currentUser()`. Rewriting this one file swaps the engine for the entire server-side.

### Client-Side Hooks (13 components)

Current Clerk hooks and their Supabase replacements:

| Clerk | Supabase Equivalent | Files |
|-------|-------------------|-------|
| `useUser()` | Custom `useAuth()` hook wrapping `supabase.auth.getUser()` | 7 components |
| `useAuth()` | Custom `useAuth()` hook | 3 components |
| `useClerk()` → `signOut()` | `supabase.auth.signOut()` | 4 components |
| `useClerk()` → `openSignIn()` | `router.push('/sign-in')` | 1 component |
| `<ClerkProvider>` | `<SupabaseAuthProvider>` | root layout |

### Custom Provider Design

```tsx
// lib/supabase/auth-provider.tsx
interface AuthContext {
  user: User | null
  profile: Profile | null
  isLoaded: boolean
  isSignedIn: boolean
  signOut: () => Promise<void>
}
```

Mirrors Clerk's API surface so component swaps are mechanical.

---

## Migration Phases

### PR 1 — Foundation (additive, nothing breaks)

| Task | Files | Risk |
|------|-------|------|
| Add `@supabase/ssr` package | package.json | None |
| Create `lib/supabase/middleware.ts` helper | New file | None |
| Create `lib/supabase/auth-provider.tsx` + `useAuth()` hook | New file | None |
| Create `lib/supabase/server.ts` (createServerClient) | New file | None |
| Create `lib/supabase/client.ts` (createBrowserClient) | New file | None |
| Build `/sign-in` page (Morning Canvas, magic link + Google) | New file | None |
| Build `/sign-up` page (Morning Canvas) | New file | None |
| Build `/auth/callback` route (handle magic link + OAuth) | Modify existing | Low |
| Build `/auth/confirm` page ("check your inbox" state) | New file | None |
| Configure Google OAuth in Supabase dashboard | External | None |
| Verify `handle_new_user()` trigger still works | DB check | None |

**Gate:** All new pages render, magic link + Google OAuth work in dev. Clerk still active.

### PR 2 — Server-Side Swap

| Task | Files | Risk |
|------|-------|------|
| Rewrite `lib/auth.ts` — replace `clerkAuth()`/`currentUser()` with `supabase.auth.getUser()` | 1 file (~500 lines) | Medium |
| Rewrite `middleware.ts` — replace `clerkMiddleware()` with Supabase session refresh | 1 file | Medium |
| Update `lib/stripe/guest-checkout.ts` — link via `auth_user_id` instead of `clerk_user_id` | 1 file | Low |
| Update E2E test bypass — adapt cookie for Supabase session | 2 files | Low |
| Update `app/actions/ensure-profile.ts` | 1 file | Low |
| Update `app/actions/create-profile.ts` | 1 file | Low |
| Update all API routes using direct `clerkAuth()` imports | ~10 files | Low (mechanical) |

**Gate:** All protected routes work. E2E auth tests pass. Guest checkout works.

### PR 3 — Client-Side Swap

| Task | Files | Risk |
|------|-------|------|
| Replace `<ClerkProvider>` with `<SupabaseAuthProvider>` in root layout | 1 file | Medium |
| Swap `useUser()` → `useAuth()` in 7 components | 7 files | Low |
| Swap `useAuth()` in 3 components | 3 files | Low |
| Swap `useClerk().signOut()` → `supabase.auth.signOut()` in 4 components | 4 files | Low |
| Swap `useClerk().openSignIn()` → `router.push('/sign-in')` | 1 file | Low |
| Update PostHog user identification (`posthog-provider.tsx`) | 1 file | Low |
| Update auth callback/complete-account pages | 2 files | Low |

**Gate:** All pages render. Sign-in/sign-out works. PostHog identifies users.

### PR 4 — Cleanup

| Task | Files | Risk |
|------|-------|------|
| Remove `@clerk/nextjs` from package.json | 1 file | None |
| Delete `app/api/webhooks/clerk/route.ts` | 1 file | None |
| Remove `CLERK_*` env vars from .env.example, Vercel, docs | Multiple | None |
| Migration: make `auth_user_id` NOT NULL again, drop Clerk helper function | 1 SQL file | Low |
| Keep `clerk_user_id` as nullable archive column for 90 days | — | None |
| Update CLAUDE.md, SECURITY.md, OPERATIONS.md, ARCHITECTURE.md | 4 files | None |
| Remove `requesting_clerk_user_id()` SQL function | 1 SQL file | Low |
| Simplify RLS policies to remove Clerk OR clauses | 1 SQL file | Low |

**Gate:** `@clerk/nextjs` not in lockfile. No CLERK_* env vars. Build passes. Full E2E green.

---

## Sign-In Page Design

Premium, minimal design matching Linear/Stripe pattern:

```
┌─────────────────────────────────────────┐
│                                         │
│              [InstantMed Logo]          │
│                                         │
│          Welcome back                   │
│    Sign in to your account              │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  your@email.com                 │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │     Continue with email    →    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ──────────── or ────────────           │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  [G]  Continue with Google      │    │
│  └─────────────────────────────────┘    │
│                                         │
│    No password needed.                  │
│    We'll email you a sign-in link.      │
│                                         │
│    Don't have an account? Sign up       │
│                                         │
└─────────────────────────────────────────┘
```

- Morning Canvas background
- Centered card with solid depth pattern
- Animated success state → "Check your inbox" with email icon animation
- Error states for rate limiting, invalid email
- Mobile-responsive (full-width on small screens)

---

## Database Changes

### Migration: Restore auth_user_id (PR 4)

```sql
-- Make auth_user_id NOT NULL again (all users now have Supabase Auth entries)
ALTER TABLE public.profiles ALTER COLUMN auth_user_id SET NOT NULL;

-- Drop Clerk helper function
DROP FUNCTION IF EXISTS public.requesting_clerk_user_id();

-- Simplify RLS policies back to auth.uid() only
-- (remove OR clerk_user_id clauses)

-- Keep clerk_user_id as nullable archive for 90 days
-- ALTER TABLE public.profiles DROP COLUMN clerk_user_id; -- run after 90 days
```

### handle_new_user() trigger

Already exists in baseline migration. Auto-creates profile on `auth.users` insert:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (auth_user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

May need updating to handle magic link metadata (first_name, last_name, avatar_url).

---

## Guest Checkout Flow

Current: Creates profile with `clerk_user_id = NULL`, links later by email match in `getOrCreateAuthenticatedUser()`.

After: Same pattern, but linking sets `auth_user_id` instead of `clerk_user_id`. The `handle_new_user()` trigger fires on `signUp()`, which may conflict if a guest profile already exists. Handle with:

1. Check for existing profile by email before trigger fires
2. If guest profile exists → update `auth_user_id`, don't insert new row
3. If no profile → trigger creates one normally

This requires updating the `handle_new_user()` trigger to use `ON CONFLICT`:

```sql
INSERT INTO public.profiles (auth_user_id, email, full_name, role)
VALUES (NEW.id, NEW.email, ...)
ON CONFLICT (email) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id,
    email_verified = true,
    email_verified_at = NOW();
```

---

## Rate Limiting

Layer Upstash Redis rate limiting on auth endpoints:
- Magic link request: 5 per email per 15 minutes
- OAuth callback: 10 per IP per minute
- Supabase Auth has built-in limits but they're generous

---

## E2E Test Bypass

Current: `__e2e_auth_user_id` cookie + `PLAYWRIGHT=1` env var.

After: Same pattern, but the cookie value maps to a Supabase Auth test user UUID instead of a Clerk user ID. The bypass in `lib/auth.ts` and `middleware.ts` stays structurally identical.

---

## Packages

| Action | Package | Version |
|--------|---------|---------|
| Add | `@supabase/ssr` | Latest |
| Remove | `@clerk/nextjs` | 7.0.8 (currently installed) |

`@supabase/supabase-js` is already installed.

---

## Env Var Changes

| Remove | Add |
|--------|-----|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | (none — Supabase keys already configured) |
| `CLERK_SECRET_KEY` | |
| `CLERK_WEBHOOK_SECRET` | |

Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are already configured.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Session refresh timing | Users logged out unexpectedly | `@supabase/ssr` middleware handles refresh; test with short token TTL |
| Guest checkout linking race | Duplicate profiles | `ON CONFLICT` in trigger + application-level dedup |
| RLS policy gaps | Data access errors | Keep service role as fallback; restore RLS incrementally |
| Magic link email deliverability | Users can't sign in | Supabase uses built-in email; add custom SMTP (Resend) if needed |
| Preview browser still can't render | Dev verification blocked | SupabaseAuthProvider can skip auth in dev when `PREVIEW_MODE=1` |

---

## Out of Scope

- Migrating existing production users (none exist — pre-launch)
- RLS-aware client usage (keep service role pattern for now, add RLS clients post-launch)
- Apple Sign-In (add post-launch if iOS app planned)
- MFA/2FA (not needed for launch; Supabase Auth supports it when ready)
- Custom SMTP for auth emails (use Supabase built-in initially)

---

## Success Criteria

1. All auth flows work: sign-in, sign-up, sign-out, guest checkout, account linking
2. All protected routes enforced: patient, doctor, admin portals
3. E2E test suite passes (93 tests)
4. Production build passes
5. Zero `@clerk/nextjs` imports in codebase
6. `auth_user_id` populated for all new users
7. RLS policies functional with `auth.uid()`
