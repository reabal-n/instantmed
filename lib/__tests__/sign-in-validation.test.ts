import { describe, expect, it } from "vitest"

import { validateSignInCredentials } from "@/lib/auth/sign-in-validation"

describe("sign-in credential validation", () => {
  it("associates an invalid email error with email only", () => {
    expect(validateSignInCredentials("a@b", "password123")).toEqual({
      email: "Please enter a valid email address.",
      password: "",
    })
  })

  it("associates a missing password error with password only", () => {
    expect(validateSignInCredentials("patient@example.com", "")).toEqual({
      email: "",
      password: "Please enter your password.",
    })
  })

  it("normalizes valid email input before submission", () => {
    expect(validateSignInCredentials("  Patient@Example.COM ", "password123")).toEqual({
      email: "",
      password: "",
    })
  })
})
