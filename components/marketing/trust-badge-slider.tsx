"use client"

import { cn } from "@/lib/utils"
import { Shield, BadgeCheck, FileCheck, CheckCircle2, BookOpen, UserCheck, ExternalLink } from "@/lib/icons"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DottedGrid } from "@/components/marketing/dotted-grid"

const trustBadges = [
  {
    name: "AHPRA-registered doctors",
    icon: BadgeCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-500/10",
    href: "https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
  },
  {
    name: "RACGP-aligned protocols",
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-500/10",
    href: "https://www.racgp.org.au/running-a-practice/practice-standards"
  },
  {
    name: "Medical Director oversight",
    icon: UserCheck,
    color: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-500/10"
  },
  {
    name: "TGA-compliant ePrescribing",
    icon: FileCheck,
    color: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-500/10"
  },
]

interface TrustBadgeSliderProps {
  className?: string
}

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section className={cn("py-20 lg:py-24 relative", className)}>
      <DottedGrid />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        {/* Trust badges grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-10 bg-muted/30 dark:bg-white/[0.02] rounded-2xl p-4 lg:p-6 border border-border/20 dark:border-white/5"
          initial={animate ? { opacity: 0, y: 20 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {trustBadges.map((badge, index) => {
            const content = (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-card border border-border/30 shadow-md shadow-primary/[0.06] hover:shadow-lg hover:shadow-primary/[0.1] hover:-translate-y-1 transition-all duration-300 h-full">
                <div className={cn('relative w-12 h-12 rounded-xl flex items-center justify-center', badge.iconBg, badge.color)}>
                  <badge.icon className="w-5.5 h-5.5" />
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

        {/* CTA Section */}
        <motion.div
          className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] p-10 lg:p-14 text-center"
          initial={animate ? { opacity: 0, y: 20 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Simple and straightforward</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-3 tracking-tight">
            Healthcare on your schedule
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto leading-relaxed">
            Trusted by Australians across the country. Most requests reviewed within an hour.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="px-8 font-semibold shadow-md shadow-primary/15 active:scale-[0.98]"
            >
              <Link href="/request">Start a request</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-8 active:scale-[0.98]"
            >
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            <Shield className="w-3.5 h-3.5 inline mr-1" />
            Full refund if we can&apos;t help
          </p>
          <p className="text-xs text-muted-foreground/60 dark:text-muted-foreground/80 mt-3">
            Operating since 2025 · ABN 64 694 559 334
          </p>
        </motion.div>
      </div>
    </section>
  )
}
