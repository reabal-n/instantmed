-- ADVERSARIAL_SECURITY_AUDIT: Database tables for enhanced security features
-- Migration: Security audit tables

-- ============================================================================
-- Security Events Table
-- Tracks injection attempts, suspicious activity, and security incidents
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  patient_id UUID REFERENCES profiles(id),
  severity TEXT NOT NULL DEFAULT 'medium',
  details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for querying by patient and type
CREATE INDEX IF NOT EXISTS idx_security_events_patient 
  ON security_events(patient_id, event_type, created_at DESC);

-- Index for recent events (security monitoring)
CREATE INDEX IF NOT EXISTS idx_security_events_recent 
  ON security_events(created_at DESC) 
  WHERE created_at > NOW() - INTERVAL '24 hours';

-- ============================================================================
-- Patient Flags Table
-- Flags accounts for security concerns, repeated violations
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  flag_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_notes TEXT,
  UNIQUE(patient_id, flag_type)
);

-- Index for active flags lookup
CREATE INDEX IF NOT EXISTS idx_patient_flags_active 
  ON patient_flags(patient_id, flag_type) 
  WHERE is_active = true;

-- ============================================================================
-- Date Change Requests Table
-- Tracks all certificate date change requests for audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS date_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL,
  original_date DATE NOT NULL,
  requested_date DATE NOT NULL,
  reason TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES profiles(id),
  approval_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Index for pending requests
CREATE INDEX IF NOT EXISTS idx_date_change_pending 
  ON date_change_requests(status, created_at DESC) 
  WHERE status = 'pending';

-- ============================================================================
-- Chat Sessions Table (for restart tracking)
-- Tracks chat session starts, abandons, and completions
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES profiles(id),
  service_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  intake_id UUID,
  session_metadata JSONB NOT NULL DEFAULT '{}'
);

-- Index for abandoned session tracking (fraud detection)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_abandoned 
  ON chat_sessions(patient_id, status, created_at DESC) 
  WHERE status = 'abandoned';

-- Index for active sessions
CREATE INDEX IF NOT EXISTS idx_chat_sessions_active 
  ON chat_sessions(patient_id, status) 
  WHERE status = 'active';

-- ============================================================================
-- Fraud Flags Table Enhancement
-- Add new columns if table exists, create if not
-- ============================================================================

-- Add service_type column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fraud_flags' AND column_name = 'service_type'
  ) THEN
    ALTER TABLE fraud_flags ADD COLUMN service_type TEXT;
  END IF;
END $$;

-- Add medication_code column for prescription deduplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fraud_flags' AND column_name = 'medication_code'
  ) THEN
    ALTER TABLE fraud_flags ADD COLUMN medication_code TEXT;
  END IF;
END $$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Security events: Only admins can read
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "security_events_admin_read" ON security_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'doctor')
    )
  );

CREATE POLICY "security_events_service_insert" ON security_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Patient flags: Admins can read/write, patients can see their own
ALTER TABLE patient_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "patient_flags_admin_all" ON patient_flags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- Date change requests: Admins/doctors only
ALTER TABLE date_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "date_change_requests_admin" ON date_change_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- Chat sessions: Users see their own, admins see all
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_own" ON chat_sessions
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

CREATE POLICY "chat_sessions_admin" ON chat_sessions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'doctor')
    )
  );

CREATE POLICY "chat_sessions_insert_own" ON chat_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid());

CREATE POLICY "chat_sessions_update_own" ON chat_sessions
  FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid());

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON TABLE security_events IS 'ADVERSARIAL_SECURITY_AUDIT: Tracks security incidents like injection attempts';
COMMENT ON TABLE patient_flags IS 'ADVERSARIAL_SECURITY_AUDIT: Flags accounts for security/fraud concerns';
COMMENT ON TABLE date_change_requests IS 'ADVERSARIAL_SECURITY_AUDIT: Audit trail for certificate date changes';
COMMENT ON TABLE chat_sessions IS 'ADVERSARIAL_SECURITY_AUDIT: Tracks chat sessions for restart abuse detection';
