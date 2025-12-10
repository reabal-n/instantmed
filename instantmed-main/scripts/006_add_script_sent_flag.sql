-- Add script_sent flag for tracking external script fulfillment
ALTER TABLE requests ADD COLUMN IF NOT EXISTS script_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS script_sent_at TIMESTAMPTZ;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS script_notes TEXT;

-- Update RLS policy to allow doctors to update these fields
-- (Already covered by existing doctor policies)
