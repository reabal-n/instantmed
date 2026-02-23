# System Brief — InstantMed

• Production domain: https://instantmed.com.au
• Hosting: Vercel (project name: instantmed)
• Auth: Clerk (email/password + Google OAuth)
• Auth bridge: Clerk JWT forwarded to Supabase via custom JWT template — Supabase RLS policies validate the Clerk-issued `sub` claim
• Database: Supabase Postgres
• Emails: Resend via Supabase SMTP (sender: hello@instantmed.com.au)
• Payments: Stripe Checkout
• DB invariant: profiles.auth_user_id == Clerk user ID (1 row per user)
• RLS: enabled on all tables, policies must be minimal + deterministic
• Profile creation: server-side only using service role (idempotent upsert)
• Error handling: never show "temporarily unavailable" without logging exact failing step
• Privacy compliance: Australian Privacy Act 1988 / Health Records Act 2001 (Vic) — HIPAA does not apply
