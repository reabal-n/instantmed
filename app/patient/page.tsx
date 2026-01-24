import { getOrCreateAuthenticatedUser } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { redirect } from "next/navigation"
import { PanelDashboard } from "@/components/patient/panel-dashboard"
import { createLogger } from "@/lib/observability/logger"

const logger = createLogger("patient-dashboard")

/**
 * Patient Dashboard Page - Now panel-based
 * 
 * Uses intakes as the canonical case object.
 */

export const dynamic = "force-dynamic"

export default async function PatientDashboard() {
  // Use getOrCreate to ensure profile exists (fallback for webhook)
  const authUser = await getOrCreateAuthenticatedUser()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const supabase = createServiceRoleClient()
  const patientId = authUser.profile.id

  // Fetch intakes with service info for the dashboard
  // Show more intakes on dashboard for better overview
  const [intakesResult, prescriptionsResult] = await Promise.all([
    supabase
      .from("intakes")
      .select(`*`)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .order("issued_date", { ascending: false })
      .limit(10),
  ])

  // Log errors but don't crash - show empty state instead
  if (intakesResult.error) {
    logger.error("Failed to fetch intakes", { patientId, error: intakesResult.error.message })
  }
  if (prescriptionsResult.error) {
    logger.error("Failed to fetch prescriptions", { patientId, error: prescriptionsResult.error.message })
  }

  return (
    <PanelDashboard
      fullName={authUser.profile.full_name || "Patient"}
      patientId={patientId}
      intakes={intakesResult.data || []}
      prescriptions={prescriptionsResult.data || []}
    />
  )
}
