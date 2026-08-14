import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814120000_review_request_funnel_lifecycle_truth.sql",
  ),
  "utf8",
)
  .toLowerCase()
  .replace(/\s+/g, " ")

describe("review-request lifecycle funnel migration", () => {
  it("replaces the aggregate with mutually exclusive lifecycle buckets", () => {
    expect(migration).toContain("create or replace function public.get_review_request_funnel")
    expect(migration).toContain("awaiting_next_run bigint")
    expect(migration).toContain("cooldown_deferred bigint")
    expect(migration).toContain("policy_suppressed bigint")
    expect(migration).toContain("legacy_handled_unverifiable bigint")
    expect(migration).toContain("actionable_backlog bigint")
    expect(migration).toContain("when evidence.was_sent then 'sent'")
    expect(migration).toContain("then 'policy_suppressed'")
    expect(migration).toContain("then 'legacy_handled_unverifiable'")
    expect(migration).toContain("then 'cooldown_deferred'")
    expect(migration).toContain("then 'awaiting_next_run'")
    expect(migration).toContain("else 'actionable_backlog'")
  })

  it("bounds every mutable delivery signal to the requested as-of time", () => {
    expect(migration).toContain("outbox.created_at <= bounds.as_of")
    expect(migration).toContain("outbox.sent_at <= bounds.as_of")
    expect(migration).toContain("outbox.delivery_status_updated_at <= bounds.as_of")
    expect(migration).toContain("outbox.review_first_clicked_at <= bounds.as_of")
    expect(migration).toContain("review_email_sent_at <= bounds.as_of")
    expect(migration).toContain("review_email_suppressed_at <= bounds.as_of")
  })

  it("treats only pre-lifecycle-cutover sent markers as unverifiable legacy", () => {
    expect(migration).toContain(
      "timestamptz '2026-07-19 09:00:00+00' as lifecycle_cutover_at",
    )
    expect(migration).toContain(
      "cohort.review_email_sent_at < bounds.lifecycle_cutover_at then 'legacy_handled_unverifiable'",
    )
    expect(migration).toContain(
      "cohort.review_email_sent_at <= bounds.as_of then 'actionable_backlog'",
    )
  })

  it("uses the Sydney 10am schedule and the same 30-day cooldown evidence as delivery policy", () => {
    expect(migration).toContain("p_as_of at time zone 'australia/sydney'")
    expect(migration).toContain("interval '10 hours'")
    expect(migration).toContain("interval '30 days'")
    expect(migration).toContain("status in ('pending', 'sending', 'sent')")
  })

  it("keeps the aggregate service-role-only with a fixed search path", () => {
    expect(migration).toContain("language sql")
    expect(migration).toContain("stable")
    expect(migration).toContain("security invoker")
    expect(migration).toContain("set search_path = ''")
    expect(migration).toContain(
      "revoke execute on function public.get_review_request_funnel(timestamptz, timestamptz, uuid[]) from public, anon, authenticated",
    )
    expect(migration).toContain(
      "grant execute on function public.get_review_request_funnel(timestamptz, timestamptz, uuid[]) to service_role",
    )
  })
})
