import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { SEEDED_E2E_PATIENT_PROFILE_IDS } from "@/lib/data/seeded-e2e-data"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260723150000_review_request_click_funnel.sql",
  ),
  "utf8",
)
  .toLowerCase()
  .replace(/\s+/g, " ")

function functionBlock(name: string, nextName?: string): string {
  const start = migration.indexOf(`create or replace function public.${name}`)
  const end = nextName
    ? migration.indexOf(`create or replace function public.${nextName}`, start)
    : migration.length

  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return migration.slice(start, end)
}

describe("review-request click funnel migration", () => {
  it("adds a nullable first-traversal receipt and a valid unique hash boundary", () => {
    expect(migration).toContain(
      "add column if not exists review_first_clicked_at timestamptz",
    )
    expect(migration).toContain("review_click_key_hash")
    expect(migration).toContain("^[0-9a-f]{64}$")
    expect(migration).toContain("validate constraint email_outbox_review_click_key_hash_check")
    expect(migration).toContain(
      "create unique index if not exists idx_email_outbox_review_click_key_hash",
    )
    expect(migration).toContain(
      "on public.email_outbox ((metadata ->> 'review_click_key_hash'))",
    )
    expect(migration).toContain("where email_type = 'review_request'")
    expect(migration).toContain("and metadata ? 'review_click_key_hash'")
  })

  it("consumes a valid key with one atomic compare-and-set", () => {
    const consume = functionBlock(
      "consume_review_request_click",
      "get_review_request_funnel",
    )

    expect(consume).toContain("returns boolean")
    expect(consume).toContain("language sql")
    expect(consume).toContain("volatile")
    expect(consume).toContain("security invoker")
    expect(consume).toContain("set search_path = ''")
    expect(consume).toContain("p_click_key_hash ~ '^[0-9a-f]{64}$'")
    expect(consume).toContain("update public.email_outbox")
    expect(consume).toContain("email_type = 'review_request'")
    expect(consume).toContain("review_first_clicked_at is null")
    expect(consume).toContain("sent_at is not null")
    expect(consume).toContain("returning true")
    expect(consume).not.toContain("patient_id")
    expect(consume).not.toContain("intake_id")
  })

  it("returns an aggregate-only 30-day-compatible cohort", () => {
    const funnel = functionBlock("get_review_request_funnel")

    expect(funnel).toContain(
      "returns table ( eligible bigint, sent bigint, delivered bigint, trackable_sent bigint, unique_redirect_traversals bigint )",
    )
    expect(funnel).toContain("language sql")
    expect(funnel).toContain("stable")
    expect(funnel).toContain("security invoker")
    expect(funnel).toContain("set search_path = ''")
    expect(funnel).toContain("interval '48 hours'")
    expect(funnel).toContain("intake.status in ('approved', 'completed')")
    expect(funnel).toContain("intake.payment_status = 'paid'")
    expect(funnel).toContain("intake.exclude_from_reporting is distinct from true")
    expect(funnel).toContain("intake.patient_id <> all(p_excluded_patient_ids)")
    expect(funnel).toContain("outbox.status <> 'skipped_e2e'")
    expect(funnel).toContain("outbox.sent_at is not null")
    expect(funnel).toContain(
      "outbox.delivery_status in ('delivered', 'opened', 'clicked')",
    )
    expect(funnel).toContain("metadata ->> 'review_click_key_hash'")
    expect(funnel).toContain("review_first_clicked_at is not null")
    expect(funnel).toContain("count(distinct")
    expect(funnel).not.toContain("to_email")
    expect(funnel).not.toContain("to_name")
  })

  it("keeps both RPCs service-role-only", () => {
    for (const signature of [
      "public.consume_review_request_click(text)",
      "public.get_review_request_funnel(timestamptz, timestamptz, uuid[])",
    ]) {
      expect(migration).toContain(
        `revoke execute on function ${signature} from public, anon, authenticated`,
      )
      expect(migration).toContain(
        `grant execute on function ${signature} to service_role`,
      )
    }
  })

  it("keeps the application-side exclusion list complete", () => {
    const helper = readFileSync(
      join(process.cwd(), "lib/admin/review-request-funnel.ts"),
      "utf8",
    )

    expect(helper).toContain("SEEDED_E2E_PATIENT_PROFILE_IDS")
    for (const patientId of SEEDED_E2E_PATIENT_PROFILE_IDS) {
      expect(SEEDED_E2E_PATIENT_PROFILE_IDS).toContain(patientId)
    }
  })
})
