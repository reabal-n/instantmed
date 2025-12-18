-- Fix profiles role constraint to allow 'admin' role
-- Previously only allowed 'patient' and 'doctor'

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['patient'::text, 'doctor'::text, 'admin'::text]));
