import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getIntakeAnswers: vi.fn(),
  editTelegramMessageToApproved: vi.fn(),
  editTelegramMessageToDeclined: vi.fn(),
  editTelegramMessageToNeedsManualReview: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/data/intake-answers", () => ({
  getIntakeAnswers: mocks.getIntakeAnswers,
}))

vi.mock("@/lib/notifications/telegram", () => ({
  editTelegramMessageToApproved: mocks.editTelegramMessageToApproved,
  editTelegramMessageToDeclined: mocks.editTelegramMessageToDeclined,
  editTelegramMessageToNeedsManualReview: mocks.editTelegramMessageToNeedsManualReview,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

const INTAKE_ID = "11111111-1111-1111-1111-111111111111"

function makeSupabaseStub(row: Record<string, unknown> | null, errored = false) {
  const maybeSingle = vi.fn().mockResolvedValue(
    errored ? { data: null, error: { message: "boom" } } : { data: row, error: null },
  )
  const eq = vi.fn().mockReturnValue({ maybeSingle })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from, _select: select, _eq: eq, _maybeSingle: maybeSingle }
}

describe("editPaidRequestTelegramMessageToApproved", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("no-ops when paid_request_telegram_message_id is null", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseStub({
        paid_request_telegram_message_id: null,
        category: "med_certs",
        subtype: null,
      }),
    )

    const { editPaidRequestTelegramMessageToApproved } = await import("@/lib/notifications/edit-paid-request-telegram")
    await editPaidRequestTelegramMessageToApproved(INTAKE_ID)

    expect(mocks.editTelegramMessageToApproved).not.toHaveBeenCalled()
    expect(mocks.getIntakeAnswers).not.toHaveBeenCalled()
  })

  it("no-ops when the intake row is not found", async () => {
    mocks.createServiceRoleClient.mockReturnValue(makeSupabaseStub(null))

    const { editPaidRequestTelegramMessageToApproved } = await import("@/lib/notifications/edit-paid-request-telegram")
    await editPaidRequestTelegramMessageToApproved(INTAKE_ID)

    expect(mocks.editTelegramMessageToApproved).not.toHaveBeenCalled()
  })

  it("calls the Telegram editor with the composed service name (med cert + duration)", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseStub({
        paid_request_telegram_message_id: 99,
        category: "med_certs",
        subtype: null,
      }),
    )
    mocks.getIntakeAnswers.mockResolvedValueOnce({ duration: "3" })

    const { editPaidRequestTelegramMessageToApproved } = await import("@/lib/notifications/edit-paid-request-telegram")
    await editPaidRequestTelegramMessageToApproved(INTAKE_ID)

    expect(mocks.editTelegramMessageToApproved).toHaveBeenCalledWith(99, {
      serviceSlug: "med-cert-sick",
      subtype: undefined,
      serviceDetail: "3 days",
    })
  })

  it("swallows errors so callers (approval action) never see a throw", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseStub({
        paid_request_telegram_message_id: 5,
        category: "common_scripts",
        subtype: null,
      }),
    )
    mocks.editTelegramMessageToApproved.mockRejectedValueOnce(new Error("Telegram down"))

    const { editPaidRequestTelegramMessageToApproved } = await import("@/lib/notifications/edit-paid-request-telegram")
    await expect(editPaidRequestTelegramMessageToApproved(INTAKE_ID)).resolves.toBeUndefined()
    expect(mocks.getIntakeAnswers).not.toHaveBeenCalled()
  })
})

describe("editPaidRequestTelegramMessageToDeclined", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls the decline editor with the composed service name", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseStub({
        paid_request_telegram_message_id: 7,
        category: "consult",
        subtype: "ed",
      }),
    )
    const { editPaidRequestTelegramMessageToDeclined } = await import("@/lib/notifications/edit-paid-request-telegram")
    await editPaidRequestTelegramMessageToDeclined(INTAKE_ID)

    expect(mocks.editTelegramMessageToDeclined).toHaveBeenCalledWith(7, {
      serviceSlug: "consult",
      subtype: "ed",
      serviceDetail: undefined,
    })
    expect(mocks.getIntakeAnswers).not.toHaveBeenCalled()
  })

  it("swallows errors so the decline action never fails because of a stale chat edit", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseStub({
        paid_request_telegram_message_id: 8,
        category: "med_certs",
        subtype: null,
      }),
    )
    mocks.getIntakeAnswers.mockResolvedValueOnce({ duration: "1" })
    mocks.editTelegramMessageToDeclined.mockRejectedValueOnce(new Error("Telegram down"))

    const { editPaidRequestTelegramMessageToDeclined } = await import("@/lib/notifications/edit-paid-request-telegram")
    await expect(editPaidRequestTelegramMessageToDeclined(INTAKE_ID)).resolves.toBeUndefined()
  })
})

describe("editPaidRequestTelegramMessageToNeedsManualReview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("flips an auto med-cert chat message to the needs-manual editor with the same service context", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseStub({
        paid_request_telegram_message_id: 21,
        category: "med_certs",
        subtype: null,
      }),
    )
    mocks.getIntakeAnswers.mockResolvedValueOnce({ duration: "2" })

    const { editPaidRequestTelegramMessageToNeedsManualReview } = await import("@/lib/notifications/edit-paid-request-telegram")
    await editPaidRequestTelegramMessageToNeedsManualReview(INTAKE_ID)

    expect(mocks.editTelegramMessageToNeedsManualReview).toHaveBeenCalledWith(21, {
      serviceSlug: "med-cert-sick",
      subtype: undefined,
      serviceDetail: "2 days",
    })
  })

  it("no-ops cleanly when the row has no Telegram message_id (notification never sent)", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseStub({
        paid_request_telegram_message_id: null,
        category: "med_certs",
        subtype: null,
      }),
    )

    const { editPaidRequestTelegramMessageToNeedsManualReview } = await import("@/lib/notifications/edit-paid-request-telegram")
    await editPaidRequestTelegramMessageToNeedsManualReview(INTAKE_ID)

    expect(mocks.editTelegramMessageToNeedsManualReview).not.toHaveBeenCalled()
  })
})
