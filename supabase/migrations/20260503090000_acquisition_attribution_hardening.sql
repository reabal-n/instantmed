-- Harden paid acquisition attribution on canonical intakes.
--
-- Why: Google Ads purchase upload and channel reporting need the same
-- source-of-truth row that Stripe webhooks update. Session-only attribution is
-- too fragile for paid search, so persist full campaign context at intake
-- creation.

alter table public.intakes
  add column if not exists utm_content text,
  add column if not exists utm_term text,
  add column if not exists landing_page text,
  add column if not exists referrer text,
  add column if not exists attribution_captured_at timestamptz;

create index if not exists idx_intakes_google_click_ids
  on public.intakes (created_at desc)
  where gclid is not null or gbraid is not null or wbraid is not null;

create index if not exists idx_intakes_utm_source_created
  on public.intakes (utm_source, created_at desc)
  where utm_source is not null;

comment on column public.intakes.utm_content is
  'Paid/owned campaign content parameter captured at intake creation.';
comment on column public.intakes.utm_term is
  'Paid/organic campaign term parameter captured at intake creation.';
comment on column public.intakes.landing_page is
  'First conversion-session landing path captured before checkout.';
comment on column public.intakes.referrer is
  'Document referrer captured before checkout for source diagnostics.';
comment on column public.intakes.attribution_captured_at is
  'Client-side timestamp when acquisition attribution was captured.';
