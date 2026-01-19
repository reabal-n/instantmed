import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DocumentsClient } from "./documents-client"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function PatientDocumentsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/auth/login?redirect=/patient/documents")
  }

  if (!authUser.profile.onboarding_completed) {
    redirect("/patient/onboarding")
  }

  const supabase = await createClient()
  const patientId = authUser.profile.id

  // Fetch all approved intakes with documents
  const { data: intakes } = await supabase
    .from("intakes")
    .select(`
      id,
      status,
      service_type,
      created_at,
      updated_at,
      certificate_url,
      certificate_generated_at,
      service:services!service_id(name, short_name)
    `)
    .eq("patient_id", patientId)
    .eq("status", "approved")
    .not("certificate_url", "is", null)
    .order("updated_at", { ascending: false })

  // Fetch payment receipts
  const { data: payments } = await supabase
    .from("intakes")
    .select(`
      id,
      stripe_checkout_session_id,
      amount_paid,
      paid_at,
      service_type,
      service:services!service_id(name, short_name)
    `)
    .eq("patient_id", patientId)
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(20)

  const documents = {
    certificates: (intakes || []).map((i) => {
      const service = Array.isArray(i.service) ? i.service[0] : i.service
      return {
        id: i.id,
        type: "certificate" as const,
        serviceType: i.service_type,
        serviceName: service?.name || service?.short_name || "Medical Certificate",
        url: i.certificate_url,
        generatedAt: i.certificate_generated_at || i.updated_at,
      }
    }),
    receipts: (payments || []).map((p) => {
      const service = Array.isArray(p.service) ? p.service[0] : p.service
      return {
        id: p.id,
        type: "receipt" as const,
        serviceType: p.service_type,
        serviceName: service?.name || service?.short_name || "Payment",
        amount: p.amount_paid,
        paidAt: p.paid_at,
        stripeSessionId: p.stripe_checkout_session_id,
      }
    }),
  }

  return <DocumentsClient documents={documents} />
}
