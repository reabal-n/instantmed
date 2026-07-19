import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

import {
  findReviewRequestCandidates,
  processReviewRequestBackfill,
} from "@/lib/email/review-request"

type Row = Record<string, unknown>

function reviewCandidate(id: string, fulfilledAt: string): Row {
  return {
    id,
    patient_id: `patient-${id}`,
    category: "medical_certificate",
    status: "completed",
    payment_status: "paid",
    document_sent_at: fulfilledAt,
    script_sent_at: null,
    review_email_sent_at: null,
    review_email_suppressed_at: null,
    patient_email: `${id}@example.com`,
    patient_first_name: "Patient",
    patient_email_bounced: false,
  }
}

describe("findReviewRequestCandidates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-20T00:00:00.000Z"))
  })

  it("delegates durable ownership exclusion to the bounded database query", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        reviewCandidate("intake-unowned", "2026-07-02T00:00:00.000Z"),
      ],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValue({
      rpc,
    })

    const candidates = await findReviewRequestCandidates()

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      "intake-unowned",
    ])
    expect(rpc).toHaveBeenCalledWith("get_review_request_candidates", {
      p_catch_up_floor: "2026-03-22T00:00:00.000Z",
      p_eligible_before: "2026-07-18T00:00:00.000Z",
      p_limit: 50,
      p_excluded_patient_id: "e2e00000-0000-0000-0000-000000000002",
    })
  })

  it("fails closed when the database candidate query cannot be read", async () => {
    mocks.createServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: { message: "reservation read unavailable" },
      }),
    })

    await expect(findReviewRequestCandidates()).rejects.toThrow(
      "Failed to fetch review request candidates",
    )
  })

  it("keeps the exported backfill processor dry-run by default", async () => {
    mocks.createServiceRoleClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    })

    await expect(processReviewRequestBackfill()).resolves.toMatchObject({
      candidates: 0,
      sent: 0,
      dryRun: true,
    })
  })
})
