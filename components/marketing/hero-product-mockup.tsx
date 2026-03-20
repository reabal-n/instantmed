"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { FileText, Clock, User } from "lucide-react"

export function HeroProductMockup() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className="relative w-72 xl:w-80">
      {/* Main form card */}
      <motion.div
        className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none p-5 space-y-4"
        initial={animate ? { opacity: 0, y: 20 } : {}}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Medical Certificate</span>
        </div>

        {/* Fake form fields */}
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Full name</p>
            <div className="h-9 rounded-lg bg-muted/50 dark:bg-muted/20 border border-border/50 px-3 flex items-center">
              <span className="text-sm text-foreground/70">Sarah Mitchell</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Reason</p>
            <div className="h-9 rounded-lg bg-muted/50 dark:bg-muted/20 border border-border/50 px-3 flex items-center">
              <span className="text-sm text-foreground/70">Cold and flu symptoms</span>
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Duration</p>
            <div className="h-9 rounded-lg bg-muted/50 dark:bg-muted/20 border border-border/50 px-3 flex items-center">
              <span className="text-sm text-foreground/70">1 day</span>
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div className="h-10 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/25">
          <span className="text-sm font-semibold text-white">Submit request</span>
        </div>

        {/* Time badge */}
        <motion.div
          className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
          initial={animate ? { opacity: 0, scale: 0.8 } : {}}
          whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
        >
          <Clock className="w-3.5 h-3.5 text-primary" />
          Takes ~2 min
        </motion.div>
      </motion.div>

      {/* Doctor notification card — overlapping bottom-right */}
      <motion.div
        className="absolute -bottom-6 -right-6 xl:-right-8 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-3 flex items-center gap-3 min-w-[200px]"
        initial={animate ? { opacity: 0, x: 20 } : {}}
        whileInView={animate ? { opacity: 1, x: 0 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          {/* Green pulse dot */}
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-card">
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight">Dr. reviewing your request</p>
          <p className="text-xs text-muted-foreground">Just now</p>
        </div>
      </motion.div>
    </div>
  )
}
