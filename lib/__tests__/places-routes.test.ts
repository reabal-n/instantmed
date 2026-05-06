import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const rateLimitMocks = vi.hoisted(() => ({
  applyRateLimit: vi.fn(),
}))
const telemetryMocks = vi.hoisted(() => ({
  trackAddressProviderLookup: vi.fn(),
}))

vi.mock("@/lib/rate-limit/redis", () => ({
  applyRateLimit: rateLimitMocks.applyRateLimit,
}))
vi.mock("@/lib/google-places/provider-telemetry", () => ({
  getPlaceIdProvider: (placeId: string | null | undefined) => placeId?.startsWith("af:") ? "addressfinder" : "google",
  trackAddressProviderLookup: telemetryMocks.trackAddressProviderLookup,
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
    expect(telemetryMocks.trackAddressProviderLookup).toHaveBeenCalledWith(expect.objectContaining({
      operation: "autocomplete",
      provider: "addressfinder",
      outcome: "zero_results",
      resultCount: 0,
      usedGoogleFallback: true,
    }))
    expect(telemetryMocks.trackAddressProviderLookup).toHaveBeenCalledWith(expect.objectContaining({
      operation: "autocomplete",
      provider: "google",
      outcome: "success",
      resultCount: 1,
      usedGoogleFallback: true,
    }))
  })

  it("returns Addressfinder matches without calling Google Places", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({
      completions: [
        {
          full_address: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
          id: "address-id",
        },
      ],
      success: true,
    }))
    const GET = await loadAutocompleteRoute()

    const response = await GET(new NextRequest("https://instantmed.test/api/places/autocomplete?input=21%20Kent"))
    const body = await response.json()

    expect(body).toEqual({
      status: "OK",
      provider: "addressfinder",
      predictions: [
        {
          description: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
          place_id: "af:address-id",
          structured_formatting: {
            main_text: "Unit 2, 21 Kent Road",
            secondary_text: "DAPTO NSW 2530",
          },
        },
      ],
    })
    expect(fetch).toHaveBeenCalledOnce()
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("api.addressfinder.io")
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("secret=af-test-secret")
    expect(telemetryMocks.trackAddressProviderLookup).toHaveBeenCalledWith(expect.objectContaining({
      operation: "autocomplete",
      provider: "addressfinder",
      outcome: "success",
      resultCount: 1,
      usedGoogleFallback: false,
    }))
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

  it("normalizes Addressfinder metadata into prescribing address fields", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({
      id: "address-id",
      full_address: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
      address_line_1: "Unit 2",
      address_line_2: "21 Kent Road",
      address_line_combined: "Unit 2, 21 Kent Road",
      locality_name: "DAPTO",
      state_territory: "NSW",
      postcode: "2530",
      latitude: "-34.4929",
      longitude: "150.7932",
      success: true,
    }))
    const GET = await loadDetailsRoute()

    const response = await GET(new NextRequest("https://instantmed.test/api/places/details?place_id=af%3Aaddress-id"))
    const body = await response.json()

    expect(body).toEqual({
      status: "OK",
      provider: "addressfinder",
      address: {
        addressLine1: "Unit 2, 21 Kent Road",
        addressLine2: null,
        suburb: "DAPTO",
        state: "NSW",
        postcode: "2530",
        fullAddress: "Unit 2, 21 Kent Road, DAPTO NSW 2530",
        placeId: "af:address-id",
        coordinates: {
          lat: -34.4929,
          lng: 150.7932,
        },
      },
    })
    expect(fetch).toHaveBeenCalledOnce()
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("api.addressfinder.io")
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toContain("id=address-id")
    expect(telemetryMocks.trackAddressProviderLookup).toHaveBeenCalledWith(expect.objectContaining({
      operation: "details",
      provider: "addressfinder",
      outcome: "success",
      detailsFailed: false,
    }))
  })

  it("tracks address detail lookup failures without leaking address text", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(
      { success: false },
      { status: 502 },
    ))
    const GET = await loadDetailsRoute()

    const response = await GET(new NextRequest("https://instantmed.test/api/places/details?place_id=af%3Aaddress-id"))
    const body = await response.json()

    expect(body).toEqual({ status: "ZERO_RESULTS" })
    expect(telemetryMocks.trackAddressProviderLookup).toHaveBeenCalledWith(expect.objectContaining({
      operation: "details",
      provider: "addressfinder",
      outcome: "details_failure",
      detailsFailed: true,
      placeIdProvider: "addressfinder",
    }))
  })
})
