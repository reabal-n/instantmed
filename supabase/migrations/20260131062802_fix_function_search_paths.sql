-- Fix security issue: set fixed search_path on update_email_outbox_updated_at function
CREATE OR REPLACE FUNCTION public.update_email_outbox_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
