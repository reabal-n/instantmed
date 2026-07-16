-- Demographics digest for Parchment reuse-mode staleness detection.
--
-- Reuse-mode prescribing opens (added 2026-07-14) skip the Parchment
-- demographics refresh entirely, which let an identity edit (Medicare,
-- address, name, phone) go stale on the next eScript. The sync layer now
-- stores a SHA-256 of the exact Parchment update payload at each successful
-- sync; reuse skips the network call only while this digest is unchanged.
-- NULL (all existing rows) forces one refresh on the next open, then the
-- fast path resumes. Irreversible digest — no demographics readable.

alter table public.profiles
  add column if not exists parchment_synced_demographics_hash text;

comment on column public.profiles.parchment_synced_demographics_hash is
  'SHA-256 of the exact Parchment update payload at the last successful sync. Reuse-mode prescribing opens skip the network refresh only while this matches; NULL forces one refresh. Irreversible digest, not readable PHI.';
