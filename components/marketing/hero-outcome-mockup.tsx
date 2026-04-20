"use client"

import { motion } from "framer-motion"
import { CheckCircle2, FileText, Mail, ShieldCheck, User } from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"

/** SVG grain noise overlay for paper-like texture */
function GrainOverlay() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.015] mix-blend-multiply rounded-2xl"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  )
}

export function HeroOutcomeMockup() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className="relative w-72 xl:w-80">
      {/* Approved certificate card - paper-cream treatment */}
      <motion.div
        className="relative rounded-2xl bg-[#FAF8F5] dark:bg-card border border-border/50 dark:border-white/15 shadow-xl shadow-primary/[0.1] dark:shadow-none p-5 space-y-4 overflow-hidden"
        initial={animate ? { y: 20 } : {}}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
      >
        <GrainOverlay />
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-semibold text-foreground">Medical Certificate</span>
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            Approved
          </div>
        </div>

        {/* Certificate preview area */}
        <div className="rounded-lg border border-border/40 bg-muted/20 dark:bg-muted/10 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Patient</span>
            <div className="h-2 rounded-full bg-muted/50 dark:bg-muted/25 flex-1" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Period</span>
            <span className="text-[10px] text-foreground/70">1 day &middot; 10 Apr 2026</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground w-12 shrink-0">Status</span>
            <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Reviewed &amp; issued</span>
          </div>
        </div>

        {/* Doctor verification */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-card flex items-center justify-center">
              <CheckCircle2 className="w-2 h-2 text-white" />
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Reviewed by your GP</p>
            <p className="text-[10px] text-muted-foreground">AHPRA-registered &middot; Verified</p>
          </div>
        </div>

        {/* Trust footer */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pt-1 border-t border-border/30">
          <ShieldCheck className="w-3 h-3 text-primary" />
          <span>Accepted by all Australian employers</span>
        </div>
      </motion.div>

      {/* Floating notification */}
      <motion.div
        className="absolute -bottom-5 -right-4 xl:-right-6 rounded-xl bg-[#FAF8F5] dark:bg-card border border-border/50 dark:border-white/15 shadow-lg shadow-primary/[0.08] dark:shadow-none p-2.5 flex items-center gap-2.5 min-w-[190px]"
        initial={animate ? { x: 20 } : {}}
        animate={{ x: 0 }}
        transition={{ duration: 0.3, delay: 1.2, ease: "easeOut" }}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground leading-tight">Certificate ready</p>
          <p className="text-[10px] text-muted-foreground">Check your inbox</p>
        </div>
      </motion.div>
    </div>
  )
}
