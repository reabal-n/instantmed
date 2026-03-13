-- Enable Supabase Realtime for intakes table
-- Required for patient dashboard live status updates (IntakeStatusTracker)
-- Without this, postgres_changes subscriptions never receive UPDATE events

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'intakes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.intakes;
  END IF;
END $$;
