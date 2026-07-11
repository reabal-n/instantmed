import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/app/actions/batch-review-cert", () => ({
  markBatchReviewed: vi.fn(),
}))

vi.mock("@/app/actions/revoke-ai-approval", () => ({
  revokeAIApproval: vi.fn(),
}))

import { BatchReviewBanner } from "@/components/doctor/batch-review-banner"
import { BatchReviewAttestation } from "@/components/doctor/review/batch-review-attestation"

describe("batch review cockpit", () => {
  it("shows an aggregate-only oldest-first banner", () => {
    const html = renderToStaticMarkup(
      <BatchReviewBanner
        result={{
          data: [{ id: "11111111-1111-4111-8111-111111111111" } as never],
          total: 3,
          oldestApprovedAt: "2026-07-10T01:00:00.000Z",
          degraded: false,
        }}
        now={new Date("2026-07-11T06:00:00.000Z")}
        onOpenOldest={() => undefined}
      />,
    )

    expect(html).toContain("3 medical certificates need doctor review")
    expect(html).toContain("Oldest pending for 29h")
    expect(html).toContain("Review oldest certificate")
    expect(html).not.toContain("Test Patient")
  })

  it("makes data-read failure visible", () => {
    const html = renderToStaticMarkup(
      <BatchReviewBanner
        result={{ data: [], total: 0, oldestApprovedAt: null, degraded: true }}
        onOpenOldest={() => undefined}
      />,
    )

    expect(html).toContain("Batch review status unavailable")
    expect(html).toContain("Refresh before relying on the post-approval review queue.")
  })

  it("requires an explicit per-certificate attestation", () => {
    const html = renderToStaticMarkup(
      <BatchReviewAttestation
        intake={{
          id: "11111111-1111-4111-8111-111111111111",
          ai_approved: true,
          category: "medical_certificate",
          status: "approved",
          batch_reviewed_at: null,
        }}
        onResolved={() => undefined}
      />,
    )

    expect(html).toContain("Complete post-approval review")
    expect(html).toContain("I reviewed the intake and issued certificate.")
    expect(html).toContain("Confirm reviewed")
    expect(html).toContain("Revoke certificate")
  })

  it("does not render an attestation for an already-reviewed certificate", () => {
    const html = renderToStaticMarkup(
      <BatchReviewAttestation
        intake={{
          id: "11111111-1111-4111-8111-111111111111",
          ai_approved: true,
          category: "medical_certificate",
          status: "approved",
          batch_reviewed_at: "2026-07-11T06:00:00.000Z",
        }}
        onResolved={() => undefined}
      />,
    )

    expect(html).toBe("")
  })
})
