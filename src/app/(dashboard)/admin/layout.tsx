import { redirect } from 'next/navigation'
import { requireAuth, getProfile } from '@/lib/supabase/auth'
import { AdminSidebar } from '@/components/dashboard/admin-sidebar'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth('/login')
  const profile = await getProfile()

  if (!profile) {
    redirect('/auth/complete-profile')
  }

  if (profile.role !== 'admin') {
    redirect('/patient')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar profile={profile} />
      <main className="flex-1 overflow-auto">
        <div className="container max-w-7xl py-6 px-4 md:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}
