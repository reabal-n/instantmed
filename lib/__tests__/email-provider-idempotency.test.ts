import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  buildEmailOutboxIdempotencyKey,
  buildResendEmailIdempotencyKey,
} from "@/lib/email/send/idempotency"
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

  it("scopes partial-recovery outbox keys to the draft tracking id", () => {
    const buildKey = (recoveryTrackingId: string) =>
      buildEmailOutboxIdempotencyKey({
        email_type: "partial_intake_recovery",
        to_email: "patient@example.test",
        metadata: { recovery_tracking_id: recoveryTrackingId },
      })

    const firstDraft = buildKey("11111111-1111-4111-8111-111111111111")
    const secondDraft = buildKey("22222222-2222-4222-8222-222222222222")

    expect(firstDraft).toMatch(/^email:partial_intake_recovery:/)
    expect(secondDraft).toMatch(/^email:partial_intake_recovery:/)
    expect(secondDraft).not.toBe(firstDraft)
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

  it("keeps partial-recovery bearer context inside the encrypted provider payload", () => {
    const sessionId = "11111111-1111-4111-8111-111111111111"
    const resumeUrl =
      `https://instantmed.example/request?service=med-cert&d=${sessionId}`
    const encrypted = freezeResendProviderPayload({
      from: "InstantMed <support@instantmed.example>",
      to: ["patient@example.test"],
      subject: "Continue your request",
      html: `<a href="${resumeUrl}">Continue</a>`,
      text: `Continue: ${resumeUrl}`,
    })
    const metadata = {
      recovery_tracking_id: "22222222-2222-4222-8222-222222222222",
      _provider_payload_enc: encrypted,
    }

    expect(Object.keys(metadata).sort()).toEqual([
      "_provider_payload_enc",
      "recovery_tracking_id",
    ])
    const plaintextMetadata = JSON.stringify(metadata)
    expect(plaintextMetadata).not.toContain(sessionId)
    expect(plaintextMetadata).not.toContain("session_id")
    expect(plaintextMetadata).not.toContain("draft_idempotency_hash")
    expect(plaintextMetadata).not.toContain("service_type")
    expect(plaintextMetadata).not.toContain("resumeUrl")
    expect(plaintextMetadata).not.toContain("/request?")

    const providerPayload = readFrozenResendProviderPayload(metadata)
    expect(providerPayload?.html).toContain(resumeUrl)
    expect(providerPayload?.text).toContain(resumeUrl)
  })
})
