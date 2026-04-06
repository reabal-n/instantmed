-- ============================================================================
-- ADD MISSING COMPLIANCE EVENT TYPES
-- Version: 1.0.0
-- Purpose: Add clinician view tracking and consent event types per MEDICOLEGAL_AUDIT_REPORT
-- ============================================================================

-- Add Clinician View Tracking event types (Section 2b)
-- Per MEDICOLEGAL_AUDIT_REPORT AI-3, RK-3
ALTER TYPE public.compliance_event_type ADD VALUE IF NOT EXISTS 'clinician_viewed_intake_answers';
ALTER TYPE public.compliance_event_type ADD VALUE IF NOT EXISTS 'clinician_viewed_medical_history';
ALTER TYPE public.compliance_event_type ADD VALUE IF NOT EXISTS 'clinician_viewed_safety_flags';
ALTER TYPE public.compliance_event_type ADD VALUE IF NOT EXISTS 'clinician_viewed_ai_summary';

-- Add Patient Consent event types (Section 6)
-- Per MEDICOLEGAL_AUDIT_REPORT CN-1, CN-2
ALTER TYPE public.compliance_event_type ADD VALUE IF NOT EXISTS 'telehealth_consent_given';
ALTER TYPE public.compliance_event_type ADD VALUE IF NOT EXISTS 'terms_consent_given';
ALTER TYPE public.compliance_event_type ADD VALUE IF NOT EXISTS 'accuracy_attestation_given';
ALTER TYPE public.compliance_event_type ADD VALUE IF NOT EXISTS 'telehealth_limitations_acknowledged';

-- NOTE: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block
-- This migration must be applied outside of a transaction or using Supabase migrations
