import { NextRequest, NextResponse } from "next/server"
import { requireApiRole } from "@/lib/auth"
import { updateScriptSent } from "@/lib/data/intakes"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

export async function POST(request: NextRequest) {
  try {
    // Rate limit before any processing
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    // Require doctor or admin role (defense-in-depth)
    const authResult = await requireApiRole(["doctor", "admin"])
    if (!authResult) {
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
