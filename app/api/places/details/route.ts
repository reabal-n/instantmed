import { NextRequest, NextResponse } from "next/server"

import {
  isAddressFinderPlaceId,
  mapAddressFinderMetadataToParsedAddress,
  parseAddressFinderPlaceId,
} from "@/lib/google-places/addressfinder"
import { getPlaceIdProvider, trackAddressProviderLookup } from "@/lib/google-places/provider-telemetry"
import { normalizePlaceId } from "@/lib/google-places/request"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const ADDRESSFINDER_KEY = process.env.ADDRESSFINDER_KEY || process.env.NEXT_PUBLIC_ADDRESSFINDER_KEY
const ADDRESSFINDER_SECRET = process.env.ADDRESSFINDER_SECRET
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  // Address search runs before guest checkout/auth, so protect it with rate limits instead of auth.
  const rateLimitResponse = await applyRateLimit(request, "addressSearch")
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = new URL(request.url)
  const placeId = normalizePlaceId(searchParams.get("place_id"))
  const startedAt = Date.now()
  const placeIdProvider = getPlaceIdProvider(placeId)

  if (!placeId) {
    trackAddressProviderLookup({
      operation: "details",
      provider: "none",
      outcome: "invalid_request",
      durationMs: Date.now() - startedAt,
      detailsFailed: true,
      placeIdProvider,
      reason: "missing_place_id",
    })
    return NextResponse.json({ status: "INVALID_REQUEST" })
  }

  if (isAddressFinderPlaceId(placeId)) {
    if (!ADDRESSFINDER_KEY) {
      trackAddressProviderLookup({
        operation: "details",
        provider: "addressfinder",
        outcome: "not_configured",
        durationMs: Date.now() - startedAt,
        detailsFailed: true,
        placeIdProvider,
        reason: "addressfinder_key_missing",
      })
      return NextResponse.json({ status: "ERROR", error: "Address provider not configured" })
    }

    const params = new URLSearchParams({
      key: ADDRESSFINDER_KEY,
      id: parseAddressFinderPlaceId(placeId),
      format: "json",
      source: "GNAF,PAF",
      gps: "1",
    })
    if (ADDRESSFINDER_SECRET) {
      params.set("secret", ADDRESSFINDER_SECRET)
    }

    try {
      const response = await fetch(
        `https://api.addressfinder.io/api/au/address/metadata?${params}`,
        { cache: "no-store" },
      )
      const data = await response.json()
      const address = mapAddressFinderMetadataToParsedAddress(data)

      if (!response.ok || !address) {
        trackAddressProviderLookup({
          operation: "details",
          provider: "addressfinder",
          outcome: "details_failure",
          statusCode: response.status,
          durationMs: Date.now() - startedAt,
          detailsFailed: true,
          placeIdProvider,
          reason: response.ok ? "addressfinder_metadata_empty" : "addressfinder_response_not_ok",
        })
        return NextResponse.json({ status: "ZERO_RESULTS" })
      }

      trackAddressProviderLookup({
        operation: "details",
        provider: "addressfinder",
        outcome: "success",
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
        detailsFailed: false,
        placeIdProvider,
      })
      return NextResponse.json({ status: "OK", address, provider: "addressfinder" })
    } catch {
      trackAddressProviderLookup({
        operation: "details",
        provider: "addressfinder",
        outcome: "provider_error",
        durationMs: Date.now() - startedAt,
        detailsFailed: true,
        placeIdProvider,
        reason: "addressfinder_fetch_failed",
      })
      return NextResponse.json({ status: "ERROR" })
    }
  }

  if (!GOOGLE_API_KEY) {
    trackAddressProviderLookup({
      operation: "details",
      provider: "google",
      outcome: "not_configured",
      durationMs: Date.now() - startedAt,
      detailsFailed: true,
      placeIdProvider,
      reason: "google_places_key_missing",
    })
    return NextResponse.json({ status: "ERROR", error: "API key not configured" })
  }

  const params = new URLSearchParams({
    place_id: placeId,
    fields: "address_components,formatted_address,geometry",
    key: GOOGLE_API_KEY,
  })

  // Forward session token if provided
  const sessionToken = searchParams.get("sessiontoken")
  if (sessionToken) {
    params.append("sessiontoken", sessionToken)
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`
    )
    const data = await response.json()
    const isSuccess = data.status === "OK" && Boolean(data.result)
    trackAddressProviderLookup({
      operation: "details",
      provider: "google",
      outcome: isSuccess ? "success" : "details_failure",
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
      detailsFailed: !isSuccess,
      placeIdProvider,
      reason: typeof data.status === "string" ? data.status : undefined,
    })
    return NextResponse.json(data)
  } catch {
    trackAddressProviderLookup({
      operation: "details",
      provider: "google",
      outcome: "provider_error",
      durationMs: Date.now() - startedAt,
      detailsFailed: true,
      placeIdProvider,
      reason: "google_fetch_failed",
    })
    return NextResponse.json({ status: "ERROR" })
  }
}
