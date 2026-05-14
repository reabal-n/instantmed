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
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  const authUser = await requireRole(["patient"])
  const avatarUrl = await resolveProfileAvatarUrl(authUser.profile.avatar_url)

  return (
    <PatientShell
      user={{
        id: authUser.profile.id,
        name: authUser.profile.full_name,
        email: authUser.user.email ?? '',
        avatar: avatarUrl ?? undefined,
      }}
    >
      {modal}
      {children}
    </PatientShell>
  )
}
