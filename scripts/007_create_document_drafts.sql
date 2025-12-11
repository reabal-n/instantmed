-- Migration: Create document_drafts and documents tables for PDF generation
-- Run this after 006_add_script_sent_flag.sql

-- Create document_drafts table
CREATE TABLE IF NOT EXISTS document_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  type text NOT NULL, -- e.g. 'med_cert', 'referral', 'prescription'
  subtype text NOT NULL, -- e.g. 'work', 'uni', 'carer'
  data jsonb NOT NULL DEFAULT '{}'::jsonb, -- stores editable fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create documents table (final generated PDFs)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'med_cert', 'referral', etc.
  subtype text NOT NULL,
  pdf_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_drafts_request_id ON document_drafts(request_id);
CREATE INDEX IF NOT EXISTS idx_documents_request_id ON documents(request_id);

-- Enable RLS on document_drafts
ALTER TABLE document_drafts ENABLE ROW LEVEL SECURITY;

-- Doctors can select all drafts
CREATE POLICY "Doctors can view all document drafts"
  ON document_drafts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Doctors can insert drafts
CREATE POLICY "Doctors can create document drafts"
  ON document_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Doctors can update drafts
CREATE POLICY "Doctors can update document drafts"
  ON document_drafts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Enable RLS on documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Doctors can view all documents
CREATE POLICY "Doctors can view all documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );

-- Patients can view their own documents (via request ownership)
CREATE POLICY "Patients can view own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM requests r
      JOIN profiles p ON p.id = r.patient_id
      WHERE r.id = documents.request_id
      AND p.auth_user_id = auth.uid()
    )
  );

-- Doctors can insert documents
CREATE POLICY "Doctors can create documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role = 'doctor'
    )
  );
