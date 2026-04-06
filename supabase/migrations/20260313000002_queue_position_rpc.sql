-- RPC: Get queue position for a patient's intake (how many ahead of them)
CREATE OR REPLACE FUNCTION public.get_queue_position(p_intake_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (
      ORDER BY is_priority DESC NULLS LAST,
               sla_deadline ASC NULLS LAST,
               created_at ASC
    ) AS pos
    FROM intakes
    WHERE status IN ('paid', 'in_review', 'pending_info')
  )
  SELECT (pos - 1)::bigint
  FROM ranked
  WHERE id = p_intake_id;
$$;
