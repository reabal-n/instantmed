import type { ReactNode } from "react"

import { AdminSidebar, MobileAdminNav } from "@/components/admin/admin-sidebar"
import type { StaffNavCounts } from "@/lib/dashboard/staff-navigation"

interface OperatorShellProps {
  userName: string
  userRole: string
  navCounts?: StaffNavCounts
  children: ReactNode
}

export function OperatorShell({ userName, userRole, navCounts, children }: OperatorShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar userName={userName} userRole={userRole} navCounts={navCounts} />
      <main className="flex-1 min-w-0 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-4 lg:hidden">
            <MobileAdminNav navCounts={navCounts} />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
