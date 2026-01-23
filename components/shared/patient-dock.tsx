"use client"

import { usePathname } from "next/navigation"
import { Dock } from "@/components/ui/dock"
import {
  LayoutDashboard,
  FileText,
  Plus,
  Settings,
  Bell,
} from "lucide-react"

export function PatientDock() {
  const pathname = usePathname()

  const items = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/patient",
      active: pathname === "/patient",
    },
    {
      icon: FileText,
      label: "My Requests",
      href: "/patient/requests",
      active: pathname?.startsWith("/patient/requests"),
    },
    {
      icon: Plus,
      label: "New Request",
      href: "/request",
      active: false,
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "/patient/notifications",
      active: pathname === "/patient/notifications",
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/patient/settings",
      active: pathname === "/patient/settings",
    },
  ]

  return <Dock items={items} position="bottom" />
}
