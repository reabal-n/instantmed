import { describe, expect, it } from "vitest"

import { buildPartialIntakeRecoveryUrl } from "@/lib/email/recovery-links"

const APP_URL = "https://instantmed.com.au"
const SESSION_ID = "11111111-1111-4111-8111-111111111111"

function expectRecoveryParams(url: string, service: string) {
  const parsed = new URL(url)
  expect(parsed.searchParams.get("d")).toBe(SESSION_ID)
  expect(parsed.searchParams.get("utm_source")).toBe("recovery_email")
  expect(parsed.searchParams.get("utm_medium")).toBe("email")
  expect(parsed.searchParams.get("utm_campaign")).toBe("partial_intake_recovery")
  expect(parsed.searchParams.get("utm_content")).toBe(service)
}

describe("partial intake recovery URL builder", () => {
  it("builds attributed resume URLs for active request services", () => {
    const medCert = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { serviceType: "med-cert", sessionId: SESSION_ID },
    })
    expect(medCert).not.toBeNull()
    expect(new URL(medCert!).pathname).toBe("/request")
    expect(new URL(medCert!).searchParams.get("service")).toBe("med-cert")
    expectRecoveryParams(medCert!, "med-cert")

    const prescription = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { serviceType: "prescription", sessionId: SESSION_ID },
    })
    expect(prescription).not.toBeNull()
    expect(new URL(prescription!).pathname).toBe("/request")
    expect(new URL(prescription!).searchParams.get("service")).toBe("repeat-script")
    expectRecoveryParams(prescription!, "prescription")
  })

  it("preserves consult subtypes when the recovered draft has one", () => {
    const ed = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { consultSubtype: "ed", serviceType: "consult", sessionId: SESSION_ID },
    })
    expect(ed).not.toBeNull()
    expect(new URL(ed!).pathname).toBe("/request")
    expect(new URL(ed!).searchParams.get("service")).toBe("consult")
    expect(new URL(ed!).searchParams.get("subtype")).toBe("ed")
    expectRecoveryParams(ed!, "consult")

    const hairLoss = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { consultSubtype: "hair_loss", serviceType: "consult", sessionId: SESSION_ID },
    })
    expect(hairLoss).not.toBeNull()
    expect(new URL(hairLoss!).pathname).toBe("/request")
    expect(new URL(hairLoss!).searchParams.get("subtype")).toBe("hair_loss")
    expectRecoveryParams(hairLoss!, "consult")

    const womensHealth = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { consultSubtype: "womens_health", serviceType: "consult", sessionId: SESSION_ID },
    })
    expect(womensHealth).not.toBeNull()
    expect(new URL(womensHealth!).pathname).toBe("/request")
    expect(new URL(womensHealth!).searchParams.get("subtype")).toBe("womens_health")
    expectRecoveryParams(womensHealth!, "consult")
  })

  it("fails closed for bare or gated consult drafts", () => {
    const bare = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { serviceType: "consult", sessionId: SESSION_ID },
    })
    const gated = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: {
        consultSubtype: "weight_loss" as never,
        serviceType: "consult",
        sessionId: SESSION_ID,
      },
    })

    expect(bare).toBeNull()
    expect(gated).toBeNull()
  })
})
