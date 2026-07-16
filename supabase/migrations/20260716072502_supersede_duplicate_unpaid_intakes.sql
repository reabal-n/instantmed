-- Keep the newest retryable, session-less intake for each patient service lane
-- and retain older duplicates as terminal audit records. Rows with a stored
-- Stripe session are deliberately excluded: their payment state must be
-- reconciled through Stripe before any lifecycle mutation.
with ranked_retryable as materialized (
  select
    i.id,
    row_number() over (
      partition by
        lower(btrim(coalesce(
          nullif(i.guest_email, ''),
          nullif(p.normalized_email, ''),
          nullif(p.email, '')
        ))),
        coalesce(i.category, ''),
        coalesce(i.subtype, '')
      order by i.created_at desc, i.id desc
    ) as lane_rank
  from public.intakes i
  left join public.profiles p on p.id = i.patient_id
  where i.status in ('pending_payment', 'checkout_failed')
    and (i.payment_status is null or i.payment_status in ('unpaid', 'pending', 'failed'))
    and i.payment_id is null
    and i.exclude_from_reporting is distinct from true
    and nullif(lower(btrim(coalesce(
      nullif(i.guest_email, ''),
      nullif(p.normalized_email, ''),
      nullif(p.email, '')
    ))), '') is not null
),
superseded as (
  select id
  from ranked_retryable
  where lane_rank > 1
)
update public.intakes i
set
  status = 'cancelled',
  cancelled_at = coalesce(i.cancelled_at, now()),
  checkout_error = case
    when nullif(btrim(i.checkout_error), '') is null
      then 'superseded_duplicate_unpaid'
    when position('superseded_duplicate_unpaid' in i.checkout_error) > 0
      then i.checkout_error
    else i.checkout_error || ' | superseded_duplicate_unpaid'
  end,
  updated_at = now()
from superseded s
where i.id = s.id
  and i.status in ('pending_payment', 'checkout_failed')
  and (i.payment_status is null or i.payment_status in ('unpaid', 'pending', 'failed'))
  and i.payment_id is null;
