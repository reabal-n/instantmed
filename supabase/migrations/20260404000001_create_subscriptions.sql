-- Create subscriptions table for repeat script subscription system
-- Tracks Stripe subscription state, billing periods, and remaining credits

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id),
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'cancelled', 'paused')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  credits_remaining integer NOT NULL DEFAULT 1,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_profile_id ON public.subscriptions(profile_id);
-- stripe_subscription_id already has a unique index from the UNIQUE constraint
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_active ON public.subscriptions(status)
  WHERE status = 'active';

-- RLS
-- Access is controlled via service_role key in server actions / API routes.
-- We use Clerk for auth (not Supabase Auth), so auth.uid() is not available.
-- RLS is enabled but no permissive policies are added — only service_role bypasses RLS.
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-update updated_at on row changes (reuses existing function)
DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
