"use client"

import { usePathname } from "next/navigation"
import { Dock } from "@/components/ui/dock"
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
} from "lucide-react"

interface DoctorDockProps {
  pendingCount?: number
}

export function DoctorDock({ pendingCount = 0 }: DoctorDockProps) {
  const pathname = usePathname()

  const items = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/doctor",
      active: pathname === "/doctor",
    },
    {
      icon: ClipboardList,
      label: "Queue",
      href: "/doctor/queue",
      active: pathname === "/doctor/queue",
      badge: pendingCount,
    },
    {
      icon: Users,
      label: "Patients",
      href: "/doctor/patients",
      active: pathname === "/doctor/patients",
    },
    {
      icon: BarChart3,
      label: "Analytics",
      href: "/doctor/analytics",
      active: pathname === "/doctor/analytics",
    },
    {
      icon: Settings,
      label: "Admin",
      href: "/doctor/admin",
      active: pathname === "/doctor/admin",
    },
  ]

  return <Dock items={items} position="bottom" />
}
