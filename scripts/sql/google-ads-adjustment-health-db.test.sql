BEGIN;
CREATE FUNCTION pg_temp.assert_health(expected jsonb) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE actual jsonb;
BEGIN
  SELECT to_jsonb(h) INTO actual FROM public.google_ads_conversion_adjustment_claim_health h;
  IF NOT actual @> expected THEN
    RAISE EXCEPTION 'Health mismatch: expected %, got %', expected, actual;
  END IF;
END;
$$;

SELECT pg_temp.assert_health('{"unknown_outcome_count":0,"irreversible_zero_count":0,"expired_conversion_target_count":0,"legacy_zero_floor_only_count":0}');
INSERT INTO public.stripe_payment_adjustment_targets VALUES (1,2995,now()-interval '80 days',0,1);
INSERT INTO public.audit_logs(intake_id,action,metadata,created_at) VALUES
  (1,'google_ads_conversion_upload','{"status":"success","runtime_source":"vercel"}',now()-interval '20 days');
INSERT INTO public.google_ads_conversion_adjustment_claims(intake_id,generation,state,target_net_value_cents)
  VALUES (1,1,'succeeded',0);
SELECT pg_temp.assert_health('{"irreversible_zero_count":0,"expired_conversion_target_count":0,"legacy_zero_floor_only_count":1}');

-- Even one cent of actual reinstated cash remains blocked by Google's zero.
UPDATE public.stripe_payment_adjustment_targets SET exact_target_net_value_cents=1 WHERE intake_id=1;
SELECT pg_temp.assert_health('{"irreversible_zero_count":1,"expired_conversion_target_count":1,"legacy_zero_floor_only_count":0}');
DELETE FROM public.stripe_payment_adjustment_targets WHERE intake_id=1;
SELECT pg_temp.assert_health('{"irreversible_zero_count":1,"legacy_zero_floor_only_count":0}');
INSERT INTO public.stripe_payment_adjustment_targets VALUES (1,2995,now()-interval '80 days',0,1);

UPDATE public.google_ads_conversion_adjustment_claims SET state='resolved_not_counted' WHERE intake_id=1;
SELECT pg_temp.assert_health('{"irreversible_zero_count":0,"expired_conversion_target_count":0,"legacy_not_counted_floor_only_count":1}');
UPDATE public.google_ads_conversion_adjustment_claims SET completed_at=now()-interval '21 days';
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_not_counted_floor_only_count":0}');
UPDATE public.google_ads_conversion_adjustment_claims SET completed_at=NULL;
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_not_counted_floor_only_count":0}');
UPDATE public.google_ads_conversion_adjustment_claims SET completed_at=now();
-- An unresolved newer generation must not inherit an old resolved result.
INSERT INTO public.google_ads_conversion_adjustment_claims VALUES (1,2,'pending',1,now()-interval '80 hours',NULL,NULL);
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"stale_pending_count":1,"legacy_not_counted_floor_only_count":0}');
DELETE FROM public.google_ads_conversion_adjustment_claims;

-- No claim is not resolution. Require an observed, exact-target provider miss.
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_post_grace_not_counted_count":0}');
INSERT INTO public.audit_logs(intake_id,action,metadata,created_at) VALUES
  (1,'google_ads_conversion_adjustment',
   '{"status":"terminal_failed","runtime_source":"vercel","error_code":"conversionAdjustmentUploadError:CONVERSION_NOT_FOUND","adjustment_type":"RETRACTION","target_net_value_cents":0}',
   now()-interval '17 days'+interval '1 second');
SELECT pg_temp.assert_health('{"expired_conversion_target_count":0,"legacy_post_grace_not_counted_count":1}');
-- Exactly 72 hours is still inside the existing runner's strict grace rule.
UPDATE public.audit_logs SET created_at=now()-interval '17 days' WHERE action='google_ads_conversion_adjustment';
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_post_grace_not_counted_count":0}');
UPDATE public.audit_logs SET created_at=now()-interval '16 days' WHERE action='google_ads_conversion_adjustment';
SELECT pg_temp.assert_health('{"expired_conversion_target_count":0,"legacy_post_grace_not_counted_count":1}');

-- A subsequent upload can be counted; it invalidates earlier absence evidence.
INSERT INTO public.audit_logs(intake_id,action,metadata,created_at) VALUES
  (1,'google_ads_conversion_upload','{"status":"success","runtime_source":"vercel"}',now()-interval '15 days');
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_post_grace_not_counted_count":0}');
DELETE FROM public.audit_logs WHERE action='google_ads_conversion_upload' AND created_at=now()-interval '15 days';
UPDATE public.stripe_payment_adjustment_targets SET exact_target_net_value_cents=500,target_net_value_cents=500 WHERE intake_id=1;
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_post_grace_not_counted_count":0}');
UPDATE public.stripe_payment_adjustment_targets SET exact_target_net_value_cents=0,target_net_value_cents=1 WHERE intake_id=1;

-- Explicit exact cash takes precedence over legacy RETRACTION shorthand.
UPDATE public.audit_logs SET metadata=metadata || '{"exact_target_net_value_cents":500}' WHERE action='google_ads_conversion_adjustment';
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_post_grace_not_counted_count":0}');
UPDATE public.audit_logs SET metadata=metadata - 'exact_target_net_value_cents' WHERE action='google_ads_conversion_adjustment';
-- New errors, non-production evidence, and uncertain claims stay fail-closed.
UPDATE public.audit_logs SET metadata=metadata || '{"runtime_source":"node"}' WHERE action='google_ads_conversion_adjustment';
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_post_grace_not_counted_count":0}');
UPDATE public.audit_logs SET metadata=metadata || '{"runtime_source":"vercel"}' WHERE action='google_ads_conversion_adjustment';
INSERT INTO public.audit_logs(intake_id,action,metadata,created_at) VALUES
  (1,'google_ads_conversion_adjustment','{"status":"unknown_outcome","runtime_source":"vercel"}',now());
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_post_grace_not_counted_count":0}');
DELETE FROM public.audit_logs WHERE action='google_ads_conversion_adjustment' AND created_at=now();
INSERT INTO public.google_ads_conversion_adjustment_claims VALUES
  (1,1,'unknown_outcome',1,now()-interval '4 days',NULL,NULL),
  (2,1,'reserved',1,now()-interval '3 days',now()-interval '1 hour',NULL);
SELECT pg_temp.assert_health('{"expired_conversion_target_count":1,"legacy_post_grace_not_counted_count":0,"unknown_outcome_count":1,"expired_reservation_count":1}');
-- Development upload receipts cannot turn a legacy target into a live alert.
UPDATE public.audit_logs SET metadata=metadata || '{"runtime_source":"node"}' WHERE action='google_ads_conversion_upload';
SELECT pg_temp.assert_health('{"expired_conversion_target_count":0,"legacy_post_grace_not_counted_count":0,"unknown_outcome_count":1,"expired_reservation_count":1}');

DO $$ BEGIN
  IF has_table_privilege('anon','public.google_ads_conversion_adjustment_claim_health','SELECT')
    OR has_table_privilege('authenticated','public.google_ads_conversion_adjustment_claim_health','SELECT')
    OR NOT has_table_privilege('service_role','public.google_ads_conversion_adjustment_claim_health','SELECT') THEN
    RAISE EXCEPTION 'Claim health must remain service-role-only';
  END IF;
END $$;
SET LOCAL ROLE service_role;
SELECT count(*) FROM public.google_ads_conversion_adjustment_claim_health;
RESET ROLE;
ROLLBACK;
