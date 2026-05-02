-- Referral system: profiles.referral_code + referral_events + referral_credits
-- Replaces the dropped referrals/credits tables with a tighter, launch-ready design.
--
-- Design decisions:
--   - referral_code: deterministic 8-char uppercase code derived from profile ID, stored for fast lookup
--   - referral_events: one row per referral relationship (referrer → referred)
--     status: pending (referred signed up) → completed (first payment made) → credited (credit awarded)
--   - referral_credits: one credit grant row per qualifying event, with credit_cents
--     (display-only for launch; Stripe coupon redemption is v2)
--   - $5 AUD = 500 cents for both parties

-- ── 1. Add referral_code to profiles ────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code text;

-- Backfill existing profiles with deterministic code (first 8 chars of UUID, uppercase, no hyphens)
UPDATE profiles
  SET referral_code = upper(replace(left(id::text, 8), '-', ''))
  WHERE referral_code IS NULL;

-- Unique index for fast ?ref= lookup
CREATE UNIQUE INDEX IF NOT EXISTS profiles_referral_code_idx ON profiles (referral_code);

COMMENT ON COLUMN profiles.referral_code IS
  'Unique 8-char referral code. Generated deterministically from profile ID on creation.';

-- Trigger: auto-set referral_code on new profile inserts
CREATE OR REPLACE FUNCTION set_profile_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(replace(left(NEW.id::text, 8), '-', ''));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_referral_code ON profiles;
CREATE TRIGGER trg_set_profile_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_profile_referral_code();

-- ── 2. referral_events table ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Status lifecycle: pending → completed → credited
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'completed', 'credited')),
  -- Set when referred user completes first payment
  completed_at    timestamptz,
  -- Set when credits are awarded to both parties
  credited_at     timestamptz,
  -- Intake that triggered the completion
  intake_id       uuid REFERENCES intakes(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  -- One referral relationship per pair (prevents duplicate rewarding)
  UNIQUE (referrer_id, referred_id)
);

COMMENT ON TABLE referral_events IS
  'Tracks referral relationships. One row per referrer→referred pair. Completed when referred user makes first payment.';

-- ── 3. referral_credits table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS referral_credits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_event_id   uuid NOT NULL REFERENCES referral_events(id) ON DELETE CASCADE,
  credit_cents        integer NOT NULL DEFAULT 500 CHECK (credit_cents > 0),
  -- 'referrer' = person who shared the link, 'referred' = new user
  credit_type         text NOT NULL CHECK (credit_type IN ('referrer', 'referred')),
  -- For v2: track if credit has been applied to a Stripe coupon/checkout
  applied_at          timestamptz,
  applied_intake_id   uuid REFERENCES intakes(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE referral_credits IS
  'Credit grants from referral completions. Display-only for launch; redemption in v2.';

-- ── 4. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS referral_events_referrer_idx ON referral_events (referrer_id);
CREATE INDEX IF NOT EXISTS referral_events_referred_idx ON referral_events (referred_id);
CREATE INDEX IF NOT EXISTS referral_events_status_idx   ON referral_events (status);
CREATE INDEX IF NOT EXISTS referral_credits_profile_idx ON referral_credits (profile_id);

-- ── 5. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE referral_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_credits ENABLE ROW LEVEL SECURITY;

-- Patients can see referral events they're part of
-- auth.uid() returns uuid; clerk_user_id is text — must cast: (auth.uid())::text = clerk_user_id
DROP POLICY IF EXISTS "referral_events_select_own" ON referral_events;
CREATE POLICY "referral_events_select_own" ON referral_events
  FOR SELECT USING (
    referrer_id = (SELECT id FROM profiles WHERE (auth.uid())::text = clerk_user_id LIMIT 1)
    OR
    referred_id = (SELECT id FROM profiles WHERE (auth.uid())::text = clerk_user_id LIMIT 1)
  );

DROP POLICY IF EXISTS "referral_credits_select_own" ON referral_credits;
CREATE POLICY "referral_credits_select_own" ON referral_credits
  FOR SELECT USING (
    profile_id = (SELECT id FROM profiles WHERE (auth.uid())::text = clerk_user_id LIMIT 1)
  );

DROP POLICY IF EXISTS "referral_events_service_role_all" ON referral_events;
CREATE POLICY "referral_events_service_role_all" ON referral_events
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "referral_credits_service_role_all" ON referral_credits;
CREATE POLICY "referral_credits_service_role_all" ON referral_credits
  FOR ALL USING (auth.role() = 'service_role');
