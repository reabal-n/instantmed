-- Operational config: business hours, capacity, urgent notice, scheduled maintenance
-- Stored in feature_flags for consistency with existing admin UI

INSERT INTO public.feature_flags (key, value) VALUES
  ('business_hours_enabled', 'true'::jsonb),
  ('business_hours_open', '8'::jsonb),
  ('business_hours_close', '22'::jsonb),
  ('business_hours_timezone', '"Australia/Sydney"'::jsonb),
  ('capacity_limit_enabled', 'false'::jsonb),
  ('capacity_limit_max', '100'::jsonb),
  ('urgent_notice_enabled', 'false'::jsonb),
  ('urgent_notice_message', '""'::jsonb),
  ('maintenance_scheduled_start', 'null'::jsonb),
  ('maintenance_scheduled_end', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Doctor availability: simple pause toggle for doctors
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS doctor_available BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.doctor_available IS 'When false, doctor is paused and does not receive new requests';

-- RPC: count intakes created today in Australia/Sydney for capacity check
CREATE OR REPLACE FUNCTION public.count_intakes_today_sydney()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::bigint
  FROM intakes
  WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Australia/Sydney')::date
    = (NOW() AT TIME ZONE 'Australia/Sydney')::date;
$$;
