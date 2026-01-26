import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DocumentsClient } from "./documents-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function PatientDocumentsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in?redirect=/patient/documents")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const supabase = createServiceRoleClient()
  const patientId = authUser.profile.id

  // Fetch approved intakes with documents (limit for performance)
  const { data: intakes, error: intakesError } = await supabase
    .from("intakes")
    .select(`
      id,
      status,
      service_type,
      created_at,
      updated_at,
      certificate_url,
      certificate_generated_at,
      category
    `)
    .eq("patient_id", patientId)
    .eq("status", "approved")
    .not("certificate_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(50)

  // Fetch payment receipts (limit for performance)
  const { data: payments, error: paymentsError } = await supabase
    .from("intakes")
    .select(`
      id,
      stripe_checkout_session_id,
      amount_paid,
      paid_at,
      service_type,
      category
    `)
    .eq("patient_id", patientId)
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(50)

  // Pass error states to client for display
  const fetchError = intakesError || paymentsError ? "Unable to load some documents. Please try again later." : null

  const documents = {
    certificates: (intakes || []).map((i) => {
      return {
        id: i.id,
        type: "certificate" as const,
        serviceType: i.service_type,
        serviceName: i.category || "Medical Certificate",
        url: i.certificate_url,
        generatedAt: i.certificate_generated_at || i.updated_at,
      }
    }),
    receipts: (payments || []).map((p) => {
      return {
        id: p.id,
        type: "receipt" as const,
        serviceType: p.service_type,
        serviceName: p.category || "Payment",
        amount: p.amount_paid,
        paidAt: p.paid_at,
        stripeSessionId: p.stripe_checkout_session_id,
      }
    }),
  }

  return <DocumentsClient documents={documents} error={fetchError} />
}
