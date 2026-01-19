-- Migration: Add indexes for monitoring queries and performance
-- These indexes improve query performance for the doctor dashboard, queue, and monitoring features

-- Index for queue queries (status + payment_status combinations)
CREATE INDEX IF NOT EXISTS idx_intakes_queue_status 
ON intakes (status, payment_status) 
WHERE status IN ('paid', 'in_review', 'pending_info');

-- Index for today's submissions queries (paid_at for date filtering)
CREATE INDEX IF NOT EXISTS idx_intakes_paid_at 
ON intakes (paid_at DESC) 
WHERE paid_at IS NOT NULL;

-- Index for approval/decline rate queries
CREATE INDEX IF NOT EXISTS idx_intakes_approved_at 
ON intakes (approved_at DESC) 
WHERE approved_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intakes_declined_at 
ON intakes (declined_at DESC) 
WHERE declined_at IS NOT NULL;

-- Index for doctor review queries (reviewed_by for personal stats)
CREATE INDEX IF NOT EXISTS idx_intakes_reviewed_by 
ON intakes (reviewed_by, approved_at DESC) 
WHERE reviewed_by IS NOT NULL;

-- Index for SLA deadline queries (priority + sla_deadline for queue ordering)
CREATE INDEX IF NOT EXISTS idx_intakes_sla_priority 
ON intakes (is_priority DESC, sla_deadline ASC NULLS LAST, created_at ASC) 
WHERE status IN ('paid', 'in_review', 'pending_info');

-- Index for patient history lookup
CREATE INDEX IF NOT EXISTS idx_intakes_patient_history 
ON intakes (patient_id, created_at DESC);

-- Index for email notification status tracking
-- NOTE: Removed - column notification_email_status does not exist on intakes table
-- CREATE INDEX IF NOT EXISTS idx_intakes_notification_status 
-- ON intakes (notification_email_status) 
-- WHERE notification_email_status = 'failed';

-- Composite index for monitoring stats query
CREATE INDEX IF NOT EXISTS idx_intakes_monitoring 
ON intakes (status, payment_status, paid_at, approved_at, declined_at);

-- Add comment explaining indexes
COMMENT ON INDEX idx_intakes_queue_status IS 'Optimizes doctor queue queries filtering by status';
COMMENT ON INDEX idx_intakes_paid_at IS 'Optimizes today submissions count queries';
COMMENT ON INDEX idx_intakes_sla_priority IS 'Optimizes queue ordering by priority and SLA';
COMMENT ON INDEX idx_intakes_monitoring IS 'Optimizes dashboard monitoring stats aggregation';
