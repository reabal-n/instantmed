-- Remove dead database artifacts that are no longer referenced in application code.
-- merge_guest_profile() and failed_profile_merges were part of an earlier guest-merge
-- feature that was removed. Only residual references exist in the auto-generated
-- types/database.ts file, which will be regenerated.

DROP FUNCTION IF EXISTS merge_guest_profile();
DROP TABLE IF EXISTS failed_profile_merges;
