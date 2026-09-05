import { beforeEach, describe, expect, it, vi } from "vitest"

import { syncParchmentPrescriptionListToPms, syncParchmentPrescriptionToPms } from "@/lib/parchment/sync-prescription"

const mocks = vi.hoisted(() => ({
  getPatientPrescriptions: vi.fn(),
}))

vi.mock("@/lib/parchment/client", () => ({
  getPatientPrescriptions: mocks.getPatientPrescriptions,
}))

function makeSupabase(initialRows: Array<Record<string, unknown>> = [], beforeUpdate?: (rows: Array<Record<string, unknown>>) => void) {
  const rows = initialRows.map((row) => ({ ...row }))
  const upserts: Array<Record<string, unknown>> = []
  const updates: Array<Record<string, unknown>> = []
  function query(payload?: Record<string, unknown>) {
    const filters: Record<string, unknown> = {}
    const q = {
      eq: (key: string, value: unknown) => { filters[key] = value; return q },
      is: (key: string, value: unknown) => { filters[key] = value; return q },
      select: () => q,
      maybeSingle: async () => {
        const row = rows.find((candidate) => Object.entries(filters).every(([key, value]) => (candidate[key] ?? null) === value))
        if (row && payload) {
          updates.push(payload)
          Object.assign(row, payload)
        }
        return { data: row ? { ...row } : null, error: null }
      },
    }
    return q
  }
  return {
    client: {
      from() {
        return {
          select: () => query(),
          update: (payload: Record<string, unknown>) => { beforeUpdate?.(rows); return query(payload) },
          upsert(payload: Record<string, unknown>, options: { ignoreDuplicates?: boolean }) {
            upserts.push(payload)
            const existing = rows.find((row) => row.parchment_reference === payload.parchment_reference)
            if (existing && !options.ignoreDuplicates) Object.assign(existing, payload)
            const inserted = existing ? null : { id: `rx-${rows.length + 1}`, ...payload }
            if (inserted) rows.push(inserted)
            return { select: () => ({ maybeSingle: async () => ({ data: inserted, error: null }) }) }
          },
        }
      },
    },
    upserts, updates, rows,
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
  const verifiedRow = {
    id: "rx-original", patient_id: "patient-profile-1", prescriber_id: "doctor-original",
    intake_id: "request-original", parchment_reference: "SCID-1", medication_name: "Original",
  }
  const baseInput = {
    userId: "viewer-user", parchmentPatientId: "external-patient",
    patientProfileId: "patient-profile-1", prescriberProfileId: null, scid: "SCID-1",
  }

  it("finds an exact reference beyond the first page", async () => {
    mocks.getPatientPrescriptions
      .mockResolvedValueOnce({ prescriptions: [], pagination: { hasNext: true, lastKey: "page-2" } })
      .mockResolvedValueOnce({ prescriptions: [{ scid: "SCID-1", item_name: "Test medicine" }] })
    const db = makeSupabase()
    expect(await syncParchmentPrescriptionToPms({ ...baseInput, supabase: db.client as never }))
      .toMatchObject({ success: true })
    expect(mocks.getPatientPrescriptions).toHaveBeenNthCalledWith(2, {
      userId: baseInput.userId, patientId: baseInput.parchmentPatientId, limit: 50, lastKey: "page-2",
    })
    expect(db.rows).toHaveLength(1)
  })

  it("stops a repeated pagination cursor without writing an unrelated prescription", async () => {
    mocks.getPatientPrescriptions.mockResolvedValue({
      prescriptions: [{ scid: "unrelated" }], pagination: { hasNext: true, lastKey: "same-page" },
    })
    const db = makeSupabase()
    expect(await syncParchmentPrescriptionToPms({ ...baseInput, supabase: db.client as never }))
      .toEqual({ success: false, reason: "prescription_pagination_failed" })
    expect(mocks.getPatientPrescriptions).toHaveBeenCalledTimes(2)
    expect(db.rows).toHaveLength(0)
  })

  it("refreshes medicine details without erasing the original doctor or request", async () => {
    const db = makeSupabase([verifiedRow])
    const result = await syncParchmentPrescriptionToPms({ ...baseInput, supabase: db.client as never })
    expect(result).toEqual({ success: true, prescriptionId: "rx-original" })
    expect(db.rows[0]).toMatchObject({
      patient_id: "patient-profile-1", intake_id: "request-original", prescriber_id: "doctor-original",
      medication_name: "Rosuvastatin",
    })
  })

  it.each([
    [{ patientProfileId: "duplicate-patient" }, "prescription_patient_mismatch"],
    [{ prescriberProfileId: "different-doctor" }, "prescription_prescriber_mismatch"],
    [{ intakeId: "different-request" }, "prescription_request_mismatch"],
  ] as const)("refuses to overwrite verified ownership: %j", async (override, reason) => {
    const db = makeSupabase([verifiedRow])
    const result = await syncParchmentPrescriptionToPms({ ...baseInput, ...override, supabase: db.client as never })
    expect(result).toEqual({ success: false, reason })
    expect(db.rows[0]).toEqual(verifiedRow)
    expect(db.updates).toHaveLength(0)
  })

  it("fills missing links when a verified callback arrives after a history refresh", async () => {
    const db = makeSupabase([{ ...verifiedRow, intake_id: null, prescriber_id: null }])
    const result = await syncParchmentPrescriptionToPms({
      ...baseInput, supabase: db.client as never, intakeId: "request-original", prescriberProfileId: "doctor-original",
    })
    expect(result.success).toBe(true)
    expect(db.rows[0]).toMatchObject({ intake_id: "request-original", prescriber_id: "doctor-original" })
  })

  it("does not overwrite a link recorded between the existing-row read and update", async () => {
    const db = makeSupabase([{ ...verifiedRow, intake_id: null }], (rows) => { rows[0].intake_id = "concurrent-request" })
    const result = await syncParchmentPrescriptionToPms({
      ...baseInput, supabase: db.client as never, intakeId: "request-original",
    })
    expect(result.success).toBe(false)
    expect(db.rows[0].intake_id).toBe("concurrent-request")
  })

})
