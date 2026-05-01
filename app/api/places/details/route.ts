import { NextRequest, NextResponse } from "next/server"

import {
  isAddressFinderPlaceId,
  mapAddressFinderMetadataToParsedAddress,
  parseAddressFinderPlaceId,
} from "@/lib/google-places/addressfinder"
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

  if (!placeId) {
    return NextResponse.json({ status: "INVALID_REQUEST" })
  }

  if (isAddressFinderPlaceId(placeId)) {
    if (!ADDRESSFINDER_KEY) {
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
        return NextResponse.json({ status: "ZERO_RESULTS" })
      }

      return NextResponse.json({ status: "OK", address, provider: "addressfinder" })
    } catch {
      return NextResponse.json({ status: "ERROR" })
    }
  }

  if (!GOOGLE_API_KEY) {
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
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ status: "ERROR" })
  }
}
