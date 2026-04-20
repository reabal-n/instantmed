import type { Metadata } from "next"
import { redirect } from 'next/navigation'

import { getAuthenticatedUserWithProfile } from '@/lib/auth/helpers'

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

  const role = authUser.profile.role
  if (role === 'doctor' || role === 'admin') {
    redirect('/doctor/dashboard')
  }

  redirect('/patient')
}
