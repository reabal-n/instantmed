-- Create the missing get_email_outbox_stats RPC function
CREATE OR REPLACE FUNCTION public.get_email_outbox_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'sent', COUNT(*) FILTER (WHERE status = 'sent'),
    'failed', COUNT(*) FILTER (WHERE status = 'failed'),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'delivered', COUNT(*) FILTER (WHERE status = 'delivered')
  ) INTO result
  FROM public.email_outbox;
  
  RETURN result;
END;
$$;

-- Grant execute to authenticated users (admins will check in app layer)
GRANT EXECUTE ON FUNCTION public.get_email_outbox_stats() TO authenticated;
