import { requireRole } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { PrescriptionsClient } from "./client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Prescriptions | InstantMed",
  description: "View your prescription history and manage repeat prescriptions.",
}

export const dynamic = "force-dynamic"

export default async function PrescriptionsPage() {
  const authUser = await requireRole(["patient"])

  const supabase = createServiceRoleClient()
  const patientId = authUser.profile.id

  // Fetch prescription-related intakes (limit for performance)
  const { data: prescriptionIntakes, error: intakesError } = await supabase
    .from("intakes")
    .select(`
      id,
      reference_number,
      status,
      category,
      subtype,
      created_at,
      updated_at,
      approved_at
    `)
    .eq("patient_id", patientId)
    .eq("category", "prescription")
    .order("created_at", { ascending: false })
    .limit(50)

  // Fetch intake answers for medication names
  const intakeIds = prescriptionIntakes?.map(i => i.id) || []
  let medicationMap: Record<string, string> = {}

  if (intakeIds.length > 0) {
    const { data: answers } = await supabase
      .from("intake_answers")
      .select("intake_id, answers")
      .in("intake_id", intakeIds)

    medicationMap = (answers || []).reduce((acc, a) => {
      const medName = a.answers?.medication_display ||
                      a.answers?.medication_name ||
                      a.answers?.drug_name ||
                      null
      if (medName) {
        acc[a.intake_id] = medName as string
      }
      return acc
    }, {} as Record<string, string>)
  }

  // Fetch from prescriptions table for active prescriptions (limit for performance)
  const { data: activePrescriptions, error: prescriptionsError } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("patient_id", patientId)
    .order("issued_date", { ascending: false })
    .limit(50)

  // Capture error for display
  const fetchError = intakesError || prescriptionsError ? "Unable to load some prescriptions. Please try again later." : null

  // Transform intakes to include service object for compatibility
  const intakesWithService = (prescriptionIntakes || []).map(i => ({
    ...i,
    service: { id: "prescription", name: i.category || "Prescription", short_name: i.category || "Rx", slug: "prescription", type: "prescription" }
  }))

  return (
    <PrescriptionsClient
      prescriptionIntakes={intakesWithService}
      medicationMap={medicationMap}
      activePrescriptions={activePrescriptions || []}
      error={fetchError}
    />
  )
}
