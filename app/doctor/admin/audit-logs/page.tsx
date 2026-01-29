import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { AuditLogsClient } from "./audit-logs-client"
import { logger } from "@/lib/observability/logger"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Audit Logs | InstantMed Admin",
}

interface PageProps {
  searchParams: Promise<{ 
    intake_id?: string
    patient_id?: string
    page?: string
  }>
}

async function getAuditLogs(filters: {
  intakeId?: string
  patientId?: string
  page: number
  pageSize: number
}) {
  const supabase = createServiceRoleClient()
  const { intakeId, patientId, page, pageSize } = filters

  // Build query for intake events
  let query = supabase
    .from("intake_events")
    .select(`
      id,
      intake_id,
      event_type,
      actor_role,
      actor_id,
      from_status,
      to_status,
      metadata,
      created_at,
      intake:intakes!intake_id(
        id,
        category,
        patient:profiles!patient_id(full_name, email)
      ),
      actor:profiles!actor_id(full_name, role)
    `, { count: "exact" })
    .order("created_at", { ascending: false })

  if (intakeId) {
    query = query.eq("intake_id", intakeId)
  }

  if (patientId) {
    query = query.eq("intake.patient_id", patientId)
  }

  // Pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    logger.error("Error fetching audit logs", {}, error)
    return { events: [], total: 0 }
  }

  return {
    events: data || [],
    total: count || 0,
  }
}

async function getCertificateEvents(intakeId?: string) {
  if (!intakeId) return []
  
  const supabase = createServiceRoleClient()
  
  const { data } = await supabase
    .from("certificate_events")
    .select(`
      id,
      certificate_id,
      event_type,
      actor_id,
      actor_role,
      metadata,
      created_at,
      actor:profiles!actor_id(full_name)
    `)
    .eq("certificate_id", intakeId)
    .order("created_at", { ascending: false })
    .limit(50)

  return data || []
}

export default async function AuditLogsPage({ searchParams }: PageProps) {
  await requireRole(["admin"])
  
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || "1", 10))
  const pageSize = 50

  const [auditData, certificateEvents] = await Promise.all([
    getAuditLogs({
      intakeId: params.intake_id,
      patientId: params.patient_id,
      page,
      pageSize,
    }),
    getCertificateEvents(params.intake_id),
  ])

  return (
    <AuditLogsClient
      events={auditData.events}
      certificateEvents={certificateEvents}
      total={auditData.total}
      page={page}
      pageSize={pageSize}
      filters={{
        intakeId: params.intake_id,
        patientId: params.patient_id,
      }}
    />
  )
}
