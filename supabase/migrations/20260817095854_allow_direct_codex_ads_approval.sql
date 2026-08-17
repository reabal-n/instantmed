-- Let an exact Codex-task decision consume a validated Google Ads proposal
-- directly. Telegram keeps its signed-card intermediate state. All immutable
-- payload and receipt checks remain unchanged.

create or replace function public.enforce_google_ads_proposal_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('validated', 'failed', 'expired'))
    or (
      old.status = 'validated'
      and new.status in (
        'awaiting_approval',
        'approved',
        'rejected',
        'failed',
        'expired'
      )
    )
    or (
      old.status = 'awaiting_approval'
      and new.status in ('approved', 'rejected', 'expired')
    )
    or (old.status = 'approved' and new.status in ('applying', 'aborted', 'expired'))
    or (
      old.status = 'applying'
      and new.status in ('applied', 'aborted', 'failed')
    )
    or (
      old.status = 'applied'
      and new.status in ('verified', 'failed', 'rolled_back')
    )
    or (old.status = 'verified' and new.status = 'rolled_back')
  ) then
    raise exception 'invalid Google Ads proposal status transition';
  end if;

  if (old.status <> 'draft' or new.status <> 'draft') and (
    new.proposal_key is distinct from old.proposal_key
    or new.run_id is distinct from old.run_id
    or new.mutation_family is distinct from old.mutation_family
    or new.operations is distinct from old.operations
    or new.rationale is distinct from old.rationale
    or new.baseline_hash is distinct from old.baseline_hash
    or new.rollback_plan is distinct from old.rollback_plan
    or new.expires_at is distinct from old.expires_at
  ) then
    raise exception 'validated Google Ads proposal payload is immutable';
  end if;

  if old.validation_receipt is not null
    and new.validation_receipt is distinct from old.validation_receipt then
    raise exception 'Google Ads proposal validation receipt is immutable';
  end if;

  if old.telegram_message_id is not null
    and new.telegram_message_id is distinct from old.telegram_message_id then
    raise exception 'Google Ads proposal Telegram message is immutable';
  end if;

  if old.approval_channel is not null and (
    new.approval_channel is distinct from old.approval_channel
    or new.approval_reference is distinct from old.approval_reference
    or new.approval_actor_hash is distinct from old.approval_actor_hash
    or new.approved_at is distinct from old.approved_at
    or new.rejected_at is distinct from old.rejected_at
    or new.telegram_update_id is distinct from old.telegram_update_id
    or new.telegram_callback_query_hash
      is distinct from old.telegram_callback_query_hash
  ) then
    raise exception 'Google Ads proposal decision receipt is immutable';
  end if;

  if old.apply_receipt is not null
    and new.apply_receipt is distinct from old.apply_receipt then
    raise exception 'Google Ads proposal apply receipt is immutable';
  end if;

  if old.verification_receipt is not null
    and new.verification_receipt is distinct from old.verification_receipt then
    raise exception 'Google Ads proposal verification receipt is immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_google_ads_proposal_immutability()
  from public, anon, authenticated;
