import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { validateAnswersServerSide } from "@/lib/request/unified-checkout"

const identity = {
  email: "patient@example.com",
  fullName: "Pat Example",
  dateOfBirth: "1985-04-01",
  phone: "0412345678",
}

describe("medical certificate checkout contract", () => {
  it("accepts completed certificate checkout answers without allergy fields", () => {
    const answers = {
      certType: "work",
      duration: "1",
      startDate: "2026-05-04",
      symptoms: ["cold_flu"],
      symptomDetails: "Fever and sore throat since yesterday.",
      symptomDuration: "1 day",
      agreedToTerms: true,
      confirmedAccuracy: true,
    }

    expect(validateAnswersServerSide("med-cert", answers, identity)).toBeNull()
  })

  it("does not render the full certificate preview in the payment step", () => {
    const checkoutStepSource = readFileSync(
      join(process.cwd(), "components/request/steps/checkout-step.tsx"),
      "utf8",
    )

    expect(checkoutStepSource).not.toContain("CertPreviewCard")
    expect(checkoutStepSource).not.toContain("Preview of your certificate")
  })
})
