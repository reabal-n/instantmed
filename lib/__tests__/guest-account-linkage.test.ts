import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  buildGuestAccountLinkageSnapshot,
  buildUnavailableGuestAccountLinkageSnapshot,
  type GuestAccountLinkageReadRow,
  readGuestAccountLinkageSnapshot,
} from "@/lib/admin/guest-account-linkage"
import { REVENUE_PURCHASE_PAYMENT_STATUSES } from "@/lib/monitoring/revenue-safety"

const DAY_MS = 24 * 60 * 60 * 1000
const FROM = new Date("2026-09-01T00:00:00.000Z")
const TO = new Date("2026-09-02T00:00:00.000Z")

afterEach(() => {
  vi.unstubAllEnvs()
})

function iso(offsetMs: number): string {
  return new Date(FROM.getTime() + offsetMs).toISOString()
}

function row(
  id: string,
  paidOffsetMs: number,
  verifiedOffsetFromPaidMs: number | null,
  authUserId: string | null = `auth-${id}`,
): GuestAccountLinkageReadRow {
  return {
    id,
    paid_at: iso(paidOffsetMs),
    patient: {
      auth_user_id: authUserId,
      email_verified_at: verifiedOffsetFromPaidMs === null
        ? null
        : iso(paidOffsetMs + verifiedOffsetFromPaidMs),
    },
  }
}

