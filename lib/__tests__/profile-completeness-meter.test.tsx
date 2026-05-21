import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { ProfileCompletenessMeter } from "@/components/patient/profile-completeness-meter"
import type { PatientProfileCompleteness } from "@/lib/data/patient-completeness"

function render(element: React.ReactElement): string {
  return renderToStaticMarkup(element)
}

function makeCompleteness(filled: number): PatientProfileCompleteness {
  const total = 10
  return {
    total,
    filled,
    missingFields: [],
    ratio: filled / total,
    isComplete: filled === total,
  }
}

describe("ProfileCompletenessMeter", () => {
  it("renders nothing when the profile is fully filled", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(10)} />)
    expect(html).toBe("")
  })

  it("renders the filled/total summary on a partial profile", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(7)} />)
    expect(html).toContain("Your profile")
    expect(html).toContain("7 of 10 complete")
    expect(html).toContain("~30 seconds")
  })

  it("sets the progress bar width to match the ratio", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(7)} />)
    expect(html).toContain("width:70%")
  })

  it("renders a 0% bar when no fields are filled", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(0)} />)
    expect(html).toContain("width:0%")
  })

  it("links to the patient settings page by default", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(3)} />)
    expect(html).toMatch(/^<a\b/)
    expect(html).toContain('href="/patient/settings"')
  })

  it("honours a custom href override", () => {
    const html = render(
      <ProfileCompletenessMeter completeness={makeCompleteness(3)} href="/patient/onboarding" />,
    )
    expect(html).toContain('href="/patient/onboarding"')
  })

  it("exposes an accessible aria-label with the live counts", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(4)} />)
    expect(html).toContain(
      'aria-label="Your profile is 4 of 10 fields complete. Click to finish."',
    )
  })

  it("uses no coral (brand reserved)", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(2)} />)
    expect(html).not.toMatch(/brand-coral|\bcoral\b/)
  })

  it("uses no colored-background pills on routine status (calm-chrome contract)", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(2)} />)
    expect(html).not.toMatch(/bg-(emerald|orange|red|amber|sky)-(50|100)(?!\d)/)
  })

  it("exposes progressbar semantics", () => {
    const html = render(<ProfileCompletenessMeter completeness={makeCompleteness(5)} />)
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('aria-valuemin="0"')
    expect(html).toContain('aria-valuemax="10"')
    expect(html).toContain('aria-valuenow="5"')
  })
})
