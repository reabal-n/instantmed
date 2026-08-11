import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { IntakeSecondaryDisclosure } from "@/components/doctor/review/intake-secondary-disclosure"

function renderDisclosure(priorRequestCount: number, noteCount: number): string {
  return renderToStaticMarkup(
    <IntakeSecondaryDisclosure
      priorRequestCount={priorRequestCount}
      noteCount={noteCount}
    >
      <span>Secondary content</span>
    </IntakeSecondaryDisclosure>,
  )
}

describe("IntakeSecondaryDisclosure", () => {
  it("omits empty count suffixes", () => {
    const html = renderDisclosure(0, 0)

    expect(html).toContain("Show full intake")
    expect(html).not.toContain("0 prior requests")
    expect(html).not.toContain("0 notes")
  })

  it("keeps non-zero context counts", () => {
    const html = renderDisclosure(2, 1)

    expect(html).toContain("Show full intake · 2 prior requests · 1 note")
  })
})
