-- ============================================================================
-- MEDICAL CERTIFICATE DRAFTS TABLE
-- Version: 1.0.0
-- Purpose: Store doctor-editable medical certificate draft data
-- ============================================================================

-- Create med_cert_drafts table for storing doctor-editable fields
CREATE TABLE IF NOT EXISTS med_cert_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES med_cert_requests(id) ON DELETE CASCADE,
  
  -- Patient information (editable by doctor)
  patient_full_name TEXT,
  patient_dob DATE,
  
  -- Certificate dates
  date_from DATE,
  date_to DATE,
  
  -- Certificate type (inherited from request but stored here for convenience)
  certificate_type certificate_type,
  
  -- Doctor-editable summary
  reason_summary TEXT,
  
  -- Doctor details (with defaults)
  doctor_typed_name TEXT NOT NULL DEFAULT 'Dr Reabal Najjar, BHSc, MD, AFHEA',
  doctor_ahpra TEXT NOT NULL DEFAULT 'MED0002576546',
  provider_name TEXT NOT NULL DEFAULT 'InstantMed',
  provider_address TEXT NOT NULL DEFAULT 'Level 1/457-459 Elizabeth Street, Surry Hills 2010, Sydney, Australia',
  
  -- Signature asset
  signature_asset_url TEXT,
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('draft', 'issued')) DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  issued_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint: only one active draft per request
  CONSTRAINT one_draft_per_request UNIQUE(request_id) WHERE status = 'draft'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_med_cert_drafts_request_id ON med_cert_drafts(request_id);
CREATE INDEX IF NOT EXISTS idx_med_cert_drafts_status ON med_cert_drafts(status);
CREATE INDEX IF NOT EXISTS idx_med_cert_drafts_created ON med_cert_drafts(created_at DESC);

-- Enable RLS on med_cert_drafts
ALTER TABLE med_cert_drafts ENABLE ROW LEVEL SECURITY;

-- Doctors can view drafts for their assigned requests
CREATE POLICY "Doctors can view med cert drafts"
  ON med_cert_drafts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Doctors can insert new drafts
CREATE POLICY "Doctors can create med cert drafts"
  ON med_cert_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Doctors can update their own drafts
CREATE POLICY "Doctors can update med cert drafts"
  ON med_cert_drafts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Patients CANNOT view drafts (even their own)
CREATE POLICY "Patients cannot view med cert drafts"
  ON med_cert_drafts
  FOR SELECT
  TO authenticated
  USING (false);

-- Patients CANNOT insert/update/delete
CREATE POLICY "Patients cannot modify med cert drafts"
  ON med_cert_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Patients cannot update med cert drafts direct"
  ON med_cert_drafts
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Patients cannot delete med cert drafts"
  ON med_cert_drafts
  FOR DELETE
  TO authenticated
  USING (false);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_med_cert_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER med_cert_drafts_updated_at_trigger
BEFORE UPDATE ON med_cert_drafts
FOR EACH ROW
EXECUTE FUNCTION update_med_cert_drafts_updated_at();

-- Add foreign key constraint linking certificate to request (if doesn't exist)
ALTER TABLE med_cert_requests
ADD CONSTRAINT fk_med_cert_draft_id
  FOREIGN KEY (certificate_id) REFERENCES med_cert_drafts(id) ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
