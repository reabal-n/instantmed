"use client"

import { motion } from "framer-motion"
import { useReducedMotion } from "@/components/ui/motion"
import {
  FileText,
  CheckCircle2,
  Pill,
  Smartphone,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"

export function HeroMultiServiceMockup() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className="relative w-72 xl:w-80 h-[320px]">
      {/* Card 1 (back): Treatment Plan — violet accent */}
      <motion.div
        className="absolute inset-x-0 top-4 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-5 space-y-3 rotate-2 origin-center"
        initial={animate ? { y: 20, opacity: 0 } : {}}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-semibold text-foreground">Treatment Plan</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Doctor-reviewed
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <div className="h-2 rounded-full bg-muted/40 dark:bg-muted/20 w-full" />
          <div className="h-2 rounded-full bg-muted/40 dark:bg-muted/20 w-4/5" />
          <div className="h-2 rounded-full bg-muted/40 dark:bg-muted/20 w-3/5" />
        </div>
      </motion.div>

      {/* Card 2 (middle): eScript — cyan accent */}
      <motion.div
        className="absolute inset-x-0 top-8 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-5 space-y-3 -rotate-1 origin-center"
        initial={animate ? { y: 20, opacity: 0 } : {}}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
              <Pill className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-sm font-semibold text-foreground">eScript</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 text-[10px] font-semibold">
            <Smartphone className="h-3 w-3" />
            Sent to phone
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-10 h-10 shrink-0">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-sm bg-muted/50 dark:bg-muted/25" />
            ))}
          </div>
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-2 rounded-full bg-muted/40 dark:bg-muted/20 w-full" />
            <div className="h-2 rounded-full bg-muted/40 dark:bg-muted/20 w-3/4" />
          </div>
        </div>
      </motion.div>

      {/* Card 3 (front): Medical Certificate — emerald accent */}
      <motion.div
        className="absolute inset-x-0 top-12 rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none p-5 space-y-4"
        initial={animate ? { y: 20, opacity: 0 } : {}}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-foreground">Medical Certificate</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-muted/20 dark:bg-muted/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Status</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Reviewed &amp; issued</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Sent</span>
            <span className="text-[10px] text-foreground/70">Just now</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          <ShieldCheck className="w-3 h-3 text-primary" />
          <span>AHPRA-registered doctor</span>
        </div>
      </motion.div>
    </div>
  )
}
