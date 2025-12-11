-- Add stripe_customer_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx ON public.profiles(stripe_customer_id);

-- No public RLS policy for stripe_customer_id - it should only be accessible via service role
-- Existing policies already restrict to own profile for patients
