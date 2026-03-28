"use client"

import { cn } from "@/lib/utils"
import { BadgeCheck, FileCheck, BookOpen, UserCheck, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { DottedGrid } from "@/components/marketing/dotted-grid"

const trustBadges = [
  {
    name: "AHPRA-registered doctors",
    icon: BadgeCheck,
    color: "text-success",
    iconBg: "bg-success-light",
    href: "https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
  },
  {
    name: "RACGP-aligned protocols",
    icon: BookOpen,
    color: "text-info",
    iconBg: "bg-info-light",
    href: "https://www.racgp.org.au/running-a-practice/practice-standards"
  },
  {
    name: "Medical Director oversight",
    icon: UserCheck,
    color: "text-info",
    iconBg: "bg-info-light"
  },
  {
    name: "TGA-compliant ePrescribing",
    icon: FileCheck,
    color: "text-warning",
    iconBg: "bg-warning-light"
  },
]

interface TrustBadgeSliderProps {
  className?: string
}

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section className={cn("py-10 lg:py-14 relative", className)}>
      <DottedGrid />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        {/* Trust badges grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6"
          initial={animate ? { opacity: 0, y: 20 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {trustBadges.map((badge, index) => {
            const content = (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-card border border-border/30 shadow-md shadow-primary/[0.06] hover:shadow-lg hover:shadow-primary/[0.1] hover:-translate-y-1 transition-all duration-300 h-full">
                <div className={cn('relative w-10 h-10 rounded-lg flex items-center justify-center', badge.iconBg, badge.color)}>
                  <badge.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground leading-tight flex items-center gap-1">
                    <span>{badge.name}</span>
                    {'href' in badge && badge.href && <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />}
                  </p>
                </div>
              </div>
            )

            return (
              <motion.div
                key={badge.name}
                initial={animate ? { opacity: 0, y: 20 } : false}
                whileInView={animate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group"
              >
                {'href' in badge && badge.href ? (
                  <a href={badge.href} target="_blank" rel="noopener noreferrer" className="block">
                    {content}
                  </a>
                ) : (
                  content
                )}
              </motion.div>
            )
          })}
        </motion.div>

      </div>
    </section>
  )
}
