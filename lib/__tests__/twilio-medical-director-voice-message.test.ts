import { describe, expect, it, vi } from "vitest"

import { createMedicalDirectorVoiceMessage } from "@/lib/twilio/medical-director-voice-message"

const baseInput = {
  callbackRequested: false,
  callSid: "CA00000000000000000000000000000000",
  category: "medical_certificate" as const,
  confirmedAt: "2026-08-27T10:00:00.000Z",
  confirmedSummary: "Please fix the date on my medical certificate.",
  patientFullName: "Alex Citizen",
}

describe("Medical Director voice messages", () => {
  it("durably stores an encrypted confirmed message before sending a PHI-free alert", async () => {
    const events: string[] = []
    const insert = vi.fn(async (row: Record<string, unknown>) => {
      events.push("insert")
      expect(JSON.stringify(row)).not.toContain(baseInput.confirmedSummary)
      expect(JSON.stringify(row)).not.toContain(baseInput.patientFullName)
      expect(row).toMatchObject({
        callback_requested: false,
        call_sid_fingerprint: "hashed-call-sid",
        category: "medical_certificate",
        patient_details_complete: true,
        patient_match_state: "unmatched",
        status: "new",
        suggested_patient_id: null,
      })
      return {
        createdAt: "2026-08-27T10:00:00.000Z",
        id: "9d452fcc-6e45-41cc-bb57-32fa34d04e2f",
        created: true,
      }
    })
    const markAlert = vi.fn(async () => {
      events.push("mark-alert")
    })
    const claimAlert = vi.fn(async () => {
      events.push("claim-alert")
      return true
    })
    const sendAlert = vi.fn(async (id: string, category: string) => {
      events.push("send-alert")
      expect(id).toBe("9d452fcc-6e45-41cc-bb57-32fa34d04e2f")
      expect(category).toBe("medical_certificate")
      return { delivered: true, messageId: 441 }
    })

    const result = await createMedicalDirectorVoiceMessage(baseInput, {
      claimAlert,
      encrypt: async (payload) => {
        expect(payload).toEqual({
          callbackNumber: null,
          confirmedSummary: baseInput.confirmedSummary,
          patientFullName: baseInput.patientFullName,
        })
        return { ciphertext: "encrypted-only" }
      },
      fingerprintCallSid: () => "hashed-call-sid",
      insert,
      markAlert,
      sendAlert,
    })

    expect(result).toEqual({
      alertDelivered: true,
      created: true,
      id: "9d452fcc-6e45-41cc-bb57-32fa34d04e2f",
    })
    expect(events).toEqual(["insert", "claim-alert", "send-alert", "mark-alert"])
  })

  it("rejects a phone number when the caller did not request a callback", async () => {
    const insert = vi.fn()

    await expect(createMedicalDirectorVoiceMessage(
      { ...baseInput, callbackNumber: "0412 345 678" },
      {
        claimAlert: vi.fn(),
        encrypt: vi.fn(),
        fingerprintCallSid: vi.fn(),
        insert,
        markAlert: vi.fn(),
        sendAlert: vi.fn(),
      },
    )).rejects.toThrow()

    expect(insert).not.toHaveBeenCalled()
  })

  it("keeps the durable save successful when Telegram delivery fails", async () => {
    const result = await createMedicalDirectorVoiceMessage(baseInput, {
      claimAlert: async () => true,
      encrypt: async () => ({ ciphertext: "encrypted-only" }),
      fingerprintCallSid: () => "hashed-call-sid",
      insert: async () => ({
        createdAt: "2026-08-27T10:00:00.000Z",
        id: "9d452fcc-6e45-41cc-bb57-32fa34d04e2f",
        created: true,
      }),
      markAlert: vi.fn(),
      sendAlert: async () => {
        throw new Error("Telegram unavailable")
      },
    })

    expect(result).toEqual({
      alertDelivered: false,
      created: true,
      id: "9d452fcc-6e45-41cc-bb57-32fa34d04e2f",
    })
  })
})
