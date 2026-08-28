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

  it("preserves the PHI-free voice record correlation ID", () => {
    expect(sanitizeAuditMetadata({
      voice_record_id: "9d452fcc-6e45-41cc-bb57-32fa34d04e2f",
    })).toEqual({
      voice_record_id: "9d452fcc-6e45-41cc-bb57-32fa34d04e2f",
    })
  })
})
