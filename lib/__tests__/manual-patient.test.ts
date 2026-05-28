import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildManualPatientDuplicateLookup,
  buildManualPatientProfileCreate,
} from "@/lib/doctor/manual-patient"

const VALID_INPUT = {
  fullName: "  Priya   Shah  ",
  email: " PRIYA.SHAH@Example.COM ",
  dateOfBirth: "1990-02-14",
  sex: "female",
  phone: "0400 000 000",
  medicareNumber: "2123 45670 1",
  medicareIrn: "1",
  medicareExpiry: "12/2030",
  addressLine1: "12 King Street",
  suburb: "Sydney",
  state: "nsw",
  postcode: "2000",
}

const manualPatientActionSource = readFileSync(
  join(process.cwd(), "app/actions/manual-patient.ts"),
  "utf8",
)
const patientDetailClientSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/[id]/patient-detail-client.tsx"),
  "utf8",
)
const doctorPatientActionsSource = readFileSync(
  join(process.cwd(), "app/doctor/patients/actions.ts"),
  "utf8",
)
const profilesSource = readFileSync(
  join(process.cwd(), "lib/data/profiles.ts"),
  "utf8",
)

function actionBody(name: string): string {
  const start = manualPatientActionSource.indexOf(`export async function ${name}`)
  expect(start).toBeGreaterThanOrEqual(0)

  const nextExport = manualPatientActionSource.indexOf("\nexport async function ", start + 1)
  return manualPatientActionSource.slice(start, nextExport === -1 ? manualPatientActionSource.length : nextExport)
}

describe("manual patient creation", () => {
  it("builds a Parchment-ready patient profile insert from validated input", () => {
    const result = buildManualPatientProfileCreate(VALID_INPUT)

    expect(result.valid).toBe(true)
    expect(result.profile).toEqual({
      auth_user_id: null,
      role: "patient",
      full_name: "Priya Shah",
      first_name: "Priya",
      last_name: "Shah",
      email: "priya.shah@example.com",
      email_verified: false,
      onboarding_completed: true,
      date_of_birth: "1990-02-14",
      sex: "F",
      phone: "+61400000000",
      medicare_number: "2123456701",
      medicare_irn: 1,
      medicare_expiry: "2030-12-01",
      ihi_number: null,
      address_line1: "12 King Street",
      suburb: "Sydney",
      state: "NSW",
      postcode: "2000",
    })
  })

  it("rejects incomplete identity before the action can insert a profile", () => {
    const result = buildManualPatientProfileCreate({
      ...VALID_INPUT,
      fullName: " ",
      email: "not-an-email",
      phone: "123",
      medicareNumber: "123",
      postcode: "9999",
    })

    expect(result.valid).toBe(false)
    expect(result.profile).toBeNull()
    expect(result.fieldErrors).toMatchObject({
      fullName: "Enter the patient's legal name.",
      email: "Enter a valid email address.",
      phone: expect.any(String),
      medicareNumber: expect.any(String),
      postcode: expect.any(String),
    })
  })

  it("builds stable duplicate lookup keys for email, phone, and name plus DOB", () => {
    expect(buildManualPatientDuplicateLookup(VALID_INPUT)).toEqual({
      normalizedEmail: "priya.shah@example.com",
      normalizedPhone: "0400000000",
      normalizedNameDob: "priya shah|1990-02-14",
    })
  })

  it("keeps patient-profile Parchment sync and prescription refresh guarded", () => {
    const createBody = actionBody("createManualPatientAction")
    const prescribeBody = actionBody("getPatientParchmentPrescribeUrlAction")
    const syncBody = actionBody("syncPatientParchmentProfileAction")
    const refreshBody = actionBody("refreshPatientParchmentPrescriptionsAction")

    expect(createBody).toContain("await validateIntegration(callerParchmentUserId)")
    expect(createBody.indexOf("await validateIntegration(callerParchmentUserId)")).toBeLessThan(
      createBody.indexOf(".insert(encryptProfilePhi({"),
    )

    expect(prescribeBody).toContain("await validateIntegration(callerParchmentUserId)")
    expect(prescribeBody).toContain("getParchmentPatientIdentityIssues(patientProfile)")
    expect(prescribeBody.indexOf("getParchmentPatientIdentityIssues(patientProfile)")).toBeLessThan(
      prescribeBody.indexOf("await validateIntegration(callerParchmentUserId)"),
    )
    expect(prescribeBody.indexOf("await validateIntegration(callerParchmentUserId)")).toBeLessThan(
      prescribeBody.indexOf("syncPatientToParchment("),
    )

    expect(syncBody).toContain('requireRoleOrNull(["doctor", "admin"])')
    expect(syncBody).toContain("checkServerActionRateLimit(")
    expect(syncBody).toContain("await validateIntegration(callerParchmentUserId)")
    expect(syncBody).toContain("syncPatientToParchment(")

    expect(refreshBody).toContain('requireRoleOrNull(["doctor", "admin"])')
    expect(refreshBody).toContain("checkServerActionRateLimit(")
    expect(refreshBody).toContain("await validateIntegration(callerParchmentUserId)")
    expect(refreshBody).toContain("syncParchmentPrescriptionListToPms(")
    expect(refreshBody).toContain("prescriberProfileId: authResult.profile.id")
    expect(refreshBody).toContain("overwriteNullableLinks: false")
  })

  it("surfaces patient-profile Parchment sync and refresh controls", () => {
    expect(patientDetailClientSource).toContain("syncPatientParchmentProfileAction")
    expect(patientDetailClientSource).toContain("refreshPatientParchmentPrescriptionsAction")
    // Phase 4 of dashboard remaster (2026-05-12): the "Prescriber account
    // not linked" warning + "Refresh prescriptions" CTA moved out of the
    // standalone Prescribing Workspace card. Equivalent affordances live
    // in the compact Prescribing strip (`Prescriber not linked` chip +
    // `Refresh` button) and link to the same identity-settings anchor.
    expect(patientDetailClientSource).toContain("Prescriber not linked")
    expect(patientDetailClientSource).toContain("`${STAFF_IDENTITY_HREF}#parchment-account`")
    expect(patientDetailClientSource).toContain("Resync identity")
    expect(patientDetailClientSource).toContain("Last identity sync")
    expect(patientDetailClientSource).toContain("IHI used for prescribing")
    expect(patientDetailClientSource).toContain("Refresh")
  })

  it("clears encrypted PHI mirrors when prescribing identifiers are cleared", () => {
    expect(doctorPatientActionsSource).toContain('"medicare_number" in input')
    expect(doctorPatientActionsSource).toContain("medicare_number_encrypted: input.medicare_number ? encryptField(input.medicare_number) : null")
    expect(doctorPatientActionsSource).toContain('"ihi_number" in input')
    expect(doctorPatientActionsSource).toContain("ihi_number_encrypted: input.ihi_number ? encryptField(input.ihi_number) : null")
    expect(profilesSource).toContain('if ("medicare_number" in data)')
    expect(profilesSource).toContain("encrypted.medicare_number_encrypted = data.medicare_number")
    expect(profilesSource).toContain(": null")
    expect(profilesSource).toContain('if ("ihi_number" in data)')
    expect(profilesSource).toContain("encrypted.ihi_number_encrypted = data.ihi_number")
  })
})
