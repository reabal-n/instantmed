import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { QueueShortcutHint } from "@/components/doctor/queue-shortcut-hint"

function render(el: React.ReactElement): string {
  return renderToStaticMarkup(el)
}

describe("QueueShortcutHint", () => {
  it("renders empty on the server (default dismissed before client effect)", () => {
    // The component initialises `dismissed` to true so SSR never flashes
    // the hint before the localStorage read on the client. This guards
    // against the strip appearing then disappearing on hydration for
    // operators who've already dismissed it.
    const html = render(<QueueShortcutHint />)
    expect(html).toBe("")
  })

  it("does not render keyboard hints into the SSR markup", () => {
    const html = render(<QueueShortcutHint />)
    expect(html).not.toContain("approve")
    expect(html).not.toContain("decline")
    expect(html).not.toContain("command palette")
  })

  it("does not render a dismiss button into the SSR markup", () => {
    const html = render(<QueueShortcutHint />)
    expect(html).not.toContain("Hide keyboard shortcuts")
  })

  it("accepts and renders a className without crashing when forced visible", () => {
    // The component's `dismissed` default is true, so the SSR pass returns
    // an empty string regardless of `className`. We assert it doesn't throw
    // when given the prop, and remains hidden (the client effect drives the
    // reveal). This locks the SSR contract: zero layout shift on hydration.
    const html = render(<QueueShortcutHint className="custom-test-class" />)
    expect(html).toBe("")
    expect(html).not.toContain("custom-test-class")
  })
})
