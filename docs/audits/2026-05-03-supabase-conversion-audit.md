# Supabase Migration + Conversion Audit

**Date:** 2026-05-03
**Scope:** Supabase migration history, public schema/table posture, dormant legacy subscription paths, and Google Ads purchase conversion tracking.

## Verdict

The drift was real. The linked Supabase project had three applied migrations missing from the repo, so `supabase db push --dry-run --linked` could not be trusted from a clean checkout. Those migrations have been restored, and a linked migration guard now exists.

The conversion path was functional but not production-grade: the server-side Google Ads upload used an old API version and sent every captured click id when Google's upload examples require exactly one of `gclid`, `gbraid`, or `wbraid`.

## Supabase Migration History

- Current live migration count on disk: **57** SQL files.
- Current structure: 1 squashed baseline plus 56 incremental migrations.
- Latest migration: `20260503090000_enable_rls_on_audit_logs_archive.sql`.
- Restored missing remote-applied migrations:
  - `20260502000000_encrypt_partial_intake_drafts.sql`
  - `20260502003000_add_account_closure_to_profiles.sql`
  - `20260503050700_fix_stripe_webhook_event_claim.sql`
- Added guard script: `pnpm db:check-migrations`.

## Public Schema Scan

Linked public schema snapshot:

- 78 tables
- 1,153 columns
- 436 indexes
- 173 policies
- 2 views
- 64 functions
- 26 triggers

Tables with RLS enabled but intentionally no direct policies are service-role/RPC surfaces: `partial_intakes`, `cron_heartbeats`, `exit_intent_captures`, and `subscriptions`.

`audit_logs_archive` was the only public table found with RLS disabled. It was empty, but the failure mode is bad once retention starts moving audit rows. RLS is now enabled with no broad policies.

## Redundancy And Legacy

- Do not delete applied migration files. Supabase migration history is an append-only operational contract.
- The duplicate `add_delay_notification_sent_at` tracker entries are cosmetic historical drift and remain documented.
- `20260428030240_remote_history_placeholder.sql` stays because it preserves remote tracker parity.
- Repeat Rx subscription acquisition was still present in this branch despite current business docs saying one-off transactions only. The checkout UI, nudge cron, email template, env requirement, and patient acquisition surfaces are retired; compatibility handlers remain for historical subscription records.

## Google Ads Conversion Flow

Current source-of-truth flow:

1. Browser captures UTM and Google click IDs through `captureAttribution()`.
2. Checkout persists `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, `landing_page`, `gclid`, `gbraid`, and `wbraid` onto `intakes`.
3. Stripe webhook fires server-side Google Ads purchase upload from the paid intake row.
4. Success pages fire browser-side `gtag` purchase events with the same intake id as transaction id for dedupe.

Fixes:

- Server upload endpoint moved to Google Ads API `v24`.
- Request builder now sends exactly one click id, in priority order: `gclid`, then `gbraid`, then `wbraid`.
- Server upload logs no longer attach Google response bodies to logs/Sentry.
- Attribution capture now runs outside production so preview/local smoke tests can exercise storage without loading Google scripts.
- Guest checkout browser conversion now passes real returning/new-customer classification where the paid intake has prior paid history.

## Remaining Notes

- Google Ads account targeting remains an operator task: do not use health-based Customer Match/lookalike audiences for health campaigns.
- Historical subscription compatibility code and the `subscriptions` table remain until there are no historical subscriptions to service.
- Do not run destructive migration cleanup against production. If a table is truly retired, add a forward migration after checking code references and row count.
