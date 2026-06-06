import { describe, expect, it } from "vitest"

import { buildAbandonedCheckoutResumeUrl } from "@/lib/email/recovery-links"

const APP_URL = "https://instantmed.com.au"
const INTAKE_ID = "11111111-1111-4111-8111-111111111111"

describe("abandoned checkout retry URL", () => {
  it("links to the owned intake retry route with recovery attribution", () => {
    const url = buildAbandonedCheckoutResumeUrl({
      appUrl: APP_URL,
      campaign: "abandoned_checkout",
      intakeId: INTAKE_ID,
    })
    const parsed = new URL(url)

    expect(parsed.pathname).toBe(`/patient/intakes/${INTAKE_ID}`)
    expect(parsed.searchParams.get("retry")).toBe("true")
    expect(parsed.searchParams.get("utm_source")).toBe("recovery_email")
    expect(parsed.searchParams.get("utm_medium")).toBe("email")
    expect(parsed.searchParams.get("utm_campaign")).toBe("abandoned_checkout")
  })

  it("uses a distinct campaign for the follow-up email", () => {
    const url = buildAbandonedCheckoutResumeUrl({
      appUrl: `${APP_URL}/`,
      campaign: "abandoned_checkout_followup",
      intakeId: INTAKE_ID,
    })

    expect(new URL(url).searchParams.get("utm_campaign")).toBe("abandoned_checkout_followup")
  })
})
