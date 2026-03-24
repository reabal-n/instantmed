import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getApiAuth } from "@/lib/auth"
import { updateScriptTaskStatus } from "@/lib/data/script-tasks"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"

const updateScriptTaskSchema = z.object({
  status: z.enum(["pending_send", "sent", "confirmed"]),
  notes: z.string().optional(),
})

const log = createLogger("doctor-scripts-update")

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limit before any processing
    const rateLimitResponse = await applyRateLimit(request, "sensitive")
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection
    const csrfError = await requireValidCsrf(request)
    if (csrfError) return csrfError

    const { id } = await params
    const authResult = await getApiAuth()

    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { profile } = authResult

    if (!["doctor", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateScriptTaskSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

    const { status, notes } = parsed.data

    const success = await updateScriptTaskStatus(id, status, notes)

    if (!success) {
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
    }

    log.info("Script task updated", { taskId: id, status, updatedBy: profile.id })
    return NextResponse.json({ success: true })
  } catch (error) {
    log.error("Failed to update script task", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
