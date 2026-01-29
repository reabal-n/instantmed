import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { notFound } from "next/navigation"
import { PatientDetailClient } from "./patient-detail-client"
import { logger } from "@/lib/observability/logger"

interface PageProps {
  params: Promise<{ id: string }>
}

async function getPatientWithHistory(patientId: string) {
  const supabase = createServiceRoleClient()

  // Get patient profile
  const { data: patient, error: patientError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", patientId)
    .eq("role", "patient")
    .single()

  if (patientError || !patient) {
    return null
  }

  // Get patient's intake history
  const { data: intakes, error: intakesError } = await supabase
    .from("intakes")
    .select(`
      id,
      status,
      category,
      subtype,
      created_at,
      paid_at,
      reviewed_at,
      reviewed_by,
      payment_status,
      service:services(name, short_name, type)
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(50)

  if (intakesError) {
    logger.error("Error fetching intakes", { patientId }, intakesError)
  }

  // Get issued certificates count
  const { count: certificatesCount } = await supabase
    .from("issued_certificates")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patientId)

  // Get email communication history
  const { data: emailLogs, error: emailError } = await supabase
    .from("email_outbox")
    .select(`
      id,
      email_type,
      to_email,
      subject,
      status,
      delivery_status,
      created_at,
      sent_at,
      intake_id
    `)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(20)

  if (emailError) {
    logger.error("Error fetching email logs", { patientId }, emailError)
  }

  // Get patient notes/flags
  const { data: patientNotes, error: notesError } = await supabase
    .from("patient_notes")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })

  if (notesError && notesError.code !== "42P01") {
    // Ignore table not exists error - we'll create it
    logger.error("Error fetching patient notes", { patientId }, notesError)
  }

  // Transform intakes to flatten the service relation (Supabase returns array for joins)
  const transformedIntakes = (intakes || []).map(intake => ({
    ...intake,
    service: Array.isArray(intake.service) ? intake.service[0] || null : intake.service,
  }))

  return {
    patient,
    intakes: transformedIntakes,
    emailLogs: emailLogs || [],
    patientNotes: patientNotes || [],
    stats: {
      totalRequests: intakes?.length || 0,
      approvedRequests: intakes?.filter(i => i.status === "approved" || i.status === "completed").length || 0,
      certificatesIssued: certificatesCount || 0,
    }
  }
}

export const dynamic = "force-dynamic"

export default async function PatientDetailPage({ params }: PageProps) {
  await requireRole(["doctor", "admin"])
  
  const { id } = await params
  const data = await getPatientWithHistory(id)

  if (!data) {
    notFound()
  }

  return (
    <PatientDetailClient 
      patient={data.patient} 
      intakes={data.intakes} 
      stats={data.stats}
      emailLogs={data.emailLogs}
      patientNotes={data.patientNotes}
    />
  )
}
