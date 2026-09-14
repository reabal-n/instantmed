import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { useFormGroupDescribedBy } from "@/components/ui/form-group-context"
import { FormGroup } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"

describe("shared Input form descriptions", () => {
  it("preserves the FormGroup label and description on its child Input", () => {
    const html = renderToStaticMarkup(<FormGroup htmlFor="staff-search" label="Search requests" hint="Use an exact reference."><Input id="staff-search" /></FormGroup>)
    expect(html).toContain('for="staff-search"')
    expect(html).toMatch(/<input[^>]*aria-describedby="staff-search-hint"/)
    expect(html).toContain('id="staff-search-hint"')
  })
  it("keeps FormGroup and Input on the same context instance", () => {
    function Reader() { return <span data-description={useFormGroupDescribedBy()} /> }
    const html = renderToStaticMarkup(<FormGroup htmlFor="field" warning="Check this detail."><Input id="field" /><Reader /></FormGroup>)
    expect(html).toMatch(/<input[^>]*aria-describedby="field-warning"/)
    expect(html).toContain('data-description="field-warning"')
    expect(html).toContain('id="field-warning"')
  })
  it("leaves standalone Input descriptions independent of FormGroup", () => {
    const html = renderToStaticMarkup(<Input id="plain" label="Request reference" isInvalid errorMessage="Enter a reference." />)
    expect(html).toContain('for="plain"')
    expect(html).toMatch(/<input[^>]*aria-describedby="plain-error"/)
    expect(html).toContain('id="plain-error"')
  })
})
