import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("script-tasks")

export type ScriptTaskStatus = "pending_send" | "sent" | "confirmed"

export async function updateScriptTaskStatus(
  taskId: string,
  status: ScriptTaskStatus,
  notes?: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === "sent") {
    updates.sent_at = new Date().toISOString()
  } else if (status === "confirmed") {
    updates.confirmed_at = new Date().toISOString()
  }

  if (notes !== undefined) {
    updates.notes = notes
  }

  const { error } = await supabase
    .from("script_tasks")
    .update(updates)
    .eq("id", taskId)

  if (error) {
    log.error("Failed to update script task", { taskId, error: error.message })
    return false
  }

  return true
}
