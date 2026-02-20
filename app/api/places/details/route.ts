import { NextRequest, NextResponse } from "next/server"

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
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
