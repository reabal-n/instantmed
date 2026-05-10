import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const serviceHubSource = readFileSync(join(root, "components/request/service-hub-screen.tsx"), "utf8")

describe("service hub experience contract", () => {
  it("keeps the service hub compact without a duplicate trust-card strip", () => {
    expect(serviceHubSource).toContain("{patientCount.toLocaleString()}+ Australians")
    expect(serviceHubSource).toContain("AHPRA doctors")
    expect(serviceHubSource).toContain("Google star rating")
    expect(serviceHubSource).not.toContain(">4.8<")
    expect(serviceHubSource).toContain("flex-nowrap")
    expect(serviceHubSource).toContain("whitespace-nowrap")
    expect(serviceHubSource).not.toContain("REQUEST_HUB_TRUST_SIGNALS")
    expect(serviceHubSource).not.toContain("Secure form")
    expect(serviceHubSource).not.toContain("Australian doctor review")
    expect(serviceHubSource).not.toContain("Clear fee before payment")
  })

  it("keeps coming-soon services informative without waitlist acquisition", () => {
    expect(serviceHubSource).toContain('data-coming-soon-strip="true"')
    expect(serviceHubSource).toContain("Not taking requests yet")
    expect(serviceHubSource).toContain('aria-disabled="true"')
    expect(serviceHubSource).not.toContain("Join the waitlist")
    expect(serviceHubSource).not.toContain("Notify me")
    expect(serviceHubSource).not.toContain("WaitlistForm")
  })

  it("polishes service rows and certification footer without adding vertical bulk", () => {
    expect(serviceHubSource).toContain("active:scale-[0.99]")
    expect(serviceHubSource).toContain("focus-visible:ring-2")
    expect(serviceHubSource).toContain("tabular-nums")
    expect(serviceHubSource).toContain("w-[4.5rem]")
    expect(serviceHubSource).toContain('data-request-hub-cert-footer="true"')
  })
})
