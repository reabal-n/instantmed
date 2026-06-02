import { readFileSync } from "fs"
import { join } from "path"
import { describe, expect, it } from "vitest"

import { shouldShowEarlyRecoveryEmailCapture } from "@/components/request/early-recovery-email-capture"

const medicationStepSource = readFileSync(
  join(process.cwd(), "components/request/steps/medication-step.tsx"),
  "utf8",
)

const earlyRecoverySource = readFileSync(
  join(process.cwd(), "components/request/early-recovery-email-capture.tsx"),
  "utf8",
)

describe("early recovery email capture contract", () => {
  it("shows on repeat-script only after medication intent exists", () => {
    expect(
      shouldShowEarlyRecoveryEmailCapture({
        serviceType: "repeat-script",
        email: "",
        hasProfile: false,
        certType: undefined,
        selectedDays: null,
        startOffset: null,
        medicationCount: 1,
      }),
    ).toBe(true)

    expect(
      shouldShowEarlyRecoveryEmailCapture({
        serviceType: "repeat-script",
        email: "",
        hasProfile: false,
        certType: undefined,
        selectedDays: null,
        startOffset: null,
        medicationCount: 0,
      }),
    ).toBe(false)
  })

  it("keeps capture hidden for known identities and non-recovery contexts", () => {
    expect(
      shouldShowEarlyRecoveryEmailCapture({
        serviceType: "prescription",
        email: "patient@example.com",
        hasProfile: false,
        certType: undefined,
        selectedDays: null,
        startOffset: null,
        medicationCount: 1,
      }),
    ).toBe(false)

    expect(
      shouldShowEarlyRecoveryEmailCapture({
        serviceType: "prescription",
        email: "",
        hasProfile: true,
        certType: undefined,
        selectedDays: null,
        startOffset: null,
        medicationCount: 1,
      }),
    ).toBe(false)

    expect(
      shouldShowEarlyRecoveryEmailCapture({
        serviceType: "consult",
        email: "",
        hasProfile: false,
        certType: undefined,
        selectedDays: null,
        startOffset: null,
        medicationCount: 1,
      }),
    ).toBe(false)
  })

  it("wires the capture into the medication step without leaking medication names to analytics", () => {
    expect(medicationStepSource).toContain("EarlyRecoveryEmailCapture")
    expect(medicationStepSource).toMatch(/<EarlyRecoveryEmailCapture[\s\S]*serviceType=\{serviceType\}/)
    expect(medicationStepSource).toMatch(/medicationCount=\{activeMedications\.length\}/)
    expect(earlyRecoverySource).not.toMatch(/medication_name|medicationName|drug_name|drugName/)
  })
})
