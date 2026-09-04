import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260905120000_refill_reminder_funnel.sql",
)
const migration = existsSync(migrationPath)
  ? readFileSync(migrationPath, "utf8").toLowerCase().replace(/\s+/g, " ")
  : ""

function functionBlock(name: string, nextName?: string): string {
  const start = migration.indexOf(`create or replace function public.${name}`)
  const end = nextName
    ? migration.indexOf(`create or replace function public.${nextName}`, start)
    : migration.length
  if (start < 0 || end <= start) return ""
  return migration.slice(start, end)
}

describe("refill reminder funnel migration", () => {
  it("creates the aggregate and atomic receipt RPCs", () => {
    expect(existsSync(migrationPath)).toBe(true)
    expect(functionBlock("record_resend_outbox_event", "get_refill_reminder_funnel")).not.toBe("")
    expect(functionBlock("get_refill_reminder_funnel")).not.toBe("")
  })

  it("owns Resend receipt dedupe in one row lock and preserves terminal delivery evidence", () => {
    const receipt = functionBlock("record_resend_outbox_event", "get_refill_reminder_funnel")

    expect(receipt).toContain("language plpgsql")
    expect(receipt).toContain("volatile")
    expect(receipt).toContain("security invoker")
    expect(receipt).toContain("set search_path = ''")
    expect(receipt).toContain("for update")
    expect(receipt).toContain("processed_events")
    expect(receipt).toContain("v_event_key")
    expect(receipt).toContain("email.clicked")
    expect(receipt).toContain("email_is_test")
    expect(receipt).toContain(
      "returns table ( matched boolean, duplicate boolean, outbox_id uuid, email_type text, email_is_test boolean )",
    )
    expect(receipt).toContain("metadata @> '{\"test\": true}'::jsonb")
    expect(receipt).toContain("p_event_created_at timestamptz default pg_catalog.clock_timestamp()")
    expect(receipt).toContain("v_event_recorded_at := p_event_created_at")
    expect(receipt).toContain("when 'complained' then 6")
    expect(receipt).toContain("when 'bounced' then 5")
    expect(receipt).toContain("v_incoming_rank >= v_current_rank")
    expect(receipt).toContain("v_status <> 'failed'")
    const returnBlock = receipt.slice(
      receipt.indexOf("returns table"),
      receipt.indexOf("language plpgsql"),
    )
    expect(returnBlock).not.toContain("to_email")
    expect(returnBlock).not.toContain("to_name")
  })

  it("commits suppression, entitlement, certificate, and delivery mirrors with the event receipt", () => {
    const receipt = functionBlock("record_resend_outbox_event", "get_refill_reminder_funnel")

    expect(receipt).toContain("outbox.patient_id")
    expect(receipt).toContain("v_patient_id")
    expect(receipt).toContain("update public.profiles")
    expect(receipt).toContain("insert into public.email_preferences")
    expect(receipt).toContain("on conflict (profile_id) do update")
    expect(receipt).toContain("update public.issued_certificates")
    expect(receipt).toContain("insert into public.delivery_tracking")
    expect(receipt).toContain("on conflict (message_id) do update")
    expect(receipt).toContain("coalesce(v_delivery_status, '') not in ('bounced', 'complained')")
    expect(receipt).toContain("v_sent_at >= profile.email_bounced_at")
  })

  it("returns only aggregate Sydney waves from real reportable sends", () => {
    const funnel = functionBlock("get_refill_reminder_funnel")

    expect(funnel).toContain("returns table (")
    for (const column of [
      "week_start timestamptz",
      "week_end_exclusive timestamptz",
      "maturity_at timestamptz",
      "sent bigint",
      "delivered bigint",
      "observed_provider_clicks bigint",
      "utm_attributed_paid_renewals_within_21d bigint",
      "same_patient_paid_reorders_within_21d bigint",
      "utm_converted_sends_within_21d bigint",
      "same_patient_converted_sends_within_21d bigint",
    ]) {
      expect(funnel).toContain(column)
    }
    for (const forbidden of [
      "returns table ( patient_id",
      "to_email text",
      "outbox_id uuid",
      "intake_id uuid",
      "prescription_id uuid",
      "provider_message_id text",
    ]) {
      expect(funnel).not.toContain(forbidden)
    }

    expect(funnel).toContain("language sql")
    expect(funnel).toContain("stable")
    expect(funnel).toContain("security invoker")
    expect(funnel).toContain("set search_path = ''")
    expect(funnel).toContain("p_from < p_to")
    expect(funnel).toContain("p_to <= p_as_of")
    expect(funnel).toContain("outbox.sent_at >= bounds.from_at")
    expect(funnel).toContain("outbox.sent_at < bounds.to_at")
    expect(funnel).toContain("outbox.email_type = 'refill_reminder'")
    expect(funnel).toContain("outbox.sent_at is not null")
    expect(funnel).toContain("outbox.provider_message_id is not null")
    expect(funnel).toContain("outbox.patient_id is not null")
    expect(funnel).toContain("outbox.status <> 'skipped_e2e'")
    expect(funnel).toContain("not (outbox.metadata @> '{\"test\": true}'::jsonb)")
    expect(funnel).toContain("not (outbox.metadata @> '{\"e2e_mode\": true}'::jsonb)")
    expect(funnel).toContain("not (outbox.metadata @> '{\"dev_mode\": true}'::jsonb)")
    expect(funnel).toContain("prescription.id::text = outbox.metadata ->> 'prescription_id'")
    expect(funnel).toContain("prescription.patient_id = outbox.patient_id")
    expect(funnel).toContain("source_intake.id = prescription.intake_id")
    expect(funnel).toContain("source_intake.patient_id = outbox.patient_id")
    expect(funnel).toContain("source_intake.exclude_from_reporting is distinct from true")
    expect(funnel).toContain("outbox.patient_id <> all(p_excluded_patient_ids)")
    expect(funnel).toContain("at time zone 'australia/sydney'")
  })

  it("uses durable event receipts and assigns every gross paid reorder to one latest reminder", () => {
    const funnel = functionBlock("get_refill_reminder_funnel")

    expect(funnel).toContain("send.provider_message_id || ':email.delivered'")
    expect(funnel).toContain("send.provider_message_id || ':email.clicked'")
    expect(funnel).toContain("reorder_intake.paid_at > send.sent_at")
    expect(funnel).toContain("reorder_intake.paid_at <= send.sent_at + interval '21 days'")
    expect(funnel).toContain("reorder_intake.category = 'prescription'")
    expect(funnel).toContain("reorder_intake.subtype = 'repeat'")
    expect(funnel).toMatch(
      /reorder_intake\.payment_status in \(\s*'paid',\s*'partially_refunded',\s*'refunded',\s*'disputed'\s*\)/,
    )
    expect(funnel).toContain("reorder_intake.exclude_from_reporting is distinct from true")
    expect(funnel).toContain("reorder_intake.patient_id <> all(p_excluded_patient_ids)")
    expect(funnel).toContain("row_number() over (")
    expect(funnel).toContain("partition by reorder_intake.id")
    expect(funnel).toContain("order by send.sent_at desc, send.outbox_id desc")
    expect(funnel).toContain("utm_source = 'refill_reminder'")
  })

  it("keeps both functions callable by service role only", () => {
    for (const signature of [
      "public.record_resend_outbox_event(text, text, text, text, timestamptz)",
      "public.get_refill_reminder_funnel(timestamptz, timestamptz, timestamptz, uuid[])",
    ]) {
      const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/, /g, ",\\s*")
        .replace(/\\\(/g, "\\(\\s*")
        .replace(/\\\)/g, "\\s*\\)")
      expect(migration).toMatch(
        new RegExp(`revoke all on function ${escaped}\\s+from public, anon, authenticated, service_role`),
      )
      expect(migration).toMatch(
        new RegExp(`grant execute on function ${escaped}\\s+to service_role`),
      )
    }
  })
})
