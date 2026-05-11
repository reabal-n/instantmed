import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getAuthenticatedUserWithProfile } from "@/lib/auth/helpers"
import {
  hasAdminAccess,
  hasDoctorAccess,
  hasSupportAccess,
} from "@/lib/auth/staff-capabilities"

export const metadata: Metadata = {
  title: "Staff Dashboard",
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = "force-dynamic"

/**
 * Canonical staff dashboard URL.
 *
 * Phase 1 of the dashboard remaster (2026-05-11): this route is the future
 * home of the unified staff cockpit. Until Phase 2 lands the consolidated
 * queue surface here, it forwards to the existing landing per role. Once the
 * real cockpit lands, /admin and /doctor/dashboard will 307 HERE instead.
 */
export default async function DashboardRedirect() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect("/sign-in")
  }

  if (hasAdminAccess(authUser.profile)) {
    redirect("/admin")
  }

  if (hasDoctorAccess(authUser.profile)) {
    redirect("/doctor/dashboard")
  }

  if (hasSupportAccess(authUser.profile)) {
    redirect("/admin/ops")
  }

  redirect("/patient")
}
