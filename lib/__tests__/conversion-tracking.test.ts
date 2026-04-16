import { beforeEach, describe, expect, it, vi } from "vitest"

import { trackConversion, trackFunnelStep, updateConsent } from "../analytics/conversion-tracking"

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
    expect(conversionCall?.[2].send_to).toBe("AW-17795889471/REPLACE_CHECKOUT_START")
  })
})
