import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { buildResendEmailIdempotencyKey } from "@/lib/email/send/idempotency"
import {
  freezeResendProviderPayload,
  readFrozenResendProviderPayload,
} from "@/lib/email/send/provider-payload"

describe("email provider idempotency", () => {
  it("binds every provider attempt to its durable outbox row", () => {
    expect(buildResendEmailIdempotencyKey("outbox-row-id"))
      .toBe("instantmed-email/outbox-row-id")
  })

  it("rejects a missing outbox id", () => {
    expect(() => buildResendEmailIdempotencyKey(" ")).toThrow("outbox id")
  })

  it("uses the same durable key for the immediate sender and outbox dispatcher", () => {
    const source = readFileSync(join(process.cwd(), "lib/email/send-email.ts"), "utf8")

    expect(source).toContain("buildResendEmailIdempotencyKey(outboxId)")
    expect(source).toContain("buildResendEmailIdempotencyKey(row.id)")
    expect(source.match(/"Idempotency-Key": providerIdempotencyKey/g)).toHaveLength(2)
    expect(source).toContain("freezeResendProviderPayload(body)")
    expect(source).toContain("readFrozenResendProviderPayload(row.metadata)")
  })

  it("stores an encrypted exact provider payload for byte-stable replay", () => {
    const payload = {
      from: "InstantMed <support@instantmed.example>",
      to: ["patient@example.test"],
      subject: "Your certificate",
      html: "<p>Private certificate link</p>",
      text: "Private certificate link",
      tags: [{ name: "email_type", value: "med_cert_patient" }],
    }

    const encrypted = freezeResendProviderPayload(payload)

    expect(encrypted).not.toContain("Private certificate link")
    expect(readFrozenResendProviderPayload({ _provider_payload_enc: encrypted }))
      .toEqual(payload)
  })
})
