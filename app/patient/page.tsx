import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
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
  // Layout enforces patient role and onboarding — just get profile for data (cached)
  const authUser = (await getAuthenticatedUserWithProfile())!

  const supabase = createServiceRoleClient()
  const patientId = authUser.profile.id

  // Fetch intakes with service info for the dashboard
  // Show more intakes on dashboard for better overview
  const [intakesResult, prescriptionsResult] = await Promise.all([
    supabase
      .from("intakes")
      .select(`id, status, created_at, updated_at, doctor_notes, service_id, service:services!service_id(id, name, short_name, type, slug)`)
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("prescriptions")
      .select("id, medication_name, dosage_instructions, issued_date, expiry_date, status")
      .eq("patient_id", patientId)
      .order("issued_date", { ascending: false })
      .limit(10),
  ])

  // Log errors but don't crash - show error state instead of empty state
  if (intakesResult.error) {
    logger.error("Failed to fetch intakes", { patientId, error: intakesResult.error.message })
  }
  if (prescriptionsResult.error) {
    logger.error("Failed to fetch prescriptions", { patientId, error: prescriptionsResult.error.message })
  }

  // Capture fetch errors for explicit display
  const fetchError = intakesResult.error || prescriptionsResult.error
    ? "Unable to load some data. Please refresh the page or try again later."
    : null

  // Unwrap service join (Supabase returns array for FK joins)
  const intakes = (intakesResult.data || []).map(row => ({
    ...row,
    service: Array.isArray(row.service) ? row.service[0] : row.service,
  }))

  return (
    <PanelDashboard
      fullName={authUser.profile.full_name || "Patient"}
      patientId={patientId}
      intakes={intakes}
      prescriptions={prescriptionsResult.data || []}
      error={fetchError}
      profileData={{
        profileId: patientId,
        phone: authUser.profile.phone,
        addressLine1: authUser.profile.address_line1,
        suburb: authUser.profile.suburb,
        state: authUser.profile.state,
        postcode: authUser.profile.postcode,
        medicareNumber: authUser.profile.medicare_number,
        medicareIrn: authUser.profile.medicare_irn,
        medicareExpiry: authUser.profile.medicare_expiry,
        consentMyhr: authUser.profile.consent_myhr,
      }}
    />
  )
}
