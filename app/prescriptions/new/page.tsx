import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { PrescriptionIntakeClient } from "./client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Get Prescription Online | InstantMed",
  description: "Get your prescription online in minutes. Reviewed by Australian-registered doctors. Fast, secure, and PBS eligible.",
}

export default async function NewPrescriptionPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  const profileData = authUser?.profile ? {
    fullName: authUser.profile.full_name,
    email: authUser.user?.email,
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
