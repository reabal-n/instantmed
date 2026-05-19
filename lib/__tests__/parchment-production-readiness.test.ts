import { describe, expect, it } from "vitest"

import { getParchmentProductionReadiness } from "@/lib/parchment/readiness"

const productionEnv = {
  NEXT_PUBLIC_PARCHMENT_IFRAME_ALLOWED_HOSTS:
    "instantmed.com.au,www.instantmed.com.au",
  PARCHMENT_API_URL: "https://api.parchmenthealth.io/external",
  PARCHMENT_DEFAULT_USER_ID: "user_prod",
  PARCHMENT_ORGANIZATION_ID: "org_prod",
  PARCHMENT_ORGANIZATION_SECRET: "org_secret",
  PARCHMENT_PARTNER_ID: "partner_prod",
  PARCHMENT_PARTNER_SECRET: "partner_secret",
  PARCHMENT_WEBHOOK_SECRET: "webhook_secret",
}

describe("Parchment production readiness", () => {
  it("blocks sandbox configuration outright", () => {
    const readiness = getParchmentProductionReadiness({
      ...productionEnv,
      PARCHMENT_API_URL: "https://api.sandbox.parchmenthealth.io/external",
    })

    expect(readiness.status).toBe("misconfigured")
    expect(readiness.label).toBe("Sandbox environment blocked")
    expect(readiness.message).toContain("Production prescribing is blocked")
  })

  it("blocks incomplete production configuration", () => {
    const readiness = getParchmentProductionReadiness({
      ...productionEnv,
      PARCHMENT_PARTNER_SECRET: undefined,
    })

    expect(readiness.status).toBe("awaiting_production_keys")
    expect(readiness.missingProductionKeys).toContain("PARCHMENT_PARTNER_SECRET")
  })

  it("requires the production external API path", () => {
    const readiness = getParchmentProductionReadiness({
      ...productionEnv,
      PARCHMENT_API_URL: "https://api.parchmenthealth.io",
    })

    expect(readiness.status).toBe("misconfigured")
    expect(readiness.label).toBe("Production API path incomplete")
    expect(readiness.externalApiPathConfigured).toBe(false)
  })

  it("requires both production iframe hosts", () => {
    const readiness = getParchmentProductionReadiness({
      ...productionEnv,
      NEXT_PUBLIC_PARCHMENT_IFRAME_ALLOWED_HOSTS: "instantmed.com.au",
    })

    expect(readiness.status).toBe("misconfigured")
    expect(readiness.iframeHosts).toContainEqual({
      allowed: false,
      host: "www.instantmed.com.au",
    })
  })

  it("passes only when production keys and iframe hosts are present", () => {
    const readiness = getParchmentProductionReadiness(productionEnv)

    expect(readiness.status).toBe("ready")
    expect(readiness.externalApiPathConfigured).toBe(true)
    expect(readiness.missingProductionKeys).toEqual([])
  })
})
