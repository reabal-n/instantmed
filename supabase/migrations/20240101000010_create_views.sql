-- ============================================
-- VIEWS: Useful aggregate views
-- ============================================

-- Admin queue view with all relevant info
CREATE OR REPLACE VIEW public.admin_queue AS
SELECT 
  i.id,
  i.reference_number,
  i.status,
  i.is_priority,
  i.risk_tier,
  i.risk_score,
  i.sla_deadline,
  i.sla_breached,
  i.created_at,
  i.submitted_at,
  i.paid_at,
  i.assigned_at,
  
  -- Patient info
  p.id AS patient_id,
  p.full_name AS patient_name,
  p.email AS patient_email,
  p.date_of_birth AS patient_dob,
  
  -- Service info
  s.id AS service_id,
  s.name AS service_name,
  s.type AS service_type,
  s.slug AS service_slug,
  
  -- Assigned admin
  a.id AS assigned_admin_id,
  a.full_name AS assigned_admin_name,
  
  -- Calculated fields
  EXTRACT(EPOCH FROM (NOW() - i.paid_at)) / 60 AS minutes_since_paid,
  EXTRACT(EPOCH FROM (i.sla_deadline - NOW())) / 60 AS minutes_until_sla,
  CASE 
    WHEN i.sla_deadline < NOW() THEN 'breached'
    WHEN i.sla_deadline < NOW() + INTERVAL '1 hour' THEN 'warning'
    ELSE 'ok'
  END AS sla_status,
  
  -- Unread messages count
  (SELECT COUNT(*) FROM public.messages m WHERE m.intake_id = i.id AND m.sender_type = 'patient' AND m.is_read = FALSE) AS unread_messages

FROM public.intakes i
JOIN public.profiles p ON i.patient_id = p.id
JOIN public.services s ON i.service_id = s.id
LEFT JOIN public.profiles a ON i.assigned_admin_id = a.id
WHERE i.status IN ('paid', 'in_review', 'pending_info')
ORDER BY 
  i.is_priority DESC,
  i.sla_deadline ASC NULLS LAST,
  i.created_at ASC;

-- Patient dashboard view
CREATE OR REPLACE VIEW public.patient_intakes_summary AS
SELECT 
  i.id,
  i.reference_number,
  i.status,
  i.is_priority,
  i.created_at,
  i.submitted_at,
  i.approved_at,
  i.completed_at,
  i.payment_status,
  
  -- Service info
  s.name AS service_name,
  s.type AS service_type,
  s.slug AS service_slug,
  
  -- Latest message preview
  (
    SELECT m.content 
    FROM public.messages m 
    WHERE m.intake_id = i.id AND m.is_internal = FALSE 
    ORDER BY m.created_at DESC 
    LIMIT 1
  ) AS latest_message,
  
  -- Unread messages count
  (
    SELECT COUNT(*) 
    FROM public.messages m 
    WHERE m.intake_id = i.id 
    AND m.sender_type IN ('admin', 'system') 
    AND m.is_read = FALSE
  ) AS unread_count,
  
  -- Patient ID for RLS
  i.patient_id

FROM public.intakes i
JOIN public.services s ON i.service_id = s.id;

-- Analytics: Daily intake stats (for admin dashboard)
CREATE OR REPLACE VIEW public.daily_intake_stats AS
SELECT 
  DATE(created_at) AS date,
  COUNT(*) AS total_intakes,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE status = 'declined') AS declined,
  COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
  COUNT(*) FILTER (WHERE sla_breached = TRUE) AS sla_breaches,
  AVG(EXTRACT(EPOCH FROM (approved_at - paid_at)) / 3600) FILTER (WHERE approved_at IS NOT NULL) AS avg_approval_hours,
  SUM(amount_cents) FILTER (WHERE payment_status = 'paid') AS revenue_cents
FROM public.intakes
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- RLS FOR VIEWS
-- ============================================

-- Note: Views inherit RLS from underlying tables, but we can add SECURITY INVOKER
-- to ensure the view runs with the caller's permissions

-- Grant access to views
GRANT SELECT ON public.admin_queue TO authenticated;
GRANT SELECT ON public.patient_intakes_summary TO authenticated;
GRANT SELECT ON public.daily_intake_stats TO authenticated;
