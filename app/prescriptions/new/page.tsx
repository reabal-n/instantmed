import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { PrescriptionIntakeClient } from "./client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Request Prescription Online | InstantMed",
  description: "Request your repeat prescription online. Reviewed by AHPRA-registered Australian doctors. E-script sent to your phone if approved.",
}

export default async function NewPrescriptionPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  const profileData = authUser?.profile ? {
    fullName: authUser.profile.full_name,
    email: authUser.user?.email ?? undefined,
    dateOfBirth: authUser.profile.date_of_birth,
    medicareNumber: authUser.profile.medicare_number || undefined,
    medicareIrn: authUser.profile.medicare_irn?.toString() || undefined,
  } : undefined

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <PrescriptionIntakeClient
        isAuthenticated={!!authUser}
        profileData={profileData}
      />
    </div>
  )
}
