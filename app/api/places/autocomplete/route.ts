import { NextRequest, NextResponse } from "next/server"

import { mapAddressFinderAutocompleteResponse } from "@/lib/google-places/addressfinder"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const ADDRESSFINDER_KEY = process.env.ADDRESSFINDER_KEY || process.env.NEXT_PUBLIC_ADDRESSFINDER_KEY
const ADDRESSFINDER_SECRET = process.env.ADDRESSFINDER_SECRET
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  // Address search runs before guest checkout/auth, so protect it with rate limits instead of auth.
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = new URL(request.url)
  const input = searchParams.get("input")

  if (!input || input.length < 3) {
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
        return NextResponse.json({ predictions, status: "OK", provider: "addressfinder" })
      }
    } catch {
      // Fall back to Google Places below.
    }
  }

  if (!GOOGLE_API_KEY) {
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
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ predictions: [], status: "ERROR" })
  }
}
