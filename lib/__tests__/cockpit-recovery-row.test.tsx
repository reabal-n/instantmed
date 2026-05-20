import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RecoveryRow } from "@/components/operator/cases/recovery-row"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

const TWO_HOURS_AGO = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

describe("RecoveryRow", () => {
  it("renders title, detail, and a relative time", () => {
    const html = render(
      <RecoveryRow
        title="Payment webhook failed"
        detail="checkout.session.completed"
        occurredAt={TWO_HOURS_AGO}
        severity="critical"
        href="/admin/webhook-dlq"
      />,
    )
    expect(html).toContain("Payment webhook failed")
    expect(html).toContain("checkout.session.completed")
    expect(html).toMatch(/\b2h\b/)
  })

  it("makes the whole row a link to href", () => {
    const html = render(
      <RecoveryRow
        title="X"
        detail="y"
        occurredAt={TWO_HOURS_AGO}
        severity="warning"
        href="/admin/ops/parchment"
      />,
    )
    expect(html).toMatch(/^<a\b/)
    expect(html).toContain('href="/admin/ops/parchment"')
  })

  it("exposes severity via data-severity", () => {
    const html = render(
      <RecoveryRow
        title="X"
        detail="y"
        occurredAt={TWO_HOURS_AGO}
        severity="critical"
        href="/"
      />,
    )
    expect(html).toContain('data-severity="critical"')
    expect(html).toContain('data-testid="recovery-row"')
  })

  it("uses no colored backgrounds on routine status (calm-chrome contract)", () => {
    const html = render(
      <RecoveryRow
        title="X"
        detail="y"
        occurredAt={TWO_HOURS_AGO}
        severity="warning"
        href="/"
      />,
    )
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky)-(50|100)(?!\d)/)
  })

  it("never uses coral (brand reserved)", () => {
    for (const severity of ["warning", "critical"] as const) {
      const html = render(
        <RecoveryRow title="x" detail="y" occurredAt={TWO_HOURS_AGO} severity={severity} href="/" />,
      )
      expect(html).not.toMatch(/brand-coral|\bcoral\b/)
    }
  })

  it("uses the 8px dot pattern (h-2 w-2) for severity", () => {
    const html = render(
      <RecoveryRow title="X" detail="y" occurredAt={TWO_HOURS_AGO} severity="critical" href="/" />,
    )
    expect(html).toContain("h-2 w-2")
  })
})
