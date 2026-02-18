import { requireRole } from "@/lib/auth"
import { DocumentsClient } from "./documents-client"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

export default async function PatientDocumentsPage() {
  const authUser = await requireRole(["patient"])

  const supabase = createServiceRoleClient()
  const patientId = authUser.profile.id

  // Fetch issued certificates for this patient
  const { data: certificates, error: intakesError } = await supabase
    .from("issued_certificates")
    .select(`
      id,
      intake_id,
      certificate_type,
      status,
      storage_path,
      created_at,
      patient_name,
      start_date,
      end_date,
      intake:intakes!intake_id (
        id,
        category,
        service:services!service_id ( name, type )
      )
    `)
    .eq("patient_id", patientId)
    .eq("status", "valid")
    .order("created_at", { ascending: false })
    .limit(50)

  // Fetch payment receipts using correct column names
  const { data: payments, error: paymentsError } = await supabase
    .from("intakes")
    .select(`
      id,
      payment_id,
      amount_cents,
      paid_at,
      category,
      service:services!service_id ( name, type )
    `)
    .eq("patient_id", patientId)
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(50)

  // Pass error states to client for display
  const fetchError = intakesError || paymentsError ? "Unable to load some documents. Please try again later." : null

  const documents = {
    certificates: (certificates || []).map((c) => {
      const intake = Array.isArray(c.intake) ? c.intake[0] : c.intake
      const service = intake?.service ? (Array.isArray(intake.service) ? intake.service[0] : intake.service) : null
      return {
        id: c.id,
        type: "certificate" as const,
        serviceType: (service as { type?: string } | null)?.type || c.certificate_type,
        serviceName: (service as { name?: string } | null)?.name || (intake as { category?: string } | null)?.category || "Medical Certificate",
        url: `/api/patient/certificates/${c.id}/download`,
        generatedAt: c.created_at,
      }
    }),
    receipts: (payments || []).map((p) => {
      const service = Array.isArray(p.service) ? p.service[0] : p.service
      return {
        id: p.id,
        type: "receipt" as const,
        serviceType: (service as { type?: string } | null)?.type || null,
        serviceName: (service as { name?: string } | null)?.name || p.category || "Payment",
        amount: p.amount_cents,
        paidAt: p.paid_at,
        stripeSessionId: p.payment_id,
      }
    }),
  }

  return <DocumentsClient documents={documents} error={fetchError} />
}
