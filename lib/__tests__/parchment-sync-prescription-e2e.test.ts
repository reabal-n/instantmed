import { afterEach, describe, expect, it, vi } from "vitest"

import {
  syncParchmentPrescriptionListToPms,
  syncParchmentPrescriptionToPms,
} from "@/lib/parchment/sync-prescription"

const getPatientPrescriptions = vi.hoisted(() => vi.fn())

vi.mock("@/lib/parchment/client", () => ({
  getPatientPrescriptions,
}))

const supabase = {} as Parameters<typeof syncParchmentPrescriptionToPms>[0]["supabase"]

describe("Parchment prescription sync E2E boundary", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("does not call the external Parchment prescription-list API during Playwright webhook tests", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")

    const result = await syncParchmentPrescriptionToPms({
      supabase,
      userId: "e2e-parchment-user",
      parchmentPatientId: "parchment-patient",
      patientProfileId: "patient-profile",
      prescriberProfileId: "doctor-profile",
      intakeId: "intake-id",
      scid: "SCID-E2E",
    })

    expect(result).toEqual({
      success: false,
      reason: "e2e_prescription_sync_skipped",
    })
    expect(getPatientPrescriptions).not.toHaveBeenCalled()
  })

  it("does not call the external Parchment prescription-list API for patient refreshes in Playwright", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")

    const result = await syncParchmentPrescriptionListToPms({
      supabase,
      userId: "e2e-parchment-user",
      parchmentPatientId: "parchment-patient",
      patientProfileId: "patient-profile",
      prescriberProfileId: "doctor-profile",
      intakeId: "intake-id",
    })

    expect(result).toMatchObject({
      success: false,
      syncedCount: 0,
      failedCount: 0,
      errors: [{ scid: "e2e", reason: "e2e_prescription_sync_skipped" }],
    })
    expect(getPatientPrescriptions).not.toHaveBeenCalled()
  })

  it("does not let the public Playwright flag disable server-side Parchment sync", async () => {
    vi.stubEnv("NEXT_PUBLIC_PLAYWRIGHT", "1")
    getPatientPrescriptions.mockResolvedValueOnce({ prescriptions: [] })

    const result = await syncParchmentPrescriptionToPms({
      supabase,
      userId: "e2e-parchment-user",
      parchmentPatientId: "parchment-patient",
      patientProfileId: "patient-profile",
      prescriberProfileId: "doctor-profile",
      intakeId: "intake-id",
      scid: "SCID-E2E",
    })

    expect(result).toEqual({
      success: false,
      reason: "prescription_not_found",
    })
    expect(getPatientPrescriptions).toHaveBeenCalledTimes(1)
  })

  it("does not skip server-side Parchment sync in a deployed runtime even if PLAYWRIGHT leaks", async () => {
    vi.stubEnv("PLAYWRIGHT", "1")
    vi.stubEnv("VERCEL", "1")
    vi.stubEnv("VERCEL_ENV", "preview")
    getPatientPrescriptions.mockResolvedValueOnce({ prescriptions: [] })

    const result = await syncParchmentPrescriptionToPms({
      supabase,
      userId: "preview-parchment-user",
      parchmentPatientId: "parchment-patient",
      patientProfileId: "patient-profile",
      prescriberProfileId: "doctor-profile",
      intakeId: "intake-id",
      scid: "SCID-PREVIEW",
    })

    expect(result).toEqual({
      success: false,
      reason: "prescription_not_found",
    })
    expect(getPatientPrescriptions).toHaveBeenCalledTimes(1)
  })
})
