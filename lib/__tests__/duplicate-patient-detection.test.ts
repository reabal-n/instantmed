import { describe, expect, it, vi } from "vitest"

import { findDuplicatePatientProfile } from "@/lib/clinical/duplicate-patient-detection"

/** Builds a small in-memory Supabase query that applies filters before limit. */
function mockSupabase(result: { data?: unknown[]; error?: { message: string } | null }) {
  let rows: Array<Record<string, unknown>> = result.data?.map((row) => ({
    date_of_birth: "1990-06-26",
    role: "patient",
    merged_into_profile_id: null,
    account_closed_at: null,
    ...(row as Record<string, unknown>),
  })) ?? []

  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] === value)
      return query
    }),
    is: vi.fn((column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] === value)
      return query
    }),
    neq: vi.fn((column: string, value: unknown) => {
      rows = rows.filter((row) => row[column] !== value)
      return query
    }),
    limit: vi.fn(async (count: number) => ({
      data: rows.slice(0, count),
      error: result.error ?? null,
    })),
  }
  const from = vi.fn(() => query)
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

  it("ignores a profile already merged into the current patient", async () => {
    const supabase = mockSupabase({
      data: [{
        id: OTHER_ID,
        full_name: "Adam West",
        role: "patient",
        merged_into_profile_id: PATIENT_ID,
        account_closed_at: null,
      }],
    })

    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })

    expect(match).toBeNull()
  })

  it("ignores a closed patient profile", async () => {
    const supabase = mockSupabase({
      data: [{
        id: OTHER_ID,
        full_name: "Adam West",
        role: "patient",
        merged_into_profile_id: null,
        account_closed_at: "2026-08-20T00:00:00.000Z",
      }],
    })

    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })

    expect(match).toBeNull()
  })

  it("ignores a non-patient profile", async () => {
    const supabase = mockSupabase({
      data: [{
        id: OTHER_ID,
        full_name: "Adam West",
        role: "doctor",
        merged_into_profile_id: null,
        account_closed_at: null,
      }],
    })

    const match = await findDuplicatePatientProfile(supabase, {
      patientId: PATIENT_ID,
      fullName: "Adam West",
      dateOfBirth: "1990-06-26",
    })

    expect(match).toBeNull()
  })

  it("filters inactive profiles before applying the shared-DOB scan limit", async () => {
    const inactiveProfiles = Array.from({ length: 50 }, (_, index) => ({
      id: `closed-${index}`,
      full_name: "Adam West",
      role: "patient",
      merged_into_profile_id: PATIENT_ID,
      account_closed_at: null,
    }))
    const supabase = mockSupabase({
      data: [
        ...inactiveProfiles,
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
