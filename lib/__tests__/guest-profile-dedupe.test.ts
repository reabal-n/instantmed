import { describe, expect, it } from "vitest"

import { shouldReuseGuestProfileForCheckout } from "@/lib/stripe/guest-profile-dedupe"

describe("shouldReuseGuestProfileForCheckout", () => {
  it("reuses an unverified guest profile when email and identity evidence match", () => {
    expect(shouldReuseGuestProfileForCheckout(
      {
        email: "marcus@example.com",
        email_verified: false,
        full_name: "Marcus Pearson",
        date_of_birth: "2001-11-24",
        phone: "+61467326610",
      },
      {
        guestEmail: " Marcus@Example.com ",
        guestName: "marcus pearson",
        guestDateOfBirth: "2001-11-24",
        guestPhone: "0467 326 610",
      },
    )).toBe(true)
  })

  it("does not reuse an unverified guest profile when only the email matches", () => {
    expect(shouldReuseGuestProfileForCheckout(
      {
        email: "shared@example.com",
        email_verified: false,
        full_name: "Alex Patient",
        date_of_birth: "1990-01-01",
        phone: "0400000000",
      },
      {
        guestEmail: "shared@example.com",
        guestName: "Different Person",
        guestDateOfBirth: "1998-02-02",
        guestPhone: "0411111111",
      },
    )).toBe(false)
  })

  it("reuses a verified guest profile when the email matches", () => {
    expect(shouldReuseGuestProfileForCheckout(
      {
        email: "verified@example.com",
        email_verified: true,
        full_name: "Old Name",
        date_of_birth: null,
        phone: null,
      },
      {
        guestEmail: "verified@example.com",
        guestName: "Updated Name",
        guestDateOfBirth: "1995-05-05",
        guestPhone: "0499999999",
      },
    )).toBe(true)
  })
})
