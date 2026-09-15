-- No historic consent is inferred or backfilled. Deploy before receipt-aware checkout.
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS consent_revision uuid NOT NULL DEFAULT gen_random_uuid();
CREATE TABLE IF NOT EXISTS public.checkout_consent_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_id uuid NOT NULL REFERENCES public.intakes(id) ON DELETE CASCADE,
  revision uuid NOT NULL,
  disclosure_version text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (intake_id, revision, disclosure_version)
);
ALTER TABLE public.checkout_consent_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_consent_receipts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.checkout_consent_receipts TO service_role;

CREATE OR REPLACE FUNCTION public.rotate_checkout_consent_revision() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_TABLE_NAME = 'intake_answers' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.intakes SET consent_revision = gen_random_uuid() WHERE id = NEW.intake_id;
      RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' THEN
      UPDATE public.intakes SET consent_revision = gen_random_uuid() WHERE id = OLD.intake_id;
      RETURN OLD;
    END IF;
    IF (to_jsonb(NEW) - ARRAY['updated_at','encryption_metadata']) IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['updated_at','encryption_metadata']) THEN
      UPDATE public.intakes SET consent_revision = gen_random_uuid() WHERE id IN (OLD.intake_id, NEW.intake_id);
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    -- Identity only: login, billing-customer and communication preference writes are not new consent.
    IF (SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(NEW)) WHERE key = ANY(ARRAY[
      'full_name','first_name','last_name','email','date_of_birth','date_of_birth_encrypted','phone','phone_encrypted',
      'sex','sex_at_birth','address_line1','address_line_1','address_line_2','suburb','state','postcode',
      'medicare_number','medicare_number_encrypted','medicare_irn','medicare_expiry','ihi_number','ihi_number_encrypted']))
      IS DISTINCT FROM
      (SELECT jsonb_object_agg(key,value) FROM jsonb_each(to_jsonb(OLD)) WHERE key = ANY(ARRAY[
      'full_name','first_name','last_name','email','date_of_birth','date_of_birth_encrypted','phone','phone_encrypted',
      'sex','sex_at_birth','address_line1','address_line_1','address_line_2','suburb','state','postcode',
      'medicare_number','medicare_number_encrypted','medicare_irn','medicare_expiry','ihi_number','ihi_number_encrypted'])) THEN
      UPDATE public.intakes SET consent_revision = gen_random_uuid() WHERE patient_id = NEW.id
        AND status IN ('pending_payment','checkout_failed') AND payment_status IN ('pending','unpaid','failed');
    END IF;
  ELSE
    -- Never accept a caller-selected old token, including a service-role write.
    IF NEW.consent_revision IS DISTINCT FROM OLD.consent_revision THEN
      NEW.consent_revision := gen_random_uuid();
    END IF;
    IF ROW(NEW.patient_id,NEW.category,NEW.subtype,NEW.service_id) IS DISTINCT FROM
       ROW(OLD.patient_id,OLD.category,OLD.subtype,OLD.service_id) THEN
      NEW.consent_revision := gen_random_uuid();
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.rotate_checkout_consent_revision() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS checkout_consent_answers_revision ON public.intake_answers;
CREATE TRIGGER checkout_consent_answers_revision AFTER INSERT OR UPDATE OR DELETE ON public.intake_answers
FOR EACH ROW EXECUTE FUNCTION public.rotate_checkout_consent_revision();
DROP TRIGGER IF EXISTS checkout_consent_profile_revision ON public.profiles;
CREATE TRIGGER checkout_consent_profile_revision AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.rotate_checkout_consent_revision();
DROP TRIGGER IF EXISTS checkout_consent_episode_revision ON public.intakes;
CREATE TRIGGER checkout_consent_episode_revision BEFORE UPDATE ON public.intakes
FOR EACH ROW EXECUTE FUNCTION public.rotate_checkout_consent_revision();

