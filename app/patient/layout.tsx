import type React from "react"
import type { Metadata } from "next"
import { requireRole } from "@/lib/auth"
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

  return (
    <PatientShell
      user={{
        id: authUser.profile.id,
        name: authUser.profile.full_name,
        email: authUser.user.email ?? '',
        avatar: undefined,
      }}
    >
      {modal}
      {children}
    </PatientShell>
  )
}
