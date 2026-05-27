import type { ReactNode } from "react"

import { AdminSidebar, MobileAdminNav } from "@/components/admin/admin-sidebar"
import { operatorNavSections, type StaffNavCounts, type StaffNavSection } from "@/lib/dashboard/staff-navigation"
import { cn } from "@/lib/utils"

interface OperatorShellProps {
  userName: string
  userRole: string
  navCounts?: StaffNavCounts
  /** Override the sidebar nav sections (admin / doctor / support). Defaults to admin operator nav. */
  navSections?: StaffNavSection[]
  /** Brand subtitle under "InstantMed". Pass "Doctor" / "Support" / etc. for role-specific framing. */
  brandLabel?: string
  /**
   * Suppress the hamburger MobileAdminNav at the top of mobile content. Use when the
   * page renders its own mobile navigation (e.g. the doctor portal's bottom tab bar).
   */
  hideMobileHamburger?: boolean
  /** Extra Tailwind class on the main content column. */
  mainClassName?: string
  /** Max width of the main content container. Defaults to 1440px. */
  contentMaxWidth?: "default" | "wide"
  children: ReactNode
}

export function OperatorShell({
  userName,
  userRole,
  navCounts,
  navSections,
  brandLabel,
  hideMobileHamburger = false,
  mainClassName,
  contentMaxWidth = "default",
  children,
}: OperatorShellProps) {
  const resolvedSections = navSections ?? operatorNavSections
  return (
    <div
      data-operator-shell
      className="flex min-h-screen bg-[#F7F3EC] text-foreground dark:bg-background"
    >
      <AdminSidebar
        userName={userName}
        userRole={userRole}
        navCounts={navCounts}
        navSections={resolvedSections}
        brandLabel={brandLabel}
      />
      <main
        className={cn(
          "min-w-0 flex-1 bg-[#F7F3EC] px-4 py-8 transition-colors duration-150 dark:bg-background sm:px-6 lg:px-8",
          mainClassName,
        )}
      >
        <div
          className={cn(
            "mx-auto",
            contentMaxWidth === "wide" ? "max-w-7xl" : "max-w-[1440px]",
          )}
        >
          {!hideMobileHamburger && (
            <div className="mb-4 lg:hidden">
              <MobileAdminNav
                navCounts={navCounts}
                navSections={navSections}
                brandLabel={brandLabel}
              />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  )
}
