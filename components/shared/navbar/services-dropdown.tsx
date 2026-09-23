"use client"

import { ChevronDown } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { type ServiceId,useServiceAvailability } from "@/components/providers/service-availability-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  getActiveServices,
  getServiceMarketingHref,
  type ServiceDef,
} from "@/lib/services/service-catalog"
import { cn } from "@/lib/utils"

type NavService = {
  serviceId: ServiceId
  title: string
  href: string
  description: string
  iconKey: ServiceDef["iconKey"]
  color: ServiceDef["colorToken"]
}

export const services: NavService[] = getActiveServices().map((service) => ({
  serviceId: service.id,
  title: service.title,
  href: getServiceMarketingHref(service),
  description: service.subtitle,
  iconKey: service.iconKey,
  color: service.colorToken,
}))

interface ServicesDropdownProps {
  isActivePath: (path: string) => boolean
}

export function ServicesDropdown({ isActivePath }: ServicesDropdownProps) {
  const { isServiceDisabled } = useServiceAvailability()
  const [open, setOpen] = useState(false)

  const isServiceActive =
    isActivePath("/medical-certificate") ||
    isActivePath("/prescriptions") ||
    isActivePath("/erectile-dysfunction") ||
    isActivePath("/hair-loss") ||
    isActivePath("/womens-health") ||
    isActivePath("/weight-loss")

  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "group/services relative z-10 flex items-center gap-1 min-h-11 px-3 py-2 text-base font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isServiceActive ? "text-foreground underline underline-offset-8 decoration-primary/50" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Services
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform duration-200",
              open && "rotate-180"
            )} />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          loop
          align="start"
          className="w-64 rounded-2xl border border-dawn-200/40 dark:border-white/10 bg-white/90 dark:bg-white/10 backdrop-blur-xl p-0 overflow-hidden shadow-xl shadow-primary/[0.08]"
        >
          <div className="p-2">
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
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">{service.title}</p>
                            <p className="text-sm text-muted-foreground">Temporarily unavailable</p>
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={service.href}
                          prefetch={false}
                          onPointerDown={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                          className="flex items-center gap-3 px-3 py-2.5 w-full"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{service.title}</p>

                            </div>
                            <p className="text-sm text-muted-foreground">{service.description}</p>
                          </div>
                        </Link>
                      )}
                    </DropdownMenuItem>
                  )
                })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>


    </div>
  )
}
