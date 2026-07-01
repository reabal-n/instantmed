import { describe, expect, it } from "vitest"

import {
  filterQuietCronOwnedEmailFailures,
  isCronOwnedNonReconstructableEmailType,
  isQuietCronOwnedEmailFailure,
} from "@/lib/email/quiet-failures"

describe("email quiet-failure classification", () => {
  it("recognizes cron-owned non-reconstructable email types", () => {
    expect(isCronOwnedNonReconstructableEmailType("partial_intake_recovery")).toBe(true)
    expect(isCronOwnedNonReconstructableEmailType("abandoned_checkout")).toBe(true)
    expect(isCronOwnedNonReconstructableEmailType("med_cert_patient")).toBe(false)
    expect(isCronOwnedNonReconstructableEmailType(null)).toBe(false)
  })

  it("only suppresses the expected unsupported-type dispatcher bookkeeping row", () => {
    expect(
      isQuietCronOwnedEmailFailure({
        email_type: "partial_intake_recovery",
        status: "failed",
        error_message: "Unsupported email_type: partial_intake_recovery",
      }),
    ).toBe(true)

    expect(
      isQuietCronOwnedEmailFailure({
        email_type: "partial_intake_recovery",
        status: "failed",
        error_message: "Resend rejected recipient",
      }),
    ).toBe(false)

    expect(
      isQuietCronOwnedEmailFailure({
        email_type: "med_cert_patient",
        status: "failed",
        error_message: "Unsupported email_type: med_cert_patient",
      }),
    ).toBe(false)
  })

  it("filters quiet failures while retaining provider failures and pending work", () => {
    const rows = [
      {
        id: "quiet",
        email_type: "partial_intake_recovery",
        status: "failed",
        error_message: "Unsupported email_type: partial_intake_recovery",
      },
      {
        id: "provider-failure",
        email_type: "partial_intake_recovery",
        status: "failed",
        error_message: "Resend rejected recipient",
      },
      {
        id: "pending",
        email_type: "abandoned_checkout",
        status: "pending",
        error_message: null,
      },
    ]

    expect(filterQuietCronOwnedEmailFailures(rows).map((row) => row.id)).toEqual([
      "provider-failure",
      "pending",
    ])
  })
})
