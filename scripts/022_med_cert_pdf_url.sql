-- ============================================================================
-- ADD PDF_URL TO MED_CERT_CERTIFICATES
-- Version: 1.0.0
-- Purpose: Store public URL for PDF alongside storage path
-- ============================================================================

-- Add pdf_url column to store the public accessible URL
ALTER TABLE med_cert_certificates
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add created_at and updated_at columns for GeneratedDocument compatibility
ALTER TABLE med_cert_certificates
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE med_cert_certificates
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update trigger to set updated_at on changes
CREATE OR REPLACE FUNCTION update_med_cert_certificates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_med_cert_certificates_timestamp ON med_cert_certificates;
CREATE TRIGGER update_med_cert_certificates_timestamp
  BEFORE UPDATE ON med_cert_certificates
  FOR EACH ROW
  EXECUTE FUNCTION update_med_cert_certificates_updated_at();

-- Add comment for documentation
COMMENT ON COLUMN med_cert_certificates.pdf_url IS 'Public URL for accessing the PDF via Supabase Storage';
