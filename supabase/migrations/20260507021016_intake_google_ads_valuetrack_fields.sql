-- Persist Google Ads ValueTrack diagnostics so paid-click quality can be
-- reconciled from the intake record without relying on browser-only analytics.
ALTER TABLE public.intakes
  ADD COLUMN IF NOT EXISTS utm_id text,
  ADD COLUMN IF NOT EXISTS campaignid text,
  ADD COLUMN IF NOT EXISTS adgroupid text,
  ADD COLUMN IF NOT EXISTS keyword text,
  ADD COLUMN IF NOT EXISTS creative text,
  ADD COLUMN IF NOT EXISTS matchtype text,
  ADD COLUMN IF NOT EXISTS device text,
  ADD COLUMN IF NOT EXISTS network text;

COMMENT ON COLUMN public.intakes.utm_id IS
  'Manual campaign ID parameter, commonly populated with Google Ads {campaignid}.';
COMMENT ON COLUMN public.intakes.campaignid IS
  'Google Ads ValueTrack campaign ID from {campaignid}.';
COMMENT ON COLUMN public.intakes.adgroupid IS
  'Google Ads ValueTrack ad group ID from {adgroupid}.';
COMMENT ON COLUMN public.intakes.keyword IS
  'Google Ads ValueTrack keyword from {keyword}.';
COMMENT ON COLUMN public.intakes.creative IS
  'Google Ads ValueTrack creative/ad ID from {creative}.';
COMMENT ON COLUMN public.intakes.matchtype IS
  'Google Ads ValueTrack match type from {matchtype}.';
COMMENT ON COLUMN public.intakes.device IS
  'Google Ads ValueTrack device code from {device}.';
COMMENT ON COLUMN public.intakes.network IS
  'Google Ads ValueTrack network code from {network}.';
