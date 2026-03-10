"use client"

import { cn } from "@/lib/utils"
import { Shield, BadgeCheck, FileCheck, CheckCircle2, BookOpen, UserCheck, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const trustBadges = [
  {
    name: "AHPRA-registered doctors",
    icon: BadgeCheck,
    color: "text-emerald-600 dark:text-emerald-400",
    href: "https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
  },
  {
    name: "RACGP-aligned protocols",
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    href: "https://www.racgp.org.au/running-a-practice/practice-standards"
  },
  {
    name: "Medical Director oversight",
    icon: UserCheck,
    color: "text-blue-600 dark:text-blue-400"
  },
  {
    name: "TGA-compliant ePrescribing",
    icon: FileCheck,
    color: "text-amber-600 dark:text-amber-400"
  },
]

interface TrustBadgeSliderProps {
  className?: string
}

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <section className={cn("py-12 lg:py-16", className)}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Trust badges grid */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-10"
          initial={animate ? { opacity: 0, y: 20 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {trustBadges.map((badge, index) => {
            const content = (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-white/70 dark:bg-white/[0.06] border border-dawn-200/40 dark:border-border/50 hover:border-dawn-300/50 dark:hover:border-accent-teal/20 hover:shadow-lg hover:shadow-dawn-200/20 dark:hover:shadow-none hover:-translate-y-0.5 transition-all duration-300 h-full backdrop-blur-sm">
                <div className={cn('relative w-10 h-10 rounded-lg bg-dawn-50/80 dark:bg-white/10 flex items-center justify-center shadow-sm shadow-dawn-100/30 dark:shadow-none group-hover:shadow-md group-hover:shadow-dawn-200/20 dark:group-hover:shadow-none transition-all duration-300', badge.color)}>
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

        {/* CTA Section */}
        <motion.div
          className="relative rounded-2xl bg-linear-to-br from-primary/5 via-transparent to-primary/3 dark:from-primary/10 dark:via-card/50 dark:to-primary/8 border border-primary/10 dark:border-primary/20 p-8 lg:p-10 text-center overflow-hidden"
          initial={animate ? { opacity: 0, y: 20 } : false}
          whileInView={animate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Background decoration — warm morning spectrum */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.06),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(240,180,160,0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(253,230,138,0.06),transparent_60%)]" />
          
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Simple and straightforward</span>
            </div>
            
            <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
              Healthcare on your schedule
            </h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
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
          </div>
        </motion.div>
      </div>
    </section>
  )
}
