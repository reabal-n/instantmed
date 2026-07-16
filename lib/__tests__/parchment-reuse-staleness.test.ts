import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPatient: vi.fn(),
  createServiceRoleClient: vi.fn(),
  getProfileById: vi.fn(),
  updatePatient: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}))

vi.mock("@/lib/data/profiles", () => ({
  getProfileById: mocks.getProfileById,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

vi.mock("@/lib/parchment/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/parchment/client")>()
  return {
    ...actual,
    createPatient: mocks.createPatient,
    updatePatient: mocks.updatePatient,
  }
})

import { ParchmentApiError } from "@/lib/parchment/client"
import {
  computeParchmentDemographicsHash,
  ParchmentPatientSyncError,
  syncPatientToParchment,
} from "@/lib/parchment/sync-patient"
import type { Profile } from "@/types/db"

const PROFILE = {
  id: "profile-1",
  full_name: "Joshua Bryant",
  first_name: "Joshua",
  last_name: "Bryant",
  date_of_birth: "1997-05-24",
  sex: "M",
  phone: "0412074190",
  email: "joshua@example.com",
  medicare_number: "2123456701",
  medicare_irn: 1,
  medicare_expiry: "2029-05-01",
  address_line1: "21 Kent Road",
  address_line2: null,
  suburb: "Dapto",
  state: "NSW",
  postcode: "2530",
} as Profile

function createProfilesTableMock(row: {
  parchment_patient_id: string | null
  parchment_synced_demographics_hash: string | null
}) {
  const updates: Array<Record<string, unknown>> = []
  const selectChain = {
    eq: vi.fn(() => selectChain),
    single: vi.fn(async () => ({ data: row, error: null })),
  }
  const supabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => selectChain),
      update: vi.fn((payload: Record<string, unknown>) => {
        updates.push(payload)
        const chain = {
          eq: vi.fn(() => chain),
          is: vi.fn(() => chain),
          then: (resolve: (value: { error: null }) => unknown) =>
            resolve({ error: null }),
        }
        return chain
      }),
    })),
  }
  return { supabase, updates }
}

describe("Parchment reuse-mode staleness gate", () => {
  const currentHash = computeParchmentDemographicsHash(PROFILE)

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getProfileById.mockResolvedValue(PROFILE)
    mocks.updatePatient.mockResolvedValue({})
  })

  it("skips the network refresh when the stored digest matches the current demographics", async () => {
    const { supabase } = createProfilesTableMock({
      parchment_patient_id: "parchment-1",
      parchment_synced_demographics_hash: currentHash,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const id = await syncPatientToParchment("profile-1", "prescriber-1", undefined, {
      existingPatientMode: "reuse",
    })

    expect(id).toBe("parchment-1")
    expect(mocks.updatePatient).not.toHaveBeenCalled()
    expect(mocks.createPatient).not.toHaveBeenCalled()
  })

  it("refreshes Parchment and re-records the digest when demographics changed", async () => {
    const { supabase, updates } = createProfilesTableMock({
      parchment_patient_id: "parchment-1",
      parchment_synced_demographics_hash: "stale-digest",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    const id = await syncPatientToParchment("profile-1", "prescriber-1", undefined, {
      existingPatientMode: "reuse",
    })

    expect(id).toBe("parchment-1")
    expect(mocks.updatePatient).toHaveBeenCalledTimes(1)
    expect(
      updates.some(
        (payload) => payload.parchment_synced_demographics_hash === currentHash,
      ),
    ).toBe(true)
  })

  it("treats a never-recorded digest as changed so pre-migration rows refresh once", async () => {
    const { supabase } = createProfilesTableMock({
      parchment_patient_id: "parchment-1",
      parchment_synced_demographics_hash: null,
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)

    await syncPatientToParchment("profile-1", "prescriber-1", undefined, {
      existingPatientMode: "reuse",
    })

    expect(mocks.updatePatient).toHaveBeenCalledTimes(1)
  })

  it("blocks the handoff when demographics changed and the refresh fails", async () => {
    const { supabase } = createProfilesTableMock({
      parchment_patient_id: "parchment-1",
      parchment_synced_demographics_hash: "stale-digest",
    })
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    mocks.updatePatient.mockRejectedValue(
      new ParchmentApiError("Parchment update patient failed: 500", 500, {
        reason: "unknown",
      }),
    )

    await expect(
      syncPatientToParchment("profile-1", "prescriber-1", undefined, {
        existingPatientMode: "reuse",
      }),
    ).rejects.toBeInstanceOf(ParchmentPatientSyncError)
    expect(mocks.createPatient).not.toHaveBeenCalled()
  })

  it("computes a stable digest that moves only when the outgoing payload moves", () => {
    expect(computeParchmentDemographicsHash({ ...PROFILE } as Profile)).toBe(currentHash)
    expect(
      computeParchmentDemographicsHash({
        ...PROFILE,
        address_line1: "99 New Street",
      } as Profile),
    ).not.toBe(currentHash)
    expect(
      computeParchmentDemographicsHash({
        ...PROFILE,
        medicare_irn: 2,
      } as Profile),
    ).not.toBe(currentHash)
  })
})
