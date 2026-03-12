import type { Metadata } from "next"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { PanelDashboard } from "@/components/patient/panel-dashboard"
import { getPatientDashboardData } from "@/lib/data/intakes"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your requests, prescriptions, and account overview.",
}

export const dynamic = "force-dynamic"

export default async function PatientDashboard() {
  const authUser = (await getAuthenticatedUserWithProfile())!
  const patientId = authUser.profile.id

  const { intakes, prescriptions, error } = await getPatientDashboardData(patientId)

  return (
    <PanelDashboard
      fullName={authUser.profile.full_name || "Patient"}
      patientId={patientId}
      intakes={intakes}
      prescriptions={prescriptions}
      error={error}
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
