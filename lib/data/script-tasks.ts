import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { createLogger } from "@/lib/observability/logger"

const log = createLogger("script-tasks")

export type ScriptTaskStatus = "pending_send" | "sent" | "confirmed"

export interface ScriptTask {
  id: string
  intake_id: string | null
  repeat_rx_request_id: string | null
  doctor_id: string
  patient_name: string
  patient_email: string | null
  medication_name: string | null
  medication_strength: string | null
  medication_form: string | null
  status: ScriptTaskStatus
  notes: string | null
  sent_at: string | null
  confirmed_at: string | null
  created_at: string
  updated_at: string
}

export async function getScriptTasks(filters?: {
  status?: ScriptTaskStatus
  doctorId?: string
}): Promise<ScriptTask[]> {
  const supabase = createServiceRoleClient()
  let query = supabase
    .from("script_tasks")
    .select("*")
    .order("created_at", { ascending: false })

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }
  if (filters?.doctorId) {
    query = query.eq("doctor_id", filters.doctorId)
  }

  const { data, error } = await query

  if (error) {
    log.error("Failed to fetch script tasks", { error: error.message })
    return []
  }

  return (data || []) as ScriptTask[]
}

export async function getScriptTaskCounts(): Promise<{
  pending_send: number
  sent: number
  confirmed: number
  total: number
}> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from("script_tasks")
    .select("status")

  if (error) {
    log.error("Failed to fetch script task counts", { error: error.message })
    return { pending_send: 0, sent: 0, confirmed: 0, total: 0 }
  }

  const counts = {
    pending_send: 0,
    sent: 0,
    confirmed: 0,
    total: data?.length || 0,
  }

  for (const task of data || []) {
    if (task.status in counts) {
      counts[task.status as keyof typeof counts]++
    }
  }

  return counts
}

export async function createScriptTask(task: {
  intake_id?: string
  repeat_rx_request_id?: string
  doctor_id: string
  patient_name: string
  patient_email?: string
  medication_name?: string
  medication_strength?: string
  medication_form?: string
}): Promise<ScriptTask | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from("script_tasks")
    .insert({
      intake_id: task.intake_id || null,
      repeat_rx_request_id: task.repeat_rx_request_id || null,
      doctor_id: task.doctor_id,
      patient_name: task.patient_name,
      patient_email: task.patient_email || null,
      medication_name: task.medication_name || null,
      medication_strength: task.medication_strength || null,
      medication_form: task.medication_form || null,
      status: "pending_send",
    })
    .select()
    .single()

  if (error) {
    log.error("Failed to create script task", { error: error.message })
    return null
  }

  return data as ScriptTask
}

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
