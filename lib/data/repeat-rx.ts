import "server-only"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export interface RepeatRxRequestRow {
  id: string
  patient_id: string
  is_guest: boolean
  guest_email: string | null
  medication_code: string
  medication_display: string
  medication_strength: string | null
  medication_form: string | null
  status: string
  created_at: string
  patient: { full_name: string | null } | null
}

export interface RepeatRxListResult {
  requests: RepeatRxRequestRow[]
  counts: { pending: number; total: number }
}

/**
 * Fetch repeat prescription requests for the doctor queue.
 * Orders by created_at ascending (oldest first) for FIFO review.
 */
export async function getRepeatRxRequests(): Promise<RepeatRxListResult> {
  const supabase = createServiceRoleClient()

  const { data: requests, error } = await supabase
    .from("repeat_rx_requests")
    .select(`
      id,
      patient_id,
      is_guest,
      guest_email,
      medication_code,
      medication_display,
      medication_strength,
      medication_form,
      status,
      created_at,
      patient:profiles!repeat_rx_requests_patient_id_fkey(full_name)
    `)
    .in("status", ["pending", "requires_consult", "approved", "declined"])
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch repeat rx requests: ${error.message}`)
  }

  const raw = requests || []
  const rows: RepeatRxRequestRow[] = raw.map((r: { patient?: { full_name: string | null } | { full_name: string | null }[]; [key: string]: unknown }) => {
    const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient
    return { ...r, patient } as RepeatRxRequestRow
  })
  const pending = rows.filter(
    (r) => r.status === "pending" || r.status === "requires_consult"
  ).length

  return {
    requests: rows,
    counts: { pending, total: rows.length },
  }
}
