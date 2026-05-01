import { describe, expect, it } from "vitest"

import {
  scrubPHIFromObject,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
} from "@/lib/observability/scrub-phi"

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
      request: {
        headers: {
          Authorization: "Bearer secret",
          Cookie: "session=secret",
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
    expect(serialized).not.toContain("patient@example.test")
    expect(serialized).not.toContain("0400000000")
    expect(serialized).not.toContain("1990-01-01")
    expect(serialized).not.toContain("intake-sensitive-id")
    expect(serialized).not.toContain("user-sensitive-id")
    expect(serialized).not.toContain("patient-sensitive-id")
    expect(event.request?.headers).toEqual({ "user-agent": "Vitest" })
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
})
