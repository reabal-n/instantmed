import { redirect } from 'next/navigation'
import { requireAuth, getProfile } from '@/lib/supabase/auth'
import { PatientSidebar } from '@/components/dashboard/patient-sidebar'

export default async function PatientDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth('/login')
  const profile = await getProfile()

  if (!profile) {
    redirect('/auth/complete-profile')
  }

  if (profile.role !== 'patient') {
    redirect('/admin')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <PatientSidebar profile={profile} />
      <main className="flex-1 overflow-auto">
        <div className="container max-w-6xl py-6 px-4 md:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
