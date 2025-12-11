-- Add priority_review field to requests table
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS priority_review boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS priority_purchased_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS estimated_review_time timestamp with time zone;

-- Add after_hours field for $39.95 tier
ALTER TABLE requests
ADD COLUMN IF NOT EXISTS after_hours boolean DEFAULT false;

-- Create priority_upsell_conversions table for tracking
CREATE TABLE IF NOT EXISTS priority_upsell_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  offered_at timestamp with time zone DEFAULT now(),
  converted boolean DEFAULT false,
  converted_at timestamp with time zone,
  price_paid integer,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE priority_upsell_conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "patients_view_own_conversions" ON priority_upsell_conversions
  FOR SELECT USING (patient_id = auth.uid());

CREATE POLICY "doctors_view_all_conversions" ON priority_upsell_conversions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('doctor', 'admin'))
  );

-- Create index for queue sorting (priority first, then created_at)
CREATE INDEX IF NOT EXISTS idx_requests_priority_queue 
  ON requests (priority_review DESC, created_at ASC) 
  WHERE status = 'pending';
