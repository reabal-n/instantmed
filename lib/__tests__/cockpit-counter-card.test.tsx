import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CounterCard } from "@/components/operator/counter-card"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("CounterCard", () => {
  it("renders count, label, and helper text", () => {
    const html = render(
      <CounterCard count={3} label="Payment failures" helperText="1 stale" tone="critical" />,
    )
    expect(html).toContain(">3<")
    expect(html).toContain("Payment failures")
    expect(html).toContain("1 stale")
  })

  it("exposes tone via data-tone for the calm-chrome contract", () => {
    const html = render(
      <CounterCard count={0} label="Webhook DLQ" helperText="All clear" tone="neutral" />,
    )
    expect(html).toContain('data-tone="neutral"')
    expect(html).toContain('data-testid="counter-card"')
  })

  it("wraps in an anchor when href is provided", () => {
    const html = render(
      <CounterCard count={1} label="Test" helperText="x" tone="warning" href="/admin/x" />,
    )
    expect(html).toMatch(/^<a\b/)
    expect(html).toContain('href="/admin/x"')
  })

  it("renders as a div when no href is provided", () => {
    const html = render(
      <CounterCard count={1} label="Test" helperText="x" tone="warning" />,
    )
    expect(html).toMatch(/^<div\b/)
  })

  it("uses no colored backgrounds on routine status (calm-chrome contract)", () => {
    const html = render(
      <CounterCard count={2} label="X" helperText="y" tone="warning" />,
    )
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky)-(50|100)(?!\d)/)
  })

  it("never uses coral (brand reserved)", () => {
    for (const tone of ["neutral", "warning", "critical"] as const) {
      const html = render(<CounterCard count={1} label="x" helperText="y" tone={tone} />)
      expect(html).not.toMatch(/brand-coral|\bcoral\b/)
    }
  })
})
