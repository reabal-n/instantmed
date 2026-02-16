import { NextResponse } from "next/server"
import { getApiAuth } from "@/lib/auth"
import { updateScriptSent } from "@/lib/data/intakes"

export async function POST(request: Request) {
  try {
    // Require doctor or admin role
    const authResult = await getApiAuth()
    if (!authResult || !["doctor", "admin"].includes(authResult.profile.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 })
    }
    const { intakeId, requestId, scriptSent, scriptNotes, parchmentReference } = body
    
    // Support both intakeId and legacy requestId
    const id = intakeId || requestId

    if (!id || typeof scriptSent !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const success = await updateScriptSent(id, scriptSent, scriptNotes, parchmentReference)

    if (!success) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
