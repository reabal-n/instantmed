import {
  Activity,
  BarChart3,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  ListOrdered,
  type LucideIcon,
  Settings,
  Shield,
  Stethoscope,
  Users,
} from "lucide-react"

import {
  hasAdminAccess,
  hasDoctorAccess,
  hasStaffAccess,
  hasSupportAccess,
} from "@/lib/auth/staff-capabilities"
import {
  ADMIN_ANALYTICS_HREF,
  ADMIN_DASHBOARD_HREF,
  ADMIN_DOCTOR_QUEUE_HREF,
  ADMIN_EMAIL_HUB_HREF,
  ADMIN_FINANCE_HREF,
  ADMIN_INTAKE_LEDGER_HREF,
  ADMIN_OPS_HREF,
  ADMIN_PARCHMENT_OPS_HREF,
  ADMIN_PATIENTS_HREF,
  ADMIN_PRESCRIBING_IDENTITY_HREF,
  ADMIN_SCRIPTS_HREF,
  ADMIN_SETTINGS_HREF,
  ADMIN_WEBHOOK_DLQ_HREF,
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

export interface StaffNavItem {
  href: string
  label: string
  icon: LucideIcon
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
    title: "Work",
    items: [
      { href: ADMIN_DASHBOARD_HREF, label: "Dashboard", icon: LayoutDashboard },
      { href: ADMIN_INTAKE_LEDGER_HREF, label: "Intake ledger", icon: ListOrdered },
      { href: ADMIN_DOCTOR_QUEUE_HREF, label: "Queue", icon: Stethoscope },
      { href: ADMIN_SCRIPTS_HREF, label: "Scripts", icon: ClipboardList, badgeKey: "scriptsToWrite", badgeTone: "primary" },
      { href: ADMIN_PATIENTS_HREF, label: "Patients", icon: Users, badgeKey: "prescribingIdentityPatients", badgeTone: "warning" },
    ],
  },
  {
    title: "Business",
    items: [
      { href: ADMIN_ANALYTICS_HREF, label: "Analytics", icon: BarChart3 },
      { href: ADMIN_FINANCE_HREF, label: "Finance", icon: DollarSign },
      { href: ADMIN_OPS_HREF, label: "Operations", icon: Activity },
    ],
  },
  {
    title: "Configure",
    items: [
      { href: ADMIN_SETTINGS_HREF, label: "Settings", icon: Settings },
    ],
  },
]

export const doctorNavSections: StaffNavSection[] = [
  {
    title: "Work",
    items: [
      { href: "/doctor/dashboard", label: "Queue", icon: ListOrdered, badge: true, badgeKey: "inQueue", badgeTone: "primary" },
      { href: "/doctor/scripts", label: "Scripts", icon: ClipboardList, badgeKey: "scriptsToWrite", badgeTone: "primary" },
      { href: "/doctor/patients", label: "Patients", icon: Users },
    ],
  },
  {
    title: "Practice",
    items: [
      { href: "/doctor/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/doctor/settings/identity", label: "Identity", icon: Settings },
    ],
  },
]

export const doctorOperatorNavItems: StaffNavItem[] = [
  { href: ADMIN_DASHBOARD_HREF, label: "Operations", icon: Shield },
]

// ── Canonical role-aware nav (Phase 1 of dashboard remaster, 2026-05-11) ────
// `getStaffNav(profile)` is the single source of truth going forward. The
// legacy exports above stay for back-compat until Phase 2 finishes the surface
// consolidation; new sidebars and command palettes should call this function.
//
// Support staff get a deliberately minimal nav: operations recovery
// surfaces only. No patient directory (full PHI), no clinical queue,
// no prescriptions. The links here all target pages that either show
// masked PHI (prescribing identity) or no PHI at all (ops, webhooks,
// email queue counts). Phase 7 of dashboard remaster (2026-05-12)
// removed the legacy `/admin/patients` entry — it was a misleading
// link, since `requireRole(["admin"])` on that page would have
// rejected support anyway.

export const supportNavSections: StaffNavSection[] = [
  {
    title: "Operations",
    items: [
      { href: ADMIN_OPS_HREF, label: "Operations", icon: Activity },
      { href: ADMIN_PRESCRIBING_IDENTITY_HREF, label: "Identity chase-ups", icon: Users },
      { href: ADMIN_EMAIL_HUB_HREF, label: "Email queue", icon: ClipboardList },
      { href: ADMIN_WEBHOOK_DLQ_HREF, label: "Webhook retries", icon: Shield },
      { href: ADMIN_PARCHMENT_OPS_HREF, label: "Parchment recovery", icon: Stethoscope },
    ],
  },
  {
    title: "Configure",
    items: [
      { href: ADMIN_SETTINGS_HREF, label: "My settings", icon: Settings },
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
