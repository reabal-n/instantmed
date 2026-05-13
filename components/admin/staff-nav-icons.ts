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

import type { StaffNavIconKey } from "@/lib/dashboard/staff-navigation"

export const STAFF_NAV_ICONS: Record<StaffNavIconKey, LucideIcon> = {
  activity: Activity,
  analytics: BarChart3,
  dashboard: LayoutDashboard,
  dollar: DollarSign,
  identity: Settings,
  intakeLedger: ListOrdered,
  queue: Stethoscope,
  scripts: ClipboardList,
  settings: Settings,
  shield: Shield,
  users: Users,
}
