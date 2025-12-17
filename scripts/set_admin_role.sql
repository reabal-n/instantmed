-- Set admin role for me@reabal.ai
-- Run this in Supabase SQL Editor

-- First, find the profile by email from auth.users
UPDATE profiles
SET role = 'admin'
WHERE auth_user_id IN (
  SELECT id FROM auth.users WHERE email = 'me@reabal.ai'
);

-- Verify the update
SELECT p.id, p.full_name, p.role, u.email
FROM profiles p
JOIN auth.users u ON p.auth_user_id = u.id
WHERE u.email = 'me@reabal.ai';
