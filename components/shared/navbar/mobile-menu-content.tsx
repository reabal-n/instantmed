"use client"

import {
  BookOpen,
  Building2,
  ClipboardList,
  DollarSign,
  HelpCircle,
  Info,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Stethoscope,
  User,
} from "lucide-react"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { services } from "@/components/shared/navbar/services-dropdown"
import { AnimatedMobileMenu } from "@/components/ui/animated-mobile-menu"

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
              icon: <ServiceIconTile iconKey={service.iconKey} color={service.color} size="sm" variant="sticker" />,
              disabled: isServiceDisabled(service.serviceId),
            }}
            index={index}
            onClose={onClose}
          />
        ))}
        <AnimatedMobileMenu.Divider />
        <AnimatedMobileMenu.Section title="Resources" />
        <AnimatedMobileMenu.Item
          item={{ label: "How it Works", href: "/how-it-works", icon: <Info className="h-5 w-5" /> }}
          index={services.length}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Pricing", href: "/pricing", icon: <DollarSign className="h-5 w-5" /> }}
          index={services.length + 1}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Health Guides", href: "/blog", icon: <BookOpen className="h-5 w-5" /> }}
          index={services.length + 2}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "FAQs", href: "/faq", icon: <HelpCircle className="h-5 w-5" /> }}
          index={services.length + 3}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Divider />
        <AnimatedMobileMenu.Section title="Company" />
        <AnimatedMobileMenu.Item
          item={{ label: "About Us", href: "/about", icon: <Info className="h-5 w-5" /> }}
          index={services.length + 4}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Reviews", href: "/reviews", icon: <ShieldCheck className="h-5 w-5" /> }}
          index={services.length + 5}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Trust & Safety", href: "/trust", icon: <ShieldCheck className="h-5 w-5" /> }}
          index={services.length + 6}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Clinical Governance", href: "/clinical-governance", icon: <Stethoscope className="h-5 w-5" /> }}
          index={services.length + 7}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "For Employers", href: "/for/employers", icon: <Building2 className="h-5 w-5" /> }}
          index={services.length + 8}
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
              icon: <ServiceIconTile iconKey={service.iconKey} color={service.color} size="sm" variant="sticker" />,
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
