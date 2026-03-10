import type { Metadata } from "next"
import { requireRole } from "@/lib/auth"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

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
  // Allow both admin and doctor roles to access admin portal
  const authUser = await requireRole(["admin", "doctor"], { redirectTo: "/" })

  return (
    <div className="flex min-h-screen bg-linear-to-br from-background via-blue-50/30 to-blue-50/20 dark:from-background dark:via-background dark:to-background">
      <AdminSidebar
        userName={authUser.profile.full_name}
        userRole={authUser.profile.role === "admin" ? "Admin" : "Doctor"}
      />
      <main className="flex-1 min-w-0 py-6 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
