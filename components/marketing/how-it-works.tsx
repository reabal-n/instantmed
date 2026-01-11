'use client'

import { ArrowRight, ClipboardList, Stethoscope, FileCheck } from 'lucide-react'
import { Button } from '@heroui/react'
import { howItWorks } from '@/lib/marketing/homepage'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ZapPremium } from '@/components/icons/certification-logos'
import DisplayCards from '@/components/ui/display-cards'

const iconMap = {
  ClipboardList: ClipboardList,
  Stethoscope: Stethoscope,
  FileCheck: FileCheck,
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-4 lg:py-6 scroll-mt-20 relative overflow-hidden">
      <div className="relative mx-auto max-w-6xl px-2 sm:px-4 lg:px-6">
        {/* Glassmorphic Container */}
        <motion.div
          className="glass-card rounded-3xl p-3 lg:p-4 pb-6 lg:pb-8 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Section Header - More Compact */}
          <motion.div 
            className="text-center mb-0"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 border border-primary/10 mb-2 interactive-pill cursor-default"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 200, damping: 25 }}
            >
              <ZapPremium className="w-3 h-3 text-primary" />
              <span className="text-xs font-medium text-foreground/80">How it works</span>
            </motion.div>
            
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-1 tracking-tight">
              Three steps. Done in minutes.
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Answer a few questions. A real doctor reviews. You&apos;re done. No appointments or waiting rooms.
            </p>
          </motion.div>

          {/* Display Cards - 3 Steps */}
          <motion.div
            className="flex justify-center pt-0 pb-1 lg:pb-2"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="w-full max-w-6xl px-1 sm:px-2">
              <DisplayCards
                cards={howItWorks.slice().reverse().map((step, reversedIndex) => {
                  const originalIndex = howItWorks.length - 1 - reversedIndex
                  const Icon = iconMap[step.icon as keyof typeof iconMap]
                  const stepColors = [
                    { icon: "text-blue-500", title: "text-blue-500", bg: "bg-blue-800" },
                    { icon: "text-purple-500", title: "text-purple-500", bg: "bg-purple-800" },
                    { icon: "text-green-500", title: "text-green-500", bg: "bg-green-800" },
                  ]
                  const colors = stepColors[originalIndex] || stepColors[0]
                  
                  return {
                    icon: <Icon className="size-4 text-white" />,
                    title: step.title,
                    description: step.description,
                    date: originalIndex === 0 ? "2 minutes" : originalIndex === 1 ? "~15 minutes" : "Instant",
                    iconClassName: colors.icon,
                    titleClassName: colors.title,
                    iconBgClassName: colors.bg,
                    className: reversedIndex === 2
                      ? "[grid-area:stack] md:translate-x-40 md:translate-y-32 hover:translate-y-10"
                      : reversedIndex === 1
                      ? "[grid-area:stack] md:translate-x-20 md:translate-y-16 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0"
                      : "[grid-area:stack] md:translate-x-0 md:translate-y-0 hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
                  }
                })}
              />
            </div>
          </motion.div>

          {/* CTA - Centered */}
          <motion.div 
            className="flex flex-col items-center pt-4 pb-1"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <Button
              as={Link}
              href="/start"
              color="primary"
              size="md"
              className="px-6 font-semibold shadow-lg hover:shadow-xl transition-all"
              endContent={<ArrowRight className="h-3.5 w-3.5" />}
            >
              Start your request
            </Button>
            <p className="text-xs text-muted-foreground mt-2 mb-0">
              Takes about 2 minutes
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
