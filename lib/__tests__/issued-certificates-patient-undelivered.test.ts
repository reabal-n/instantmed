import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

type Row = {
  intake_id: string
  certificate_ref: string | null
  certificate_number: string | null
  certificate_type: string | null
  email_failed_at: string
  email_retry_count: number | null
  status: string | null
}

interface QueryResult {
  data: Row[] | null
  error: { message: string } | null
}

function createSupabaseMock(result: QueryResult) {
  const limit = vi.fn(async () => result)
  const order = vi.fn(() => ({ limit }))
  const is = vi.fn(() => ({ order }))
  const not = vi.fn(() => ({ is }))
  const eq = vi.fn(() => ({ not }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, select, eq, not, is, order, limit }
}

describe("getPatientUndeliveredCertificates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns rows where email_failed_at is set and email_sent_at is null", async () => {
    const rows: Row[] = [
      {
        intake_id: "intake-1",
        certificate_ref: "IM-001",
        certificate_number: null,
        certificate_type: "medical_certificate",
        email_failed_at: "2026-05-21T01:00:00Z",
        email_retry_count: 3,
        status: "valid",
      },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUndeliveredCertificates } = await import("@/lib/data/issued-certificates")
    const result = await getPatientUndeliveredCertificates("patient-1")

    expect(result).toEqual([
      {
        intakeId: "intake-1",
        certificateRef: "IM-001",
        certificateType: "medical_certificate",
        failedAt: "2026-05-21T01:00:00Z",
        retryCount: 3,
      },
    ])
  })

  it("uses certificate_number as a fallback when certificate_ref is null", async () => {
    const rows: Row[] = [
      {
        intake_id: "intake-2",
        certificate_ref: null,
        certificate_number: "CERT-999",
        certificate_type: null,
        email_failed_at: "2026-05-21T02:00:00Z",
        email_retry_count: null,
        status: "valid",
      },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUndeliveredCertificates } = await import("@/lib/data/issued-certificates")
    const result = await getPatientUndeliveredCertificates("patient-2")

    expect(result).toEqual([
      {
        intakeId: "intake-2",
        certificateRef: "CERT-999",
        certificateType: null,
        failedAt: "2026-05-21T02:00:00Z",
        retryCount: 0,
      },
    ])
  })

  it("filters out revoked and superseded certificates", async () => {
    const rows: Row[] = [
      {
        intake_id: "i1",
        certificate_ref: null,
        certificate_number: "C1",
        certificate_type: "x",
        email_failed_at: "2026-05-21T01:00:00Z",
        email_retry_count: null,
        status: "revoked",
      },
      {
        intake_id: "i2",
        certificate_ref: null,
        certificate_number: "C2",
        certificate_type: "x",
        email_failed_at: "2026-05-21T02:00:00Z",
        email_retry_count: null,
        status: "superseded",
      },
      {
        intake_id: "i3",
        certificate_ref: null,
        certificate_number: "C3",
        certificate_type: "x",
        email_failed_at: "2026-05-21T03:00:00Z",
        email_retry_count: null,
        status: "valid",
      },
    ]
    const supabase = createSupabaseMock({ data: rows, error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUndeliveredCertificates } = await import("@/lib/data/issued-certificates")
    const result = await getPatientUndeliveredCertificates("p")

    expect(result.map((r) => r.intakeId)).toEqual(["i3"])
  })

  it("returns [] on Supabase error", async () => {
    const supabase = createSupabaseMock({ data: null, error: { message: "boom" } })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUndeliveredCertificates } = await import("@/lib/data/issued-certificates")
    const result = await getPatientUndeliveredCertificates("p")

    expect(result).toEqual([])
  })

  it("calls Supabase with the right query shape", async () => {
    const supabase = createSupabaseMock({ data: [], error: null })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const { getPatientUndeliveredCertificates } = await import("@/lib/data/issued-certificates")
    await getPatientUndeliveredCertificates("patient-xyz")

    expect(supabase.from).toHaveBeenCalledWith("issued_certificates")
    expect(supabase.eq).toHaveBeenCalledWith("patient_id", "patient-xyz")
    expect(supabase.not).toHaveBeenCalledWith("email_failed_at", "is", null)
    expect(supabase.is).toHaveBeenCalledWith("email_sent_at", null)
    expect(supabase.order).toHaveBeenCalledWith("email_failed_at", { ascending: false })
    expect(supabase.limit).toHaveBeenCalledWith(5)
  })
})
