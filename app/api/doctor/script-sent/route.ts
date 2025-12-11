import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { updateScriptSent } from "@/lib/data/requests"

export async function POST(request: Request) {
  try {
    const { profile } = await requireAuth("doctor")
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId, scriptSent, scriptNotes } = await request.json()

    if (!requestId || typeof scriptSent !== "boolean") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const success = await updateScriptSent(requestId, scriptSent, scriptNotes)

    if (!success) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating script sent status:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
