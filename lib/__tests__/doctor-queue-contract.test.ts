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

const queueHealthSource = readFileSync(
  join(process.cwd(), "lib/monitoring/queue-health.ts"),
  "utf8",
)

describe("doctor queue production contract", () => {
  it("keeps the server queue aligned with all actionable paid statuses", () => {
    expect(queriesSource).toContain("QUEUE_REVIEW_STATUSES")
    expect(queriesSource).toContain('.eq("payment_status", "paid")')
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

  it("keeps queue health monitoring aligned with the paid doctor queue", () => {
    expect(queueHealthSource).toContain("QUEUE_REVIEW_STATUSES")
    expect(queueHealthSource).toContain('.in("status", QUEUE_REVIEW_STATUSES)')
    expect(queueHealthSource).toContain('.eq("payment_status", "paid")')
  })

  it("retires duplicate doctor decision APIs in favour of canonical server actions", () => {
    expect(existsSync(join(process.cwd(), "app/api/doctor/update-request/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/doctor/bulk-action/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "app/api/intakes/[id]/approve/route.ts"))).toBe(false)
    expect(existsSync(join(process.cwd(), "lib/stripe/refunds.ts"))).toBe(false)
    expect(queueActionsSource).toContain("declineIntakeCanonical")
    expect(queueActionsSource).not.toContain("refundIfEligible")
  })
})
