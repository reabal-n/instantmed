import { Suspense } from "react"

import { getEmailPreferences } from "@/app/actions/email-preferences"
import { resolveProfileAvatarUrl } from "@/lib/account/avatar-storage"
import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import { decryptIfNeeded } from "@/lib/security/encryption"

import { PatientSettingsClient } from "./settings-client"

// Prevent static generation for dynamic auth

export const dynamic = "force-dynamic"
export const metadata = {
  title: "Settings",
  description: "Manage your profile and account settings",
}

export default async function PatientSettingsPage() {
  // Layout enforces patient role - use cached profile
  const authUser = (await getAuthenticatedUserWithProfile())!

  // Decrypt sensitive fields before passing to client
  let decryptedMedicare: string | null = null
  try {
    decryptedMedicare = authUser.profile.medicare_number
      ? decryptIfNeeded(authUser.profile.medicare_number)
      : null
  } catch {
    // Decryption failure - pass null so UI doesn't crash.
    // Patient can re-enter their Medicare number in settings.
    decryptedMedicare = null
  }
  const profileWithDecryptedFields = {
    ...authUser.profile,
    medicare_number: decryptedMedicare,
  }

  // Fetch email preferences
  const [emailPreferences, avatarUrl] = await Promise.all([
    getEmailPreferences(),
    resolveProfileAvatarUrl(authUser.profile.avatar_url),
  ])

  return (
    <Suspense fallback={null}>
      <PatientSettingsClient
        profile={profileWithDecryptedFields}
        email={authUser.user.email || ""}
        avatarUrl={avatarUrl}
        emailPreferences={emailPreferences}
      />
    </Suspense>
  )
}
