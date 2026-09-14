import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { closureRefundStatus } from "@/lib/email/closure-refund-status"
import { RequestDeclinedEmail } from "@/lib/email/components/templates/request-declined"

function render(refundStatus?: string, reasonCode = "requires_examination") {
  return renderToStaticMarkup(<RequestDeclinedEmail patientName="Test Person" requestAccessUrl="https://example.test/request" reason="Please follow the advice provided." reasonCode={reasonCode} refundStatus={refundStatus} />)
}
describe("closure email outcomes", () => {
  it("does not turn a settled historical partial refund into a full-refund claim on replay", () => {
    expect(render(closureRefundStatus("partially_refunded", "succeeded"))).not.toContain("has been refunded")
    expect(render(closureRefundStatus("partially_refunded", "failed"))).toContain("Refund needs attention")
    expect(render(closureRefundStatus("refunded", "succeeded"))).toContain("has been refunded")
  })
  it("never promises a refund when payment evidence is absent", () => {
    expect(render()).not.toContain("Full refund guaranteed")
    expect(render()).not.toContain("has been refunded")
    expect(render("not_applicable")).not.toContain("Refund requested")
  })
  it("distinguishes pending, failed, and processed refunds", () => {
    expect(render("pending")).toContain("Refund requested")
    expect(render("pending")).not.toContain("has been refunded")
    expect(render("failed")).toContain("Refund needs attention")
    expect(render("failed")).not.toContain("has been refunded")
    expect(render("succeeded")).toContain("including any priority fee")
  })
  it.each(["duplicate_request", "patient_cancelled"])("avoids clinical refusal language for %s", code => {
    const html = render("pending", code)
    expect(html).toContain("Your request has been closed")
    expect(html).not.toContain("Why we declined")
    expect(html).not.toContain("unable to issue")
  })
})
