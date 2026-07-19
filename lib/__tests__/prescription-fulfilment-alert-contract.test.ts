import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const routeSource = readFileSync(
  join(process.cwd(), "app/api/cron/business-alerts/route.ts"),
  "utf8",
)

describe("prescription fulfilment business alert contract", () => {
  it("pages on aggregate fulfilment-stage SLA breaches", () => {
    expect(routeSource).toContain("getPrescriptionFulfilmentDashboard")
    expect(routeSource).toContain("buildPrescriptionFulfilmentSlaAlerts")
    expect(routeSource).toContain('section: "prescription_fulfilment"')
  })

  it("keeps fulfilment alerts aggregate-only", () => {
    const sectionStart = routeSource.indexOf('section: "prescription_fulfilment"')
    expect(sectionStart).toBeGreaterThanOrEqual(0)

    const sectionEnd = routeSource.indexOf("\n    //", sectionStart)
    const section = routeSource.slice(
      sectionStart,
      sectionEnd === -1 ? routeSource.length : sectionEnd,
    )

    expect(section).toContain("metadata: alert.metadata")
    expect(section).not.toContain(".items")
    expect(section).not.toContain("intakeId")
    expect(section).not.toContain("referenceNumber")
  })
})
