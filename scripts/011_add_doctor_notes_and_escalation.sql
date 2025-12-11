-- Add doctor notes, escalation, and analytics columns to requests table

-- Add doctor_notes column for private clinical notes
ALTER TABLE requests ADD COLUMN IF NOT EXISTS doctor_notes TEXT;

-- Add escalation fields
ALTER TABLE requests ADD COLUMN IF NOT EXISTS escalation_level TEXT DEFAULT 'none' CHECK (escalation_level IN ('none', 'senior_review', 'phone_consult'));
ALTER TABLE requests ADD COLUMN IF NOT EXISTS escalation_reason TEXT;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS escalated_by UUID REFERENCES profiles(id);

-- Add follow_up flag
ALTER TABLE requests ADD COLUMN IF NOT EXISTS flagged_for_followup BOOLEAN DEFAULT FALSE;
ALTER TABLE requests ADD COLUMN IF NOT EXISTS followup_reason TEXT;

-- Add reviewed_by field to track which doctor reviewed
ALTER TABLE requests ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);
ALTER TABLE requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_category ON requests(category);
CREATE INDEX IF NOT EXISTS idx_requests_reviewed_at ON requests(reviewed_at);
