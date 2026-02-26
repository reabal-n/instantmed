-- Composite index for doctor queue ordering
-- Speeds up getDoctorQueue() which is the most frequent doctor portal query
CREATE INDEX IF NOT EXISTS idx_intakes_queue_order
ON intakes(is_priority DESC, sla_deadline ASC NULLS LAST, created_at ASC)
WHERE status IN ('paid', 'in_review', 'pending_info');
