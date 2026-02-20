import { redirect } from 'next/navigation'
import { getAuthenticatedUserWithProfile } from '@/lib/auth'

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
