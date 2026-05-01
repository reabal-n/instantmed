import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const queriesSource = readFileSync(
  join(process.cwd(), "lib/data/intakes/queries.ts"),
  "utf8",
)

const realtimeSource = readFileSync(
  join(process.cwd(), "lib/doctor/use-queue-realtime.ts"),
  "utf8",
)

const declineSource = readFileSync(
  join(process.cwd(), "app/actions/decline-intake.ts"),
  "utf8",
)

const queueClientSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/queue-client.tsx"),
  "utf8",
)

const queueTypesSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/types.ts"),
  "utf8",
)

const queueActionsSource = readFileSync(
  join(process.cwd(), "app/doctor/queue/actions.ts"),
  "utf8",
)

const caseActionGuardSource = readFileSync(
  join(process.cwd(), "lib/doctor/case-action-guard.ts"),
  "utf8",
)

const intakeLockSource = readFileSync(
  join(process.cwd(), "lib/data/intake-lock.ts"),
  "utf8",
)

const requestMoreInfoSource = readFileSync(
  join(process.cwd(), "app/actions/request-more-info.ts"),
  "utf8",
)

const queueHealthSource = readFileSync(
  join(process.cwd(), "lib/monitoring/queue-health.ts"),
  "utf8",
)

const e2eResetMigrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/20260501124500_harden_e2e_intake_reset.sql"),
  "utf8",
)

describe("doctor queue production contract", () => {
  it("keeps the server queue aligned with all actionable paid statuses", () => {
    expect(queriesSource).toContain("QUEUE_REVIEW_STATUSES")
    expect(queriesSource).toContain('.eq("payment_status", "paid")')
  })

  it("keeps seeded E2E intakes out of live operational queue reads", () => {
    expect(queriesSource).toContain("filterSeededE2EIntakes")
    expect(queueHealthSource).toContain("filterSeededE2EIntakes")
    expect(queueHealthSource).toContain("QUEUE_REVIEW_STATUSES")
    expect(queueHealthSource).not.toContain("mailinator.com")
  })

  it("keeps the E2E reset helper from leaving stale terminal timestamps", () => {
    expect(e2eResetMigrationSource).toContain("CREATE OR REPLACE FUNCTION public.e2e_reset_intake_status")
    expect(e2eResetMigrationSource).toContain("cancelled_at = CASE")
    expect(e2eResetMigrationSource).toContain("completed_at = CASE")
  })

  it("does not inject raw Supabase realtime INSERT rows into the hydrated queue list", () => {
    expect(realtimeSource).toContain("isHydratedQueueRealtimeInsert")
    expect(realtimeSource).toContain("router.refresh()")
  })

  it("does not write patient email addresses into decline logs", () => {
    const logLines = declineSource
      .split("\n")
      .filter((line) => line.includes("logger.") && line.includes("patient.email"))

    expect(logLines).toEqual([])
  })

  it("does not select profile columns that are absent from the live schema", () => {
    expect(queriesSource).not.toContain("address_line2")
  })

  it("surfaces degraded queue reads instead of silently rendering an empty queue", () => {
    expect(queriesSource).toContain("degraded")
    expect(queueTypesSource).toContain("queueDegraded")
    expect(queueClientSource).toContain("Queue data may be incomplete")
  })

  it("retires duplicate doctor decision APIs in favour of canonical server actions", () => {
    expect(existsSync(join(process.cwd(), "app/api/doctor/update-request/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/doctor/bulk-action/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/intakes/[id]/approve/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/stripe/refunds.ts"))).toBe(false)
    expect(queueActionsSource).toContain("declineIntakeCanonical")
    expect(queueActionsSource).not.toContain("refundIfEligible")
  })

  it("does not fail open when the doctor claim RPC is missing or unavailable", () => {
    expect(queueActionsSource).not.toContain("fallback to success")
    expect(queueActionsSource).not.toContain("return { success: true } // Graceful fallback")
    expect(queueActionsSource).not.toContain("return { success: true }\\n      }")
  })

  it("requires claimed case ownership before mutable doctor queue actions", () => {
    expect(queueActionsSource).toContain("ensureDoctorCaseActionAllowed")
    expect(caseActionGuardSource).toContain("Claim this case before taking action.")
  })

  it("uses the atomic claim RPC for panel lock acquisition", () => {
    expect(intakeLockSource).toContain('rpc("claim_intake_for_review"')
    expect(intakeLockSource).not.toContain("claimed_by: doctorId")
  })

  it("requires case ownership before requesting more patient information", () => {
    expect(requestMoreInfoSource).toContain("getDoctorCaseActionError")
    expect(requestMoreInfoSource).toContain("claimed_by")
    expect(requestMoreInfoSource).toContain("reviewing_doctor_id")
  })
})
