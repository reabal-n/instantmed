"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
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

export const services: Array<{ serviceId: ServiceId; title: string; href: string; description: string; icon: typeof FileText; badge?: string }> = [
  { serviceId: "med-cert", title: "Medical Certificates", href: "/medical-certificate", description: "Work, uni & carer's leave", icon: FileText },
  { serviceId: "scripts", title: "Repeat Medication", href: "/repeat-prescriptions", description: "Medications you already take", icon: Pill },
  { serviceId: "consult", title: "ED Treatment", href: "/erectile-dysfunction", description: "Discreet, no call needed", icon: HeartPulse, badge: "Popular" },
  { serviceId: "consult", title: "Hair Loss Treatment", href: "/hair-loss", description: "Doctor-reviewed treatment plan", icon: Sparkles },
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
    isActivePath("/hair-loss")

  const handleTriggerMouseEnter = () => {
    services.forEach(service => router.prefetch(service.href))
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
              </motion.div>
            </DropdownMenuContent>
          )}
        </AnimatePresence>
      </DropdownMenu>

      {/* Tubelight active indicator — mirrors AnimatedNavLink pattern */}
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
