import { describe, expect, it } from "vitest"

import { buildPrescribingPacket, getPrescribingPacketBlocker } from "@/lib/clinical/prescribing-packet"

describe("buildPrescribingPacket", () => {
  it("builds a complete repeat-Rx packet with no missing fields", () => {
    const packet = buildPrescribingPacket({
      serviceType: "repeat-script",
      answers: {
        medicationName: "Doxycycline",
        medicationStrength: "100 mg",
        medicationForm: "tablet",
        currentDose: "1 tablet once daily",
        indication: "acne",
        prescriptionHistory: "6_to_12_months",
      },
      intake: { status: "paid", script_sent: false },
    })

    expect(packet.serviceKind).toBe("repeat_rx")
    expect(packet.medicationLabel).toBe("Doxycycline 100 mg tablet")
    expect(packet.dose).toBe("1 tablet once daily")
    expect(packet.indication).toBe("acne")
    expect(packet.primaryLabel).toBe("Doxycycline 100 mg tablet · 1 tablet once daily · acne")
    expect(packet.missingRequiredFields).toEqual([])
    expect(packet.optionalContext).toContain("Last prescribed: 6_to_12_months")
    expect(packet.fulfilment.status).toBe("not_prescribed")
  })

  it("flags missing required fields on a legacy repeat request", () => {
    const packet = buildPrescribingPacket({
      serviceType: "repeat-script",
      answers: { medicationName: "Atorvastatin 20 mg" },
      intake: { status: "paid", script_sent: false },
    })

    expect(packet.missingRequiredFields).toEqual(["dose", "indication"])
  })

  it("does not require repeat dose/indication for specialty consults", () => {
    const packet = buildPrescribingPacket({
      serviceType: "consult",
      subtype: "ed",
      answers: { iiefTotal: 14 },
      intake: { status: "paid", script_sent: false },
    })

    expect(packet.serviceKind).toBe("ed")
    expect(packet.missingRequiredFields).toEqual([])
  })

  it("marks fulfilment complete once the script is sent", () => {
    const packet = buildPrescribingPacket({
      serviceType: "repeat-script",
      answers: { medicationName: "Doxycycline", currentDose: "1 daily", indication: "acne" },
      intake: { status: "completed", script_sent: true },
    })

    expect(packet.fulfilment.status).toBe("completed")
    expect(packet.fulfilment.prescribedMedicationLabel).toBe("Doxycycline")
  })
})

describe("getPrescribingPacketBlocker", () => {
  const legacyPacket = buildPrescribingPacket({
    serviceType: "repeat-script",
    answers: { medicationName: "Atorvastatin 20 mg" },
    intake: { status: "paid", script_sent: false },
  })

  it("blocks prescribing when required fields are missing and there is no clinical note", () => {
    const result = getPrescribingPacketBlocker(legacyPacket, "")
    expect(result.blocked).toBe(true)
    expect(result.warning).toBe(false)
    expect(result.message).toContain("dose & frequency")
  })

  it("allows with a warning when a clinical note is recorded", () => {
    const result = getPrescribingPacketBlocker(legacyPacket, "Confirmed regimen with patient by phone.")
    expect(result.blocked).toBe(false)
    expect(result.warning).toBe(true)
  })

  it("never blocks a complete packet", () => {
    const completePacket = buildPrescribingPacket({
      serviceType: "repeat-script",
      answers: { medicationName: "Doxycycline", currentDose: "1 daily", indication: "acne" },
      intake: { status: "paid", script_sent: false },
    })
    expect(getPrescribingPacketBlocker(completePacket, "")).toEqual({ blocked: false, warning: false, message: null })
  })
})
