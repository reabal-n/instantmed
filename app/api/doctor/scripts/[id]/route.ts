import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireApiRole } from "@/lib/auth/helpers"
import { updateScriptTaskStatus } from "@/lib/data/script-tasks"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { logExternalPrescribingIndicated } from "@/lib/audit/compliance-audit"

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
    const authResult = await requireApiRole(["doctor", "admin"])
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { profile } = authResult

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

    // Compliance audit: when a script task transitions to "sent" the doctor
    // has handed the prescription off to Parchment (the external eScript
    // system). Per CLINICAL.md Section 5 we need to evidence this happened
    // outside the platform.
    if (status === "sent") {
      try {
        const supabase = createServiceRoleClient()
        const { data: task } = await supabase
          .from("script_tasks")
          .select("intake_id")
          .eq("id", id)
          .single()
        if (task?.intake_id) {
          await logExternalPrescribingIndicated(
            task.intake_id,
            "repeat_rx",
            profile.id,
            "parchment"
          )
        }
      } catch (auditError) {
        log.warn("Failed to log external_prescribing_indicated event for script task", {
          taskId: id,
        }, auditError instanceof Error ? auditError : undefined)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    log.error("Failed to update script task", {
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
