-- Fix overly permissive INSERT policy on intake_events
-- The current policy allows any insert (WITH CHECK true), which is a security risk
-- Restrict to service role only by checking that the session role is 'service_role'

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service role can insert events" ON public.intake_events;

-- Create a more restrictive policy that only allows service role inserts
-- This is enforced by checking auth.role() = 'service_role'
CREATE POLICY "Service role can insert events" ON public.intake_events
  FOR INSERT
  WITH CHECK (
    -- Only allow inserts from service role (server-side operations)
    auth.role() = 'service_role'
  );

-- Add a comment explaining the policy
COMMENT ON POLICY "Service role can insert events" ON public.intake_events IS 
  'Restricts INSERT to service role only. Events should only be created by server-side operations.';
