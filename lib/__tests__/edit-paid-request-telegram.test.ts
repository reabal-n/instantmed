import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getIntakeAnswers: vi.fn(),
  editTelegramMessageToApproved: vi.fn(),
  editTelegramMessageToDeclined: vi.fn(),
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/data/intake-answers", () => ({
  getIntakeAnswers: mocks.getIntakeAnswers,
}))

vi.mock("@/lib/notifications/telegram", () => ({
  editTelegramMessageToApproved: mocks.editTelegramMessageToApproved,
  editTelegramMessageToDeclined: mocks.editTelegramMessageToDeclined,
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

    expect(mocks.editTelegramMessageToApproved).toHaveBeenCalledWith(99, "Medical Certificate · 3 days")
  })

  it("swallows errors so callers (approval action) never see a throw", async () => {
    mocks.createServiceRoleClient.mockReturnValue(
      makeSupabaseStub({
        paid_request_telegram_message_id: 5,
        category: "common_scripts",
        subtype: null,
      }),
    )
    mocks.getIntakeAnswers.mockResolvedValueOnce({ medicationName: "Atorvastatin" })
    mocks.editTelegramMessageToApproved.mockRejectedValueOnce(new Error("Telegram down"))

    const { editPaidRequestTelegramMessageToApproved } = await import("@/lib/notifications/edit-paid-request-telegram")
    await expect(editPaidRequestTelegramMessageToApproved(INTAKE_ID)).resolves.toBeUndefined()
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
    mocks.getIntakeAnswers.mockResolvedValueOnce(null)

    const { editPaidRequestTelegramMessageToDeclined } = await import("@/lib/notifications/edit-paid-request-telegram")
    await editPaidRequestTelegramMessageToDeclined(INTAKE_ID)

    expect(mocks.editTelegramMessageToDeclined).toHaveBeenCalledWith(7, "ED Consultation")
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
