-- Capture Google Ads click identifiers on the intakes row.
--
-- Why: server-side Google Ads Conversion API needs the gclid (or gbraid/wbraid)
-- to attribute conversions back to the originating ad click. Browser-side gtag
-- already covers most users via cookies, but iOS Safari blocks third-party
-- cookies and ~30% of attribution is lost. Storing the click id at intake
-- submit time and firing the conversion server-side from the Stripe webhook
-- recovers that gap.

alter table public.intakes
  add column if not exists gclid text,
  add column if not exists gbraid text,
  add column if not exists wbraid text;

-- Index gclid for support lookups ("did this user click an ad?") and for
-- the conversion-fire query that finds intakes needing server-side upload.
create index if not exists idx_intakes_gclid on public.intakes (gclid)
  where gclid is not null;

comment on column public.intakes.gclid is
  'Google Click ID captured at intake submission. Used for server-side Google Ads Conversion API attribution.';
comment on column public.intakes.gbraid is
  'Google Click ID for iOS app/web cross-domain (replaces gclid in some contexts).';
comment on column public.intakes.wbraid is
  'Google Click ID for web-to-app journeys.';
