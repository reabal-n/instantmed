import { describe, expect, it } from "vitest"

import type { ServerDraftRecord } from "@/lib/request/server-draft"
import {
  getServerDraftRecoveryDecision,
  stripDraftSessionFromUrl,
} from "@/lib/request/server-draft-recovery"

const SESSION_ID = "11111111-1111-4111-8111-111111111111"

function draft(overrides: Partial<ServerDraftRecord> = {}): ServerDraftRecord {
  return {
    sessionId: SESSION_ID,
    serviceType: "med-cert",
    currentStepId: "symptoms",
    answers: { certType: "work", symptomDetails: "Headache" },
    identity: {
      email: "patient@example.com",
      firstName: "Pat",
      lastName: "Example",
      phone: "0400000000",
      dob: "1990-05-15",
    },
    updatedAt: "2026-07-16T01:00:00.000Z",
    expiresAt: "2026-07-17T01:00:00.000Z",
    ...overrides,
  }
}

describe("server draft recovery decision", () => {
  it("accepts a matching active route and canonicalizes prescription state", () => {
    const result = getServerDraftRecoveryDecision({
      draft: draft({
        serviceType: "prescription",
        currentStepId: "medication-history",
        answers: { medications: [{ name: "Existing medicine" }] },
      }),
      initialService: "repeat-script",
      now: Date.parse("2026-07-16T02:00:00.000Z"),
    })

    expect(result).toEqual({
      ok: true,
      serviceType: "repeat-script",
      consultSubtype: undefined,
    })
  })

  it("accepts only the matching active consult subtype", () => {
    const active = draft({
      serviceType: "consult",
      currentStepId: "ed-health",
      answers: { consultSubtype: "ed", takesNitrates: true },
    })

    expect(
      getServerDraftRecoveryDecision({
        draft: active,
        initialService: "consult",
        initialSubtype: "ed",
        now: Date.parse("2026-07-16T02:00:00.000Z"),
      }),
    ).toEqual({ ok: true, serviceType: "consult", consultSubtype: "ed" })

    expect(
      getServerDraftRecoveryDecision({
        draft: active,
        initialService: "consult",
        initialSubtype: "hair_loss",
        now: Date.parse("2026-07-16T02:00:00.000Z"),
      }),
    ).toEqual({ ok: false, reason: "route_mismatch" })
  })

  it("fails closed for a gated women's-health child pathway", () => {
    const result = getServerDraftRecoveryDecision({
      draft: draft({
        serviceType: "consult",
        currentStepId: "womens-health-assessment",
        answers: {
          consultSubtype: "womens_health",
          womensHealthOption: "ocp_repeat",
        },
      }),
      initialService: "consult",
      initialSubtype: "womens_health",
      now: Date.parse("2026-07-16T02:00:00.000Z"),
    })

    expect(result).toEqual({ ok: false, reason: "unresumable" })
  })

  it("fails closed for expired, malformed, or unresumable records", () => {
    expect(
      getServerDraftRecoveryDecision({
        draft: draft(),
        initialService: "med-cert",
        now: Date.parse("2026-07-18T00:00:00.000Z"),
      }),
    ).toEqual({ ok: false, reason: "expired" })

    expect(
      getServerDraftRecoveryDecision({
        draft: draft({ answers: [] as never }),
        initialService: "med-cert",
        now: Date.parse("2026-07-16T02:00:00.000Z"),
      }),
    ).toEqual({ ok: false, reason: "malformed" })

    expect(
      getServerDraftRecoveryDecision({
        draft: draft({
          serviceType: "consult",
          answers: { consultSubtype: "weight_loss" },
        }),
        initialService: "consult",
        initialSubtype: "weight_loss",
        now: Date.parse("2026-07-16T02:00:00.000Z"),
      }),
    ).toEqual({ ok: false, reason: "unresumable" })
  })

  it("removes only the bearer token while preserving attribution", () => {
    const clean = stripDraftSessionFromUrl(
      `https://instantmed.com.au/request?service=consult&subtype=ed&d=${SESSION_ID}&utm_source=recovery_email&utm_medium=email#top`,
    )
    const parsed = new URL(clean, "https://instantmed.com.au")

    expect(parsed.pathname).toBe("/request")
    expect(parsed.searchParams.has("d")).toBe(false)
    expect(parsed.searchParams.get("service")).toBe("consult")
    expect(parsed.searchParams.get("subtype")).toBe("ed")
    expect(parsed.searchParams.get("utm_source")).toBe("recovery_email")
    expect(parsed.searchParams.get("utm_medium")).toBe("email")
    expect(parsed.hash).toBe("#top")
  })
})
