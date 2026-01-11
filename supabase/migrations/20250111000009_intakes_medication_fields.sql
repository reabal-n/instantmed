-- Add medication search audit fields to intakes table
-- Per MEDICATION_SEARCH_SPEC.md section 5: Interaction Logging
-- This migration will succeed even if intakes table doesn't exist yet (DO block handles it)

DO $$
BEGIN
  -- Check if intakes table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'intakes') THEN
    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'intakes' AND column_name = 'medication_search_used') THEN
      ALTER TABLE public.intakes ADD COLUMN medication_search_used BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'intakes' AND column_name = 'medication_selected') THEN
      ALTER TABLE public.intakes ADD COLUMN medication_selected BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'intakes' AND column_name = 'selected_artg_id') THEN
      ALTER TABLE public.intakes ADD COLUMN selected_artg_id TEXT REFERENCES public.artg_products(artg_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'intakes' AND column_name = 'selected_medication_name') THEN
      ALTER TABLE public.intakes ADD COLUMN selected_medication_name TEXT;
    END IF;
    
    -- Create index for audit queries
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'intakes' AND indexname = 'idx_intakes_medication_search') THEN
      CREATE INDEX idx_intakes_medication_search ON public.intakes(medication_search_used, medication_selected) WHERE medication_search_used = TRUE;
    END IF;
    
    RAISE NOTICE 'Medication search fields added to intakes table';
  ELSE
    RAISE NOTICE 'Intakes table does not exist yet - medication search fields will be added when intakes is created';
  END IF;
END $$;
