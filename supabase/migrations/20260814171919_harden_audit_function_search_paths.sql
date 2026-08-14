-- Resolve the ten mutable-search-path warnings from the 2026-08-15 Supabase
-- security-advisor audit without replacing function bodies, changing
-- SECURITY INVOKER/DEFINER posture, or widening any existing EXECUTE grants.
-- `public` is safe in this project because CREATE is revoked from PUBLIC,
-- anon, authenticated, and service_role; `pg_temp` stays last.

ALTER FUNCTION public.increment_cron_run_count()
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.set_profile_referral_code()
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.tg_intake_followups_touch()
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.tg_partial_intakes_set_updated_at()
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.guard_issued_certificate_status_change()
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.normalize_au_phone(text)
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.tg_profiles_identity_normalize()
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.increment_auto_approval_attempts(uuid)
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.prevent_role_change()
  SET search_path TO public, pg_temp;
ALTER FUNCTION public.upsert_exit_intent_capture(text, text)
  SET search_path TO public, pg_temp;

-- The manual-delivery ledger's actor FK is intentionally nullable and
-- append-only, but still needs an index so profile maintenance does not scan
-- the entire evidence ledger.
CREATE INDEX certificate_delivery_reconciliations_recorded_by_idx
  ON public.certificate_delivery_reconciliations (recorded_by)
  WHERE recorded_by IS NOT NULL;
