import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildEnhancedConversionsUserData,
  initConsentMode,
  trackConversion,
  trackFunnelStep,
  trackStepEvent,
  updateConsent,
} from "../analytics/conversion-tracking"

let gtagMock: ReturnType<typeof vi.fn>
let storage: Record<string, string>

function commandToArray(command: unknown): unknown[] {
  return Array.from(command as ArrayLike<unknown>)
}

function expectArgumentsCommand(command: unknown) {
  expect(Array.isArray(command)).toBe(false)
  expect(Object.prototype.toString.call(command)).toBe("[object Arguments]")
}

beforeEach(() => {
  gtagMock = vi.fn()
  storage = {}

  Object.defineProperty(global, "window", {
    value: {
      gtag: gtagMock,
      crypto: globalThis.crypto,
      location: {
        origin: "https://instantmed.com.au",
        pathname: "/auth/complete-account",
        search: "?intake_id=sensitive&session_id=cs_sensitive",
      },
    },
    writable: true,
  })

  Object.defineProperty(global, "localStorage", {
    value: {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value
      },
      removeItem: (key: string) => {
        delete storage[key]
      },
    },
    writable: true,
  })
})

describe("conversion tracking", () => {
  it("keeps advertising personalisation denied by default", () => {
    const dataLayer: unknown[] = []
    Object.assign(window, { dataLayer, gtag: undefined })

    initConsentMode()

    expect(window.gtag).toEqual(expect.any(Function))
    expect(dataLayer).toHaveLength(1)
    expectArgumentsCommand(dataLayer[0])
    expect(commandToArray(dataLayer[0])).toEqual(["consent", "default", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "denied",
      analytics_storage: "granted",
      functionality_storage: "granted",
      personalization_storage: "denied",
      security_storage: "granted",
    }])
  })

  it("does not send or queue duplicate browser conversions", () => {
    trackConversion("PURCHASE", { transaction_id: "private-order", value: 49.95 })
    expect(gtagMock).not.toHaveBeenCalled()
    Object.assign(window, { dataLayer: [], gtag: undefined })
    trackConversion("PURCHASE", { transaction_id: "private-order", value: 49.95 })
    expect(window.dataLayer).toEqual([])
    expect(window.gtag).toBeUndefined()
  })

  it("updates consent mode correctly for marketing permissions", () => {
    updateConsent({
      adStorage: true,
      adUserData: true,
      adPersonalization: false,
      analyticsStorage: true,
    })

    expect(gtagMock).toHaveBeenCalledWith("consent", "update", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "denied",
      analytics_storage: "granted",
    })
  })

  it("keeps funnel diagnostics local and never forwards health steps to Google", async () => {
    await trackFunnelStep("checkout", "prescription")
    trackStepEvent({ serviceType: "prescription", stepIndex: 2, stepName: "medication", totalSteps: 6 })
    expect(gtagMock).not.toHaveBeenCalled()
    expect(storage.instantmed_funnel).toContain("checkout")
  })

  it("cannot opt into health advertising personalisation", () => {
    updateConsent({ adPersonalization: true })
    expect(gtagMock).toHaveBeenCalledWith("consent", "update", expect.objectContaining({ ad_personalization: "denied" }))
  })

  it("builds the enhanced-conversion user data payload with explicit hashed fields", async () => {
    await expect(
      buildEnhancedConversionsUserData({
        email: " Test@Example.com ",
        phone: "0412345678",
        firstName: "Pat",
        lastName: "Example",
      }),
    ).resolves.toEqual({
      sha256_email_address: "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b",
      sha256_phone_number: "e41826c28802a198d4806265956e297cca877a5118130441691bed37aad57c72",
      address: {
        sha256_first_name: "68d753f055b1a15b39499fdbbe86d614f986d0e50e62817b38e86b20a0935f82",
        sha256_last_name: "50d858e0985ecc7f60418aaf0cc5ab587f42c2570a884095a9e8ccacd0f6545c",
      },
    })
  })
})
