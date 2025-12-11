-- Add payment fields to requests table
ALTER TABLE public.requests 
ADD COLUMN IF NOT EXISTS paid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending_payment' 
  CHECK (payment_status IN ('pending_payment', 'paid', 'failed', 'refunded'));

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL,
  stripe_payment_intent_id text,
  amount integer NOT NULL,
  currency text DEFAULT 'aud',
  status text DEFAULT 'created' CHECK (status IN ('created', 'pending', 'paid', 'failed', 'refunded')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Patients can view payments for their own requests
CREATE POLICY "patients_select_own_payments"
  ON public.payments FOR SELECT
  USING (
    request_id IN (
      SELECT r.id FROM public.requests r
      JOIN public.profiles p ON r.patient_id = p.id
      WHERE p.auth_user_id = auth.uid()
    )
  );

-- Doctors can view all payments
CREATE POLICY "doctors_select_all_payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE auth_user_id = auth.uid() AND role = 'doctor'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS payments_request_id_idx ON public.payments(request_id);
CREATE INDEX IF NOT EXISTS payments_stripe_session_id_idx ON public.payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS requests_payment_status_idx ON public.requests(payment_status);
CREATE INDEX IF NOT EXISTS requests_paid_idx ON public.requests(paid);
