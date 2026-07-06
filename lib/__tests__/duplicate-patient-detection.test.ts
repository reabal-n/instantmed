import { describe, expect, it, vi } from "vitest"

import { findDuplicatePatientProfile } from "@/lib/clinical/duplicate-patient-detection"

/**
 * Builds a minimal Supabase mock for the
 * from("profiles").select().eq().neq().limit() chain the detector uses.
 * The chain resolves to { data, error } at .limit().
 */
function mockSupabase(result: { data?: unknown[]; error?: { message: string } | null }) {
  const limit = vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null })
  const neq = vi.fn(() => ({ limit }))
  const eq = vi.fn(() => ({ neq }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { from } as any
}

const PATIENT_ID = "11111111-1111-4111-8111-111111111111"
const OTHER_ID = "22222222-2222-4222-8222-222222222222"

describe("findDuplicatePatientProfile", () => {
  it("matches a different profile with the same name + DOB", async () => {
    const supabase = mockSupabase({ data: [{ id: OTHER_ID, full_name: "Adam West" }] })
    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })
    expect(match).toEqual({ matchedProfileId: OTHER_ID })
  })

  it("normalizes case and whitespace before comparing names", async () => {
    const supabase = mockSupabase({ data: [{ id: OTHER_ID, full_name: "  adam   WEST " }] })
    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })
    expect(match).toEqual({ matchedProfileId: OTHER_ID })
  })

  it("returns null when the same-DOB profile has a different name", async () => {
    const supabase = mockSupabase({ data: [{ id: OTHER_ID, full_name: "Jane Smith" }] })
    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })
    expect(match).toBeNull()
  })

  it("returns null when no other profile shares the DOB", async () => {
    const supabase = mockSupabase({ data: [] })
    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })
    expect(match).toBeNull()
  })

  it("returns null (no query) when name or DOB is missing", async () => {
    const supabase = mockSupabase({ data: [{ id: OTHER_ID, full_name: "Adam West" }] })

    expect(
      await findDuplicatePatientProfile(supabase, { patientId: PATIENT_ID, fullName: null, dateOfBirth: "1990-06-26" }),
    ).toBeNull()
    expect(
      await findDuplicatePatientProfile(supabase, { patientId: PATIENT_ID, fullName: "Adam West", dateOfBirth: null }),
    ).toBeNull()
    // A whitespace-only name normalizes to empty and must not query.
    expect(
      await findDuplicatePatientProfile(supabase, { patientId: PATIENT_ID, fullName: "   ", dateOfBirth: "1990-06-26" }),
    ).toBeNull()

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("fails soft (returns null) when the lookup errors", async () => {
    const supabase = mockSupabase({ error: { message: "db down" } })
    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })
    expect(match).toBeNull()
  })

  it("returns the first name-match when several profiles share the DOB", async () => {
    const supabase = mockSupabase({
      data: [
        { id: "33333333-3333-4333-8333-333333333333", full_name: "Someone Else" },
        { id: OTHER_ID, full_name: "Adam West" },
      ],
    })
    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })
    expect(match).toEqual({ matchedProfileId: OTHER_ID })
  })
})
