import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const rateLimitMocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: rateLimitMocks.applyRateLimit,
}))

const ORIGINAL_ENV = {
  ADDRESSFINDER_KEY: process.env.ADDRESSFINDER_KEY,
  ADDRESSFINDER_SECRET: process.env.ADDRESSFINDER_SECRET,
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY,
}

function restoreAddressEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
}

async function loadAutocompleteRoute(env: {
  addressfinderKey?: string
  addressfinderSecret?: string
  googlePlacesKey?: string
} = {}) {
  vi.resetModules()
  restoreAddressEnv()
  process.env.ADDRESSFINDER_KEY = env.addressfinderKey ?? "af-test-key"
  process.env.ADDRESSFINDER_SECRET = env.addressfinderSecret ?? "af-test-secret"
  process.env.GOOGLE_PLACES_API_KEY = env.googlePlacesKey ?? "google-test-key"
  const route = await import("@/app/api/places/autocomplete/route")
  return route.GET
}

async function loadDetailsRoute(env: {
  addressfinderKey?: string
  addressfinderSecret?: string
  googlePlacesKey?: string
} = {}) {
  vi.resetModules()
  restoreAddressEnv()
  process.env.ADDRESSFINDER_KEY = env.addressfinderKey ?? "af-test-key"
  process.env.ADDRESSFINDER_SECRET = env.addressfinderSecret ?? "af-test-secret"
  process.env.GOOGLE_PLACES_API_KEY = env.googlePlacesKey ?? "google-test-key"
  const route = await import("@/app/api/places/details/route")
  return route.GET
}

describe("/api/places/autocomplete", () => {
  beforeEach(() => {
    rateLimitMocks.applyRateLimit.mockResolvedValue(null)
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    restoreAddressEnv()
  })

  it("uses the address-search limiter before calling address providers", async () => {
    const limited = Response.json({ error: "Too many requests" }, { status: 429 })
    rateLimitMocks.applyRateLimit.mockResolvedValueOnce(limited)
    const GET = await loadAutocompleteRoute()

    const response = await GET(new NextRequest("https://instantmed.test/api/places/autocomplete?input=21%20Kent"))

    expect(response.status).toBe(429)
    expect(rateLimitMocks.applyRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "addressSearch")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("does not call paid providers when trimmed input is shorter than three characters", async () => {
    const GET = await loadAutocompleteRoute()

    const response = await GET(new NextRequest("https://instantmed.test/api/places/autocomplete?input=%20ab%20"))

    expect(await response.json()).toEqual({ predictions: [] })
    expect(rateLimitMocks.applyRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "addressSearch")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("falls back to Google Places when Addressfinder has no matches", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(Response.json({ completions: [], success: true }))
      .mockResolvedValueOnce(Response.json({
        status: "OK",
        predictions: [
          {
            description: "21 Kent Road, Dapto NSW, Australia",
            place_id: "google-place-id",
            structured_formatting: {
              main_text: "21 Kent Road",
              secondary_text: "Dapto NSW",
            },
          },
        ],
      }))
    const GET = await loadAutocompleteRoute()

    const response = await GET(new NextRequest("https://instantmed.test/api/places/autocomplete?input=21%20Kent"))
    const body = await response.json()

    expect(body.status).toBe("OK")
    expect(body.predictions).toHaveLength(1)
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("api.addressfinder.io")
    expect(vi.mocked(fetch).mock.calls[1]?.[0]).toContain("maps.googleapis.com")
  })
})

describe("/api/places/details", () => {
  beforeEach(() => {
    rateLimitMocks.applyRateLimit.mockResolvedValue(null)
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    restoreAddressEnv()
  })

  it("uses the address-search limiter for selected address details", async () => {
    const limited = Response.json({ error: "Too many requests" }, { status: 429 })
    rateLimitMocks.applyRateLimit.mockResolvedValueOnce(limited)
    const GET = await loadDetailsRoute()

    const response = await GET(new NextRequest("https://instantmed.test/api/places/details?place_id=af%3Aaddress-id"))

    expect(response.status).toBe(429)
    expect(rateLimitMocks.applyRateLimit).toHaveBeenCalledWith(expect.any(NextRequest), "addressSearch")
    expect(fetch).not.toHaveBeenCalled()
  })
})
