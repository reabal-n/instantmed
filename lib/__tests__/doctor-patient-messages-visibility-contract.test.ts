import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

describe("doctor patient-message visibility contract", () => {
  it("loads patient message threads into both doctor review surfaces", () => {
    const reviewRouteSource = readFileSync(
      join(process.cwd(), "app/api/doctor/intakes/[id]/review-data/route.ts"),
      "utf8",
    )
    const reviewPanelSource = readFileSync(
      join(process.cwd(), "components/doctor/intake-review-panel.tsx"),
      "utf8",
    )
    const detailPageSource = readFileSync(
      join(process.cwd(), "app/doctor/intakes/[id]/page.tsx"),
      "utf8",
    )
    const detailClientSource = readFileSync(
      join(process.cwd(), "app/doctor/intakes/[id]/intake-detail-client.tsx"),
      "utf8",
    )

    expect(reviewRouteSource).toContain("getPatientMessagesForIntake(intakeId)")
    expect(reviewRouteSource).toContain("patientMessages")
    expect(reviewPanelSource).toContain("<PatientMessageThread")
    expect(detailPageSource).toContain("getPatientMessagesForIntake(id)")
    expect(detailClientSource).toContain("<PatientMessageThread")
  })
})
