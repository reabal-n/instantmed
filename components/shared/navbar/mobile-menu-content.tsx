"use client"

import {
  ChevronDown,
  ClipboardList,
  DollarSign,
  Info,
  LayoutDashboard,
  Mail,
  Settings,
  User,
} from "lucide-react"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { useServiceAvailability } from "@/components/providers/service-availability-provider"
import { services } from "@/components/shared/navbar/services-dropdown"
import { AnimatedMobileMenu } from "@/components/ui/animated-mobile-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  STAFF_DOCTOR_PATIENTS_HREF,
  STAFF_DOCTOR_SCRIPTS_HREF,
  STAFF_IDENTITY_HREF,
  STAFF_QUEUE_HREF,
} from "@/lib/dashboard/routes"

interface MobileMenuContentProps {
  variant: "marketing" | "patient" | "doctor"
  onClose: () => void
}

export function MobileMenuContent({ variant, onClose }: MobileMenuContentProps) {
  const { isServiceDisabled } = useServiceAvailability()

  if (variant === "marketing") {
    return (
      <>
        <li className="list-none">
          <Collapsible>
            <CollapsibleTrigger
              className="group flex min-h-14 w-full items-center justify-between rounded-xl px-4 text-base font-medium hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") event.stopPropagation()
              }}
            >
              Services
              <ChevronDown className="h-4 w-4 group-data-[state=open]:rotate-180" aria-hidden="true" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <ul aria-label="Services" className="pb-2">
                {services.map((service, index) => (
                  <AnimatedMobileMenu.Item
                    key={service.href}
                    item={{
                      label: service.title,
                      href: service.href,
                      description: isServiceDisabled(service.serviceId) ? "Temporarily unavailable" : undefined,
                      icon: <ServiceIconTile iconKey={service.iconKey} color={service.color} size="sm" variant="sticker" />,
                      disabled: isServiceDisabled(service.serviceId),
                    }}
                    index={index}
                    onClose={onClose}
                  />
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </li>
        <AnimatedMobileMenu.Item
          item={{ label: "How it works", href: "/how-it-works", icon: <Info className="h-5 w-5" /> }}
          index={0}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Pricing", href: "/pricing", icon: <DollarSign className="h-5 w-5" /> }}
          index={1}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Contact us", href: "/contact", icon: <Mail className="h-5 w-5" /> }}
          index={2}
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
          item={{ label: "Queue", href: STAFF_QUEUE_HREF, icon: <LayoutDashboard className="h-5 w-5" /> }}
          index={0}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Scripts", href: STAFF_DOCTOR_SCRIPTS_HREF, icon: <ClipboardList className="h-5 w-5" /> }}
          index={1}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Patients", href: STAFF_DOCTOR_PATIENTS_HREF, icon: <User className="h-5 w-5" /> }}
          index={2}
          onClose={onClose}
        />
        <AnimatedMobileMenu.Item
          item={{ label: "Identity", href: STAFF_IDENTITY_HREF, icon: <Settings className="h-5 w-5" /> }}
          index={3}
          onClose={onClose}
        />
      </>
    )
  }

  return null
}
