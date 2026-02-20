import { NextRequest, NextResponse } from "next/server"

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const input = searchParams.get("input")

  if (!input || input.length < 3) {
    return NextResponse.json({ predictions: [] })
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ predictions: [], error: "API key not configured" })
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
