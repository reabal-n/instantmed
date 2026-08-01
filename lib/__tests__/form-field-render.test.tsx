import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { FormField } from "@/components/request/form-field"
import { ChipToggleGroup } from "@/components/request/shared/intake-step-primitives"
import { Textarea } from "@/components/ui/textarea"

function openingTag(html: string, selector: RegExp): string {
  const match = html.match(selector)
  expect(match).not.toBeNull()
  return match?.[0] ?? ""
}

describe("FormField accessibility wiring", () => {
  it("targets an explicitly identified control after leading helper controls", () => {
    const html = renderToStaticMarkup(
      <FormField
        label="How much do you take, and how often?"
        required
        hint="Copy the directions from your label if you can."
        error="Enter how much you take and how often (for example, one tablet each morning)"
      >
        <ChipToggleGroup
          options={[{ key: "once_daily", label: "Once daily" }]}
          values={{}}
          onChange={() => undefined}
          ariaLabel="Common dose frequencies"
        />
        <Textarea id="current-dose" />
      </FormField>,
    )

    const textarea = openingTag(html, /<textarea[^>]*id="current-dose"[^>]*>/)
    const chipGroup = openingTag(
      html,
      /<div[^>]*data-intake-chip-toggle-group="true"[^>]*>/,
    )

    expect(textarea).toContain('aria-describedby="current-dose-hint current-dose-error"')
    expect(textarea).toContain('aria-invalid="true"')
    expect(textarea).toContain('aria-required="true"')
    expect(chipGroup).not.toContain("aria-describedby")
    expect(chipGroup).not.toContain("aria-invalid")
    expect(chipGroup).not.toContain("aria-required")
    expect(html.match(/id="current-dose"/g)).toHaveLength(1)
  })

  it("preserves an existing description and the first-child fallback", () => {
    const explicitHtml = renderToStaticMarkup(
      <FormField label="Dose" hint="Use the label directions.">
        <Textarea id="current-dose" aria-describedby="dose-context" />
      </FormField>,
    )
    const explicitTextarea = openingTag(
      explicitHtml,
      /<textarea[^>]*id="current-dose"[^>]*>/,
    )
    expect(explicitTextarea).toContain(
      'aria-describedby="dose-context current-dose-hint"',
    )
    expect(explicitTextarea).not.toContain("aria-invalid")
    expect(explicitTextarea).not.toContain("aria-required")

    const fallbackHtml = renderToStaticMarkup(
      <FormField label="Medication" required hint="Use the label name.">
        <input />
      </FormField>,
    )
    const fieldId = fallbackHtml.match(/<label[^>]*for="([^"]+)"/)?.[1]
    expect(fieldId).toBeTruthy()
    const fallbackInput = openingTag(fallbackHtml, /<input[^>]*>/)
    expect(fallbackInput).toContain(`id="${fieldId}"`)
    expect(fallbackInput).toContain(`aria-describedby="${fieldId}-hint"`)
    expect(fallbackInput).toContain('aria-required="true"')
  })
})