describe("guest account linkage", () => {
  it("counts reportable paid guest orders once and preserves exact inclusive horizons", () => {
    const rows = [
      row("a", 1 * 60 * 60 * 1000, DAY_MS, "shared-auth"),
      row("b", 2 * 60 * 60 * 1000, DAY_MS + 1),
      row("c", 3 * 60 * 60 * 1000, 7 * DAY_MS),
      row("d", 4 * 60 * 60 * 1000, 7 * DAY_MS + 1),
      row("e", 5 * 60 * 60 * 1000, 14 * DAY_MS),
      row("f", 6 * 60 * 60 * 1000, 14 * DAY_MS + 1),
      row("g", 7 * 60 * 60 * 1000, -1),
      row("h", 8 * 60 * 60 * 1000, DAY_MS, null),
      row("i", 9 * 60 * 60 * 1000, null),
      // A second paid order for the same linked guest remains a second order.
      row("j", 10 * 60 * 60 * 1000, DAY_MS, "shared-auth"),
      row("b", 2 * 60 * 60 * 1000, DAY_MS + 1),
      row("at-end", DAY_MS, DAY_MS),
      row("before-start", -1, DAY_MS),
    ]

    const snapshot = buildGuestAccountLinkageSnapshot(rows, {
      asOf: new Date(TO.getTime() + 14 * DAY_MS),
      from: FROM,
      to: TO,
    })

    expect(snapshot.availability).toBe("available")
    expect(snapshot.eligiblePaidGuestOrders).toBe(10)
    expect(snapshot.currentlyLinkedOrders).toBe(7)
    expect(snapshot.unlinkedAtCutoffOrders).toBe(3)
    expect(snapshot.verifiedBeforePaidAnomalies).toBe(1)
    expect(snapshot.within24h).toMatchObject({
      eligibleOrders: 10,
      linkedOrders: 2,
      percent: 20,
      status: "available",
    })
    expect(snapshot.within7d).toMatchObject({
      eligibleOrders: 10,
      linkedOrders: 4,
      percent: 40,
      status: "available",
    })
    expect(snapshot.within14d).toMatchObject({
      eligibleOrders: 10,
      linkedOrders: 6,
      percent: 60,
      status: "available",
    })
    expect(JSON.stringify(snapshot)).not.toMatch(
      /auth-|before-start|at-end|patient|email_verified|paid_at/i,
    )
  })

  it("returns pending rather than zero until each complete cohort horizon matures", () => {
    const rows = [row("a", 0, DAY_MS)]
    const justBeforeSevenDays = buildGuestAccountLinkageSnapshot(rows, {
      asOf: new Date(TO.getTime() + 7 * DAY_MS - 1),
      from: FROM,
      to: TO,
    })
    expect(justBeforeSevenDays.within24h.status).toBe("available")
    expect(justBeforeSevenDays.within7d).toEqual({
      eligibleOrders: null,
      linkedOrders: null,
      percent: null,
      status: "pending",
    })
    expect(justBeforeSevenDays.within14d.status).toBe("pending")

    const exactSevenDays = buildGuestAccountLinkageSnapshot(rows, {
      asOf: new Date(TO.getTime() + 7 * DAY_MS),
      from: FROM,
      to: TO,
    })
    expect(exactSevenDays.within7d.status).toBe("available")
    expect(exactSevenDays.within14d.status).toBe("pending")
  })

  it("withholds a partial cohort until the exact half-open end is observed", () => {
    const inProgress = buildGuestAccountLinkageSnapshot([row("a", 0, DAY_MS)], {
      asOf: new Date(TO.getTime() - 1),
      from: FROM,
      to: TO,
    })
    expect(inProgress).toMatchObject({
      availability: "degraded",
      cohortStatus: "in_progress",
      eligiblePaidGuestOrders: null,
      reason: "cohort_in_progress",
      within24h: { linkedOrders: null, status: "pending" },
    })

    const complete = buildGuestAccountLinkageSnapshot([row("a", 0, DAY_MS)], {
      asOf: TO,
      from: FROM,
      to: TO,
    })
    expect(complete.cohortStatus).toBe("complete")
    expect(complete.eligiblePaidGuestOrders).toBe(1)
  })

  it("represents a failed read as unavailable nullable evidence", () => {
    expect(buildUnavailableGuestAccountLinkageSnapshot({
      asOf: TO,
      from: FROM,
      reason: "query_failed",
      to: TO,
    })).toMatchObject({
      availability: "unavailable",
      cohortStatus: "unavailable",
      eligiblePaidGuestOrders: null,
      currentlyLinkedOrders: null,
      reason: "query_failed",
      unlinkedAtCutoffOrders: null,
      verifiedBeforePaidAnomalies: null,
      within14d: { linkedOrders: null, status: "unavailable" },
      within24h: { linkedOrders: null, status: "unavailable" },
      within7d: { linkedOrders: null, status: "unavailable" },
    })
  })

  it("pins the server-only read to the guest predicate, all reportable paid statuses, and no selected email", () => {
    const source = readFileSync(
      join(process.cwd(), "lib/admin/guest-account-linkage.ts"),
      "utf8",
    )
    expect(source).toContain('import "server-only"')
    expect(source).toContain("filterReportableIntakes")
    expect(source).toContain("REVENUE_PURCHASE_PAYMENT_STATUSES")
    expect(source).toContain('.not("guest_email", "is", null)')
    expect(source).toContain('.lt("paid_at", toIso)')
    expect(source).toContain('{ count: "exact" }')

    const select = source.match(/GUEST_LINKAGE_SELECT\s*=\s*\[([\s\S]*?)\]\.join/)?.[1] ?? ""
    expect(select).toContain('"id"')
    expect(select).toContain('"paid_at"')
    expect(select).toContain("auth_user_id")
    expect(select).toContain("email_verified_at")
    expect(select).not.toContain("guest_email")
    expect(select).not.toMatch(/phone|date_of_birth|address|medication|answers/i)
  })

  it("applies reportability and E2E filters before reducing a complete exact-count read", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const calls: Array<[string, ...unknown[]]> = []
    const result = {
      count: 1,
      data: [row("a", 0, DAY_MS)],
      error: null,
    }
    const query: Record<string, unknown> = {}
    for (const method of ["select", "in", "not", "gte", "lt", "limit", "or"] as const) {
      query[method] = (...args: unknown[]) => {
        calls.push([method, ...args])
        return query
      }
    }
    query.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve)
    const supabase = { from: vi.fn(() => query) }

    const snapshot = await readGuestAccountLinkageSnapshot(supabase as never, {
      asOf: new Date(TO.getTime() + 14 * DAY_MS),
      from: FROM,
      to: TO,
    })

    expect(snapshot.eligiblePaidGuestOrders).toBe(1)
    expect(supabase.from).toHaveBeenCalledWith("intakes")
    expect(calls.find(([method]) => method === "select")?.[1]).not.toContain("guest_email")
    expect(calls).toContainEqual(["in", "payment_status", [...REVENUE_PURCHASE_PAYMENT_STATUSES]])
    expect(calls).toContainEqual(["not", "guest_email", "is", null])
    expect(calls).toContainEqual(["gte", "paid_at", FROM.toISOString()])
    expect(calls).toContainEqual(["lt", "paid_at", TO.toISOString()])
    expect(calls).toContainEqual(["or", "exclude_from_reporting.is.null,exclude_from_reporting.eq.false"])
    expect(calls.some(([method, column]) => method === "not" && column === "patient_id")).toBe(true)
  })

  it("fails closed instead of treating a truncated exact-count result as zero", async () => {
    const result = {
      count: 2,
      data: [row("a", 0, DAY_MS)],
      error: null,
    }
    const query: Record<string, unknown> = {}
    for (const method of ["select", "in", "not", "gte", "lt", "limit", "or"] as const) {
      query[method] = () => query
    }
    query.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve)
    const snapshot = await readGuestAccountLinkageSnapshot(
      { from: () => query } as never,
      {
        asOf: new Date(TO.getTime() + 14 * DAY_MS),
        from: FROM,
        to: TO,
      },
    )
    expect(snapshot).toMatchObject({
      availability: "unavailable",
      eligiblePaidGuestOrders: null,
      reason: "guest_linkage_incomplete",
    })
  })
})
