import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { MedCertIntakeClient } from "./client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Get Medical Certificate | InstantMed",
  description: "Get a legitimate medical certificate online in minutes. Reviewed by Australian-registered doctors. Fast, secure, and convenient.",
}

export default async function NewMedCertPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const authUser = await getAuthenticatedUserWithProfile()
  const { type } = await searchParams

  const profileData = authUser?.profile ? {
    fullName: authUser.profile.full_name,
    email: authUser.user?.email ?? undefined,
    dateOfBirth: authUser.profile.date_of_birth,
    medicareNumber: authUser.profile.medicare_number || undefined,
    medicareIrn: authUser.profile.medicare_irn?.toString() || undefined,
  } : undefined

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/30">
      <MedCertIntakeClient
        subtype={type}
        isAuthenticated={!!authUser}
        profileData={profileData}
      />
    </div>
  )
}
