-- Atomic profile merge function to prevent race conditions
-- When a guest user logs in, their guest profile data needs to be merged atomically

CREATE OR REPLACE FUNCTION merge_guest_profile(
  p_guest_profile_id UUID,
  p_authenticated_profile_id UUID
) RETURNS void AS $$
BEGIN
  -- Validate inputs
  IF p_guest_profile_id IS NULL OR p_authenticated_profile_id IS NULL THEN
    RAISE EXCEPTION 'Both profile IDs are required';
  END IF;
  
  IF p_guest_profile_id = p_authenticated_profile_id THEN
    RAISE EXCEPTION 'Cannot merge a profile with itself';
  END IF;

  -- Reassign intakes from guest to authenticated profile
  UPDATE intakes 
  SET patient_id = p_authenticated_profile_id 
  WHERE patient_id = p_guest_profile_id;
  
  -- Reassign notifications
  UPDATE notifications 
  SET user_id = p_authenticated_profile_id 
  WHERE user_id = p_guest_profile_id;
  
  -- Reassign any requests (legacy table)
  UPDATE requests 
  SET patient_id = p_authenticated_profile_id 
  WHERE patient_id = p_guest_profile_id;
  
  -- Delete the guest profile
  DELETE FROM profiles WHERE id = p_guest_profile_id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION merge_guest_profile FROM PUBLIC;
GRANT EXECUTE ON FUNCTION merge_guest_profile TO service_role;

COMMENT ON FUNCTION merge_guest_profile IS 'Atomically merges a guest profile into an authenticated profile, reassigning all related records';
