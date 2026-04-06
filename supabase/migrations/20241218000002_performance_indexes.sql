-- Performance optimization indexes for common query patterns
-- Run this migration to improve query performance

-- ============================================
-- REQUESTS TABLE INDEXES
-- ============================================

-- Index for doctor dashboard: fetch pending requests ordered by created_at
CREATE INDEX IF NOT EXISTS idx_requests_status_created 
  ON public.requests(status, created_at DESC);

-- Index for patient dashboard: fetch requests by patient
CREATE INDEX IF NOT EXISTS idx_requests_patient_created 
  ON public.requests(patient_id, created_at DESC);

-- Index for payment status queries
CREATE INDEX IF NOT EXISTS idx_requests_payment_status 
  ON public.requests(payment_status) 
  WHERE payment_status = 'pending_payment';

-- Composite index for filtering by status and category
CREATE INDEX IF NOT EXISTS idx_requests_status_category 
  ON public.requests(status, category);

-- Index for active checkout sessions (used in webhook processing)
CREATE INDEX IF NOT EXISTS idx_requests_active_checkout 
  ON public.requests(active_checkout_session_id) 
  WHERE active_checkout_session_id IS NOT NULL;

-- ============================================
-- PROFILES TABLE INDEXES
-- ============================================

-- Index for auth user lookups (most common operation)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user 
  ON public.profiles(auth_user_id);

-- Index for role-based queries (doctors vs patients)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON public.profiles(role);

-- Index for Stripe customer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer 
  ON public.profiles(stripe_customer_id) 
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================
-- PAYMENTS TABLE INDEXES
-- ============================================

-- Index for Stripe session lookups (webhook processing)
CREATE INDEX IF NOT EXISTS idx_payments_stripe_session 
  ON public.payments(stripe_session_id);

-- Index for payment status queries
CREATE INDEX IF NOT EXISTS idx_payments_status 
  ON public.payments(status);

-- Index for request payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_request 
  ON public.payments(request_id);

-- ============================================
-- DOCUMENTS TABLE INDEXES
-- ============================================

-- Index for fetching documents by request
CREATE INDEX IF NOT EXISTS idx_documents_request 
  ON public.documents(request_id, created_at DESC);

-- Index for document type queries
CREATE INDEX IF NOT EXISTS idx_documents_type 
  ON public.documents(type);

-- ============================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================

-- Index for user notification lookups (already created in notifications migration)
-- These are here for completeness if running separately

-- Index for unread notifications count
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_count 
  ON public.notifications(user_id) 
  WHERE read = FALSE;

-- ============================================
-- STRIPE WEBHOOK EVENTS INDEXES
-- ============================================

-- Index for event idempotency checks
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_id 
  ON public.stripe_webhook_events(event_id);

-- Index for debugging: find events by request
CREATE INDEX IF NOT EXISTS idx_stripe_events_request 
  ON public.stripe_webhook_events(request_id) 
  WHERE request_id IS NOT NULL;

-- ============================================
-- REQUEST ANSWERS TABLE INDEXES
-- ============================================

-- Index for fetching answers by request
CREATE INDEX IF NOT EXISTS idx_request_answers_request 
  ON public.request_answers(request_id);

-- ============================================
-- ANALYZE TABLES
-- ============================================

-- Update table statistics for query planner
ANALYZE public.requests;
ANALYZE public.profiles;
ANALYZE public.payments;
ANALYZE public.documents;
ANALYZE public.notifications;
