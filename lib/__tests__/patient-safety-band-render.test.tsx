import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PatientDecisionStrip } from "@/components/doctor/patient-decision-strip"
import type { IntakeWithDetails } from "@/types/db"

const MEDICARE_NUMBER = "2123456701"

const intake = {
  id: "11111111-1111-4111-8111-111111111111",
  category: "prescription",
  subtype: null,
  status: "paid",
  doctor_notes: null,
  script_sent: false,
  is_priority: false,
  risk_tier: "low",
  gclid: "test-click-id",
  landing_page: "https://instantmed.com.au/prescriptions?campaign=private-detail",
  patient: {
    id: "22222222-2222-4222-8222-222222222222",
    full_name: "Alex Morgan",
    date_of_birth: "1986-04-05",
    sex: "F",
    medicare_number: MEDICARE_NUMBER,
    medicare_irn: 1,
    medicare_expiry: "2030-12-01",
    ihi_number: null,
    phone: "0412 345 678",
    email: "alex@example.com",
    address_line1: "10 Example Street",
    address_line2: null,
    suburb: "Ellenbrook",
    state: "WA",
    postcode: "6069",
  },
  service: {
    type: "common_scripts",
    name: "Repeat prescription",
    short_name: "Scripts",
  },
} as unknown as IntakeWithDetails

function renderBand(overrides?: {
  intake?: IntakeWithDetails
  previousIntakeCount?: number
}): string {
  const activeIntake = overrides?.intake ?? intake
  return renderToStaticMarkup(
    <PatientDecisionStrip
      intake={activeIntake}
      answers={{}}
      previousIntakeCount={overrides?.previousIntakeCount}
      service={activeIntake.service}
      actions={
        <>
          <button type="button">View profile</button>
          <span>Open full record</span>
        </>
      }
    />,
  )
}

describe("PatientDecisionStrip safety band", () => {
  it("puts decision-critical patient context and navigation in one compact band", () => {
    const html = renderBand({ previousIntakeCount: 3 })

    expect(html).toContain("Alex Morgan")
    expect(html).toMatch(/\d+y \/ 05\/04\/1986/)
    expect(html).toContain("Female")
    expect(html).toContain("Ellenbrook, WA")
    expect(html).toContain("0412 345 678")
    expect(html).toContain("Medicare / IHI")
    expect(html).toContain("Ready")
    expect(html).toContain("3 prior requests")
    expect(html).toContain("Source:")
    expect(html).toContain("Google Ads")
    expect(html).toContain("/prescriptions")
    expect(html).not.toContain("campaign=private-detail")
    expect(html).toContain("View profile")
    expect(html).toContain("Open full record")
  })

  it("shows identifier readiness without leaking the Medicare or IHI value", () => {
    const html = renderBand()

    expect(html).toContain("First visit")
    expect(html).not.toContain(MEDICARE_NUMBER)
    expect(html).not.toContain("2123 45670 1")
    expect(html).not.toContain("Hidden ending")
    expect(html).not.toContain("Reveal")
  })

  it("distinguishes missing prescribing identity from a service where it is not required", () => {
    const withoutIdentifier = {
      ...intake,
      gclid: null,
      landing_page: null,
      patient: {
        ...intake.patient,
        medicare_number: null,
        medicare_irn: null,
        medicare_expiry: null,
        ihi_number: null,
      },
    } as IntakeWithDetails
    const prescribingHtml = renderBand({ intake: withoutIdentifier })
    const medCertHtml = renderBand({
      intake: {
        ...withoutIdentifier,
        category: "medical_certificate",
        service: {
          ...intake.service!,
          type: "med_certs",
          name: "Medical certificate",
          short_name: "Certificates",
        },
      },
    })

    expect(prescribingHtml).toContain('data-readiness="blocked"')
    expect(prescribingHtml).toContain("Needs details")
    expect(prescribingHtml).toContain("Source:")
    expect(prescribingHtml).toContain("Unknown")
    expect(medCertHtml).toContain('data-readiness="not-required"')
    expect(medCertHtml).toContain("Not required")
  })

  it("renders once above the review cockpit rather than inside its scroller", () => {
    const panelSource = readFileSync(
      resolve(process.cwd(), "components/doctor/intake-review-panel.tsx"),
      "utf8",
    )
    const cockpitSource = readFileSync(
      resolve(process.cwd(), "components/doctor/review/intake-review-cockpit.tsx"),
      "utf8",
    )
    const fullDetailSource = readFileSync(
      resolve(process.cwd(), "app/doctor/intakes/[id]/intake-detail-client.tsx"),
      "utf8",
    )
    const bandIndex = panelSource.indexOf("<PatientDecisionStrip")
    const cockpitIndex = panelSource.indexOf("<IntakeReviewCockpit", bandIndex)

    expect(bandIndex).toBeGreaterThan(-1)
    expect(cockpitIndex).toBeGreaterThan(bandIndex)
    expect(cockpitSource).not.toContain("PatientDecisionStrip")
    expect(fullDetailSource.indexOf("<PatientDecisionStrip")).toBeLessThan(
      fullDetailSource.indexOf('className="min-h-0 flex-1 overflow-y-auto pr-1"'),
    )
  })
})
