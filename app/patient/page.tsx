import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PanelDashboard } from "@/components/patient/panel-dashboard"

/**
 * Patient Dashboard Page - Now panel-based
 * 
 * Uses intakes as the canonical case object.
 */

export const dynamic = "force-dynamic"

export default async function PatientDashboard() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const supabase = await createClient()
  const patientId = authUser.profile.id

  // Fetch intakes with service info for the dashboard
  const [intakesResult, prescriptionsResult] = await Promise.all([
    supabase
      .from("intakes")
      .select(`
        *,
        service:services!service_id(id, name, short_name, type, slug)
      `)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10),

    supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .order("issued_date", { ascending: false })
      .limit(10),
  ])

  return (
    <PanelDashboard
      fullName={authUser.profile.full_name || "Patient"}
      patientId={patientId}
      intakes={intakesResult.data || []}
      prescriptions={prescriptionsResult.data || []}
    />
  )
}
