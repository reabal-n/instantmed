"use client"

import { cn } from "@/lib/utils"
import { Shield, BadgeCheck, FileCheck, CheckCircle2, BookOpen, UserCheck, ExternalLink } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@heroui/react"

const trustBadges = [
  { 
    name: "AHPRA Verified Doctors", 
    description: "Verify on the public register", 
    icon: BadgeCheck, 
    color: "text-emerald-600",
    href: "https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx"
  },
  { 
    name: "RACGP Standards", 
    description: "5th Edition aligned protocols", 
    icon: BookOpen, 
    color: "text-blue-600",
    href: "https://www.racgp.org.au/running-a-practice/practice-standards"
  },
  { 
    name: "Medical Director Oversight", 
    description: "FRACGP clinical leadership", 
    icon: UserCheck, 
    color: "text-violet-600" 
  },
  { 
    name: "TGA ePrescribing", 
    description: "Compliant electronic scripts", 
    icon: FileCheck, 
    color: "text-amber-600" 
  },
]

interface TrustBadgeSliderProps {
  className?: string
}

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  return (
    <section className={cn("py-12 lg:py-16", className)}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Trust badges grid */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {trustBadges.map((badge, index) => {
            const content = (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-card/50 border border-border/50 hover:border-border hover:shadow-sm transition-all h-full">
                <div className={`w-10 h-10 rounded-lg bg-white dark:bg-white/10 flex items-center justify-center shadow-sm ${badge.color}`}>
                  <badge.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                    {badge.name}
                    {'href' in badge && badge.href && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                </div>
              </div>
            )
            
            return (
              <motion.div
                key={badge.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
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
          className="relative rounded-2xl bg-linear-to-br from-primary/5 via-transparent to-violet-500/5 border border-primary/10 p-8 lg:p-10 text-center overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(139,92,246,0.06),transparent_50%)]" />
          
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Simple and straightforward</span>
            </div>
            
            <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
              Healthcare on your schedule
            </h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Trusted by thousands of Australians. Most requests reviewed within an hour.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                as={Link}
                href="/request"
                color="primary"
                size="lg"
                className="px-8 font-semibold shadow-lg shadow-primary/25"
              >
                Get started
              </Button>
              <Button
                as={Link}
                href="/pricing"
                variant="bordered"
                size="lg"
                className="px-8"
              >
                View pricing
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground mt-4">
              <Shield className="w-3.5 h-3.5 inline mr-1" />
              Full refund if we can&apos;t help
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
