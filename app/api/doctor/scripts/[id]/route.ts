import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { logExternalPrescribingIndicated } from "@/lib/audit/compliance-audit"
import { requireApiRole } from "@/lib/auth/helpers"
import { updateScriptTaskStatus } from "@/lib/data/script-tasks"
import { createLogger } from "@/lib/observability/logger"
import { applyRateLimit } from "@/lib/rate-limit/redis"
import { requireValidCsrf } from "@/lib/security/csrf"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const updateScriptTaskSchema = z.object({
  status: z.enum(["pending_send", "sent", "confirmed"]),
  notes: z.string().optional(),
})

const log = createLogger("doctor-scripts-update")

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 })
    }

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
    const supabase = createServiceRoleClient()
    const { data: task, error: taskError } = await supabase
      .from("script_tasks")
      .select("id, intake_id, doctor_id")
      .eq("id", id)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    if (profile.role !== "admin" && task.doctor_id !== profile.id) {
      return NextResponse.json(
        { error: "You can only update your own script tasks" },
        { status: 403 },
      )
    }

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
