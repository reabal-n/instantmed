import { beforeEach, describe, expect, it, vi } from "vitest"

import { syncParchmentPrescriptionListToPms } from "@/lib/parchment/sync-prescription"

const mocks = vi.hoisted(() => ({
  getPatientPrescriptions: vi.fn(),
}))

vi.mock("@/lib/parchment/client", () => ({
  getPatientPrescriptions: mocks.getPatientPrescriptions,
}))

function makeSupabase() {
  const upserts: Array<Record<string, unknown>> = []

  return {
    client: {
      from(table: string) {
        return {
          upsert(payload: Record<string, unknown>) {
            if (table === "prescriptions") upserts.push(payload)
            return {
              select: () => ({
                maybeSingle: () => Promise.resolve({
                  data: { id: `rx-${upserts.length}` },
                  error: null,
                }),
              }),
            }
          },
        }
      },
    },
    upserts,
  }
}

describe("syncParchmentPrescriptionListToPms", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getPatientPrescriptions.mockResolvedValue({
      prescriptions: [
        {
          scid: "SCID-1",
          item_name: "Rosuvastatin",
          item_strength: "10 mg",
          quantity: "30",
          number_of_repeats_authorised: "5",
          patient_instructions: "Take one tablet daily",
          created_date: "2026-05-04T09:15:00.000Z",
          status: "Active",
          url: "https://parchment.example/rx/SCID-1",
        },
        {
          scid: "SCID-2",
          item_name: "Salbutamol inhaler",
          item_strength: "100 mcg",
          quantity: "1",
          number_of_repeats_authorised: "1",
          patient_instructions: "Use as directed",
          created_date: "2026-05-05T01:30:00.000Z",
          status: "Dispensed",
        },
      ],
      requestId: "req_list",
    })
  })

  it("refreshes the latest Parchment prescriptions into PMS records in one pass", async () => {
    const { client, upserts } = makeSupabase()

    const result = await syncParchmentPrescriptionListToPms({
      supabase: client as never,
      userId: "parchment-user-1",
      parchmentPatientId: "parchment-patient-1",
      patientProfileId: "patient-profile-1",
      prescriberProfileId: "doctor-profile-1",
      intakeId: null,
      limit: 50,
    })

    expect(mocks.getPatientPrescriptions).toHaveBeenCalledWith({
      userId: "parchment-user-1",
      patientId: "parchment-patient-1",
      limit: 50,
    })
    expect(result).toEqual({
      success: true,
      syncedCount: 2,
      failedCount: 0,
      requestId: "req_list",
      errors: [],
    })
    expect(upserts).toHaveLength(2)
    expect(upserts[0]).toMatchObject({
      patient_id: "patient-profile-1",
      prescriber_id: "doctor-profile-1",
      intake_id: null,
      medication_name: "Rosuvastatin",
      medication_strength: "10 mg",
      dosage_instructions: "Take one tablet daily",
      quantity_prescribed: 30,
      repeats_allowed: 5,
      status: "active",
      issued_date: "2026-05-04",
      parchment_reference: "SCID-1",
      parchment_url: "https://parchment.example/rx/SCID-1",
    })
    expect(upserts[1]).toMatchObject({
      medication_name: "Salbutamol inhaler",
      status: "completed",
      parchment_reference: "SCID-2",
    })
  })
})
