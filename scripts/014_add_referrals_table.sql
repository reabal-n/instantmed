-- Add referrals and credits table for referral program
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'completed', 'expired')),
  referrer_credit_amount INTEGER DEFAULT 500, -- $5.00 in cents
  referee_credit_amount INTEGER DEFAULT 500,  -- $5.00 in cents
  referrer_credited BOOLEAN DEFAULT false,
  referee_credited BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days'
);

CREATE TABLE IF NOT EXISTS credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  type TEXT NOT NULL CHECK (type IN ('referral_bonus', 'promo', 'refund', 'used')),
  description TEXT,
  referral_id UUID REFERENCES referrals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up referral codes
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_credits_profile ON credits(profile_id);

-- RLS policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Users can see their own referrals
CREATE POLICY referrals_select_own ON referrals
  FOR SELECT USING (referrer_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

-- Users can see their own credits
CREATE POLICY credits_select_own ON credits
  FOR SELECT USING (profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));
