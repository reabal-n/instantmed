import * as Sentry from "@sentry/nextjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  clearTokenCache,
  createPatient,
  createUser,
  disableUser,
  enableUser,
  getPatientPrescriptions,
  updatePatient,
  updateUser,
  updateUserRoles,
  validateIntegration,
} from "@/lib/parchment/client"

const env = {
  PARCHMENT_API_URL: "https://api.sandbox.parchmenthealth.io/external",
  PARCHMENT_PARTNER_ID: "instantmed",
  PARCHMENT_PARTNER_SECRET: "partner-secret",
  PARCHMENT_ORGANIZATION_ID: "org-123",
  PARCHMENT_ORGANIZATION_SECRET: "org-secret",
}

describe("Parchment client workflows", () => {
  beforeEach(() => {
    vi.stubEnv("PARCHMENT_API_URL", env.PARCHMENT_API_URL)
    vi.stubEnv("PARCHMENT_PARTNER_ID", env.PARCHMENT_PARTNER_ID)
    vi.stubEnv("PARCHMENT_PARTNER_SECRET", env.PARCHMENT_PARTNER_SECRET)
    vi.stubEnv("PARCHMENT_ORGANIZATION_ID", env.PARCHMENT_ORGANIZATION_ID)
    vi.stubEnv("PARCHMENT_ORGANIZATION_SECRET", env.PARCHMENT_ORGANIZATION_SECRET)
    clearTokenCache()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    clearTokenCache()
  })

  it("validates the sandbox integration with a per-user token before calling /validate", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { accessToken: "token-for-doctor", expiresIn: 21600 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { validated: true },
        message: "Successfully validated token",
        requestId: "req_validate",
      }), { status: 200 }))

    vi.stubGlobal("fetch", fetchMock)

    const result = await validateIntegration("parchment-user-1")

    expect(result.validated).toBe(true)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/validate`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token-for-doctor",
          "x-organization-secret": env.PARCHMENT_ORGANIZATION_SECRET,
        }),
      }),
    )
  })

  it("retrieves patient prescriptions using the logged-in Parchment user identity", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { accessToken: "token-for-doctor", expiresIn: 21600 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        message: "Patient prescriptions retrieved successfully",
        data: {
          patient: { given_name: "John", family_name: "Smith" },
          prescriber: { given_name: "Dr. Emily", family_name: "Johnson" },
          prescriptions: [
            {
              prescription_type: "ELECTRONIC",
              scid: "2F3WFX8J4WQH8T72X9",
              status: "Active",
              created_date: "2025-06-30T00:11:22",
              item_name: "Sildenafil 100 mg tablet, 4",
              quantity: "4",
              number_of_repeats_authorised: "0",
              patient_instructions: "As directed",
            },
          ],
        },
        requestId: "req_scripts",
        pagination: { count: 1, hasNext: false, limit: 20, offset: 0, lastKey: null },
      }), { status: 200 }))

    vi.stubGlobal("fetch", fetchMock)

    const result = await getPatientPrescriptions({
      userId: "parchment-user-1",
      patientId: "parchment-patient-1",
    })

    expect(result.prescriptions).toHaveLength(1)
    expect(result.prescriptions[0].item_name).toBe("Sildenafil 100 mg tablet, 4")
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/users/parchment-user-1/patients/parchment-patient-1/prescriptions?limit=20`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-for-doctor",
          "x-organization-secret": env.PARCHMENT_ORGANIZATION_SECRET,
        }),
      }),
    )
  })

  it("updates an existing patient before prescribing using the logged-in Parchment user identity", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { accessToken: "token-for-update", expiresIn: 21600 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        message: "Patient updated successfully",
        data: {
          patient_id: "parchment-patient-1",
          given_name: "Jane",
          family_name: "Smith",
          phone: "0412345678",
        },
        requestId: "req_update",
      }), { status: 200 }))

    vi.stubGlobal("fetch", fetchMock)

    const result = await updatePatient("parchment-user-1", "parchment-patient-1", {
      given_name: "Jane",
      family_name: "Smith",
      phone: "0412345678",
      australian_address: {
        street_number: "1",
        street_name: "Test Street",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000",
      },
    })

    expect(result.requestId).toBe("req_update")
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${env.PARCHMENT_API_URL}/v1/token`,
      expect.objectContaining({
        body: JSON.stringify({
          grantType: "client_credentials",
          scope: ["update:patient", "read:patient"],
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/users/parchment-user-1/patients/parchment-patient-1`,
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer token-for-update",
          "x-organization-secret": env.PARCHMENT_ORGANIZATION_SECRET,
        }),
      }),
    )
  })

  it("does not reuse a cached token when the same user requests different scopes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { accessToken: "token-for-validate", expiresIn: 21600 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { validated: true },
        requestId: "req_validate",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { accessToken: "token-for-update", expiresIn: 21600 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        message: "Patient updated successfully",
        data: { patient_id: "parchment-patient-1" },
        requestId: "req_update",
      }), { status: 200 }))

    vi.stubGlobal("fetch", fetchMock)

    await validateIntegration("parchment-user-1")
    await updatePatient("parchment-user-1", "parchment-patient-1", {
      given_name: "Jane",
      family_name: "Smith",
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${env.PARCHMENT_API_URL}/v1/token`,
      expect.objectContaining({
        body: JSON.stringify({
          grantType: "client_credentials",
          scope: ["update:patient", "read:patient"],
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/users/parchment-user-1/patients/parchment-patient-1`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token-for-update",
        }),
      }),
    )
  })

  it("does not expose Parchment error bodies or patient identifiers in thrown errors or Sentry extras", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { accessToken: "token-for-create", expiresIn: 21600 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: "Rejected patient payload for 0400000000 / medicare 1111111111",
        patient_id: "parchment-patient-secret",
      }), { status: 422 }))

    vi.stubGlobal("fetch", fetchMock)

    await expect(createPatient("parchment-user-1", {
      given_name: "Test",
      family_name: "Patient",
      date_of_birth: "1990-01-01",
      sex: "M",
      partner_patient_id: "profile-secret",
      phone: "0400000000",
      medicare_card_number: "1111111111",
      medicare_irn: "1",
      medicare_valid_to: "2029-05-01",
    })).rejects.toThrow("Parchment create patient failed: 422")

    const captured = vi.mocked(Sentry.captureException).mock.calls.at(-1)
    expect(captured).toBeDefined()
    expect(JSON.stringify(captured)).not.toContain("0400000000")
    expect(JSON.stringify(captured)).not.toContain("1111111111")
    expect(JSON.stringify(captured)).not.toContain("parchment-patient-secret")
    expect(JSON.stringify(captured)).not.toContain("profile-secret")
    expect(JSON.stringify(captured)).toContain("responseBytes")
  })

  it("runs a user lifecycle through create, update, role update, disable, and enable endpoints", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { accessToken: "token-for-create-user", expiresIn: 21600 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 201,
        message: "User created successfully",
        data: { user_id: "parchment-user-new" },
        requestId: "req_create_user",
      }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        data: { accessToken: "token-for-update-user", expiresIn: 21600 },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        message: "User updated successfully",
        data: { user_id: "parchment-user-new" },
        requestId: "req_update_user",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        message: "User roles updated successfully",
        data: { user_id: "parchment-user-new", access_roles: ["admin", "provider"] },
        requestId: "req_update_roles",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        message: "User disabled successfully",
        data: { user_id: "parchment-user-new" },
        requestId: "req_disable_user",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        statusCode: 200,
        message: "User enabled successfully",
        data: { user_id: "parchment-user-new" },
        requestId: "req_enable_user",
      }), { status: 200 }))

    vi.stubGlobal("fetch", fetchMock)

    const created = await createUser("parchment-admin-user", {
      given_name: "Conformance",
      family_name: "Prescriber",
      email: "conformance.prescriber@example.test",
      partner_user_id: "instantmed-conformance-prescriber-1",
      access_roles: ["provider"],
      date_of_birth: "1980-03-15",
      sex: "F",
      phone: "0412345678",
      hpii_number: "8003614900029560",
      prescriber_type: "M",
      prescriber_number: "1234567",
      qualifications: "MBBS",
      title: "Dr",
    })
    const updated = await updateUser("parchment-admin-user", created.user_id, {
      given_name: "Conformance Updated",
      family_name: "Prescriber",
      phone: "0412345679",
    })
    const roles = await updateUserRoles("parchment-admin-user", created.user_id, ["admin", "provider"])
    const disabled = await disableUser("parchment-admin-user", created.user_id)
    const enabled = await enableUser("parchment-admin-user", created.user_id)

    expect(created.requestId).toBe("req_create_user")
    expect(updated.requestId).toBe("req_update_user")
    expect(roles.access_roles).toEqual(["admin", "provider"])
    expect(disabled.message).toBe("User disabled successfully")
    expect(enabled.message).toBe("User enabled successfully")
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${env.PARCHMENT_API_URL}/v1/token`,
      expect.objectContaining({
        body: JSON.stringify({
          grantType: "client_credentials",
          scope: ["create:user"],
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/users`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-for-create-user",
          "x-organization-secret": env.PARCHMENT_ORGANIZATION_SECRET,
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${env.PARCHMENT_API_URL}/v1/token`,
      expect.objectContaining({
        body: JSON.stringify({
          grantType: "client_credentials",
          scope: ["update:user"],
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/users/parchment-user-new`,
      expect.objectContaining({ method: "PUT" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/users/parchment-user-new/roles`,
      expect.objectContaining({ method: "PUT" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/users/parchment-user-new/disable`,
      expect.objectContaining({ method: "PUT" }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      `${env.PARCHMENT_API_URL}/v1/organizations/${env.PARCHMENT_ORGANIZATION_ID}/users/parchment-user-new/enable`,
      expect.objectContaining({ method: "PUT" }),
    )
  })
})
