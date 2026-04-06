-- Migration: Add repeat_rx and consult to draft_type enum
-- Purpose: Enable draft generation for all service types

-- Add new values to draft_type enum
ALTER TYPE draft_type ADD VALUE IF NOT EXISTS 'repeat_rx';
ALTER TYPE draft_type ADD VALUE IF NOT EXISTS 'consult';

-- Update table comment to reflect expanded scope
COMMENT ON TABLE document_drafts IS 'Stores AI-generated draft documents (clinical notes, med certs, repeat rx, consults) for doctor review';
