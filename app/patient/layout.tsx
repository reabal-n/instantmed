import type { Metadata } from "next"
import type React from "react"

import { resolveProfileAvatarUrl } from "@/lib/account/avatar-storage"
import { requireRole } from "@/lib/auth/helpers"

import { PatientShell } from "./patient-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const authUser = await requireRole(["patient"])
  const avatarUrl = await resolveProfileAvatarUrl(authUser.profile.avatar_url)

  return (
    <PatientShell
      user={{
        name: authUser.profile.full_name,
        email: authUser.user.email ?? '',
        avatar: avatarUrl ?? undefined,
      }}
    >
      {children}
    </PatientShell>
  )
}
