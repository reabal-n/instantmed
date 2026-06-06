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
    expect(new URL(medCert).pathname).toBe("/request")
    expect(new URL(medCert).searchParams.get("service")).toBe("med-cert")
    expectRecoveryParams(medCert, "med-cert")

    const prescription = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { serviceType: "prescription", sessionId: SESSION_ID },
    })
    expect(new URL(prescription).pathname).toBe("/request")
    expect(new URL(prescription).searchParams.get("service")).toBe("prescription")
    expectRecoveryParams(prescription, "prescription")
  })

  it("preserves consult subtypes when the recovered draft has one", () => {
    const ed = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { consultSubtype: "ed", serviceType: "consult", sessionId: SESSION_ID },
    })
    expect(new URL(ed).pathname).toBe("/request")
    expect(new URL(ed).searchParams.get("service")).toBe("consult")
    expect(new URL(ed).searchParams.get("subtype")).toBe("ed")
    expectRecoveryParams(ed, "consult")

    const hairLoss = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { consultSubtype: "hair_loss", serviceType: "consult", sessionId: SESSION_ID },
    })
    expect(new URL(hairLoss).pathname).toBe("/request")
    expect(new URL(hairLoss).searchParams.get("subtype")).toBe("hair_loss")
    expectRecoveryParams(hairLoss, "consult")
  })

  it("sends retired bare consult drafts to the consult overview", () => {
    const url = buildPartialIntakeRecoveryUrl({
      appUrl: APP_URL,
      draft: { serviceType: "consult", sessionId: SESSION_ID },
    })

    expect(new URL(url).pathname).toBe("/consult")
    expectRecoveryParams(url, "consult")
  })
})
