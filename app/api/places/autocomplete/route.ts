import { NextRequest, NextResponse } from "next/server"

import { mapAddressFinderAutocompleteResponse } from "@/lib/google-places/addressfinder"
import { trackAddressProviderLookup } from "@/lib/google-places/provider-telemetry"
import { normalizeAddressSearchInput } from "@/lib/google-places/request"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const ADDRESSFINDER_KEY = process.env.ADDRESSFINDER_KEY || process.env.NEXT_PUBLIC_ADDRESSFINDER_KEY
const ADDRESSFINDER_SECRET = process.env.ADDRESSFINDER_SECRET
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  // Address search runs before guest checkout/auth, so protect it with rate limits instead of auth.
  const rateLimitResponse = await applyRateLimit(request, "addressSearch")
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = new URL(request.url)
  const input = normalizeAddressSearchInput(searchParams.get("input"))
  const startedAt = Date.now()

  if (!input) {
    return NextResponse.json({ predictions: [] })
  }

  if (ADDRESSFINDER_KEY) {
    const addressFinderParams = new URLSearchParams({
      key: ADDRESSFINDER_KEY,
      q: input,
      format: "json",
      source: "GNAF,PAF",
      post_box: "0",
      max: "8",
    })
    if (ADDRESSFINDER_SECRET) {
      addressFinderParams.set("secret", ADDRESSFINDER_SECRET)
    }

    try {
      const response = await fetch(
        `https://api.addressfinder.io/api/au/address/autocomplete?${addressFinderParams}`,
        { cache: "no-store" },
      )
      const data = await response.json()
      const predictions = mapAddressFinderAutocompleteResponse(data)

      if (response.ok && predictions.length > 0) {
        trackAddressProviderLookup({
          operation: "autocomplete",
          provider: "addressfinder",
          outcome: "success",
          inputLength: input.length,
          resultCount: predictions.length,
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
          usedGoogleFallback: false,
        })
        return NextResponse.json({ predictions, status: "OK", provider: "addressfinder" })
      }
      trackAddressProviderLookup({
        operation: "autocomplete",
        provider: "addressfinder",
        outcome: response.ok ? "zero_results" : "provider_error",
        inputLength: input.length,
        resultCount: predictions.length,
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
        usedGoogleFallback: true,
        reason: response.ok ? undefined : "addressfinder_response_not_ok",
      })
    } catch {
      trackAddressProviderLookup({
        operation: "autocomplete",
        provider: "addressfinder",
        outcome: "provider_error",
        inputLength: input.length,
        durationMs: Date.now() - startedAt,
        usedGoogleFallback: true,
        reason: "addressfinder_fetch_failed",
      })
      // Fall back to Google Places below.
    }
  }

  if (!GOOGLE_API_KEY) {
    trackAddressProviderLookup({
      operation: "autocomplete",
      provider: "none",
      outcome: "not_configured",
      inputLength: input.length,
      resultCount: 0,
      durationMs: Date.now() - startedAt,
      usedGoogleFallback: false,
      reason: "google_places_key_missing",
    })
    return NextResponse.json({ predictions: [], status: "ZERO_RESULTS" })
  }

  const params = new URLSearchParams({
    input,
    types: "address",
    components: "country:au",
    key: GOOGLE_API_KEY,
  })

  // Forward session token if provided (for billing optimization)
  const sessionToken = searchParams.get("sessiontoken")
  if (sessionToken) {
    params.append("sessiontoken", sessionToken)
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`
    )
    const data = await response.json()
    const resultCount = Array.isArray(data.predictions) ? data.predictions.length : 0
    trackAddressProviderLookup({
      operation: "autocomplete",
      provider: "google",
      outcome: data.status === "OK" && resultCount > 0 ? "success" : "zero_results",
      inputLength: input.length,
      resultCount,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      usedGoogleFallback: Boolean(ADDRESSFINDER_KEY),
      reason: typeof data.status === "string" ? data.status : undefined,
    })
    return NextResponse.json(data)
  } catch {
    trackAddressProviderLookup({
      operation: "autocomplete",
      provider: "google",
      outcome: "provider_error",
      inputLength: input.length,
      durationMs: Date.now() - startedAt,
      usedGoogleFallback: Boolean(ADDRESSFINDER_KEY),
      reason: "google_fetch_failed",
    })
    return NextResponse.json({ predictions: [], status: "ERROR" })
  }
}
