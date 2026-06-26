import { describe, expect, it } from "vitest"

import {
  type DoctorPatientCreateInput,
  validateDoctorPatientCreateInput,
} from "@/lib/doctor/doctor-patient-create"

const validInput: DoctorPatientCreateInput = {
  firstName: "Glenn",
  lastName: "James",
  email: "GLENN.JAMES@example.com",
  dateOfBirth: "1990-04-12",
  sex: "M",
  phone: "0450722549",
  medicareNumber: "1111111111",
  medicareIrn: "1",
  medicareExpiry: "2029-05",
  addressLine1: "12 Test Street",
  suburb: "Goulburn",
  state: "NSW",
  postcode: "2580",
}

describe("validateDoctorPatientCreateInput", () => {
  it("normalizes complete doctor-entered patients for Parchment sync", () => {
    const result = validateDoctorPatientCreateInput(validInput)

    expect(result.valid).toBe(true)
    expect(result.value).toMatchObject({
      fullName: "Glenn James",
      firstName: "Glenn",
      lastName: "James",
      email: "glenn.james@example.com",
      profileUpdates: {
        date_of_birth: "1990-04-12",
        sex: "M",
        phone: "+61450722549",
        medicare_number: "1111111111",
        medicare_irn: 1,
        medicare_expiry: "2029-05-01",
        address_line1: "12 Test Street",
        suburb: "Goulburn",
        state: "NSW",
        postcode: "2580",
      },
    })
  })

  it("requires first and last name plus Parchment prescribing identity fields", () => {
    const result = validateDoctorPatientCreateInput({
      ...validInput,
      firstName: "Glenn",
      lastName: "",
      email: "bad-email",
      medicareIrn: "0",
      postcode: "3000",
    })

    expect(result.valid).toBe(false)
    expect(result.fieldErrors.lastName).toBe("Enter the patient's last name.")
    expect(result.fieldErrors.email).toBe("Enter a valid patient email address.")
    expect(result.fieldErrors.medicareIrn).toBe("Enter the Medicare IRN as one digit from 1 to 9.")
    expect(result.fieldErrors.postcode).toContain("Postcode 3000")
  })

  it("does not require Medicare expiry when the card number and IRN are valid", () => {
    const result = validateDoctorPatientCreateInput({
      ...validInput,
      medicareExpiry: "",
    })

    expect(result.valid).toBe(true)
    expect(result.value?.profileUpdates).not.toHaveProperty("medicare_expiry")
  })
})
