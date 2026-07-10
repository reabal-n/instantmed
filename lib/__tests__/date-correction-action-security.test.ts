import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getApiAuth: vi.fn(),
  hasDoctorAccess: vi.fn(),
  doctorHasCapability: vi.fn(),
  checkRateLimit: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getCertificateCorrectionCount: vi.fn(),
  getCertificateForIntake: vi.fn(),
  reissueCertificateAction: vi.fn(),
}))

vi.mock("@/lib/auth/helpers", () => ({ getApiAuth: mocks.getApiAuth }))
vi.mock("@/lib/auth/staff-capabilities", () => ({
  hasDoctorAccess: mocks.hasDoctorAccess,
  doctorHasCapability: mocks.doctorHasCapability,
}))
vi.mock("@/lib/rate-limit/redis", () => ({
  checkServerActionRateLimit: mocks.checkRateLimit,
}))
vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))
vi.mock("@/lib/data/issued-certificates", () => ({
  getCertificateCorrectionCount: mocks.getCertificateCorrectionCount,
  getCertificateForIntake: mocks.getCertificateForIntake,
}))
vi.mock("@/app/actions/reissue-cert", () => ({
  reissueCertificateAction: mocks.reissueCertificateAction,
}))

import {
  getPatientDateCorrectionState,
  getPendingDateCorrection,
  requestDateCorrection,
} from "@/app/actions/request-date-correction"

const INTAKE_ID = "11111111-1111-4111-8111-111111111111"
const PATIENT_ID = "22222222-2222-4222-8222-222222222222"

function createPatientCorrectionClient(options: {
  answers?: Record<string, unknown> | null
  answersError?: { message: string } | null
  existingEvent?: { id: string } | null
  eventInsert?: ReturnType<typeof vi.fn>
} = {}) {
  const eventInsert = options.eventInsert ?? vi.fn().mockResolvedValue({ error: null })

  return {
    eventInsert,
    client: {
      from: vi.fn((table: string) => {
        if (table === "intakes") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: INTAKE_ID,
                    patient_id: PATIENT_ID,
                    status: "approved",
                    category: "medical_certificate",
                  },
                }),
              }),
            }),
          }
        }

        if (table === "intake_answers") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: options.answers === null
                    ? null
                    : { answers: options.answers ?? { duration: "1" } },
                  error: options.answersError ?? null,
                }),
              }),
            }),
          }
        }

        if (table === "intake_events") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: options.existingEvent ?? null }),
                  }),
                }),
              }),
            }),
            insert: eventInsert,
          }
        }

        throw new Error(`Unexpected table ${table}`)
      }),
    },
  }
}

