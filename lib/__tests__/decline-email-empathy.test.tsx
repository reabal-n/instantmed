import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { RequestDeclinedEmail } from "@/lib/email/components/templates/request-declined"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

describe("RequestDeclinedEmail empathy wrapping", () => {
  const baseProps = {
    patientFirstName: "Tuki",
    serviceLabel: "medical certificate",
    reason: "Symptoms warrant in-person review.",
    reasonCode: "requires_in_person" as const,
    portalUrl: "https://instantmed.com.au/patient",
    requestAccessUrl: "https://instantmed.com.au/track/signed-request-access",
  }

  it("includes an empathetic preamble before the reason", () => {
    const html = render(<RequestDeclinedEmail {...baseProps} />)
    expect(html).toMatch(/Thank you for getting in touch with InstantMed/i)
    expect(html).toMatch(/we're unable to issue/i)
    expect(html).toMatch(/Symptoms warrant in-person review/)
  })

  it("includes a category-aware next-step paragraph", () => {
    const inPerson = render(<RequestDeclinedEmail {...baseProps} reasonCode="requires_in_person" />)
    expect(inPerson).toMatch(/in-person appointment with your GP/i)

    const outOfScope = render(<RequestDeclinedEmail {...baseProps} reasonCode="outside_scope" />)
    expect(outOfScope).toMatch(/sits outside what InstantMed/i)

    const insufficient = render(<RequestDeclinedEmail {...baseProps} reasonCode="insufficient_information" />)
    expect(insufficient).toMatch(/submit a fresh request/i)

    const other = render(<RequestDeclinedEmail {...baseProps} reasonCode="other" />)
    expect(other).toMatch(/support@instantmed.com.au/)
  })

  it("closes with the patient's first name and a soft sign-off", () => {
    const html = render(<RequestDeclinedEmail {...baseProps} />)
    expect(html).toMatch(/Tuki/)
    expect(html).toMatch(/Look after yourself/i)
  })

  it("falls back gracefully when reasonCode is unknown", () => {
    const html = render(<RequestDeclinedEmail {...baseProps} reasonCode={"surprise" as never} />)
    expect(html).toMatch(/support@instantmed.com.au/)
  })

  it("falls back to 'there' when patient first name is missing", () => {
    const html = render(<RequestDeclinedEmail {...baseProps} patientFirstName={null as never} />)
    expect(html).not.toMatch(/null/)
    expect(html).toMatch(/Look after yourself,/i)
  })
})
