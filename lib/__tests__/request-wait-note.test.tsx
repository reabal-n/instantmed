import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RequestWaitNote } from "@/components/patient/request-wait-note"
import type { WaitState } from "@/lib/brand/wait-counter-types"

const FALLBACK = <p>static fallback copy</p>
const NOW = new Date("2026-07-21T12:00:00Z")

function render(waitState: WaitState | null, paidAt: string | null) {
  return renderToStaticMarkup(
    <RequestWaitNote waitState={waitState} paidAt={paidAt} fallback={FALLBACK} now={NOW} />,
  )
}

const live = (overrides: Partial<WaitState> = {}): WaitState => ({
  variant: "live",
  medianMinutes: 120,
  sampleSize: 10,
  service: "rx",
  ...overrides,
})

describe("RequestWaitNote", () => {
  it("quotes the real median while the patient is still inside it", () => {
    // Paid 30 minutes ago, median 2 hours.
    const html = render(live(), "2026-07-21T11:30:00Z")
    expect(html).toContain("about 2 hours")
    expect(html).not.toContain("static fallback copy")
  })

  it("stops quoting the median once the patient has already waited longer", () => {
    // Paid 5 hours ago against a 2-hour median. Repeating "about 2 hours" here
    // reads as a broken promise; naming the overrun is the honest sentence.
    const html = render(live(), "2026-07-21T07:00:00Z")
    expect(html).toContain("taking longer than most")
    expect(html).not.toContain("about 2 hours")
  })

  it("never promises a turnaround", () => {
    const inside = render(live(), "2026-07-21T11:30:00Z")
    const over = render(live(), "2026-07-21T07:00:00Z")
    for (const html of [inside, over]) {
      // "within X" is an SLA promise; CLAUDE.md forbids one on patient surfaces.
      expect(html).not.toMatch(/\bwithin\b/i)
      expect(html).not.toMatch(/\bguarantee/i)
    }
  })

  it("falls back to static copy rather than inventing a number", () => {
    // Metrics outage, no queue data, and a sample too small to mean anything.
    expect(render({ variant: "reviewing", service: "rx" }, "2026-07-21T11:30:00Z"))
      .toContain("static fallback copy")
    expect(render(null, "2026-07-21T11:30:00Z")).toContain("static fallback copy")
    expect(render(live({ sampleSize: 1 }), "2026-07-21T11:30:00Z"))
      .toContain("static fallback copy")
    expect(render(live({ medianMinutes: 0 }), "2026-07-21T11:30:00Z"))
      .toContain("static fallback copy")
  })

  it("reads naturally for a fast med-cert median", () => {
    const html = render(live({ medianMinutes: 11, service: "med-cert" }), "2026-07-21T11:58:00Z")
    expect(html).toContain("10 minutes")
  })

  it("still renders without a paid_at rather than blanking", () => {
    const html = render(live(), null)
    expect(html).toContain("about 2 hours")
  })
})
