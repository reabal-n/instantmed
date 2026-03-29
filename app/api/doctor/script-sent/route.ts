import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireApiRole } from "@/lib/auth"
import { updateScriptSent } from "@/lib/data/intakes"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

const scriptSentSchema = z.object({
  intakeId: z.string().uuid().optional(),
  requestId: z.string().uuid().optional(),
  scriptSent: z.boolean(),
  scriptNotes: z.string().max(2000).optional(),
  parchmentReference: z.string().max(200).optional(),
}).refine(data => data.intakeId || data.requestId, {
  message: "Either intakeId or requestId is required",
})

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

    const parsed = scriptSentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 })
    }

    const { intakeId, requestId, scriptSent, scriptNotes, parchmentReference } = parsed.data
    // refine() guarantees at least one of intakeId/requestId exists
    const id = (intakeId || requestId)!

    const success = await updateScriptSent(id, scriptSent, scriptNotes, parchmentReference)

    if (!success) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
