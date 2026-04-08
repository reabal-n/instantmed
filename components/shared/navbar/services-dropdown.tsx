"use client"

import Link from "next/link"
import {
  FileText,
  Pill,
  ChevronDown,
  HeartPulse,
  Sparkles,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useServiceAvailability, type ServiceId } from "@/components/providers/service-availability-provider"

export const services: Array<{ serviceId: ServiceId; title: string; href: string; description: string; icon: typeof FileText }> = [
  { serviceId: "med-cert", title: "Medical Certificates", href: "/medical-certificate", description: "Work, uni & carer's leave", icon: FileText },
  { serviceId: "scripts", title: "Repeat Medication", href: "/repeat-prescriptions", description: "Medications you already take", icon: Pill },
  { serviceId: "consult", title: "ED Treatment", href: "/erectile-dysfunction", description: "Discreet, no call needed", icon: HeartPulse },
  { serviceId: "consult", title: "Hair Loss Treatment", href: "/hair-loss", description: "Doctor-reviewed treatment plan", icon: Sparkles },
]

interface ServicesDropdownProps {
  isActivePath: (path: string) => boolean
}

export function ServicesDropdown({ isActivePath }: ServicesDropdownProps) {
  const { isServiceDisabled } = useServiceAvailability()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group/services flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            isActivePath("/medical-certificate") || isActivePath("/prescriptions") || isActivePath("/repeat-prescriptions") || isActivePath("/erectile-dysfunction") || isActivePath("/hair-loss")
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Services
          <ChevronDown className="h-3 w-3 transition-transform duration-200 group-data-[state=open]/services:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-2xl border border-dawn-200/40 dark:border-white/10 bg-white/90 dark:bg-white/10 backdrop-blur-xl p-2">
        {services.map((service) => {
          const disabled = isServiceDisabled(service.serviceId)
          return (
            <DropdownMenuItem
              key={service.href}
              disabled={disabled}
              asChild={!disabled}
              className="rounded-xl p-0 focus:bg-primary/10 dark:focus:bg-primary/20"
            >
              {disabled ? (
                <div className="flex items-center gap-3 px-3 py-2.5 w-full">
                  <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-accent-teal/15">
                    <service.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{service.title}</p>
                    <p className="text-xs text-muted-foreground">Temporarily unavailable</p>
                  </div>
                </div>
              ) : (
                <Link
                  href={service.href}
                  className="flex items-center gap-3 px-3 py-2.5 w-full"
                >
                  <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-accent-teal/15 transition-colors">
                    <service.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{service.title}</p>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                </Link>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
