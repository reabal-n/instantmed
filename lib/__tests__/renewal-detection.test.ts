import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

interface PrescriptionRow {
  patient_id: string
  medication_name: string
}

interface QueryResult {
  data: PrescriptionRow[] | null
  error: { message: string } | null
}

function createSupabaseMock(result: QueryResult) {
  // .from("prescriptions").select(...).in(...).in(...) -> awaited result
  const secondIn = vi.fn(async () => result)
  const firstIn = vi.fn(() => ({ in: secondIn }))
  const select = vi.fn(() => ({ in: firstIn }))
  const from = vi.fn(() => ({ select }))
  return { from, select, firstIn, secondIn }
}

describe("detectRenewalsForIntakes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns an empty map when probes is empty", async () => {
    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    const result = await detectRenewalsForIntakes([])
    expect(result.size).toBe(0)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("ignores non-prescription categories", async () => {
    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    const result = await detectRenewalsForIntakes([
      {
        intakeId: "intake-cert-1",
        patientId: "patient-1",
        category: "medical_certificate",
        serviceType: "med_certs",
        medicationName: "Atorvastatin",
      },
    ])
    expect(result.size).toBe(0)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("ignores prescription intakes with no medicationName", async () => {
    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    const result = await detectRenewalsForIntakes([
      {
        intakeId: "intake-rx-1",
        patientId: "patient-1",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "   ",
      },
    ])
    expect(result.size).toBe(0)
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("returns true when a prior active prescription matches by name", async () => {
    const supabase = createSupabaseMock({
      data: [
        { patient_id: "patient-1", medication_name: "Atorvastatin 20mg" },
      ],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    const result = await detectRenewalsForIntakes([
      {
        intakeId: "intake-rx-1",
        patientId: "patient-1",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "Atorvastatin 20mg",
      },
    ])

    expect(result.get("intake-rx-1")).toBe(true)
    expect(supabase.firstIn).toHaveBeenCalledWith("patient_id", ["patient-1"])
    expect(supabase.secondIn).toHaveBeenCalledWith(
      "status",
      ["active", "completed"],
    )
  })

  it("returns no entry when there is no matching prior prescription", async () => {
    const supabase = createSupabaseMock({
      data: [
        { patient_id: "patient-1", medication_name: "Metformin 500mg" },
      ],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    const result = await detectRenewalsForIntakes([
      {
        intakeId: "intake-rx-1",
        patientId: "patient-1",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "Atorvastatin 20mg",
      },
    ])

    expect(result.get("intake-rx-1")).toBeUndefined()
  })

  it("matches case-insensitively on the trimmed medication name", async () => {
    const supabase = createSupabaseMock({
      data: [
        { patient_id: "patient-1", medication_name: "atorvastatin" },
      ],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    const result = await detectRenewalsForIntakes([
      {
        intakeId: "intake-rx-1",
        patientId: "patient-1",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "  Atorvastatin  ",
      },
    ])

    expect(result.get("intake-rx-1")).toBe(true)
  })

  it("only counts active and completed prior statuses (cancelled/expired excluded by query)", async () => {
    const supabase = createSupabaseMock({
      data: [
        { patient_id: "patient-1", medication_name: "Atorvastatin" },
      ],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    await detectRenewalsForIntakes([
      {
        intakeId: "intake-rx-1",
        patientId: "patient-1",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "Atorvastatin",
      },
    ])

    expect(supabase.secondIn).toHaveBeenCalledWith(
      "status",
      ["active", "completed"],
    )
  })

  it("returns an empty map (fail-soft) when supabase errors", async () => {
    const supabase = createSupabaseMock({
      data: null,
      error: { message: "boom" },
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    const result = await detectRenewalsForIntakes([
      {
        intakeId: "intake-rx-1",
        patientId: "patient-1",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "Atorvastatin",
      },
    ])

    expect(result.size).toBe(0)
  })

  it("batches into a single query for multiple intakes across patients", async () => {
    const supabase = createSupabaseMock({
      data: [
        { patient_id: "patient-1", medication_name: "Atorvastatin" },
        { patient_id: "patient-2", medication_name: "Metformin" },
      ],
      error: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { detectRenewalsForIntakes } = await import(
      "@/lib/doctor/renewal-detection"
    )
    const result = await detectRenewalsForIntakes([
      {
        intakeId: "intake-rx-1",
        patientId: "patient-1",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "Atorvastatin",
      },
      {
        intakeId: "intake-rx-2",
        patientId: "patient-2",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "Metformin",
      },
      {
        intakeId: "intake-rx-3",
        patientId: "patient-2",
        category: "prescription",
        serviceType: "repeat_rx",
        medicationName: "Sertraline",
      },
    ])

    expect(supabase.from).toHaveBeenCalledTimes(1)
    expect(result.get("intake-rx-1")).toBe(true)
    expect(result.get("intake-rx-2")).toBe(true)
    expect(result.get("intake-rx-3")).toBeUndefined()
  })
})
