import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { getPatientRequests } from "@/lib/data/requests"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PatientDashboard } from "@/components/patient/enhanced-dashboard"

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

  // Fetch all dashboard data in parallel
  const [requestsResult, prescriptionsResult, invoicesResult, paymentMethodsResult] = await Promise.all([
    // Get patient requests
    supabase
      .from("requests")
      .select("*")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(100),

    // Get patient prescriptions
    supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .order("issued_date", { ascending: false })
      .limit(50),

    // Get patient invoices
    supabase
      .from("invoices")
      .select("*")
      .eq("customer_id", patientId)
      .order("created_at", { ascending: false })
      .limit(50),

    // Get payment methods (stored via Stripe integration)
    supabase
      .from("payment_methods")
      .select("*")
      .eq("customer_id", patientId)
      .eq("deleted", false)
      .limit(10),
  ])

  return (
    <PatientDashboard
      fullName={authUser.profile.full_name || "Patient"}
      email={authUser.user.email || ""}
      requests={requestsResult.data || []}
      prescriptions={prescriptionsResult.data || []}
      invoices={invoicesResult.data || []}
      paymentMethods={paymentMethodsResult.data || []}
    />
  )
}
