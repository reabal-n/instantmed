import type { Metadata } from "next"

import { AdminSidebar, MobileAdminNav } from "@/components/admin/admin-sidebar"
import { requireRole } from "@/lib/auth/helpers"
import { getStaffDisplayRole } from "@/lib/auth/staff-capabilities"

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
  // Admin-only. Doctors previously had access to revenue and exception data via
  // createServiceRoleClient-backed widgets. Clinical users stay in the doctor
  // portal; delivery and recovery surfaces are admin-owned under /admin.
  const authUser = await requireRole(["admin"], { redirectTo: "/" })

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        userName={authUser.profile.full_name}
        userRole={getStaffDisplayRole(authUser.profile)}
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
