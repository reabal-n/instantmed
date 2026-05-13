import {
  hasAdminAccess,
  hasDoctorAccess,
  hasStaffAccess,
  hasSupportAccess,
} from "@/lib/auth/staff-capabilities"
import {
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
  STAFF_ANALYTICS_HREF,
  STAFF_DASHBOARD_HREF,
  STAFF_DOCTOR_PATIENTS_HREF,
  STAFF_DOCTOR_SCRIPTS_HREF,
  STAFF_FINANCE_HREF,
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
      { href: STAFF_LEDGER_HREF, label: "Requests", icon: "intakeLedger" },
      { href: STAFF_QUEUE_HREF, label: "Review", icon: "queue" },
      { href: STAFF_SCRIPTS_HREF, label: "Scripts", icon: "scripts", badgeKey: "scriptsToWrite", badgeTone: "primary" },
      { href: STAFF_PATIENTS_HREF, label: "Patients", icon: "users", badgeKey: "prescribingIdentityPatients", badgeTone: "warning" },
    ],
  },
  {
    title: "Run",
    items: [
      { href: STAFF_ANALYTICS_HREF, label: "Analytics", icon: "analytics" },
      { href: STAFF_FINANCE_HREF, label: "Payments", icon: "dollar" },
      { href: STAFF_OPS_HREF, label: "Ops", icon: "activity" },
    ],
  },
  {
    title: "Setup",
    items: [
      { href: STAFF_SETTINGS_HREF, label: "Settings", icon: "settings" },
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

// ── Canonical role-aware nav (Phase 1 of dashboard remaster, 2026-05-11) ────
// `getStaffNav(profile)` is the single source of truth going forward. The
// legacy exports above stay for back-compat until Phase 2 finishes the surface
// consolidation; new sidebars should call this function.
//
// Support staff get a deliberately minimal nav: operations recovery
// surfaces only. No patient directory (full PHI), no email hub, no settings,
// no clinical queue, no prescriptions. The links here all target pages that
// either show masked PHI (prescribing identity/Parchment) or payload-redacted
// operational data (ops, webhooks). Phase 7 of dashboard remaster (2026-05-12)
// removed the legacy `/admin/patients` entry — it was a misleading
// link, since `requireRole(["admin"])` on that page would have
// rejected support anyway.

export const supportNavSections: StaffNavSection[] = [
  {
    title: "Operations",
    items: [
      { href: STAFF_OPS_HREF, label: "Operations", icon: "activity" },
      { href: ADMIN_WEBHOOK_DLQ_HREF, label: "Webhook retries", icon: "shield" },
      { href: ADMIN_PARCHMENT_OPS_HREF, label: "Parchment recovery", icon: "queue" },
      { href: ADMIN_PRESCRIBING_IDENTITY_HREF, label: "Identity chase-ups", icon: "users" },
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
