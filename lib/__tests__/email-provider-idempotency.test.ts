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

  it("uses the same durable key for the immediate sender and outbox dispatcher", () => {
    const source = readFileSync(join(process.cwd(), "lib/email/send-email.ts"), "utf8")

    expect(source).toContain("buildResendEmailIdempotencyKey(outboxId)")
    expect(source).toContain("buildResendEmailIdempotencyKey(row.id)")
    expect(source.match(/"Idempotency-Key": providerIdempotencyKey/g)).toHaveLength(2)
    expect(source).toContain("freezeResendProviderPayload(body)")
    expect(source).toContain("readFrozenResendProviderPayload(row.metadata)")
  })

  it("scopes new partial recoveries to the non-bearer tracking ID", () => {
    const first = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "Patient@patientmail.com.au",
      metadata: {
        recovery_tracking_id: "tracking-1",
        draft_idempotency_hash: "ignored-legacy-digest",
      },
    })
    const same = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "patient@patientmail.com.au",
      metadata: {
        recovery_tracking_id: "tracking-1",
      },
    })
    const different = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "patient@patientmail.com.au",
      metadata: {
        recovery_tracking_id: "tracking-2",
      },
    })

    expect(first).toBe(same)
    expect(different).not.toBe(first)
  })

  it("retains the inherited digest scope only when no tracking ID exists", () => {
    const legacy = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "patient@patientmail.com.au",
      metadata: {
        draft_idempotency_hash: "legacy-digest",
      },
    })
    const changedLegacy = buildEmailOutboxIdempotencyKey({
      email_type: "partial_intake_recovery",
      to_email: "patient@patientmail.com.au",
      metadata: {
        draft_idempotency_hash: "another-legacy-digest",
      },
    })

    expect(legacy).toMatch(/^email:partial_intake_recovery:/)
    expect(changedLegacy).not.toBe(legacy)
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
