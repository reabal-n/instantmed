import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { updateScriptSent } from "@/lib/data/intakes"

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { intakeId, requestId, scriptSent, scriptNotes, parchmentReference } = await request.json()
    
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
