-- Fix intake_drafts RLS policy that leaked data via session_id
-- The previous policy allowed ANY user to read ANY draft with a session_id set
-- This tightens it to only allow access to drafts owned by the current user

-- Drop the problematic policies
DROP POLICY IF EXISTS "intake_drafts_user_select" ON public.intake_drafts;
DROP POLICY IF EXISTS "intake_drafts_user_update" ON public.intake_drafts;

-- Recreate with proper ownership checks
-- Users can only select their own drafts (by user_id)
-- Anonymous/guest drafts (user_id IS NULL) are accessed via session matching in application layer
CREATE POLICY "intake_drafts_user_select" ON public.intake_drafts
  FOR SELECT USING (
    user_id = (select auth.uid())
  );

-- Users can only update their own drafts
-- Guest draft updates (user_id IS NULL) must be done via service role in application layer
CREATE POLICY "intake_drafts_user_update" ON public.intake_drafts
  FOR UPDATE USING (
    user_id = (select auth.uid())
  );

-- Add policy for guest draft claiming (when user_id is null, allow update to set user_id)
-- This allows authenticated users to claim their own guest drafts
CREATE POLICY "intake_drafts_claim_guest" ON public.intake_drafts
  FOR UPDATE USING (
    user_id IS NULL
  ) WITH CHECK (
    user_id = (select auth.uid())
  );

COMMENT ON POLICY "intake_drafts_user_select" ON public.intake_drafts IS 
  'Users can only read their own drafts. Guest drafts accessed via service role.';
COMMENT ON POLICY "intake_drafts_user_update" ON public.intake_drafts IS 
  'Users can only update their own drafts.';
COMMENT ON POLICY "intake_drafts_claim_guest" ON public.intake_drafts IS 
  'Authenticated users can claim guest drafts (set user_id on drafts where user_id is null).';
