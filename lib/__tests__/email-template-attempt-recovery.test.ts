import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ pending: vi.fn(), provider: vi.fn(), client: vi.fn() }))
vi.unmock("@/lib/email/template-sender")
vi.mock("@/lib/supabase/service-role", () => ({ createServiceRoleClient: mocks.client }))
vi.mock("@/lib/email/send/outbox", () => ({
  createPendingOutbox: mocks.pending,
  updateOutboxStatus: vi.fn(),
}))
vi.mock("@/lib/email/resend", () => ({ sendViaResend: mocks.provider, sendCriticalEmail: mocks.provider }))

import { reserveRefundEmail, sendTemplateEmail } from "@/lib/email/template-sender"

beforeEach(() => {
  vi.clearAllMocks()
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: {
      subject: "Synthetic notice", body_html: "Synthetic notice", available_tags: [],
    }, error: null }),
  }
  mocks.client.mockReturnValue({ from: vi.fn(() => query) })
})

describe("existing template send attempts", () => {
  it.each(["template", "refund"])("keeps an unavailable %s reservation recoverable", async (kind) => {
    mocks.pending.mockResolvedValue({ id: "outbox-1", duplicate: true, persistenceUnavailable: true })
    const result = kind === "template"
      ? await sendTemplateEmail({ to: "synthetic@example.test", templateSlug: "generic", data: {}, idempotencyKey: "existing-attempt" })
      : await reserveRefundEmail({ to: "synthetic@example.test", patientName: "Synthetic", amountCents: 2495, refundReason: "Synthetic", intakeId: "intake-1", stripeRefundId: "re_test" })
    expect(result.success).toBe(false)
    expect(result.terminalExisting).not.toBe(true)
    expect(mocks.provider).not.toHaveBeenCalled()
  })

  it.each(["template", "refund"])("does not replay a confirmed terminal %s attempt", async (kind) => {
    mocks.pending.mockResolvedValue({ id: "outbox-1", duplicate: true, providerTerminal: true })
    const result = kind === "template"
      ? await sendTemplateEmail({ to: "synthetic@example.test", templateSlug: "generic", data: {}, idempotencyKey: "existing-attempt" })
      : await reserveRefundEmail({ to: "synthetic@example.test", patientName: "Synthetic", amountCents: 2495, refundReason: "Synthetic", intakeId: "intake-1", stripeRefundId: "re_test" })
    expect(result).toMatchObject({ success: false, terminalExisting: true, emailId: "outbox-1" })
    expect(mocks.provider).not.toHaveBeenCalled()
  })
})
