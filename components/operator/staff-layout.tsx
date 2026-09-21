import type { ReactNode } from "react"

import { DoctorShell } from "@/app/doctor/doctor-shell"
import { DoctorOnboardingBanner } from "@/components/doctor/onboarding-banner"
import { OperatorShell } from "@/components/operator/operator-shell"
import { getStaffDisplayRole, hasAdminAccess, hasDoctorAccess } from "@/lib/auth/staff-capabilities"
import { EMPTY_STAFF_NAV_COUNTS, getStaffNav } from "@/lib/dashboard/staff-navigation"
import { getStaffNavCounts } from "@/lib/data/staff-nav-counts"
import { getDoctorOnboardingStatus } from "@/lib/doctor/onboarding-status"
import { createLogger } from "@/lib/observability/logger"
import type { Profile } from "@/types/db"

const log = createLogger("staff-layout")

/** Route layouts retain their access gates; the staff frame is the same on every route. */
export async function StaffLayout({ profile, children }: {
  profile: Pick<Profile, "id" | "full_name" | "role">
  children: ReactNode
}) {
  const hasClinicalAccess = hasDoctorAccess(profile)
  const isAdmin = hasAdminAccess(profile)
  const [navCounts, onboardingStatus] = await Promise.all([
    getStaffNavCounts().catch((error) => {
      log.error("Failed to load staff nav counts", {}, error instanceof Error ? error : new Error(String(error)))
      return EMPTY_STAFF_NAV_COUNTS
    }),
    hasClinicalAccess ? getDoctorOnboardingStatus(profile.id).catch((error) => {
      log.error("Failed to load doctor onboarding status", {}, error)
      return null
    }) : null,
  ])

  return (
    <OperatorShell
      userName={profile.full_name ?? "Staff"}
      userRole={getStaffDisplayRole(profile)}
      brandLabel={getStaffDisplayRole(profile)}
      navCounts={navCounts}
      navSections={getStaffNav(profile)}
      hideMobileHamburger={hasClinicalAccess && !isAdmin}
      contentMaxWidth="wide"
      mainClassName={hasClinicalAccess
        ? "py-5 pb-[calc(7rem+env(safe-area-inset-bottom))] lg:border-l lg:border-border/40 lg:py-5 lg:pb-5"
        : "py-5 lg:py-5"}
    >
      {hasClinicalAccess ? (
        <DoctorShell isAdmin={isAdmin}>
          <div className="staff-workspace">
            <DoctorOnboardingBanner data={onboardingStatus} />
            {children}
          </div>
        </DoctorShell>
      ) : <div className="staff-workspace">{children}</div>}
    </OperatorShell>
  )
}
