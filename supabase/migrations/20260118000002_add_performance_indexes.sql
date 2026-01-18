-- Performance indexes for RLS policy subqueries and common query patterns
-- These indexes are critical for scale as RLS policies execute per-row

-- Profiles table: auth_user_id is used in most RLS policies
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON profiles(auth_user_id);

-- Intakes table: commonly queried by patient_id, status, and payment_status
CREATE INDEX IF NOT EXISTS idx_intakes_patient_id ON intakes(patient_id);
CREATE INDEX IF NOT EXISTS idx_intakes_status ON intakes(status);
CREATE INDEX IF NOT EXISTS idx_intakes_payment_status ON intakes(payment_status);
CREATE INDEX IF NOT EXISTS idx_intakes_created_at ON intakes(created_at DESC);

-- Composite index for doctor queue queries
CREATE INDEX IF NOT EXISTS idx_intakes_queue ON intakes(status, payment_status, created_at DESC) 
  WHERE status IN ('paid', 'in_review');

-- Requests table (legacy): similar indexes
CREATE INDEX IF NOT EXISTS idx_requests_patient_id ON requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);

-- Notifications: user lookup (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(user_id, read) WHERE read = false;
  END IF;
END $$;

-- Intake answers: lookup by intake (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'intake_answers') THEN
    CREATE INDEX IF NOT EXISTS idx_intake_answers_intake_id ON intake_answers(intake_id);
  END IF;
END $$;

-- Audit logs: actor and timestamp queries (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_request ON audit_logs(request_id) WHERE request_id IS NOT NULL;
  END IF;
END $$;

-- Abandoned checkout optimization (only if column exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'intakes' AND column_name = 'abandoned_email_sent_at') THEN
    CREATE INDEX IF NOT EXISTS idx_intakes_abandoned ON intakes(created_at, payment_status, abandoned_email_sent_at)
      WHERE payment_status = 'pending' AND abandoned_email_sent_at IS NULL;
  END IF;
END $$;
