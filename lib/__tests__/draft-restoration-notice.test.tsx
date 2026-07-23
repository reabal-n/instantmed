import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { DraftRestorationNotice } from "@/components/request/draft-restoration-notice"

describe("DraftRestorationNotice", () => {
  it("acknowledges automatic recovery without presenting a false restore decision", () => {
    const html = renderToStaticMarkup(<DraftRestorationNotice onStartOver={() => {}} />)

    expect(html).toContain("Progress restored")
    expect(html).toContain("Start over")
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).not.toContain('role="alert"')
    expect(html).not.toContain("Continue where you left off")
    expect(html).not.toContain("border-primary")
  })
})
