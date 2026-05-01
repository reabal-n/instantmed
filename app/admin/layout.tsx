import type { Metadata } from "next"

import { AdminSidebar, MobileAdminNav } from "@/components/admin/admin-sidebar"
import { requireRole } from "@/lib/auth/helpers"

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "InstantMed admin dashboard.",
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Admin-only. Doctors previously had access (yesterday-widget renders
  // Stripe revenue + open disputes via createServiceRoleClient — RLS-bypassing,
  // PHI-adjacent). Tightened in Phase 0 hotfix 2026-04-29; doctors with a real
  // need can use /doctor/analytics + /doctor/email-suppression instead.
  const authUser = await requireRole(["admin"], { redirectTo: "/" })

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        userName={authUser.profile.full_name}
        userRole="Admin"
      />
      <main className="flex-1 min-w-0 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 lg:hidden">
            <MobileAdminNav />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