CREATE OR REPLACE FUNCTION public.get_checkout_consent_state(p_intake_id uuid, p_version text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object('revision',i.consent_revision) ||
    CASE WHEN r.id IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('receipt_id',r.id,'received_at',r.received_at) END
  FROM public.intakes i LEFT JOIN public.checkout_consent_receipts r ON r.intake_id=i.id
    AND r.revision=i.consent_revision AND r.disclosure_version=p_version WHERE i.id=p_intake_id;
$$;
REVOKE ALL ON FUNCTION public.get_checkout_consent_state(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_checkout_consent_state(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.record_checkout_consent(p_intake_id uuid,p_patient_id uuid,p_revision uuid,p_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE i public.intakes%ROWTYPE; r public.checkout_consent_receipts%ROWTYPE; event_name text;
BEGIN
  IF p_version <> '2026-09-15' THEN RETURN NULL; END IF;
  SELECT * INTO i FROM public.intakes WHERE id=p_intake_id FOR UPDATE;
  IF NOT FOUND OR i.patient_id IS DISTINCT FROM p_patient_id OR i.consent_revision IS DISTINCT FROM p_revision
    OR (i.status IN ('pending_payment','checkout_failed') AND i.payment_status IN ('pending','unpaid','failed')) IS NOT TRUE
    OR NOT EXISTS(SELECT 1 FROM public.intake_answers WHERE intake_id=i.id) THEN RETURN NULL; END IF;
  SELECT * INTO r FROM public.checkout_consent_receipts WHERE intake_id=i.id AND revision=p_revision AND disclosure_version=p_version;
  IF NOT FOUND THEN
    INSERT INTO public.checkout_consent_receipts(intake_id,revision,disclosure_version)
      VALUES(i.id,p_revision,p_version) RETURNING * INTO r;
    FOREACH event_name IN ARRAY ARRAY['terms_consent_given','telehealth_consent_given','accuracy_attestation_given'] LOOP
      INSERT INTO public.compliance_audit_log(event_type,intake_id,request_type,actor_id,actor_role,is_human_action,event_data)
      VALUES(event_name::public.compliance_event_type,i.id,
        CASE WHEN i.category='medical_certificate' THEN 'med_cert'
          WHEN i.category='prescription' AND i.subtype IN ('repeat','chronic_review') THEN 'repeat_rx'
          ELSE 'intake' END,p_patient_id,'patient',true,
        jsonb_build_object('receipt_id',r.id,'episode_revision',p_revision,'disclosure_version',p_version,
          'server_received_at',r.received_at) ||
          CASE event_name
            WHEN 'terms_consent_given' THEN jsonb_build_object('termsVersion','2026-02')
            WHEN 'telehealth_consent_given' THEN jsonb_build_object('consentVersion',p_version)
            ELSE '{}'::jsonb END);
    END LOOP;
  END IF;
  RETURN jsonb_build_object('revision',r.revision,'receipt_id',r.id,'received_at',r.received_at);
END $$;
REVOKE ALL ON FUNCTION public.record_checkout_consent(uuid,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_checkout_consent(uuid,uuid,uuid,text) TO service_role;

-- A change racing Stripe creation must not attach a payable URL to the changed episode.
CREATE OR REPLACE FUNCTION public.guard_checkout_consent_attachment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.payment_id IS DISTINCT FROM OLD.payment_id AND NEW.payment_id IS NOT NULL
     AND NEW.status IN ('pending_payment','checkout_failed') AND NEW.payment_status IN ('pending','unpaid','failed')
     -- Additive rollout: old code has no receipts. New checkout fails closed in the application.
     AND EXISTS(SELECT 1 FROM public.checkout_consent_receipts WHERE intake_id=NEW.id)
     AND NOT EXISTS(SELECT 1 FROM public.checkout_consent_receipts WHERE intake_id=NEW.id
       AND revision=NEW.consent_revision AND disclosure_version='2026-09-15') THEN
    RAISE EXCEPTION 'Current checkout consent receipt required' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_checkout_consent_attachment() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS zz_checkout_consent_attachment ON public.intakes;
CREATE TRIGGER zz_checkout_consent_attachment BEFORE UPDATE ON public.intakes
FOR EACH ROW EXECUTE FUNCTION public.guard_checkout_consent_attachment();
-- Rollback: keep receipts/audit. Remove trigger only while checkout is held; never restore a receipt-free checkout.
