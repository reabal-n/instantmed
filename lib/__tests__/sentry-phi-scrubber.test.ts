import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  scrubPHIFromObject,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentryLog,
  scrubSentrySpan,
  scrubSentryTransaction,
} from "@/lib/observability/scrub-phi"

function createSentryFormattedLogMessage(value: string) {
  return Object.assign(Object(`Queue search for ${value}`), {
    __sentry_template_string__: "Queue search for %s",
    __sentry_template_values__: [value],
  })
}

describe("Sentry PHI scrubber", () => {
  it("redacts PHI-shaped keys, not just PHI-looking values", () => {
    expect(scrubPHIFromObject({
      content: "Patient free text",
      dateOfBirth: "1990-01-01",
      recipientName: "Patient Name",
      patientEmail: "patient@example.test",
      serviceType: "certificate",
    })).toEqual({
      content: "[REDACTED]",
      dateOfBirth: "[REDACTED]",
      recipientName: "[REDACTED]",
      patientEmail: "[REDACTED]",
      serviceType: "certificate",
    })
  })

  it("scrubs complete Sentry events before they leave the app", () => {
    const event = scrubSentryEvent({
      message: "Email bounce for patient@example.test",
      exception: {
        values: [
          { value: "Download failed for 47e24318-089e-4658-885f-4b9049b69a35" },
        ],
      },
      request: {
        cookies: {
          "__Host-auth": "session-cookie-secret",
        },
        headers: {
          Authorization: "Bearer secret",
          Cookie: "session=secret",
          Referer: "https://chatgpt.com/c/thread-99?prompt=health",
          "x-forwarded-for": "203.0.113.10",
          "user-agent": "Vitest",
        },
        url: "https://instantmed.test/patient/messages?email=patient@example.test",
        data: { body: "Please call 0400000000", intakeId: "intake-sensitive-id" },
        query_string: "dob=1990-01-01",
      },
      tags: {
        intake_id: "intake-sensitive-id",
        service_type: "certificate",
      },
      user: {
        id: "user-sensitive-id",
        email: "patient@example.test",
      },
      extra: {
        recipientName: "Patient Name",
        message: "Patient says 0400000000",
        subject: "Patient, your medical certificate is ready",
        referrer: "https://chatgpt.com/c/thread-99?prompt=health",
      },
      breadcrumbs: [
        {
          message: "Failed for patient@example.test",
          data: { patientId: "patient-sensitive-id", route: "/patient/messages" },
        },
      ],
    })

    const serialized = JSON.stringify(event)

    expect(serialized).not.toContain("secret")
    expect(serialized).not.toContain("session-cookie-secret")
    expect(serialized).not.toContain("patient@example.test")
    expect(serialized).not.toContain("0400000000")
    expect(serialized).not.toContain("1990-01-01")
    expect(serialized).not.toContain("medical certificate is ready")
    expect(serialized).not.toContain("intake-sensitive-id")
    expect(serialized).not.toContain("user-sensitive-id")
    expect(serialized).not.toContain("patient-sensitive-id")
    expect(serialized).not.toContain("47e24318")
    // Referrer URLs (header + object key) are dropped whole — paths/query
    // strings can carry navigation state no error report needs.
    expect(serialized).not.toContain("thread-99")
    expect(event.message).toBe("Email bounce for [EMAIL_REDACTED]")
    expect(event.exception?.values?.[0]?.value).toContain("[ID_REDACTED]")
    expect(event.request?.headers).toEqual({ "user-agent": "Vitest" })
    expect(event.request?.cookies).toBe("[REDACTED]")
    expect(event.tags?.service_type).toBe("certificate")
  })

  it("scrubs breadcrumbs without discarding useful non-PHI route context", () => {
    expect(scrubSentryBreadcrumb({
      message: "Failed for patient@example.test",
      data: {
        route: "/patient/messages",
        patientId: "patient-sensitive-id",
      },
    })).toEqual({
      message: "Failed for [EMAIL_REDACTED]",
      data: {
        route: "/patient/messages",
        patientId: "[REDACTED]",
      },
    })
  })

  it("redacts request identifiers embedded in URLs and paths", () => {
    const event = scrubSentryEvent({
      request: {
        url: "https://instantmed.test/patient/intakes/intake-sensitive-id?intake_id=intake-query-id",
      },
      extra: {
        path: "/track/intake-sensitive-id",
        redirect: "/auth/post-signin?intake_id=intake-query-id",
      },
    })

    const serialized = JSON.stringify(event)

    expect(serialized).not.toContain("intake-sensitive-id")
    expect(serialized).not.toContain("intake-query-id")
    expect(event.request?.url).toContain("[ID_REDACTED]")
    expect(event.extra?.path).toBe("/track/[ID_REDACTED]")
  })

  it("redacts one-time auth secrets carried in URL fragments", () => {
    const event = scrubSentryEvent({
      request: {
        url: "https://instantmed.test/auth/confirm#token_hash=one-time-secret&type=recovery",
      },
      breadcrumbs: [{
        data: {
          to: "/auth/confirm#access_token=session-secret&type=magiclink",
        },
      }],
    })

    const serialized = JSON.stringify(event)
    expect(serialized).not.toContain("one-time-secret")
    expect(serialized).not.toContain("session-secret")
    expect(event.request?.url).toContain("token_hash=[REDACTED]")
  })

  it("redacts Stripe Checkout Session capabilities from URLs", () => {
    const event = scrubSentryEvent({
      request: {
        url: "https://instantmed.test/auth/complete-account?intake_id=11111111-1111-4111-8111-111111111111&session_id=cs_sensitive",
      },
    })

    const serialized = JSON.stringify(event)
    expect(serialized).not.toContain("cs_sensitive")
    expect(event.request?.url).toContain("session_id=[REDACTED]")
  })

  it("redacts the one-use review traversal capability from Sentry URLs and query objects", () => {
    const clickKey = "A".repeat(43)
    const event = scrubSentryEvent({
      request: {
        url: `https://instantmed.test/api/review-redirect?review_click_key=${clickKey}&utm_source=email`,
        query_string: {
          review_click_key: clickKey,
          utm_source: "email",
        },
      },
    })

    const serialized = JSON.stringify(event)
    expect(serialized).not.toContain(clickKey)
    expect(event.request?.url).toContain("review_click_key=[REDACTED]")
    expect(event.request?.query_string).toEqual({
      review_click_key: "[REDACTED]",
      utm_source: "email",
    })
  })

  it("redacts role and clinician identifiers from tags and extras", () => {
    const event = scrubSentryEvent({
      tags: {
        actor_id: "actor-sensitive-id",
        doctor_id: "doctor-sensitive-id",
        targetDoctorId: "target-doctor-sensitive-id",
        service_type: "certificate",
      },
      extra: {
        profile_id: "profile-sensitive-id",
        requestId: "request-sensitive-id",
      },
    })

    const serialized = JSON.stringify(event)

    expect(serialized).not.toContain("actor-sensitive-id")
    expect(serialized).not.toContain("doctor-sensitive-id")
    expect(serialized).not.toContain("target-doctor-sensitive-id")
    expect(serialized).not.toContain("profile-sensitive-id")
    expect(serialized).not.toContain("request-sensitive-id")
    expect(event.tags?.service_type).toBe("certificate")
  })

  it("redacts certificate credentials and document identifiers by key", () => {
    const event = scrubSentryEvent({
      tags: {
        certificate_ref: "IM-WORK-20260501-12345678",
        certificateNumber: "MC-2026-12345678",
      },
      extra: {
        verificationCode: "MC-ABC123-XYZ",
      },
      breadcrumbs: [
        {
          message: "Atomic approval transaction",
          data: {
            certificateRef: "IM-WORK-20260501-12345678",
            certificateNumber: "MC-2026-12345678",
            verification_code: "MC-ABC123-XYZ",
          },
        },
      ],
    })

    const serialized = JSON.stringify(event)

    expect(serialized).not.toContain("IM-WORK")
    expect(serialized).not.toContain("MC-2026")
    expect(serialized).not.toContain("MC-ABC123")
    expect(event.tags?.certificate_ref).toBe("[REDACTED]")
    expect(event.tags?.certificateNumber).toBe("[REDACTED]")
    expect(event.extra?.verificationCode).toBe("[REDACTED]")
  })

  it("redacts plain-name search terms across private requests, transactions, spans, and logs", () => {
    const encodedName = "Jos%C3%A9+Smith"
    const encodedJsonName = "Jos%C3%A9%20Smith"
    const plainName = "José Smith"
    const transaction = scrubSentryTransaction({
      type: "transaction",
      transaction: `/dashboard?q=${encodedName}&status=review`,
      request: {
        url: `https://instantmed.test/dashboard?q=${encodedName}&status=review`,
        query_string: `q=${encodedName}&status=review`,
        data: { query: plainName, page: 1 },
      },
      breadcrumbs: [{ data: { to: `/dashboard?q=${encodedName}&status=review` } }],
      spans: [{
        description: `POST /dashboard?q=${encodedName}`,
        data: { searchTerm: plainName, status: "review" },
      }],
    })
    const span = scrubSentrySpan({
      description: `navigation /dashboard?q=${encodedName}`,
      data: {
        search_query: plainName,
        "http.request.body": `{"query":"${plainName}","status":"review"}`,
        encodedPayload: `%7B%22query%22%3A%22${encodedJsonName}%22%7D`,
        status: "review",
      },
    })
    const log = scrubSentryLog({
      level: "info",
      message: `Queue search q=${encodedName}`,
      attributes: { q: plainName, status: "review" },
    })
    const parameterizedLog = scrubSentryLog({
      level: "info",
      // Sentry.logger.fmt returns this boxed-String shape, not a plain object.
      message: createSentryFormattedLogMessage(plainName),
      attributes: {
        "sentry.message.parameter.0": plainName,
        "user.name": plainName,
        status: "review",
      },
    })

    const serialized = JSON.stringify({ transaction, span, log, parameterizedLog })
    expect(serialized).not.toContain(encodedName)
    expect(serialized).not.toContain(encodedJsonName)
    expect(serialized).not.toContain(plainName)
    expect(transaction.request?.data).toBe("[REDACTED]")
    expect(parameterizedLog.message).toBe("Queue search for %s")
    expect(serialized).toContain("status")
    expect(serialized).toContain("review")
  })

  it("redacts decoded search text and Sentry logentry parameters", () => {
    const event = scrubSentryEvent({
      message: "Queue search q=Patient Smith failed",
      logentry: {
        message: "Queue search for %s",
        params: ["Patient Smith"],
      },
      transaction: "/dashboard?q=Patient Smith&status=review",
    })

    const serialized = JSON.stringify(event)
    expect(serialized).not.toContain("Patient Smith")
    expect(event.message).toBe("Queue search q=[REDACTED]")
    expect(event.logentry?.message).toBe("Queue search for %s")
    expect(event.logentry?.params).toEqual(["[REDACTED]"])
  })

  it("redacts search values from tuple-form Sentry query strings", () => {
    const event = scrubSentryEvent({
      request: {
        url: "https://instantmed.test/dashboard?status=review",
        query_string: [
          ["q", "Patient Smith"],
          ["status", "review"],
        ],
      },
    })

    expect(event.request?.query_string).toEqual([
      ["q", "[REDACTED]"],
      ["status", "review"],
    ])
    expect(JSON.stringify(event)).not.toContain("Patient Smith")
  })

  it("wires every Sentry payload family through the shared PHI scrubber", () => {
    for (const file of ["instrumentation.ts", "instrumentation-client.ts"]) {
      const source = readFileSync(join(process.cwd(), file), "utf8")
      expect(source).toContain("beforeSendTransaction")
      expect(source).toContain("scrubSentryTransaction")
      expect(source).toContain("beforeSendSpan")
      expect(source).toContain("scrubSentrySpan")
      expect(source).toContain("beforeSendLog")
      expect(source).toContain("scrubSentryLog")
    }
  })
})
