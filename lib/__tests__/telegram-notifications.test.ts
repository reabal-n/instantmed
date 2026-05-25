import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("Telegram request notifications", () => {
  const originalEnv = { ...process.env }
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    fetchMock.mockReset()
    vi.stubGlobal("fetch", fetchMock)
    process.env.TELEGRAM_BOT_TOKEN = "test-token"
    process.env.TELEGRAM_CHAT_ID = "123456"
    process.env.NEXT_PUBLIC_APP_URL = "https://instantmed.com.au"
    delete process.env.TELEGRAM_APPROVAL_ACTIONS_ENABLED
    delete process.env.TELEGRAM_ACTION_SIGNING_SECRET
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...originalEnv }
  })

  it("renders the title as a single compact line with no payment / PHI noise", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "med-cert-sick",
      serviceDetail: "1 day",
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.parse_mode).toBe("MarkdownV2")
    expect(requestBody.text).toBe("*❌ New med cert · 1 day*")
    expect(requestBody.text).not.toContain("$29")
    expect(requestBody.text).not.toContain("💰")
    expect(requestBody.text).not.toContain("Patient")
  })

  it("surfaces Telegram API failures to webhook callers for Sentry capture", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "Bad Request: can't parse entities",
    })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await expect(notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "med-cert-sick",
    })).rejects.toThrow("Telegram med cert send failed: 400")
  })

  it("does not include a clinical approve callback by default", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "med-cert-sick",
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.reply_markup.inline_keyboard[0]).toEqual([
      {
        text: "📋 Review",
        url: "https://instantmed.com.au/doctor/intakes/12345678-1234-1234-1234-123456789abc",
      },
    ])
    expect(JSON.stringify(requestBody.reply_markup)).not.toContain("callback_data")
  })

  it("prefixes the title with ⚡ when isPriority is true", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "med-cert-sick",
      serviceDetail: "3 days",
      isPriority: true,
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toBe("*⚡ ❌ New med cert · 3 days*")
  })

  it("omits the ⚡ prefix when isPriority is false and renders generic message body with Review link", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "common-scripts",
      serviceDetail: "Atorvastatin",
      isPriority: false,
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toContain("*💊 New prescription · Atorvastatin*")
    expect(body.text).not.toContain("⚡")
    expect(body.text).toContain("[Review now →]")
  })

  it("uses 👍 (not ✅) on the Approve button so it stays distinct from the title's auto-approval ✅", async () => {
    process.env.TELEGRAM_APPROVAL_ACTIONS_ENABLED = "true"
    process.env.TELEGRAM_ACTION_SIGNING_SECRET = "test-action-signing-secret"
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })

    const { notifyNewIntakeViaTelegram, verifyIntakeAction } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "med-cert-sick",
      autoApprovalCandidate: true,
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    const [approveButton, reviewButton] = requestBody.reply_markup.inline_keyboard[0]

    expect(approveButton.text).toBe("👍 Approve")
    expect(approveButton.text).not.toContain("✅")
    expect(approveButton.callback_data).toMatch(/^approve:12345678-1234-1234-1234-123456789abc:[a-f0-9]{16}$/)
    expect(reviewButton.text).toBe("📋 Review")

    const [, intakeId, signature] = approveButton.callback_data.split(":")
    expect(verifyIntakeAction(intakeId, "approve", signature)).toBe(true)
  })

  it("fails loudly when paid-request Telegram credentials are missing", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await expect(notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "med-cert-sick",
    })).rejects.toThrow("Telegram notification is not configured")

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("uses ✅ when the med cert is an auto-approval candidate", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "med-cert-sick",
      serviceDetail: "1 day",
      autoApprovalCandidate: true,
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toBe("*✅ New med cert · 1 day*")
    expect(body.text).not.toContain("❌")
  })

  it("stacks priority + auto markers in a stable order", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    await notifyNewIntakeViaTelegram({
      intakeId: "12345678-1234-1234-1234-123456789abc",
      serviceSlug: "med-cert-sick",
      serviceDetail: "2 days",
      isPriority: true,
      autoApprovalCandidate: true,
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toBe("*⚡ ✅ New med cert · 2 days*")
  })

  it("picks per-subtype emoji + noun for consults", async () => {
    const cases = [
      { subtype: "ed", expected: "*💙 New ED consult*" },
      { subtype: "hair_loss", expected: "*💇 New hair loss consult*" },
      { subtype: "womens_health", expected: "*🌸 New women's health consult*" },
      { subtype: "weight_loss", expected: "*⚖️ New weight loss consult*" },
    ]

    const { notifyNewIntakeViaTelegram } = await import("@/lib/notifications/telegram")

    for (const c of cases) {
      fetchMock.mockClear()
      fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })

      await notifyNewIntakeViaTelegram({
        intakeId: "12345678-1234-1234-1234-123456789abc",
        serviceSlug: "consult",
        subtype: c.subtype,
      })

      const body = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(body.text, `subtype=${c.subtype}`).toContain(c.expected)
    }
  })

  it("edits the message to ✓ Approved with the original service context for chat-history continuity", async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { editTelegramMessageToApproved } = await import("@/lib/notifications/telegram")

    await editTelegramMessageToApproved(99, {
      serviceSlug: "common-scripts",
      serviceDetail: "Atorvastatin",
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.message_id).toBe(99)
    expect(body.text).toBe("*✓ Approved · 💊 prescription · Atorvastatin*")
  })

  it("drops the routing emoji from the med-cert edited title to avoid stacking ✓ + ✅/❌", async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { editTelegramMessageToApproved } = await import("@/lib/notifications/telegram")

    await editTelegramMessageToApproved(50, {
      serviceSlug: "med-cert-sick",
      serviceDetail: "1 day",
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toBe("*✓ Approved · med cert · 1 day*")
    expect(body.text).not.toContain("✅")
    expect(body.text).not.toContain("❌")
  })

  it("edits the message to ✕ Declined with the original service context", async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { editTelegramMessageToDeclined } = await import("@/lib/notifications/telegram")

    await editTelegramMessageToDeclined(7, {
      serviceSlug: "consult",
      subtype: "ed",
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toBe("*✕ Declined · 💙 ED consult*")
  })

  it("edits the message to ❌ Manual review needed when the auto-approval pipeline declines", async () => {
    fetchMock.mockResolvedValue({ ok: true })

    const { editTelegramMessageToNeedsManualReview } = await import("@/lib/notifications/telegram")

    await editTelegramMessageToNeedsManualReview(123, {
      serviceSlug: "med-cert-sick",
      serviceDetail: "2 days",
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.text).toBe("*❌ Manual review needed · med cert · 2 days*")
  })

  it("keeps system Telegram alerts off unless explicitly re-enabled", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ result: { message_id: 42 } }) })
    process.env.TELEGRAM_ALL_LEVELS = "1"
    delete process.env.TELEGRAM_SYSTEM_ALERTS_ENABLED

    const { sendTelegramAlert } = await import("@/lib/notifications/telegram")

    await sendTelegramAlert("*Critical test*", { severity: "critical" })
    expect(fetchMock).not.toHaveBeenCalled()

    process.env.TELEGRAM_SYSTEM_ALERTS_ENABLED = "1"
    await sendTelegramAlert("*Critical test*", { severity: "critical" })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
