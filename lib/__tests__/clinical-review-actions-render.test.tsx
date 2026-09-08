import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/doctor/queue/actions", () => ({ markScriptSentAction: vi.fn() }))
import { IntakeActionButtons } from "@/components/doctor/review/intake-action-buttons"
import { type IntakeReviewContextValue,IntakeReviewProvider } from "@/components/doctor/review/intake-review-context"
import { ReviewBlockersStrip } from "@/components/doctor/review/review-blockers-strip"

function context(status = "paid", scriptSent = false): IntakeReviewContextValue {
  const intake = { id: "synthetic", status, category: "prescription", script_sent: scriptSent, payment_status: "paid", amount_cents: 2995,
    patient: { id: "synthetic-patient", full_name: "Synthetic Patient", date_of_birth: "1990-01-01", sex: "male", phone: "0400000000", address_line1: "1 Test Street", suburb: "Sydney", state: "NSW", postcode: "2000", medicare_number: "2123456701", medicare_irn: "1" } }
  return { intake, service: { type: "repeat_rx" }, answers: { medicationName: "Synthetic medicine 10 mg", medicationDose: "One tablet daily", medicationFrequency: "Daily", indication: "Patient indication", doseChanged: false, medicationStillTaking: true, medicationChanged: false, medicationSideEffects: false }, doctorNotes: "Reviewed the patient request and source information for clinical suitability.", data: { intake, viewerActionAccess: { allowed: true, reason: null } }, setShowDeclineDialog: vi.fn() } as unknown as IntakeReviewContextValue
}
function render(value: IntakeReviewContextValue, blockers = false) {
  return renderToStaticMarkup(<IntakeReviewProvider value={value}>{blockers ? <ReviewBlockersStrip /> : <IntakeActionButtons onRequestInformation={() => undefined} />}</IntakeReviewProvider>)
}

describe("shared clinical review action presentation", () => {
  it("offers labelled clarification and explains the unsupported awaiting-script state", () => {
    const html = render(context("awaiting_script"))
    expect(html).toContain("Request information")
    expect(html).toContain("Information cannot be requested while awaiting a script.")
  })
  it("keeps completion visible while clarification is pending", () => {
    const html = render(context("pending_info"))
    expect(html).toContain("Complete request")
    expect(html).toContain("Await patient information before completing the request.")
  })
  it("keeps ordinary pending prescribing out of the warning strip", () => {
    expect(render(context("awaiting_script"), true)).not.toContain("Delivery pending")
  })
  it("puts the manual fallback behind a labelled disclosure on every viewport", () => {
    const html = render(context())
    expect(html).toMatch(/<details[^>]*data-prescribing-recovery/)
    expect(html).toContain("Recovery options")
  })
  it("renders one neutral recorded state without everyday refund repetition", () => {
    const html = render(context("awaiting_script", true))
    expect(html).toContain('data-prescribing-state="recorded"')
    expect(html).not.toContain("Full refund if you decline")
  })
  it("explains actor restrictions instead of showing enabled-looking actions", () => {
    const value = context()
    value.data.viewerActionAccess = { allowed: false, canReviewService: true, reason: "This case is claimed by another doctor." }
    expect(render(value)).toContain("This case is claimed by another doctor.")
  })
})
