"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import { FileText, Clock, CheckCircle2, Mail } from "lucide-react"

/**
 * Med-cert-specific hero mockup for the /medical-certificate landing page.
 * Shows the certificate request flow: form → doctor review → delivered.
 * Replaces the generic HeroProductMockup on this page.
 */
export function MedCertHeroMockup() {
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

        {/* Form fields */}
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-1">Reason for absence</p>
            <div className="h-9 rounded-lg bg-muted/50 dark:bg-muted/20 border border-border/50 px-3 flex items-center">
              <span className="text-sm text-foreground/70">Cold and flu symptoms</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Duration</p>
              <div className="h-9 rounded-lg bg-muted/50 dark:bg-muted/20 border border-border/50 px-3 flex items-center">
                <span className="text-sm text-foreground/70">1 day</span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1">For</p>
              <div className="h-9 rounded-lg bg-muted/50 dark:bg-muted/20 border border-border/50 px-3 flex items-center">
                <span className="text-sm text-foreground/70">Work</span>
              </div>
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

      {/* Progress timeline — overlapping bottom-right */}
      <motion.div
        className="absolute -bottom-8 -right-4 xl:-right-8 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-3 min-w-[210px]"
        initial={animate ? { opacity: 0, x: 20 } : {}}
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
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-[11px] text-foreground/60">Request submitted</span>
            <span className="text-[9px] text-muted-foreground ml-auto">2m ago</span>
          </motion.div>
          <motion.div
            className="flex items-center gap-2"
            variants={animate
              ? { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }
              : { hidden: { opacity: 1 }, visible: { opacity: 1 } }
            }
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
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
            <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-medium text-foreground">Certificate sent</span>
            <span className="inline-flex items-center gap-0.5 ml-auto px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              Done
            </span>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
