import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { buildPatientIntakeHref } from "@/lib/dashboard/routes"
import { getGuestCertificateAccessHref } from "@/lib/patient/certificate-download"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { TrackingClient } from "./tracking-client"

interface PageProps {
  params: Promise<{ intakeId: string }>
}

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Track Your Request",
  description: "Track the real-time status of your medical request",
}

export default async function TrackingPage({ params }: PageProps) {
  const { intakeId } = await params
  const supabase = createServiceRoleClient()

  // Get the intake with patient profile + service label
  const { data: intake, error } = await supabase
    .from("intakes")
    .select(`
      id, status, created_at, updated_at, is_priority, paid_at,
      patient:profiles!patient_id ( id, auth_user_id ),
      service:services!service_id ( name, short_name )
    `)
    .eq("id", intakeId)
    .single()

  if (error || !intake) {
    notFound()
  }

  // Get queue position for paid intakes awaiting review
  let queuePosition = 0
  if (intake.status === "paid") {
    const { count } = await supabase
      .from("intakes")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .lt("created_at", intake.created_at)

    queuePosition = (count || 0) + 1
  }

  const estimatedMinutes = queuePosition * 15

  // Supabase returns join relations as arrays with .single() - unwrap for component
  const intakeForClient = {
    ...intake,
    patient: Array.isArray(intake.patient) ? intake.patient[0] : intake.patient,
    service: Array.isArray(intake.service) ? intake.service[0] : intake.service,
  }

  const isTerminalApproved = intake.status === "approved" || intake.status === "completed"
  const patient = Array.isArray(intake.patient) ? intake.patient[0] : intake.patient
  const approvedAccessHref = isTerminalApproved
    ? patient?.auth_user_id
      ? buildPatientIntakeHref(intake.id)
      : getGuestCertificateAccessHref(intake.id)
    : null

  return (
    <TrackingClient
      intake={intakeForClient}
      queuePosition={queuePosition}
      estimatedMinutes={estimatedMinutes}
      approvedAccessHref={approvedAccessHref}
    />
  )
}
