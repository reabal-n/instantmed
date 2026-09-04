import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { QueueClinicalStatusBadges } from "@/components/doctor/queue-clinical-status-badges"

function render(props: React.ComponentProps<typeof QueueClinicalStatusBadges>): string {
  return renderToStaticMarkup(<QueueClinicalStatusBadges {...props} />)
}

describe("QueueClinicalStatusBadges", () => {
  it("shows a calm call requirement without adding red high-risk language", () => {
    const html = render({ hasClinicalRisk: false, requiresLiveConsult: true })

    expect(html).toContain("Needs call")
    expect(html).toContain("data-queue-needs-call-chip")
    expect(html).toContain("bg-warning-light")
    expect(html).not.toContain("High risk")
    expect(html).not.toContain("bg-destructive")
  })

  it("keeps the red badge reserved for clinical high risk", () => {
    const html = render({ hasClinicalRisk: true, requiresLiveConsult: false })

    expect(html).toContain("High risk")
    expect(html).toContain("bg-destructive/10")
    expect(html).not.toContain("Needs call")
  })

  it("shows both cues when a high-risk case also requires a live consultation", () => {
    const html = render({ hasClinicalRisk: true, requiresLiveConsult: true })

    expect(html).toContain("High risk")
    expect(html).toContain("Needs call")
  })

  it("renders no clinical-status chrome for routine cases", () => {
    expect(render({ hasClinicalRisk: false, requiresLiveConsult: false })).toBe("")
  })
})
