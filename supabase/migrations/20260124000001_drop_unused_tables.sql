-- Drop unused tables: credits, referrals, payment_reconciliation
-- These tables were created but never integrated into the application

-- Drop credits first (has FK to referrals)
DROP TABLE IF EXISTS credits CASCADE;

-- Drop referrals (has FK to profiles)
DROP TABLE IF EXISTS referrals CASCADE;

-- Drop payment_reconciliation (has FK to requests and profiles)
DROP TABLE IF EXISTS payment_reconciliation CASCADE;

-- Remove referral_code column from profiles if it exists
ALTER TABLE profiles DROP COLUMN IF EXISTS referral_code;
