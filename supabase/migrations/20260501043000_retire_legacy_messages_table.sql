-- Retire the abandoned public.messages thread model.
-- Active patient/doctor messaging uses public.patient_messages. Do not keep the
-- old table in the active schema because it makes message source-of-truth
-- ambiguous for operators and future audits.

DO $$
DECLARE
  v_legacy_count bigint := 0;
BEGIN
  IF to_regclass('public.messages') IS NOT NULL THEN
    EXECUTE 'SELECT count(*) FROM public.messages' INTO v_legacy_count;

    IF v_legacy_count > 0 THEN
      RAISE EXCEPTION 'legacy public.messages still contains % rows; migrate or archive those rows before dropping the legacy table', v_legacy_count
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
END;
$$;

DROP VIEW IF EXISTS public.admin_queue;
DROP VIEW IF EXISTS public.patient_intakes_summary;
DROP FUNCTION IF EXISTS public.send_system_message(uuid, text, text, jsonb);

ALTER TABLE IF EXISTS public.attachments
  DROP CONSTRAINT IF EXISTS attachments_message_id_fkey;

ALTER TABLE IF EXISTS public.attachments
  DROP COLUMN IF EXISTS message_id;

DROP TABLE IF EXISTS public.messages;
DROP TYPE IF EXISTS public.message_sender_type;
