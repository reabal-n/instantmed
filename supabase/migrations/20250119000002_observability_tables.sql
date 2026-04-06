-- OBSERVABILITY_AUDIT: Database tables for monitoring and metrics
-- Migration: Observability tables

-- ============================================================================
-- Request Latency Tracking
-- Tracks payment → review → decision latencies for SLA monitoring
-- ============================================================================

CREATE TABLE IF NOT EXISTS request_latency (
  request_id UUID PRIMARY KEY,
  
  -- Timestamps
  payment_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  assigned_doctor_id UUID,
  review_started_at TIMESTAMPTZ,
  decision_at TIMESTAMPTZ,
  decision_type TEXT,
  
  -- Calculated latencies (milliseconds)
  payment_to_queue_ms INTEGER,
  queue_to_assign_ms INTEGER,
  queue_to_review_ms INTEGER,
  review_to_decision_ms INTEGER,
  total_latency_ms INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for latency queries
CREATE INDEX IF NOT EXISTS idx_request_latency_decision 
  ON request_latency(decision_at DESC) 
  WHERE decision_at IS NOT NULL;

-- Index for SLA monitoring
CREATE INDEX IF NOT EXISTS idx_request_latency_pending 
  ON request_latency(queued_at) 
  WHERE decision_at IS NULL;

-- ============================================================================
-- Operational Metrics
-- Time-series metrics for dashboards and alerting
-- ============================================================================

CREATE TABLE IF NOT EXISTS operational_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  dimensions JSONB DEFAULT '{}',
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_metrics_name_time 
  ON operational_metrics(metric_name, recorded_at DESC);

-- Partition hint (for future scaling)
COMMENT ON TABLE operational_metrics IS 'Consider partitioning by recorded_at for high-volume deployments';

-- ============================================================================
-- Delivery Tracking
-- Email/SMS delivery status tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  request_id UUID,
  patient_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  template_type TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  recipient TEXT NOT NULL, -- Masked
  
  -- Status
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'failed', 'opened')),
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  
  -- Error details
  bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft')),
  bounce_reason TEXT,
  error_code TEXT,
  error_message TEXT,
  
  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for status queries
CREATE INDEX IF NOT EXISTS idx_delivery_status 
  ON delivery_tracking(status, sent_at DESC);

-- Index for request lookup
CREATE INDEX IF NOT EXISTS idx_delivery_request 
  ON delivery_tracking(request_id) 
  WHERE request_id IS NOT NULL;

-- Index for bounce monitoring
CREATE INDEX IF NOT EXISTS idx_delivery_bounces 
  ON delivery_tracking(sent_at DESC) 
  WHERE status = 'bounced';

-- ============================================================================
-- Intake Abandonment Tracking
-- Enhanced abandonment analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS intake_abandonment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  last_step TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  time_spent_ms INTEGER,
  message_count INTEGER DEFAULT 0,
  abandon_reason TEXT NOT NULL,
  
  -- Payment context
  reached_payment BOOLEAN DEFAULT false,
  stripe_checkout_started BOOLEAN DEFAULT false,
  payment_error TEXT,
  
  -- Safety context
  was_blocked_by_safety BOOLEAN DEFAULT false,
  safety_block_reason TEXT,
  safety_block_code TEXT,
  
  -- Form context
  fields_completed TEXT[] DEFAULT '{}',
  last_field_edited TEXT,
  form_progress INTEGER DEFAULT 0,
  
  -- Technical context
  device_type TEXT,
  browser TEXT,
  browser_version TEXT,
  os_name TEXT,
  has_network_error BOOLEAN DEFAULT false,
  last_network_error TEXT,
  
  -- Session context
  page_view_count INTEGER DEFAULT 0,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for abandonment analytics
CREATE INDEX IF NOT EXISTS idx_abandonment_time 
  ON intake_abandonment(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abandonment_reason 
  ON intake_abandonment(abandon_reason, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abandonment_step 
  ON intake_abandonment(last_step, created_at DESC);

-- ============================================================================
-- AI Metrics (for persistent storage beyond in-memory)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  latency_ms INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  model_version TEXT,
  prompt_version TEXT,
  error_type TEXT,
  error_message TEXT,
  request_id UUID,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for AI health monitoring
CREATE INDEX IF NOT EXISTS idx_ai_metrics_time 
  ON ai_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_endpoint 
  ON ai_metrics(endpoint, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_metrics_failures 
  ON ai_metrics(recorded_at DESC) 
  WHERE success = false;

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Request latency: Admins and doctors only
ALTER TABLE request_latency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "request_latency_admin_read" ON request_latency
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'doctor')
    )
  );

CREATE POLICY "request_latency_service_write" ON request_latency
  FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Operational metrics: Admins only
ALTER TABLE operational_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operational_metrics_admin" ON operational_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Delivery tracking: Admins and doctors
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_tracking_admin" ON delivery_tracking
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- Intake abandonment: Admins only (contains analytics)
ALTER TABLE intake_abandonment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intake_abandonment_admin" ON intake_abandonment
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- AI metrics: Admins only
ALTER TABLE ai_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_metrics_admin" ON ai_metrics
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to calculate latency percentiles
CREATE OR REPLACE FUNCTION calculate_latency_percentile(
  p_metric TEXT,
  p_percentile NUMERIC,
  p_hours INTEGER DEFAULT 24
) RETURNS INTEGER AS $$
DECLARE
  result INTEGER;
BEGIN
  EXECUTE format(
    'SELECT percentile_cont(%s) WITHIN GROUP (ORDER BY %I)::INTEGER
     FROM request_latency
     WHERE decision_at > NOW() - INTERVAL ''%s hours''
     AND %I IS NOT NULL',
    p_percentile, p_metric, p_hours, p_metric
  ) INTO result;
  RETURN COALESCE(result, 0);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE request_latency IS 'OBSERVABILITY_AUDIT P0: Payment-to-decision latency tracking';
COMMENT ON TABLE operational_metrics IS 'OBSERVABILITY_AUDIT: Time-series operational metrics';
COMMENT ON TABLE delivery_tracking IS 'OBSERVABILITY_AUDIT P1: Email/SMS delivery confirmation';
COMMENT ON TABLE intake_abandonment IS 'OBSERVABILITY_AUDIT P1: Enhanced intake abandonment tracking';
COMMENT ON TABLE ai_metrics IS 'OBSERVABILITY_AUDIT P0: AI request metrics for health monitoring';
