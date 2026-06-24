import { afterEach, describe, expect, it } from "vitest"

import { certReactivationEnabled, processCertReactivations } from "@/lib/email/cert-reactivation"

// Safety contract for a marketing email: it must ship dark and only send when the
// kill-switch is set to exactly "true". The disabled path returns before
// constructing a Supabase client, so these tests need no DB.
describe("cert reactivation feature gate", () => {
  const original = process.env.CERT_REACTIVATION_EMAILS_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.CERT_REACTIVATION_EMAILS_ENABLED
    else process.env.CERT_REACTIVATION_EMAILS_ENABLED = original
  })

  it("is disabled unless CERT_REACTIVATION_EMAILS_ENABLED is exactly 'true'", () => {
    delete process.env.CERT_REACTIVATION_EMAILS_ENABLED
    expect(certReactivationEnabled()).toBe(false)

    process.env.CERT_REACTIVATION_EMAILS_ENABLED = "false"
    expect(certReactivationEnabled()).toBe(false)

    process.env.CERT_REACTIVATION_EMAILS_ENABLED = "1"
    expect(certReactivationEnabled()).toBe(false)

    process.env.CERT_REACTIVATION_EMAILS_ENABLED = "TRUE"
    expect(certReactivationEnabled()).toBe(false)

    process.env.CERT_REACTIVATION_EMAILS_ENABLED = "true"
    expect(certReactivationEnabled()).toBe(true)
  })

  it("no-ops without touching the database when disabled", async () => {
    delete process.env.CERT_REACTIVATION_EMAILS_ENABLED
    const result = await processCertReactivations()
    expect(result).toEqual({ enabled: false, sent: 0, failed: 0, candidates: 0 })
  })
})
