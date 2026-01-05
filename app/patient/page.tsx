import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PanelDashboard } from "@/components/patient/panel-dashboard"

/**
 * Patient Dashboard Page - Now panel-based
 * 
 * Changes:
 * - Uses PanelDashboard (no tabs, single scroll)
 * - Click request → DrawerPanel opens
 * - Simpler, calmer interface
 * - Removed invoices/payment methods from main view
 */

// Prevent static generation to avoid Clerk publishableKey build errors

export const dynamic = "force-dynamic"
export default async function PatientDashboardPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const supabase = await createClient()
  const patientId = authUser.profile.id

  // Fetch only what's needed for the dashboard
  const [requestsResult, prescriptionsResult] = await Promise.all([
    // Get patient requests
    supabase
      .from("requests")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(10),

    // Get patient prescriptions
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
      requests={requestsResult.data || []}
      prescriptions={prescriptionsResult.data || []}
    />
  )
}
