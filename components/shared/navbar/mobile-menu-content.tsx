"use client"

import {
  FileText,
  User,
  LayoutDashboard,
  ClipboardList,
  Settings,
  ListChecks,
  DollarSign,
} from "lucide-react"
import { AnimatedMobileMenu } from "@/components/ui/animated-mobile-menu"
import { services } from "@/components/shared/navbar/services-dropdown"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"

interface MobileMenuContentProps {
  variant: "marketing" | "patient" | "doctor"
  onClose: () => void
}

export function MobileMenuContent({ variant, onClose }: MobileMenuContentProps) {
  const { isServiceDisabled } = useServiceAvailability()

  if (variant === "marketing") {
    return (
      <>
        <AnimatedMobileMenu.Section title="Services" />
        {services.map((service, index) => (
          <AnimatedMobileMenu.Item
            key={service.href}
            item={{
              label: service.title,
              href: service.href,
              description: isServiceDisabled(service.serviceId) ? "Temporarily unavailable" : service.description,
              icon: <service.icon className="h-5 w-5" />,
              disabled: isServiceDisabled(service.serviceId),
            }}
            index={index}
            onClose={onClose}
          />
        ))}
        <AnimatedMobileMenu.Divider />
        <AnimatedMobileMenu.Item
          item={{ label: "How it Works", href: "/how-it-works", icon: <ListChecks className="h-5 w-5" /> }}
          index={3}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Health Guides", href: "/blog", icon: <FileText className="h-5 w-5" /> }}
          index={4}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Pricing", href: "/pricing", icon: <DollarSign className="h-5 w-5" /> }}
          index={5}
          onClose={onClose}
        />
      </>
    )
  }

  if (variant === "patient") {
    return (
      <>
        <AnimatedMobileMenu.Item
          item={{ label: "Dashboard", href: "/patient", icon: <LayoutDashboard className="h-5 w-5" /> }}
          index={0}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "My Requests", href: "/patient/intakes", icon: <ClipboardList className="h-5 w-5" /> }}
          index={1}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Settings", href: "/patient/settings", icon: <Settings className="h-5 w-5" /> }}
          index={2}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Divider />
        <AnimatedMobileMenu.Section title="New Request" />
        {services.map((service, index) => (
          <AnimatedMobileMenu.Item
            key={service.href}
            item={{
              label: service.title,
              href: service.href,
              description: isServiceDisabled(service.serviceId) ? "Temporarily unavailable" : service.description,
              icon: <service.icon className="h-5 w-5" />,
              disabled: isServiceDisabled(service.serviceId),
            }}
            index={index + 3}
            onClose={onClose}
          />
        ))}
      </>
    )
  }

  if (variant === "doctor") {
    return (
      <>
        <AnimatedMobileMenu.Item
          item={{ label: "Queue", href: "/doctor/dashboard", icon: <LayoutDashboard className="h-5 w-5" /> }}
          index={0}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Patients", href: "/doctor/patients", icon: <User className="h-5 w-5" /> }}
          index={1}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Admin", href: "/admin", icon: <Settings className="h-5 w-5" /> }}
          index={2}
          onClose={onClose}
        />
      </>
    )
  }

  return null
}
