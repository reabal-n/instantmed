import {
  hasAdminAccess,
  hasDoctorAccess,
  hasStaffAccess,
  hasSupportAccess,
} from "@/lib/auth/staff-capabilities"
import {
  STAFF_ANALYTICS_HREF,
  STAFF_DASHBOARD_HREF,
  STAFF_DOCTOR_PATIENTS_HREF,
  STAFF_DOCTOR_SCRIPTS_HREF,
  STAFF_IDENTITY_HREF,
  STAFF_LEDGER_HREF,
  STAFF_OPS_HREF,
  STAFF_PATIENTS_HREF,
  STAFF_QUEUE_HREF,
  STAFF_SCRIPTS_HREF,
  STAFF_SETTINGS_HREF,
} from "@/lib/dashboard/routes"
import type { Profile } from "@/types/db"

export interface StaffNavCounts {
  prescribingIdentityPatients: number
  scriptsToWrite: number
  inQueue: number
}

export const EMPTY_STAFF_NAV_COUNTS: StaffNavCounts = {
  prescribingIdentityPatients: 0,
  scriptsToWrite: 0,
  inQueue: 0,
}

export type StaffNavIconKey =
  | "activity"
  | "analytics"
  | "dashboard"
  | "dollar"
  | "identity"
  | "intakeLedger"
  | "queue"
  | "scripts"
  | "settings"
  | "shield"
  | "users"

export interface StaffNavItem {
  href: string
  label: string
  icon: StaffNavIconKey
  badge?: boolean
  badgeKey?: keyof StaffNavCounts
  badgeTone?: "primary" | "warning"
}

export interface StaffNavSection {
  title: string
  items: StaffNavItem[]
}

export const operatorNavSections: StaffNavSection[] = [
  {
    title: "Today",
    items: [
      { href: STAFF_DASHBOARD_HREF, label: "Dashboard", icon: "dashboard" },
      { href: STAFF_LEDGER_HREF, label: "Ledger", icon: "intakeLedger" },
      { href: STAFF_QUEUE_HREF, label: "Review", icon: "queue" },
      { href: STAFF_SCRIPTS_HREF, label: "Scripts", icon: "scripts", badgeKey: "scriptsToWrite", badgeTone: "primary" },
      { href: STAFF_PATIENTS_HREF, label: "Patients", icon: "users", badgeKey: "prescribingIdentityPatients", badgeTone: "warning" },
    ],
  },
  {
    title: "Run",
    items: [
      { href: STAFF_ANALYTICS_HREF, label: "Overview", icon: "analytics" },
      { href: STAFF_OPS_HREF, label: "Ops", icon: "activity" },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: STAFF_SETTINGS_HREF, label: "Setup", icon: "settings" },
    ],
  },
]

export const doctorNavSections: StaffNavSection[] = [
  {
    title: "Work",
    items: [
      { href: STAFF_QUEUE_HREF, label: "Queue", icon: "intakeLedger", badge: true, badgeKey: "inQueue", badgeTone: "primary" },
      { href: STAFF_DOCTOR_SCRIPTS_HREF, label: "Scripts", icon: "scripts", badgeKey: "scriptsToWrite", badgeTone: "primary" },
      { href: STAFF_DOCTOR_PATIENTS_HREF, label: "Patients", icon: "users" },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: STAFF_IDENTITY_HREF, label: "Identity", icon: "settings" },
    ],
  },
]

export const doctorOperatorNavItems: StaffNavItem[] = [
  { href: STAFF_DASHBOARD_HREF, label: "Operations", icon: "shield" },
]

// ── Canonical role-aware nav ────────────────────────────────────────────────
// `getStaffNav(profile)` is the single source of truth for resolving the staff
// shell by role. The exported section arrays stay because mobile and sidebar
// surfaces render the same items differently.
//
// Support staff get deliberately minimal navigation. `/admin/ops` is the
// bounded recovery cockpit and `/admin/intakes` is the metadata ledger for
// request/payment lookup. Nested webhook, Parchment, and prescribing identity
// pages with masked PHI / redacted payload details stay linked from Ops cards
// only, which avoids a second support dashboard while preserving the access
// boundary.
// Phase 7 of dashboard remaster (2026-05-12) removed the legacy
// `/admin/patients` entry because it was a misleading PHI-heavy link.

export const supportNavSections: StaffNavSection[] = [
  {
    title: "Operations",
    items: [
      { href: STAFF_OPS_HREF, label: "Operations", icon: "activity" },
      // Phase 8 (2026-05-20): refund workflow opened to support. Ledger
      // shows ref/service/status/refund chips but no clinical answers.
      { href: STAFF_LEDGER_HREF, label: "Ledger", icon: "intakeLedger" },
    ],
  },
]

export function getStaffNav(profile: Pick<Profile, "role">): StaffNavSection[] {
  if (hasAdminAccess(profile)) {
    return operatorNavSections
  }
  if (hasDoctorAccess(profile)) {
    return doctorNavSections
  }
  if (hasSupportAccess(profile)) {
    return supportNavSections
  }
  return []
}

/** Whether this profile should see ANY staff-shell nav at all. */
export function shouldShowStaffNav(profile: Pick<Profile, "role">): boolean {
  return hasStaffAccess(profile)
}
