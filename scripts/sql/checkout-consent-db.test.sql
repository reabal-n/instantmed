DO $test$
DECLARE receipt jsonb; again jsonb; rev uuid; actor constant uuid := '00000000-0000-0000-0000-000000000001'; episode constant uuid := '00000000-0000-0000-0000-000000000002';
BEGIN
  IF has_function_privilege('anon','public.record_checkout_consent(uuid,uuid,uuid,text)','EXECUTE')
     OR has_function_privilege('authenticated','public.get_checkout_consent_state(uuid,text)','EXECUTE')
     OR has_table_privilege('authenticated','public.checkout_consent_receipts','INSERT') THEN RAISE EXCEPTION 'ACL leak'; END IF;
  IF NOT has_function_privilege('service_role','public.record_checkout_consent(uuid,uuid,uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'missing service grant'; END IF;
  IF (SELECT count(*) FROM public.checkout_consent_receipts) <> 0 THEN RAISE EXCEPTION 'historic consent fabricated'; END IF;
  SELECT consent_revision INTO rev FROM public.intakes WHERE id=episode;
  IF public.record_checkout_consent(episode,actor,rev,'old') IS NOT NULL THEN RAISE EXCEPTION 'stale version accepted'; END IF;
  IF public.record_checkout_consent(episode,gen_random_uuid(),rev,'2026-09-15') IS NOT NULL THEN RAISE EXCEPTION 'foreign owner accepted'; END IF;
  -- Fail midway through the three audit records. Entire function statement rolls back.
  ALTER TABLE public.compliance_audit_log ADD CONSTRAINT simulated_audit_failure CHECK(event_type <> 'telehealth_consent_given');
  BEGIN
    PERFORM public.record_checkout_consent(episode,actor,rev,'2026-09-15');
    RAISE EXCEPTION 'partial audit failure accepted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  IF EXISTS(SELECT 1 FROM public.checkout_consent_receipts) OR EXISTS(SELECT 1 FROM public.compliance_audit_log) THEN RAISE EXCEPTION 'partial receipt committed'; END IF;
  ALTER TABLE public.compliance_audit_log DROP CONSTRAINT simulated_audit_failure;
  receipt := public.record_checkout_consent(episode,actor,rev,'2026-09-15');
  again := public.record_checkout_consent(episode,actor,rev,'2026-09-15');
  IF receipt IS NULL OR receipt <> again OR (SELECT count(*) FROM public.compliance_audit_log) <> 3 THEN RAISE EXCEPTION 'idempotency failed'; END IF;
  UPDATE public.intakes SET payment_id='cs_synthetic' WHERE id=episode;
  UPDATE public.profiles SET stripe_customer_id='cus_synthetic' WHERE id=actor;
  IF public.get_checkout_consent_state(episode,'2026-09-15') <> receipt THEN RAISE EXCEPTION 'billing change invalidated consent'; END IF;
  UPDATE public.profiles SET address_line1='2 Synthetic Lane' WHERE id=actor;
  IF public.get_checkout_consent_state(episode,'2026-09-15') ? 'receipt_id' THEN RAISE EXCEPTION 'identity change reused consent'; END IF;
  BEGIN
    UPDATE public.intakes SET payment_id='cs_racing' WHERE id=episode;
    RAISE EXCEPTION 'stale attachment permitted';
  EXCEPTION WHEN check_violation THEN NULL; END;
  UPDATE public.intakes SET consent_revision=rev WHERE id=episode;
  IF public.get_checkout_consent_state(episode,'2026-09-15') ? 'receipt_id' THEN RAISE EXCEPTION 'caller restored historic revision'; END IF;
  IF public.record_checkout_consent(episode,actor,rev,'2026-09-15') IS NOT NULL THEN RAISE EXCEPTION 'stale revision accepted'; END IF;
  SELECT consent_revision INTO rev FROM public.intakes WHERE id=episode;
  PERFORM public.record_checkout_consent(episode,actor,rev,'2026-09-15');
  INSERT INTO public.intake_answers(intake_id,answers) VALUES(episode,'{"synthetic":"extra row"}');
  IF public.get_checkout_consent_state(episode,'2026-09-15') ? 'receipt_id' THEN RAISE EXCEPTION 'insert did not invalidate'; END IF;
  SELECT consent_revision INTO rev FROM public.intakes WHERE id=episode;
  UPDATE public.intakes SET payment_status='paid',status='paid' WHERE id=episode;
  IF public.record_checkout_consent(episode,actor,rev,'2026-09-15') IS NOT NULL THEN RAISE EXCEPTION 'paid consent fabricated'; END IF;
  UPDATE public.intakes SET payment_status='unpaid',status='pending_payment' WHERE id=episode;
END $test$;
