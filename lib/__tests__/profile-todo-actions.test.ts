import { beforeEach, describe, expect, it, vi } from "vitest"

import { getTodoItems, type ProfileData } from "@/components/patient/profile-todo-card"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createServiceRoleClient: vi.fn(),
  revalidatePath: vi.fn(),
  verifyAddress: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/auth/helpers", () => ({
  auth: mocks.auth,
}))

vi.mock("@/lib/google-places/geocoding", () => ({
  verifyAddress: mocks.verifyAddress,
}))

vi.mock("@/lib/supabase/service-role", () => ({
  createServiceRoleClient: mocks.createServiceRoleClient,
}))

function createProfileSupabaseMock() {
  const updatePayloads: Record<string, unknown>[] = []

  const profiles = {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: { auth_user_id: "auth-user-id" },
          error: null,
        })),
      })),
    })),
    update: vi.fn((payload: Record<string, unknown>) => {
      updatePayloads.push(payload)
      return {
        eq: vi.fn(async () => ({ error: null })),
      }
    }),
  }

  const supabase = {
    from: vi.fn((table: string) => {
      if (table !== "profiles") throw new Error(`Unexpected table ${table}`)
      return profiles
    }),
  }

  return { supabase, updatePayloads }
}

describe("profile todo server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ENCRYPTION_KEY = Buffer.from("12345678901234567890123456789012").toString("base64")
    mocks.auth.mockResolvedValue({ userId: "auth-user-id" })
    mocks.verifyAddress.mockResolvedValue({ verified: false, address: null })
  })

  it("stores phone as readable normalized data plus encrypted PHI column", async () => {
    const { supabase, updatePayloads } = createProfileSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { updatePhoneAction } = await import("@/app/actions/profile-todo")

    const result = await updatePhoneAction("profile-id", "0412 345 678")

    expect(result.success).toBe(true)
    expect(updatePayloads[0]).toMatchObject({
      phone: "+61412345678",
    })
    expect(updatePayloads[0]?.phone_encrypted).toEqual(expect.any(String))
    expect(updatePayloads[0]?.phone_encrypted).not.toBe("+61412345678")
    expect(updatePayloads[0]?.phi_encrypted_at).toEqual(expect.any(String))
  })

  it("stores Medicare as readable data plus encrypted PHI column", async () => {
    const { supabase, updatePayloads } = createProfileSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { updateMedicareAction } = await import("@/app/actions/profile-todo")

    const result = await updateMedicareAction("profile-id", {
      medicareNumber: "1111111111",
      medicareIrn: 2,
      medicareExpiry: "2029-05-01",
      consentMyhr: true,
    })

    expect(result.success).toBe(true)
    expect(updatePayloads[0]).toMatchObject({
      medicare_number: "1111111111",
      medicare_irn: 2,
      medicare_expiry: "2029-05-01",
      consent_myhr: true,
    })
    expect(updatePayloads[0]?.medicare_number_encrypted).toEqual(expect.any(String))
    expect(updatePayloads[0]?.medicare_number_encrypted).not.toBe("1111111111")
    expect(updatePayloads[0]?.phi_encrypted_at).toEqual(expect.any(String))
  })

  it("allows Medicare number and IRN without expiry because Parchment expiry is optional", async () => {
    const { supabase, updatePayloads } = createProfileSupabaseMock()
    mocks.createServiceRoleClient.mockReturnValue(supabase)
    const { updateMedicareAction } = await import("@/app/actions/profile-todo")

    const result = await updateMedicareAction("profile-id", {
      medicareNumber: "1111111111",
      medicareIrn: 2,
      medicareExpiry: null,
      consentMyhr: false,
    })

    expect(result.success).toBe(true)
    expect(updatePayloads[0]).toMatchObject({
      medicare_number: "1111111111",
      medicare_irn: 2,
      medicare_expiry: null,
    })
  })
})

const COMPLETE_PROFILE: ProfileData = {
  profileId: "profile-id",
  phone: "0412 345 678",
  addressLine1: "1 Elizabeth Street",
  suburb: "Surry Hills",
  state: "NSW",
  postcode: "2010",
  medicareNumber: "1111111111",
  medicareIrn: 2,
  medicareExpiry: null,
  consentMyhr: false,
}

describe("profile todo completion logic", () => {
  it("does not mark Medicare complete when the IRN is missing", () => {
    const items = getTodoItems({
      ...COMPLETE_PROFILE,
      medicareIrn: null,
    })

    expect(items.find((item) => item.type === "medicare")?.isComplete).toBe(false)
  })

  it("treats Medicare expiry as optional when number and IRN are valid", () => {
    const items = getTodoItems(COMPLETE_PROFILE)

    expect(items.find((item) => item.type === "medicare")?.isComplete).toBe(true)
  })

  it("does not hide invalid legacy phone or postcode data as complete", () => {
    const items = getTodoItems({
      ...COMPLETE_PROFILE,
      phone: "12345",
      postcode: "3000",
    })

    expect(items.find((item) => item.type === "phone")?.isComplete).toBe(false)
    expect(items.find((item) => item.type === "address")?.isComplete).toBe(false)
  })
})
