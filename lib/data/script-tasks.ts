import { readDashboardQuery } from "@/lib/data/dashboard-read-model"
import { createLogger } from "@/lib/observability/logger"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

const log = createLogger("script-tasks")

export type ScriptTaskStatus = "pending_send" | "sent" | "confirmed"

export interface ScriptTask {
  id: string
  intake_id: string | null
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
  page?: number
  pageSize?: number
}): Promise<{ tasks: ScriptTask[]; total: number }> {
  const supabase = createServiceRoleClient()
  const page = filters?.page ?? 1
  const pageSize = filters?.pageSize ?? 50
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return readDashboardQuery({
    label: "script tasks",
    fallback: { tasks: [], total: 0 },
    context: { surface: "doctor-scripts", status: filters?.status, hasDoctorId: Boolean(filters?.doctorId) },
    operation: async () => {
      let query = supabase
        .from("script_tasks")
        .select("id, intake_id, doctor_id, patient_name, patient_email, medication_name, medication_strength, medication_form, status, notes, sent_at, confirmed_at, created_at, updated_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to)

      if (filters?.status) {
        query = query.eq("status", filters.status)
      }
      if (filters?.doctorId) {
        query = query.eq("doctor_id", filters.doctorId)
      }

      const { data, error, count } = await query
      return {
        data: error ? null : { tasks: (data || []) as ScriptTask[], total: count ?? 0 },
        error,
      }
    },
  })
}

export async function getScriptTaskCounts(filters?: { doctorId?: string }): Promise<{
  pending_send: number
  sent: number
  confirmed: number
  total: number
}> {
  const supabase = createServiceRoleClient()
  const data = await readDashboardQuery({
    label: "script task counts",
    fallback: [] as Array<{ status: ScriptTaskStatus }>,
    context: { surface: "doctor-scripts", hasDoctorId: Boolean(filters?.doctorId) },
    operation: async () => {
      let query = supabase
        .from("script_tasks")
        .select("status")

      if (filters?.doctorId) {
        query = query.eq("doctor_id", filters.doctorId)
      }

      return await query
    },
  })

  const counts = {
    pending_send: 0,
    sent: 0,
    confirmed: 0,
    total: data?.length || 0,
  }

  for (const task of data) {
    if (task.status in counts) {
      counts[task.status as keyof typeof counts]++
    }
  }

  return counts
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
