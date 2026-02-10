"use client"

import { usePathname } from "next/navigation"
import { Dock } from "@/components/ui/dock"
import {
  LayoutDashboard,
  FileText,
  Plus,
  Bell,
  HelpCircle,
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
      href: "/patient/intakes",
      active: pathname?.startsWith("/patient/intakes"),
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
      icon: HelpCircle,
      label: "Help",
      href: "/faq",
      active: pathname === "/faq",
    },
  ]

  return <Dock items={items} position="bottom" />
}
