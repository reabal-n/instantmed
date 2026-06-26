import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { AddressAutocomplete } from "@/components/ui/address-autocomplete"

describe("AddressAutocomplete manual entry escape", () => {
  it("always offers a manual-entry affordance on initial render (never strands the user)", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        value: "",
        onChange: () => {},
        onAddressSelect: () => {},
        onManualEntry: () => {},
      }),
    )

    expect(markup).toContain("Enter address manually")
  })

  it("keeps provider names out of the component markup", () => {
    const markup = renderToStaticMarkup(
      React.createElement(AddressAutocomplete, {
        value: "10 Test Street",
        onChange: () => {},
        onAddressSelect: () => {},
        onManualEntry: () => {},
      }),
    )

    expect(markup).not.toMatch(/google/i)
    expect(markup).not.toMatch(/addressfinder/i)
  })
})
