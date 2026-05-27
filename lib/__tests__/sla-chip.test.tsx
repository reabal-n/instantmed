import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SlaChip } from "@/components/doctor/sla-chip"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("SlaChip", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-26T10:00:00Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders 'Paid 3h ago' with green dot when within 4h of paid", () => {
    const html = render(<SlaChip paidAt="2026-05-26T07:00:00Z" />)
    expect(html).toMatch(/Paid 3h ago/)
    expect(html).toMatch(/data-tone="success"|tone-success|bg-emerald/)
  })

  it("renders amber dot when between 4 and 24 hours", () => {
    const html = render(<SlaChip paidAt="2026-05-26T00:00:00Z" />)
    expect(html).toMatch(/Paid 10h ago/)
    expect(html).toMatch(/data-tone="warning"|bg-amber/)
  })

  it("renders red dot when over 24 hours", () => {
    const html = render(<SlaChip paidAt="2026-05-25T05:00:00Z" />)
    expect(html).toMatch(/Paid 1d/)
    expect(html).toMatch(/data-tone="critical"|bg-red/)
  })

  it("renders 'Not paid' with neutral dot when paidAt is null", () => {
    const html = render(<SlaChip paidAt={null} />)
    expect(html).toContain("Not paid")
    expect(html).toMatch(/data-tone="neutral"|bg-slate/)
  })

  it("renders 'Paid just now' when under a minute", () => {
    const html = render(<SlaChip paidAt="2026-05-26T09:59:30Z" />)
    expect(html).toContain("just now")
  })

  it("can render patient waiting time for the inline review header", () => {
    const html = render(<SlaChip paidAt="2026-05-26T09:42:00Z" mode="waiting" />)
    expect(html).toContain("Waiting 18m")
    expect(html).toContain("Queue entered at")
  })

  it("uses no colored backgrounds on routine display (calm-chrome contract)", () => {
    const html = render(<SlaChip paidAt="2026-05-26T07:00:00Z" />)
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky|violet|blue|slate)-(50|100)(?!\d)/)
  })

  it("renders days for very stale paid timestamps", () => {
    const html = render(<SlaChip paidAt="2026-05-24T10:00:00Z" />)
    expect(html).toContain("Paid 2d ago")
    expect(html).toMatch(/data-tone="critical"|bg-red/)
  })
})
