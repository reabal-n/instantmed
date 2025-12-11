-- Add support for test payment status
-- This allows distinguishing real payments from test-mode bypassed payments

-- No schema changes needed - payment_status is already a text field
-- Just documenting the valid statuses:
-- 'pending_payment' - awaiting payment
-- 'paid' - real payment completed
-- 'paid_test' - test mode payment bypass
-- 'failed' - payment failed
-- 'refunded' - payment refunded

-- Update any RLS policies if needed to treat paid_test same as paid
-- (Current policies use simple SELECT so no changes needed)

SELECT 'Test payment status support ready' as status;
