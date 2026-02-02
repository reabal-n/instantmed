import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { updateScriptTaskStatus, ScriptTaskStatus } from "@/lib/data/script-tasks"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("doctor-scripts-update")

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceRoleClient()
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("clerk_user_id", userId)
      .single()

    if (!profile || !["doctor", "admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { status, notes } = body as { status: ScriptTaskStatus; notes?: string }

    if (!status || !["pending_send", "sent", "confirmed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }

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
