"use client"

import { AnimatePresence,motion } from "framer-motion"
import { Building2,ChevronDown } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { ServiceIconTile } from "@/components/icons/service-icons"
import { type ServiceId,useServiceAvailability } from "@/components/providers/service-availability-provider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

export const services: Array<{ serviceId: ServiceId; title: string; href: string; description: string; iconKey: string; color: string; badge?: string }> = [
  { serviceId: "med-cert", title: "Medical Certificates", href: "/medical-certificate", description: "Work, uni & carer's leave",       iconKey: "FileText",  color: "emerald" },
  { serviceId: "scripts",  title: "Repeat Medication",    href: "/repeat-prescriptions",  description: "Medications you already take", iconKey: "Pill",       color: "cyan"    },
  { serviceId: "consult",  title: "ED Treatment",         href: "/erectile-dysfunction",  description: "Discreet, no call needed",     iconKey: "Lightning",  color: "blue",   badge: "Popular" },
  { serviceId: "consult",  title: "Hair Loss Treatment",  href: "/hair-loss",             description: "Doctor-reviewed treatment plan", iconKey: "Sparkles", color: "violet"  },
]

interface ServicesDropdownProps {
  isActivePath: (path: string) => boolean
}

export function ServicesDropdown({ isActivePath }: ServicesDropdownProps) {
  const { isServiceDisabled } = useServiceAvailability()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const isServiceActive =
    isActivePath("/medical-certificate") ||
    isActivePath("/prescriptions") ||
    isActivePath("/repeat-prescriptions") ||
    isActivePath("/erectile-dysfunction") ||
    isActivePath("/hair-loss") ||
    isActivePath("/for/employers")

  const handleTriggerMouseEnter = () => {
    services.forEach(service => router.prefetch(service.href))
    router.prefetch("/for/employers")
  }

  return (
    <div className="relative">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            onMouseEnter={handleTriggerMouseEnter}
            className={cn(
              "group/services relative z-10 flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isServiceActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Services
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform duration-200",
              open && "rotate-180"
            )} />
          </button>
        </DropdownMenuTrigger>

        <AnimatePresence>
          {open && (
            <DropdownMenuContent
              forceMount
              loop
              align="start"
              className="w-64 rounded-2xl border border-dawn-200/40 dark:border-white/10 bg-white/90 dark:bg-white/10 backdrop-blur-xl p-0 overflow-hidden shadow-xl shadow-primary/[0.08]"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={prefersReducedMotion ? {} : { opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="p-2"
              >
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
                          <ServiceIconTile iconKey={service.iconKey} color={service.color} size="sm" />
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
                          <ServiceIconTile iconKey={service.iconKey} color={service.color} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{service.title}</p>
                              {service.badge && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">
                                  {service.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{service.description}</p>
                          </div>
                        </Link>
                      )}
                    </DropdownMenuItem>
                  )
                })}

                <DropdownMenuSeparator className="my-1.5 bg-border/40" />
                <DropdownMenuItem asChild className="rounded-xl p-0 focus:bg-primary/10 dark:focus:bg-primary/20">
                  <Link href="/for/employers" className="flex items-center gap-3 px-3 py-2.5 w-full">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">For Employers</p>
                      <p className="text-xs text-muted-foreground">Verify certificates</p>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </motion.div>
            </DropdownMenuContent>
          )}
        </AnimatePresence>
      </DropdownMenu>

      {/* Tubelight active indicator - mirrors AnimatedNavLink pattern */}
      {isServiceActive && (
        <div className="absolute inset-0 rounded-lg bg-primary/10 -z-0 pointer-events-none">
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full">
            <div className="absolute w-8 h-4 bg-primary/20 rounded-full blur-md -top-1 -left-1" />
          </div>
        </div>
      )}
    </div>
  )
}
