import { describe, expect, it } from "vitest"

import {
  buildPatientProfileMergeRequest,
  validatePatientProfileMergeProfiles,
} from "@/lib/doctor/patient-profile-merge"

const UUIDS = {
  canonical: "11111111-1111-4111-8111-111111111111",
  duplicateA: "22222222-2222-4222-8222-222222222222",
  duplicateB: "33333333-3333-4333-8333-333333333333",
  admin: "44444444-4444-4444-8444-444444444444",
}

describe("patient profile merge", () => {
  it("builds a deduped merge request with a bounded reason", () => {
    const request = buildPatientProfileMergeRequest({
      canonicalPatientId: UUIDS.canonical,
      duplicatePatientIds: [UUIDS.duplicateA, UUIDS.duplicateA, UUIDS.duplicateB],
      mergedByProfileId: UUIDS.admin,
      reason: "  Duplicate guest checkout profiles  ",
    })

    expect(request).toEqual({
      canonicalPatientId: UUIDS.canonical,
      duplicatePatientIds: [UUIDS.duplicateA, UUIDS.duplicateB],
      mergedByProfileId: UUIDS.admin,
      reason: "Duplicate guest checkout profiles",
    })
  })

  it("rejects invalid or self-referential merge requests before touching the database", () => {
    expect(() => buildPatientProfileMergeRequest({
      canonicalPatientId: "not-a-uuid",
      duplicatePatientIds: [UUIDS.duplicateA],
      mergedByProfileId: UUIDS.admin,
    })).toThrow("Invalid canonical patient profile.")

    expect(() => buildPatientProfileMergeRequest({
      canonicalPatientId: UUIDS.canonical,
      duplicatePatientIds: [UUIDS.canonical],
      mergedByProfileId: UUIDS.admin,
    })).toThrow("Duplicate profiles cannot include the canonical profile.")
  })

  it("blocks merging signed-in duplicate profiles into another patient profile", () => {
    const result = validatePatientProfileMergeProfiles({
      canonicalPatientId: UUIDS.canonical,
      duplicatePatientIds: [UUIDS.duplicateA],
      profiles: [
        {
          id: UUIDS.canonical,
          role: "patient",
          auth_user_id: UUIDS.admin,
          merged_into_profile_id: null,
        },
        {
          id: UUIDS.duplicateA,
          role: "patient",
          auth_user_id: UUIDS.duplicateB,
          merged_into_profile_id: null,
        },
      ],
    })

    expect(result).toEqual({
      valid: false,
      error: "Signed-in duplicate profiles need manual review before merge.",
    })
  })

  it("allows merging inactive guest duplicate profiles into the canonical patient", () => {
    const result = validatePatientProfileMergeProfiles({
      canonicalPatientId: UUIDS.canonical,
      duplicatePatientIds: [UUIDS.duplicateA, UUIDS.duplicateB],
      profiles: [
        {
          id: UUIDS.canonical,
          role: "patient",
          auth_user_id: UUIDS.admin,
          merged_into_profile_id: null,
        },
        {
          id: UUIDS.duplicateA,
          role: "patient",
          auth_user_id: null,
          merged_into_profile_id: null,
        },
        {
          id: UUIDS.duplicateB,
          role: "patient",
          auth_user_id: null,
          merged_into_profile_id: null,
        },
      ],
    })

    expect(result).toEqual({ valid: true })
  })
})
