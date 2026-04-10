"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { Pill, Smartphone, MapPin, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EScriptHeroMockupProps {
  /** Compact mode for mobile — shows card only, no floating badges or timeline */
  compact?: boolean
}

/**
 * eScript-specific hero mockup for the prescriptions landing page.
 * Shows the eScript delivery flow: request → doctor review → SMS sent.
 * Replaces the generic HeroProductMockup on this page.
 */
export function EScriptHeroMockup({ compact = false }: EScriptHeroMockupProps) {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className={cn("relative", compact ? "w-full" : "w-72 xl:w-80")}>
      {/* Main card */}
      <motion.div
        className={cn(
          "rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none space-y-4",
          compact ? "p-4" : "p-5"
        )}
        initial={animate ? { y: 20 } : {}}
        whileInView={animate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Pill className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">eScript Ready</span>
        </div>

        {/* SMS notification area */}
        <div className="rounded-xl bg-muted/50 dark:bg-muted/20 border border-border/50 p-3.5 space-y-2">
          <p className="text-[12px] leading-relaxed text-foreground/70">
            Your eScript is ready. Show this at any pharmacy to collect your medication.
          </p>
          <p className="text-[11px] font-medium text-primary">
            escript.health/tk-2847-x
          </p>
        </div>

        {/* Pharmacy instruction */}
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-[11px] text-muted-foreground">Works at any pharmacy in Australia</span>
        </div>

        {/* Sent via SMS badge — top-right, desktop only */}
        {!compact && (
          <motion.div
            className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            initial={animate ? { scale: 0.8 } : {}}
            whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
          >
            <Smartphone className="w-3.5 h-3.5 text-primary" />
            Sent via SMS
          </motion.div>
        )}

        {/* Any pharmacy badge — top-left, desktop only */}
        {!compact && (
          <motion.div
            className="absolute -top-3 -left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
            initial={animate ? { scale: 0.8 } : {}}
            whileInView={animate ? { opacity: 1, scale: 1 } : undefined}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.65, ease: "easeOut" }}
          >
            <MapPin className="w-3.5 h-3.5 text-primary" />
            Any pharmacy
          </motion.div>
        )}
      </motion.div>

      {/* Progress timeline — overlapping bottom-right, desktop only */}
      {!compact && (
        <motion.div
          className="absolute -bottom-8 -right-4 xl:-right-8 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-3 min-w-[210px]"
          initial={animate ? { x: 20 } : {}}
          whileInView={animate ? { opacity: 1, x: 0 } : undefined}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
        >
          <motion.div
            className="space-y-2"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: animate ? 0.2 : 0, delayChildren: animate ? 0.3 : 0 } },
            }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div
              className="flex items-center gap-2"
              variants={animate
                ? { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }
                : { hidden: { opacity: 1 }, visible: { opacity: 1 } }
              }
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span className="text-[11px] text-foreground/60">Request submitted</span>
              <span className="text-[9px] text-muted-foreground ml-auto">5m ago</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-2"
              variants={animate
                ? { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }
                : { hidden: { opacity: 1 }, visible: { opacity: 1 } }
              }
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
              <span className="text-[11px] text-foreground/60">Doctor reviewed</span>
              <span className="text-[9px] text-muted-foreground ml-auto">Just now</span>
            </motion.div>
            <motion.div
              className="flex items-center gap-2"
              variants={animate
                ? { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }
                : { hidden: { opacity: 1 }, visible: { opacity: 1 } }
              }
            >
              <Smartphone className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-[11px] font-medium text-foreground">eScript sent</span>
              <span className="inline-flex items-center gap-0.5 ml-auto px-1.5 py-0.5 rounded-full bg-success/10 text-[9px] font-medium text-success">
                Done
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
