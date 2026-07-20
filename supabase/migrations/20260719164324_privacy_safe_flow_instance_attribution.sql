alter table public.partial_intakes
  add column if not exists flow_instance_id uuid;

comment on column public.partial_intakes.flow_instance_id is
  'Opaque random identifier for one intake attempt; contains no patient or clinical data.';

alter table public.intakes
  add column if not exists flow_instance_id uuid;

comment on column public.intakes.flow_instance_id is
  'Opaque random identifier for one intake attempt; contains no patient or clinical data.';
