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
  ADMIN_ANALYTICS_HREF,
  ADMIN_DASHBOARD_HREF,
  ADMIN_DOCTOR_QUEUE_HREF,
  ADMIN_FINANCE_HREF,
  ADMIN_INTAKE_LEDGER_HREF,
  ADMIN_OPS_HREF,
  ADMIN_PATIENTS_HREF,
  ADMIN_SCRIPTS_HREF,
  ADMIN_SETTINGS_HREF,
} from "@/lib/dashboard/routes"

export interface StaffNavCounts {
  prescribingIdentityPatients: number
  scriptsToWrite: number
}

export const EMPTY_STAFF_NAV_COUNTS: StaffNavCounts = {
  prescribingIdentityPatients: 0,
  scriptsToWrite: 0,
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
      { href: "/doctor/dashboard", label: "Queue", icon: ListOrdered, badge: true },
      { href: "/doctor/scripts", label: "Scripts", icon: ClipboardList },
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
