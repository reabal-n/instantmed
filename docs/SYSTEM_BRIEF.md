# System Brief — Lumen Health

• Production domain: https://www.lumenhealth.com.au (previously instantmed.com.au)
• Hosting: Vercel (project name: lumen-health)
• Auth: Supabase Auth (email/password + Google)
• Database: Supabase Postgres
• Emails: Resend via Supabase SMTP (sender: hello@lumenhealth.com.au)
• Payments: Stripe Checkout
• DB invariant: profiles.auth_user_id == auth.users.id (1 row per user)
• RLS: enabled on all tables, policies must be minimal + deterministic
• Profile creation: server-side only using service role (idempotent upsert)
• Error handling: never show "temporarily unavailable" without logging exact failing step
