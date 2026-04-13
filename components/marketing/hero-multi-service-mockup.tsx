"use client"

import { motion } from "framer-motion"
import {
  CheckCircle2,
  FileText,
  Pill,
  ShieldCheck,
  Smartphone,
  Stethoscope,
} from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"

export function HeroMultiServiceMockup() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className="relative w-72 xl:w-80 h-[420px]">
      {/* Card 1 (back): Treatment Plan - violet accent, visible header */}
      <motion.div
        className="absolute inset-x-2 top-0 rounded-2xl bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-card border border-violet-200/40 dark:border-violet-800/20 shadow-md shadow-violet-500/[0.08] dark:shadow-none p-4 rotate-2 origin-center"
        initial={animate ? { y: 20, opacity: 0 } : {}}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
              <Stethoscope className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs font-semibold text-foreground">Treatment Plan</span>
          </div>
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 text-[9px] font-semibold">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Reviewed
          </div>
        </div>
        <div className="space-y-1.5 pt-2.5">
          <div className="h-1.5 rounded-full bg-muted/40 dark:bg-muted/20 w-full" />
          <div className="h-1.5 rounded-full bg-muted/40 dark:bg-muted/20 w-3/4" />
        </div>
      </motion.div>

      {/* Card 2 (middle): eScript - cyan accent, visible header */}
      <motion.div
        className="absolute inset-x-1 top-[100px] rounded-2xl bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-card border border-cyan-200/40 dark:border-cyan-800/20 shadow-lg shadow-cyan-500/[0.08] dark:shadow-none p-4 -rotate-1 origin-center"
        initial={animate ? { y: 20, opacity: 0 } : {}}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center">
              <Pill className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-foreground">eScript</span>
          </div>
          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 text-[9px] font-semibold">
            <Smartphone className="h-2.5 w-2.5" />
            Sent to phone
          </div>
        </div>
        <div className="flex gap-2.5 pt-2.5">
          <div className="grid grid-cols-3 grid-rows-3 gap-0.5 w-8 h-8 shrink-0">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="rounded-sm bg-muted/50 dark:bg-muted/25" />
            ))}
          </div>
          <div className="flex-1 space-y-1.5 pt-0.5">
            <div className="h-1.5 rounded-full bg-muted/40 dark:bg-muted/20 w-full" />
            <div className="h-1.5 rounded-full bg-muted/40 dark:bg-muted/20 w-2/3" />
          </div>
        </div>
      </motion.div>

      {/* Card 3 (front): Medical Certificate - emerald accent, full detail */}
      <motion.div
        className="absolute inset-x-0 top-[200px] rounded-2xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card border border-emerald-200/40 dark:border-emerald-800/20 shadow-xl shadow-emerald-500/[0.1] dark:shadow-none p-5 space-y-4"
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
