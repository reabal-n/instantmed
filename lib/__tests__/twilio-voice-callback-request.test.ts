import { describe, expect, it, vi } from "vitest"

import { createVoiceCallbackRequest } from "@/lib/twilio/voice-callback-request"

describe("Twilio AI voice callback requests", () => {
  it("durably stores an encrypted summary before sending a PHI-free operator alert", async () => {
    const events: string[] = []
    const insert = vi.fn(async (row: Record<string, unknown>) => {
      events.push("insert")
      expect(JSON.stringify(row)).not.toContain("Please fix the date on my certificate")
      expect(JSON.stringify(row)).not.toContain("+61412345678")
      return { id: "9d452fcc-6e45-41cc-bb57-32fa34d04e2f", created: true }
    })
    const markAlert = vi.fn(async () => {
      events.push("mark-alert")
    })
    const claimAlert = vi.fn(async () => {
      events.push("claim-alert")
      return true
    })
    const sendAlert = vi.fn(async (id: string) => {
      events.push("send-alert")
      expect(id).toBe("9d452fcc-6e45-41cc-bb57-32fa34d04e2f")
      return { delivered: true, messageId: 441 }
    })

    const result = await createVoiceCallbackRequest(
      {
        callbackNumber: "+61412345678",
        callerName: "Alex",
        callSid: "CA00000000000000000000000000000000",
        category: "document_adjustment",
        consentedAt: "2026-08-27T10:00:00.000Z",
        summary: "Please fix the date on my certificate",
      },
      {
        claimAlert,
        encrypt: async () => ({ ciphertext: "encrypted-only" }),
        hashCallSid: () => "hashed-call-sid",
        insert,
        markAlert,
        sendAlert,
      },
    )

    expect(result).toEqual({
      alertDelivered: true,
      created: true,
      id: "9d452fcc-6e45-41cc-bb57-32fa34d04e2f",
    })
    expect(events).toEqual(["insert", "claim-alert", "send-alert", "mark-alert"])
    expect(markAlert).toHaveBeenCalledWith(
      "9d452fcc-6e45-41cc-bb57-32fa34d04e2f",
      { delivered: true, messageId: 441 },
    )
  })
})
