import { describe, expect, it } from "vitest"

import { sanitizeAuditMetadata } from "@/lib/security/sanitize-audit"

describe("sanitizeAuditMetadata", () => {
  it("redacts common PHI fields before audit metadata is persisted", () => {
    expect(sanitizeAuditMetadata({
      content: "Patient free-text message",
      dateOfBirth: "1990-01-01",
      birthDate: "1990-01-01",
      recipientName: "Patient Name",
      service_name: "Medical Certificate",
      intake_id: "intake_123",
    })).toEqual({
      content: "[REDACTED]",
      dateOfBirth: "[REDACTED]",
      birthDate: "[REDACTED]",
      recipientName: "[REDACTED]",
      service_name: "Medical Certificate",
      intake_id: "intake_123",
    })
  })
})
