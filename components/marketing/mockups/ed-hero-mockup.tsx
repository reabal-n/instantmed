"use client"

import { motion } from "framer-motion"
import { CheckCircle2, Pill, ShieldCheck } from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

interface EDHeroMockupProps {
  compact?: boolean
}

export function EDHeroMockup({ compact = false }: EDHeroMockupProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div
      className={cn(
        "relative w-full max-w-sm mx-auto",
        compact ? "max-w-xs" : "max-w-sm lg:max-w-md"
      )}
      aria-hidden="true"
    >
      {/* Main card */}
      <motion.div
        className="relative rounded-2xl border border-border/50 dark:border-white/15 bg-white dark:bg-card shadow-xl shadow-primary/[0.08] overflow-hidden"
        initial={animate ? { y: 18 } : {}}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Pill className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">InstantMed</p>
                <p className="text-sm font-semibold">Treatment plan</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              Approved
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reviewed by</p>
            <p className="text-sm font-medium">An AHPRA-registered Australian doctor</p>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-1">
            <p className="text-[11px] text-muted-foreground">Next step</p>
            <p className="text-sm font-medium">eScript sent to your phone</p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Discreet packaging · No call needed</span>
          </div>
        </div>
      </motion.div>

      {/* Floating badge */}
      <motion.div
        className="absolute -bottom-3 -right-3 rounded-full bg-white dark:bg-card shadow-lg shadow-primary/[0.15] border border-border/50 px-3 py-1.5 text-[11px] font-semibold text-primary"
        initial={animate ? { scale: 0.8 } : {}}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        Doctor-reviewed
      </motion.div>
    </div>
  )
}
