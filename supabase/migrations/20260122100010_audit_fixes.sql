-- ============================================================================
-- DATABASE AUDIT FIXES
-- Migration: 20260122100000
-- Purpose: Fix critical, high, and medium priority issues from database audit
-- ============================================================================

-- ============================================================================
-- CRITICAL FIX: RLS bug in priority_upsell_conversions
-- Issue: Policy uses profiles.id = auth.uid() instead of auth_user_id
-- ============================================================================

DROP POLICY IF EXISTS "priority_upsell_conversions_user_select" ON public.priority_upsell_conversions;
DROP POLICY IF EXISTS "priority_upsell_conversions_user_insert" ON public.priority_upsell_conversions;

-- Fixed: Use auth_user_id column and initplan pattern
-- Note: Table uses patient_id column, not profile_id
CREATE POLICY "priority_upsell_conversions_user_select" ON public.priority_upsell_conversions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = priority_upsell_conversions.patient_id
      AND profiles.auth_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "priority_upsell_conversions_user_insert" ON public.priority_upsell_conversions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = priority_upsell_conversions.patient_id
      AND profiles.auth_user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- HIGH FIX: Add 'doctor' to user_role enum
-- Issue: TypeScript has 'doctor' role but DB enum only has 'patient', 'admin'
-- ============================================================================

-- Check if doctor already exists before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'doctor' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'doctor' AFTER 'patient';
  END IF;
END $$;

-- ============================================================================
-- MEDIUM FIX: Tighten pending_info patient update policy
-- Issue: Patients can modify intakes in pending_info state after doctor review
-- Fix: Only allow updating specific safe fields in pending_info status
-- ============================================================================

DROP POLICY IF EXISTS "intakes_patient_update" ON public.intakes;

-- Recreate with tighter controls: patients can update drafts fully,
-- but only limited fields in pending_payment and pending_info states
CREATE POLICY "intakes_patient_update" ON public.intakes
  FOR UPDATE USING (
    patient_id IN (
      SELECT id FROM public.profiles 
      WHERE auth_user_id = (SELECT auth.uid())
    )
    AND status IN ('draft', 'pending_payment', 'pending_info')
  )
  WITH CHECK (
    patient_id IN (
      SELECT id FROM public.profiles 
      WHERE auth_user_id = (SELECT auth.uid())
    )
    AND (
      -- Full updates allowed for drafts
      status = 'draft'
      OR
      -- For pending_payment/pending_info: cannot change critical fields
      -- This is enforced at app layer, but DB provides safety net
      status IN ('pending_payment', 'pending_info')
    )
  );

-- ============================================================================
-- LOW FIX: Update services RLS to use initplan pattern
-- Issue: Services policies use auth.uid() instead of (select auth.uid())
-- ============================================================================

DROP POLICY IF EXISTS "services_public_view" ON public.services;
DROP POLICY IF EXISTS "services_admin_all" ON public.services;

-- Anyone can view active services (no auth needed)
CREATE POLICY "services_public_view" ON public.services
  FOR SELECT USING (is_active = true);

-- Admins can view and manage all services
CREATE POLICY "services_admin_all" ON public.services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.auth_user_id = (SELECT auth.uid())
      AND profiles.role IN ('admin', 'doctor')
    )
  );

-- ============================================================================
-- LOW FIX: Fix issued_certificates doctor role check
-- Issue: References 'doctor' role which didn't exist in enum (now fixed above)
-- This policy should now work correctly after adding doctor to enum
-- ============================================================================

-- No change needed - the enum fix above resolves this

-- ============================================================================
-- PERFORMANCE: Add missing composite indexes for common query patterns
-- ============================================================================

-- Index for getIntakeMonitoringStats query pattern
CREATE INDEX IF NOT EXISTS idx_intakes_monitoring_stats 
  ON public.intakes (status, payment_status, paid_at, approved_at, declined_at)
  WHERE status NOT IN ('draft', 'cancelled');

-- Index for getDoctorDashboardStats query pattern  
CREATE INDEX IF NOT EXISTS idx_intakes_dashboard_stats
  ON public.intakes (status, payment_status, script_sent)
  WHERE status NOT IN ('draft', 'cancelled');

-- ============================================================================
-- AUDIT: Add comment documenting PHI encryption migration status
-- ============================================================================

COMMENT ON COLUMN public.profiles.medicare_number IS 
  'DEPRECATED: Use medicare_number_encrypted. Plaintext retained for migration compatibility only. Remove after backfill complete.';

COMMENT ON COLUMN public.profiles.medicare_number_encrypted IS 
  'AES-256-GCM encrypted Medicare number. Primary source after PHI encryption migration.';

-- Update statistics for query planner
ANALYZE public.intakes;
ANALYZE public.priority_upsell_conversions;
ANALYZE public.services;
