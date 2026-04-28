-- Hard rule: an issued certificate's status can only move to 'revoked'.
-- 'expired' and 'superseded' are no longer used and must not be re-introduced
-- without an explicit migration. This trigger is a belt-and-braces guard so
-- that no rogue cron or admin script can silently mass-mutate cert status
-- away from 'valid' (which is what the deleted expire-certificates cron did).
--
-- Allowed transitions:
--   valid -> revoked  (must include revoked_at + revocation_reason — already
--                      enforced by the existing valid_revocation CHECK)
--   <any> -> <same>   (no-op, e.g. updating other columns)
--
-- Forbidden:
--   valid -> expired
--   valid -> superseded
--   revoked -> anything else
--
-- If you legitimately need to add a new status pathway in the future,
-- add a CASE branch here in a fresh migration. Do not bypass via service-role.

CREATE OR REPLACE FUNCTION public.guard_issued_certificate_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'valid' AND NEW.status = 'revoked' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Disallowed certificate status transition: % -> %. Only valid -> revoked is permitted. See migration 20260428000001.',
    OLD.status, NEW.status
    USING ERRCODE = '23514';
END;
$$;

DROP TRIGGER IF EXISTS guard_issued_certificate_status_change ON public.issued_certificates;
CREATE TRIGGER guard_issued_certificate_status_change
  BEFORE UPDATE OF status ON public.issued_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_issued_certificate_status_change();

COMMENT ON FUNCTION public.guard_issued_certificate_status_change IS
  'Defence-in-depth guard. Med certs do not expire — only revocation is allowed.';
