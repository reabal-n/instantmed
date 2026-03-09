import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { applyRateLimit } from "@/lib/rate-limit/redis"

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  // Require authenticated user to prevent quota abuse
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ status: "UNAUTHORIZED" }, { status: 401 })
  }

  // Rate limit: standard (100 req/min per IP)
  const rateLimitResponse = await applyRateLimit(request, "standard")
  if (rateLimitResponse) return rateLimitResponse

  const { searchParams } = new URL(request.url)
  const placeId = searchParams.get("place_id")

  if (!placeId) {
    return NextResponse.json({ status: "INVALID_REQUEST" })
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
