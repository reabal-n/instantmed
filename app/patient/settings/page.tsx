import { redirect } from "next/navigation"
import { getAuthenticatedUserWithProfile } from "@/lib/auth"
import { PatientSettingsClient } from "./settings-client"
import { decryptIfNeeded } from "@/lib/security/encryption"
import { getEmailPreferences } from "@/app/actions/email-preferences"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Settings | InstantMed",
  description: "Manage your profile and account settings",
}

export default async function PatientSettingsPage() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (authUser.profile.role !== "patient") {
    redirect("/doctor")
  }

  // Decrypt sensitive fields before passing to client
  const profileWithDecryptedFields = {
    ...authUser.profile,
    medicare_number: authUser.profile.medicare_number 
      ? decryptIfNeeded(authUser.profile.medicare_number) 
      : null,
  }

  // Fetch email preferences
  const emailPreferences = await getEmailPreferences()

  return (
    <PatientSettingsClient 
      profile={profileWithDecryptedFields} 
      email={authUser.user.email || ""} 
      emailPreferences={emailPreferences}
    />
  )
}
