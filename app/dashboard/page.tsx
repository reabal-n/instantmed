import type { Metadata } from "next"
import { redirect } from 'next/navigation'

import { getAuthenticatedUserWithProfile } from '@/lib/auth/helpers'
import { hasAdminAccess, hasDoctorAccess } from '@/lib/auth/staff-capabilities'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function DashboardRedirect() {
  const authUser = await getAuthenticatedUserWithProfile()

  if (!authUser) {
    redirect('/sign-in')
  }

  if (hasAdminAccess(authUser.profile)) {
    redirect("/admin")
  }

  if (hasDoctorAccess(authUser.profile)) {
    redirect('/doctor/dashboard')
  }

  redirect('/patient')
}
