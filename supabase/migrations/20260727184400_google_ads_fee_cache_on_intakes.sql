-- Cache actual Stripe fee truth on the authoritative intake PaymentIntent.
-- The legacy payments table is not populated for current checkout flows.

alter table public.intakes
  add column if not exists stripe_balance_transaction_id text,
  add column if not exists stripe_fee_cents integer
    check (stripe_fee_cents >= 0),
  add column if not exists stripe_fee_synced_at timestamptz;

comment on column public.intakes.stripe_balance_transaction_id is
  'Stripe BalanceTransaction used to verify the actual processing fee.';
comment on column public.intakes.stripe_fee_cents is
  'Actual Stripe processing fee in cents for the current PaymentIntent.';
comment on column public.intakes.stripe_fee_synced_at is
  'Time the current PaymentIntent fee was read from Stripe and cached.';
