import { describe, expect, it } from "vitest"

import { LEGACY_REPEAT_RX_RECONCILIATION_NOTE } from "@/lib/clinical/repeat-rx-attestation"
import {
  buildReviewPacket,
  type BuildReviewPacketInput,
  getReviewPacketBlocker,
} from "@/lib/clinical/review-packet"

function repeatRxInput(
  overrides: Partial<BuildReviewPacketInput> = {},
): BuildReviewPacketInput {
  return {
    category: "prescription",
    serviceType: "repeat-script",
    answers: {
      medications: [
        {
          name: "Effexor 75mg",
          displayName: "Effexor 75mg",
          strength: "75mg",
          form: "tablet",
        },
      ],
      currentDose: "75mg once daily",
      indication: "Anxiety",
      prescriptionHistory: "3_to_6_months",
      doseChanged: false,
    },
    intake: { status: "paid", script_sent: false },
    summary: {
      title: "Repeat prescription",
      keyFacts: [
        { label: "Allergies", value: "None reported" },
        { label: "Current medications", value: "None reported" },
      ],
    },
    ...overrides,
  }
}

describe("buildReviewPacket", () => {
  it("does not duplicate a structured strength embedded in a medication name", () => {
    const packet = buildReviewPacket(repeatRxInput())

    expect(packet.facts.find((fact) => fact.key === "medicine")).toMatchObject({
      value: "Effexor",
      state: "confirmed",
    })
    expect(packet.facts.find((fact) => fact.key === "strength")).toMatchObject({
      value: "75mg",
      state: "confirmed",
    })
    expect(packet.facts.map((fact) => fact.value).join(" ")).not.toContain("Effexor 75mg 75mg")
  })

  it("marks embedded free-text strength as inferred without satisfying the structured field", () => {
    const packet = buildReviewPacket(repeatRxInput({
      answers: {
        medicationName: "Effexor 75mg",
        medicationStrength: "",
        medicationForm: "tablet",
        currentDose: "75mg once daily",
        indication: "Anxiety",
        prescriptionHistory: "3_to_6_months",
        doseChanged: false,
      },
    }))

    expect(packet.facts.find((fact) => fact.key === "medicine")).toMatchObject({
      value: "Effexor",
      state: "confirmed",
    })
    expect(packet.facts.find((fact) => fact.key === "strength")).toMatchObject({
      value: "75mg",
      state: "inferred",
      issue: "Confirm strength",
    })
    expect(packet.issueCount).toBe(1)
  })

  it("attaches missing form, dose, and indication issues to their own facts", () => {
    const packet = buildReviewPacket(repeatRxInput({
      answers: {
        medicationName: "Venlafaxine",
        medicationStrength: "75mg",
        prescriptionHistory: "3_to_6_months",
        doseChanged: false,
      },
    }))

    expect(packet.facts.find((fact) => fact.key === "form")).toMatchObject({
      value: "Not recorded",
      state: "missing",
      issue: "Confirm form",
    })
    expect(packet.facts.find((fact) => fact.key === "patient_dose")).toMatchObject({
      value: "Not recorded",
      state: "missing",
      issue: "Confirm dose and frequency",
      blocksPrescribing: true,
    })
    expect(packet.facts.find((fact) => fact.key === "indication")).toMatchObject({
      value: "Not recorded",
      state: "missing",
      issue: "Confirm indication",
      blocksPrescribing: true,
    })
    expect(packet.issueCount).toBe(3)
  })

  it("marks a legacy missing regimen attestation as a non-overridable request issue", () => {
    const packet = buildReviewPacket(repeatRxInput({
      answers: {
        medicationName: "Venlafaxine",
        medicationStrength: "75mg",
        medicationForm: "tablet",
        currentDose: "75mg daily",
        indication: "Anxiety",
        prescriptionHistory: "3_to_6_months",
      },
    }))

    expect(packet.facts.find((fact) => fact.key === "regimen")).toMatchObject({
      value: "Not recorded",
      state: "missing",
      issue: "Regimen confirmation not captured",
      blocksPrescribing: true,
      noteCanResolve: false,
    })
    expect(getReviewPacketBlocker(packet, "Confirmed by phone")).toMatchObject({
      blocked: true,
      warning: false,
    })
  })

  it.each([
    ["less_than_3_months", "Less than 3 months ago"],
    ["3_to_6_months", "3–6 months ago"],
    ["6_to_12_months", "6–12 months ago"],
    ["over_12_months", "Over 12 months ago"],
  ])("humanises prescription recency %s", (storedValue, displayValue) => {
    const packet = buildReviewPacket(repeatRxInput({
      answers: {
        ...(repeatRxInput().answers as Record<string, unknown>),
        prescriptionHistory: storedValue,
      },
    }))

    expect(packet.facts.find((fact) => fact.key === "last_prescribed")?.value).toBe(displayValue)
  })

  it("keeps multiple historic medication requests inside one medicine fact", () => {
    const packet = buildReviewPacket(repeatRxInput({
      answers: {
        medications: [
          { name: "Rosuvastatin", strength: "10mg", form: "tablet" },
          { name: "Metformin", strength: "500mg", form: "tablet" },
        ],
        currentDose: "As recorded for each medicine",
        indication: "Ongoing treatment",
        prescriptionHistory: "less_than_3_months",
        doseChanged: false,
      },
    }))

    expect(packet.facts.filter((fact) => fact.key === "medicine")).toEqual([
      expect.objectContaining({
        value: "Rosuvastatin 10mg tablet; Metformin 500mg tablet",
        state: "confirmed",
      }),
    ])
    expect(packet.facts.some((fact) => fact.key === "strength")).toBe(false)
    expect(packet.facts.some((fact) => fact.key === "form")).toBe(false)
  })

  it.each([
    {
      label: "medical certificate",
      input: {
        category: "medical_certificate",
        serviceType: "med_certs",
        subtype: "work",
        answers: {},
        summary: {
          title: "Medical certificate request",
          keyFacts: [{ label: "Requested duration", value: "2 days" }],
        },
      },
      workflow: {
        kind: "medical_certificate",
        prescribeLabel: null,
        completionLabel: "Approve certificate",
        requiresFulfilment: false,
      },
    },
    {
      label: "repeat prescription",
      input: repeatRxInput(),
      workflow: {
        kind: "repeat_prescription",
        prescribeLabel: "Prescribe",
        completionLabel: "Complete request",
        requiresFulfilment: true,
      },
    },
    ...["ed", "hair_loss", "womens_health"].map((subtype) => ({
      label: subtype,
      input: {
        category: "consult",
        serviceType: "consult",
        subtype,
        answers: {},
        summary: {
          title: `Consult · ${subtype}`,
          keyFacts: [{ label: "Preference", value: "Doctor to decide" }],
        },
      },
      workflow: {
        kind: "prescribing_consult",
        prescribeLabel: "Prescribe",
        completionLabel: "Complete request",
        requiresFulfilment: true,
      },
    })),
    {
      label: "legacy non-prescribing consult",
      input: {
        category: "consult",
        serviceType: "consult",
        subtype: "general",
        answers: {},
        summary: {
          title: "Consult · General",
          keyFacts: [{ label: "Subtype", value: "General" }],
        },
      },
      workflow: {
        kind: "consult",
        prescribeLabel: null,
        completionLabel: "Complete request",
        requiresFulfilment: false,
      },
    },
  ])("supplies shared workflow metadata for $label", ({ input, workflow }) => {
    expect(buildReviewPacket(input as BuildReviewPacketInput).workflow).toEqual(workflow)
  })

  it("uses script evidence, not a completed status alone, as fulfilment proof", () => {
    const withoutEvidence = buildReviewPacket(repeatRxInput({
      intake: { status: "completed", script_sent: false },
    }))
    const withEvidence = buildReviewPacket(repeatRxInput({
      intake: {
        status: "awaiting_script",
        script_sent: true,
        script_sent_at: "2026-07-14T02:30:00.000Z",
      },
    }))

    expect(withoutEvidence.fulfilment).toEqual({ status: "pending", recordedAt: null })
    expect(withEvidence.fulfilment).toEqual({
      status: "recorded",
      recordedAt: "2026-07-14T02:30:00.000Z",
    })
  })

  it("preserves generic summary facts without reparsing service fields in the view", () => {
    const packet = buildReviewPacket({
      category: "medical_certificate",
      serviceType: "med_certs",
      answers: {},
      summary: {
        title: "Medical certificate request",
        keyFacts: [
          { label: "Requested duration", value: "2 days" },
          { label: "Symptoms", value: "Fever and fatigue" },
          { label: "Patient note", value: "Not provided" },
        ],
      },
    })

    expect(packet.facts).toEqual([
      expect.objectContaining({ key: "requested_duration", value: "2 days", state: "confirmed" }),
      expect.objectContaining({ key: "symptoms", value: "Fever and fatigue", state: "confirmed" }),
      expect.objectContaining({ key: "patient_note", value: "Not recorded", state: "missing" }),
    ])
  })

  it("attaches missing medical-certificate symptom detail to the request packet", () => {
    const packet = buildReviewPacket({
      category: "medical_certificate",
      serviceType: "med_certs",
      answers: { duration: "1", certType: "work" },
      summary: {
        title: "Medical certificate request",
        keyFacts: [
          { label: "Certificate type", value: "Work" },
          { label: "Requested duration", value: "1 day" },
        ],
      },
    })

    expect(packet.facts.find((fact) => fact.key === "symptoms")).toMatchObject({
      value: "Not recorded",
      state: "missing",
      issue: "Request symptom detail",
    })
    expect(packet.issueCount).toBe(1)
  })
})

