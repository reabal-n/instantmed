-- Set admin role for the primary admin user
-- This ensures the doctor/admin can access the doctor dashboard

UPDATE profiles
SET role = 'admin'
WHERE email = 'reabalnj@gmail.com';

-- Verify the update
SELECT id, email, role, clerk_user_id FROM profiles WHERE email = 'reabalnj@gmail.com';
