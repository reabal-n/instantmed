import type { Metadata } from "next"
import type React from "react"

import { requireRole } from "@/lib/auth/helpers"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

import { PatientShell } from "./patient-shell"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Fetch the unread notification count for the LeftRail bell badge.
 *
 * Uses count={head: true} so only the count is returned, not row payloads.
 * Tolerant of failures: returns 0 on any error so a notifications-table
 * outage never breaks the patient layout.
 */
async function getUnreadNotificationCount(profileId: string): Promise<number> {
  try {
    const supabase = createServiceRoleClient()
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profileId)
      .eq("read", false)
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function PatientLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  const authUser = await requireRole(["patient"])
  const unreadNotifications = await getUnreadNotificationCount(authUser.profile.id)

  return (
    <PatientShell
      user={{
        id: authUser.profile.id,
        name: authUser.profile.full_name,
        email: authUser.user.email ?? '',
        avatar: undefined,
      }}
      unreadNotifications={unreadNotifications}
    >
      {modal}
      {children}
    </PatientShell>
  )
}
