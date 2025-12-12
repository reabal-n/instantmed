-- ============================================
-- ENUMS: Define all enumerated types
-- ============================================

-- User roles in the system
CREATE TYPE public.user_role AS ENUM (
  'patient',
  'admin'  -- doctors/admins who can review requests
);

-- Service categories offered
CREATE TYPE public.service_type AS ENUM (
  'weight_loss',
  'mens_health',
  'womens_health',
  'common_scripts',
  'med_certs',
  'referrals',
  'pathology'
);

-- Request/intake status lifecycle
CREATE TYPE public.intake_status AS ENUM (
  'draft',           -- Patient started but not submitted
  'pending_payment', -- Submitted, awaiting payment
  'paid',            -- Payment received, in queue
  'in_review',       -- Admin is reviewing
  'pending_info',    -- Admin requested more information
  'approved',        -- Admin approved, script/cert generated
  'declined',        -- Admin declined the request
  'escalated',       -- Requires live consultation
  'completed',       -- Fully complete, delivered
  'cancelled',       -- Patient cancelled
  'expired'          -- SLA expired without action
);

-- Risk tiers for triage
CREATE TYPE public.risk_tier AS ENUM (
  'low',       -- Routine, auto-approvable in some cases
  'moderate',  -- Standard review required
  'high',      -- Senior review required
  'critical'   -- Requires live consult, cannot be approved async
);

-- Admin action types for audit trail
CREATE TYPE public.admin_action_type AS ENUM (
  'viewed',
  'assigned',
  'unassigned',
  'requested_info',
  'approved',
  'declined',
  'escalated',
  'added_note',
  'generated_document',
  'sent_message'
);

-- Message sender types
CREATE TYPE public.message_sender_type AS ENUM (
  'patient',
  'admin',
  'system'
);

-- Consent types required
CREATE TYPE public.consent_type AS ENUM (
  'telehealth_terms',
  'privacy_policy',
  'fee_agreement',
  'escalation_agreement',
  'medication_consent',
  'treatment_consent'
);

-- Attachment types
CREATE TYPE public.attachment_type AS ENUM (
  'id_document',
  'medical_record',
  'prescription',
  'referral',
  'pathology_result',
  'photo',
  'other'
);

-- Audit event types
CREATE TYPE public.audit_event_type AS ENUM (
  'intake_created',
  'intake_submitted',
  'payment_received',
  'status_changed',
  'admin_action',
  'message_sent',
  'document_generated',
  'document_sent',
  'consent_given',
  'escalation_triggered',
  'sla_warning',
  'sla_breached'
);
