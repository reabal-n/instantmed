import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildEnhancedConversionsUserData,
  initConsentMode,
  trackConversion,
  trackFunnelStep,
  updateConsent,
} from "../analytics/conversion-tracking"

type GtagCall = [string, string, Record<string, unknown>]

let gtagMock: ReturnType<typeof vi.fn>
let storage: Record<string, string>

beforeEach(() => {
  gtagMock = vi.fn()
  storage = {}

  Object.defineProperty(global, "window", {
    value: {
      gtag: gtagMock,
      crypto: globalThis.crypto,
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
  it("defaults consent mode to granted until visitors opt out", () => {
    const dataLayer: unknown[] = []
    Object.assign(window, { dataLayer })

    initConsentMode()

    expect(dataLayer).toContainEqual(["consent", "default", {
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
      functionality_storage: "granted",
      personalization_storage: "granted",
      security_storage: "granted",
    }])
  })

  it("maps purchase conversion to the Google Ads purchase label", () => {
    trackConversion("PURCHASE", {
      transaction_id: "intake_123",
      value: 49.95,
      currency: "AUD",
    })

    const calls = gtagMock.mock.calls as GtagCall[]
    const conversionCall = calls.find(([kind, event]) => kind === "event" && event === "conversion")
    expect(conversionCall?.[2].send_to).toBe("AW-17795889471/SqypCNva94YcEL_y3qVC")
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

  it("tracks checkout funnel step conversion with send_to", () => {
    trackFunnelStep("checkout", "prescription")

    const calls = gtagMock.mock.calls as GtagCall[]
    const conversionCall = calls.find(([kind, event]) => kind === "event" && event === "conversion")
    expect(conversionCall?.[2].send_to).toBe("AW-17795889471/4MCMCMrGhYccEL_y3qVC")
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
