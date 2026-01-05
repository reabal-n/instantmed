-- Set admin role for a user by email (Clerk-based)
-- Run this in Supabase SQL Editor
-- Replace 'your-email@example.com' with the actual email

-- Update profile to admin role by email
UPDATE profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';

-- Verify the update
SELECT 
  id, 
  email, 
  full_name, 
  role, 
  clerk_user_id,
  created_at
FROM profiles
WHERE email = 'your-email@example.com';

-- If you need to set multiple admins:
-- UPDATE profiles
-- SET role = 'admin'
-- WHERE email IN (
--   'admin1@instantmed.com.au',
--   'admin2@instantmed.com.au'
-- );