describe("getReviewPacketBlocker", () => {
  it("allows only reconciled closure after legacy script evidence is already recorded", () => {
    const packet = buildReviewPacket(repeatRxInput({
      answers: {
        medicationName: "Atorvastatin",
        medicationStrength: "20 mg",
        medicationForm: "tablet",
        currentDose: "Take one tablet at night",
      },
      intake: { status: "awaiting_script", script_sent: true },
    }))

    expect(getReviewPacketBlocker(packet, "Confirmed by phone")).toMatchObject({
      blocked: true,
      warning: false,
    })
    expect(getReviewPacketBlocker(packet, LEGACY_REPEAT_RX_RECONCILIATION_NOTE)).toMatchObject({
      blocked: false,
      warning: true,
    })
  })

  it("retains the legacy clinical-note override for missing dose and indication", () => {
    const packet = buildReviewPacket(repeatRxInput({
      answers: { medicationName: "Atorvastatin 20mg", medicationForm: "tablet", doseChanged: false },
    }))

    expect(getReviewPacketBlocker(packet, "")).toMatchObject({
      blocked: true,
      warning: false,
    })
    expect(getReviewPacketBlocker(packet, "Confirmed regimen with patient by phone.")).toMatchObject({
      blocked: false,
      warning: true,
    })
  })

  it("does not turn an inferred-strength issue into a new prescribing blocker", () => {
    const packet = buildReviewPacket(repeatRxInput({
      answers: {
        medicationName: "Effexor 75mg",
        medicationForm: "tablet",
        currentDose: "75mg daily",
        indication: "Anxiety",
        doseChanged: false,
      },
    }))

    expect(getReviewPacketBlocker(packet, "")).toEqual({
      blocked: false,
      warning: false,
      message: null,
    })
  })
})
