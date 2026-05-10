import type { ReactNode } from "react"

import { AdminSidebar, MobileAdminNav } from "@/components/admin/admin-sidebar"

interface OperatorShellProps {
  userName: string
  userRole: string
  children: ReactNode
}

export function OperatorShell({ userName, userRole, children }: OperatorShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar userName={userName} userRole={userRole} />
      <main className="flex-1 min-w-0 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-4 lg:hidden">
            <MobileAdminNav />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
