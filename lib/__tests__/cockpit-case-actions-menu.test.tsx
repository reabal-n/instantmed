import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { CaseActionsMenu } from "@/components/operator/cases/case-actions-menu"

// Inspect the real event boundaries without simulating Radix internals in Node.
describe("CaseActionsMenu", () => {
  it("renders nothing when no action is permitted", () => {
    expect(renderToStaticMarkup(<CaseActionsMenu requestRef="IM-TEST" actions={[]} />)).toBe("")
  })

  it("has an always visible labelled touch target", () => {
    const html = renderToStaticMarkup(<CaseActionsMenu requestRef="IM-TEST" actions={[{ label: "Issue refund", onSelect: vi.fn() }]} />)
    expect(html).toContain('aria-label="Actions for request IM-TEST"')
    expect(html).toContain("min-h-11")
    expect(html).toContain("Actions")
  })

  it("stops click and keyboard events at both menu boundaries", () => {
    const menu = CaseActionsMenu({ requestRef: "IM-TEST", actions: [{ label: "Issue refund", onSelect: vi.fn() }] })!
    const [trigger, content] = React.Children.toArray(menu.props.children) as React.ReactElement[]
    for (const boundary of [trigger.props.children, content]) {
      for (const name of ["onClick", "onKeyDown"]) {
        const stopPropagation = vi.fn()
        expect(boundary.props[name]).toBeTypeOf("function")
        boundary.props[name]({ stopPropagation })
        expect(stopPropagation).toHaveBeenCalledOnce()
      }
    }
  })
})
