-- Add checkout_error column to intakes (code writes to it on Stripe failures)
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS checkout_error TEXT;

-- Add emergency_sms_sent_at for emergency flags cron deduplication
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS emergency_sms_sent_at TIMESTAMPTZ;

-- Add QA sampling columns for QA cron job
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS qa_sampled BOOLEAN DEFAULT NULL;
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS qa_sampled_at TIMESTAMPTZ DEFAULT NULL;

-- Add UTM tracking columns for analytics
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS utm_campaign TEXT;

-- Add synced_clinical_note_draft_id for draft approval idempotency
ALTER TABLE public.intakes ADD COLUMN IF NOT EXISTS synced_clinical_note_draft_id UUID;