describe("date correction action security", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkRateLimit.mockResolvedValue({ success: true })
    mocks.getCertificateCorrectionCount.mockResolvedValue({ success: true, count: 0 })
    mocks.getCertificateForIntake.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      intake_id: INTAKE_ID,
      patient_id: PATIENT_ID,
      status: "valid",
      start_date: "2026-07-10",
      end_date: "2026-07-10",
    })
  })

  it("does not query PHI for an unauthenticated pending-correction read", async () => {
    mocks.getApiAuth.mockResolvedValueOnce(null)

    await expect(getPendingDateCorrection(INTAKE_ID)).resolves.toBeNull()
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("does not query patient correction state without patient authentication", async () => {
    mocks.getApiAuth.mockResolvedValueOnce(null)

    await expect(getPatientDateCorrectionState(INTAKE_ID)).resolves.toBe("none")
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("returns unavailable instead of falsely confirming a pending correction on lookup failure", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({ profile: { id: PATIENT_ID, role: "patient" } })
    const intakeQuery: Record<string, unknown> = {}
    intakeQuery.select = vi.fn(() => intakeQuery)
    intakeQuery.eq = vi.fn(() => intakeQuery)
    intakeQuery.maybeSingle = vi.fn(async () => ({
      data: null,
      error: { message: "database unavailable" },
    }))
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn(() => intakeQuery),
    })

    await expect(getPatientDateCorrectionState(INTAKE_ID)).resolves.toBe("unavailable")
  })

  it("returns the persisted pending state for an owned certificate request", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({ profile: { id: PATIENT_ID, role: "patient" } })
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        const query: Record<string, unknown> = {}
        query.select = vi.fn(() => query)
        query.eq = vi.fn(() => query)
        query.limit = vi.fn(() => query)
        query.maybeSingle = vi.fn(async () => table === "intakes"
          ? { data: { id: INTAKE_ID }, error: null }
          : { data: { id: "44444444-4444-4444-8444-444444444444" }, error: null })
        return query
      }),
    })

    await expect(getPatientDateCorrectionState(INTAKE_ID)).resolves.toBe("pending")
  })

  it("does not query PHI for a doctor without med-cert capability", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({ profile: { id: "doctor-1", role: "doctor" } })
    mocks.hasDoctorAccess.mockReturnValueOnce(true)
    mocks.doctorHasCapability.mockReturnValueOnce(false)

    await expect(getPendingDateCorrection(INTAKE_ID)).resolves.toBeNull()
    expect(mocks.createServiceRoleClient).not.toHaveBeenCalled()
  })

  it("rejects an approved non-certificate intake before creating a correction event", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({
      profile: { id: PATIENT_ID, role: "patient", full_name: "Test Patient" },
    })
    const eventInsert = vi.fn()
    mocks.createServiceRoleClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === "intakes") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: INTAKE_ID,
                    patient_id: PATIENT_ID,
                    status: "approved",
                    category: "prescription",
                  },
                }),
              }),
            }),
          }
        }
        if (table === "intake_events") return { insert: eventInsert }
        throw new Error(`Unexpected table ${table}`)
      }),
    })

    const result = await requestDateCorrection({
      intakeId: INTAKE_ID,
      requestedStartDate: "2026-07-10",
      requestedEndDate: "2026-07-10",
      reason: "Incorrect dates",
    })

    expect(result).toEqual({
      success: false,
      error: "Date corrections are only available for medical certificates",
    })
    expect(eventInsert).not.toHaveBeenCalled()
  })

  it("rejects a correction request when there is no current valid certificate", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({
      profile: { id: PATIENT_ID, role: "patient", full_name: "Test Patient" },
    })
    mocks.getCertificateForIntake.mockResolvedValueOnce(null)
    const { client, eventInsert } = createPatientCorrectionClient()
    mocks.createServiceRoleClient.mockReturnValue(client)

    const result = await requestDateCorrection({
      intakeId: INTAKE_ID,
      requestedStartDate: "2026-07-11",
      requestedEndDate: "2026-07-11",
      reason: "Incorrect dates",
    })

    expect(result).toEqual({
      success: false,
      error: "No valid certificate found for this request",
    })
    expect(eventInsert).not.toHaveBeenCalled()
  })

  it("rejects a patient correction that exceeds the paid certificate tier", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({
      profile: { id: PATIENT_ID, role: "patient", full_name: "Test Patient" },
    })
    const { client, eventInsert } = createPatientCorrectionClient({
      answers: { duration: "1" },
    })
    mocks.createServiceRoleClient.mockReturnValue(client)

    const result = await requestDateCorrection({
      intakeId: INTAKE_ID,
      requestedStartDate: "2026-07-11",
      requestedEndDate: "2026-07-12",
      reason: "Incorrect dates",
    })

    expect(result).toEqual({
      success: false,
      error: "Requested duration (2 days) exceeds the paid certificate tier (1 day). Contact support if you need a longer certificate.",
    })
    expect(eventInsert).not.toHaveBeenCalled()
  })

  it("rejects a no-op correction that already matches the current certificate", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({
      profile: { id: PATIENT_ID, role: "patient", full_name: "Test Patient" },
    })
    const { client, eventInsert } = createPatientCorrectionClient()
    mocks.createServiceRoleClient.mockReturnValue(client)

    const result = await requestDateCorrection({
      intakeId: INTAKE_ID,
      requestedStartDate: "2026-07-10",
      requestedEndDate: "2026-07-10",
      reason: "Incorrect dates",
    })

    expect(result).toEqual({
      success: false,
      error: "The requested dates already match your current certificate",
    })
    expect(eventInsert).not.toHaveBeenCalled()
  })

  it("rejects a patient correction before creating a permanently blocked fourth request", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({
      profile: { id: PATIENT_ID, role: "patient", full_name: "Test Patient" },
    })
    mocks.getCertificateCorrectionCount.mockResolvedValueOnce({ success: true, count: 3 })
    const { client, eventInsert } = createPatientCorrectionClient()
    mocks.createServiceRoleClient.mockReturnValue(client)

    const result = await requestDateCorrection({
      intakeId: INTAKE_ID,
      requestedStartDate: "2026-07-11",
      requestedEndDate: "2026-07-11",
      reason: "Incorrect dates",
    })

    expect(result).toEqual({
      success: false,
      error: "Maximum corrections reached (3). Contact support.",
    })
    expect(eventInsert).not.toHaveBeenCalled()
  })

  it("maps a concurrent pending-request conflict to the existing-request message", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({
      profile: { id: PATIENT_ID, role: "patient", full_name: "Test Patient" },
    })
    const eventInsert = vi.fn().mockResolvedValue({
      error: { code: "23505", message: "duplicate key" },
    })
    const { client } = createPatientCorrectionClient({
      answers: { duration: "2" },
      eventInsert,
    })
    mocks.createServiceRoleClient.mockReturnValue(client)

    const result = await requestDateCorrection({
      intakeId: INTAKE_ID,
      requestedStartDate: "2026-07-11",
      requestedEndDate: "2026-07-12",
      reason: "Incorrect dates",
    })

    expect(result).toEqual({
      success: false,
      error: "A correction request is already pending",
    })
  })

  it("stores an in-tier correction request after validating the current certificate", async () => {
    mocks.getApiAuth.mockResolvedValueOnce({
      profile: { id: PATIENT_ID, role: "patient", full_name: "Test Patient" },
    })
    const { client, eventInsert } = createPatientCorrectionClient({
      answers: { duration: "2" },
    })
    mocks.createServiceRoleClient.mockReturnValue(client)

    const result = await requestDateCorrection({
      intakeId: INTAKE_ID,
      requestedStartDate: "2026-07-11",
      requestedEndDate: "2026-07-12",
      reason: "Incorrect dates",
    })

    expect(result).toEqual({ success: true })
    expect(eventInsert).toHaveBeenCalledWith(expect.objectContaining({
      intake_id: INTAKE_ID,
      event_type: "date_correction_requested",
      actor_id: PATIENT_ID,
      actor_role: "patient",
      metadata: expect.objectContaining({
        requested_start_date: "2026-07-11",
        requested_end_date: "2026-07-12",
      }),
    }))
  })
})
