import type { Metadata } from "next"
import { requireRole } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { getDoctorDashboardStats } from "@/lib/data/intakes"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "InstantMed admin dashboard.",
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require admin role for all admin routes
  const authUser = await requireRole(["admin"], { redirectTo: "/" })

  // Get stats for sidebar badge
  let pendingCount = 0
  try {
    const stats = await getDoctorDashboardStats()
    pendingCount = stats.in_queue
  } catch {
    // Non-blocking
  }
  
  return (
    <div className="flex min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AdminSidebar 
        userName={authUser.profile.full_name}
        userRole="Admin"
        pendingCount={pendingCount}
      />
      <main className="flex-1 min-w-0 py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
