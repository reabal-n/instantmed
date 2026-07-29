import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const pageSource = read("app/admin/intakes/page.tsx")
const client = read("app/admin/intakes/intakes-ledger-client.tsx")
const filterSelects = read("app/admin/intakes/ledger-filter-selects.tsx")
const queries = read("lib/data/intakes/queries.ts")

describe("admin ledger server contract", () => {
  it("passes every URL filter and pagination value into the server query", () => {
    for (const value of ["page", "pageSize"]) {
      expect(pageSource).toContain(`firstParam(params.${value})`)
      expect(pageSource).toContain(`      ${value},`)
    }
    for (const value of ["q", "service", "status", "workLane", "chips"]) {
      expect(pageSource).toContain(`${value}: initialFilters.${value}`)
    }
    expect(pageSource).toContain("getAllIntakesForAdmin")
    expect(queries).toContain("buildAdminLedgerSearchOr")
    expect(queries).toContain('.range(offset, offset + pageSize - 1)')
    expect(queries).toContain('.eq("category", serviceCategory)')
    expect(queries).toContain('.in("status", [...workLaneStatuses])')
    expect(queries).toContain('payment_status.eq.failed')
    expect(queries).toContain('.eq("refund_status", "failed")')
  })

  it("does not filter, count, or sort only the current client page", () => {
    expect(client).not.toMatch(/\brows\.filter\(/)
    expect(client).not.toMatch(/\brows\.sort\(/)
    expect(client).not.toContain("sortIntakes")
    expect(client).not.toContain("Smart sort")
    expect(client).not.toContain("computeLedgerDailyAggregate")
    expect(client).not.toContain("Stale > 4h")
    expect(client).not.toContain('label: "Mine"')
  })

  it("keeps conditional filter and refund UI out of the initial Ledger bundle", () => {
    expect(client).not.toContain('from "@/components/ui/select"')
    expect(client).not.toContain('from "@/app/doctor/intakes/[id]/intake-refund-dialog"')
    expect(client).toContain('import("@/app/admin/intakes/ledger-filter-selects")')
    expect(client).toContain('import("@/app/doctor/intakes/[id]/intake-refund-dialog")')
    expect(client).toContain("ssr: false")
    expect(client).toContain("{refundTarget ? (")
    expect(filterSelects).toContain('from "@/components/ui/select"')
  })

  it("keeps support action-only and prevents the clinical review panel from opening", () => {
    expect(client).toContain('href: viewerRole === "admin" ? buildAdminIntakeHref(intake.id) : null')
    expect(client).toContain("if (!isAdmin) return")
    expect(client).toContain("onRowPrimary={isAdmin ? openCaseSlideover : undefined}")
    expect(queries).toContain('options.viewerRole === "support"')
    expect(queries).toContain('if (options.viewerRole === "support")')
  })
})
