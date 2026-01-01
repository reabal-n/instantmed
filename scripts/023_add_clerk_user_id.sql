-- ============================================================================
-- ADD CLERK USER ID TO PROFILES
-- Version: 1.0.0
-- Purpose: Support Clerk authentication alongside existing auth
-- ============================================================================

-- Add clerk_user_id column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS clerk_user_id TEXT UNIQUE;

-- Create index for Clerk user lookups
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id 
ON profiles(clerk_user_id) 
WHERE clerk_user_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN profiles.clerk_user_id IS 'Clerk user ID for authentication. Format: user_xxxxx';

-- Note: Existing users will have NULL clerk_user_id
-- They can be migrated manually or on next login
