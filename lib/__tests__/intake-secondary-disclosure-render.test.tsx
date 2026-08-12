import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PatientTimeline } from "@/components/doctor/patient-timeline"
import { IntakeSecondaryDisclosure } from "@/components/doctor/review/intake-secondary-disclosure"

function renderDisclosure(
  totalOtherRequestCount: number,
  visibleOtherRequestCount: number,
  noteCount: number,
  defaultOpen = false,
): string {
  return renderToStaticMarkup(
    <IntakeSecondaryDisclosure
      totalOtherRequestCount={totalOtherRequestCount}
      visibleOtherRequestCount={visibleOtherRequestCount}
      noteCount={noteCount}
      defaultOpen={defaultOpen}
    >
      <span>Secondary content</span>
    </IntakeSecondaryDisclosure>,
  )
}

describe("IntakeSecondaryDisclosure", () => {
  it("omits empty count suffixes", () => {
    const html = renderDisclosure(0, 0, 0)

    expect(html).toContain("Recent history")
    expect(html).not.toContain("0 other requests")
    expect(html).not.toContain("0 notes")
  })

  it("keeps true request totals without presenting the capped rows as the total", () => {
    const closedHtml = renderDisclosure(39, 5, 1)
    const openHtml = renderDisclosure(39, 5, 1, true)

    expect(closedHtml).toContain("Recent history · 39 other requests · 1 note")
    expect(openHtml).toContain("Showing the latest 5 of 39 other requests")
    expect(openHtml).toContain("Open full record for the complete history")
  })

  it("does not show a cap explanation when every other request is visible", () => {
    const html = renderDisclosure(2, 2, 0)

    expect(html).toContain("Recent history · 2 other requests")
    expect(html).not.toContain("Showing the latest")
  })
})

describe("PatientTimeline request labels", () => {
  it("distinguishes two same-service requests by patient-typed medicine", () => {
    const html = renderToStaticMarkup(
      <PatientTimeline
        compact
        requests={[
          {
            id: "request-1",
            status: "paid",
            created_at: "2026-08-11T10:00:00Z",
            category: "prescription",
            service_label: "Scripts",
            medication_name: "Metformin",
            service: { type: "common_scripts" },
          },
          {
            id: "request-2",
            status: "paid",
            created_at: "2026-08-11T10:06:00Z",
            category: "prescription",
            service_label: "Scripts",
            medication_name: "Sertraline",
            service: { type: "common_scripts" },
          },
        ]}
      />,
    )

    expect(html).toContain("Repeat prescription · Metformin")
    expect(html).toContain("Repeat prescription · Sertraline")
  })
})
