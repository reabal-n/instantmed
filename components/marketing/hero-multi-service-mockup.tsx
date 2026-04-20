"use client"

import { motion } from "framer-motion"
import {
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Pill,
  ShieldCheck,
  Smartphone,
  Stethoscope,
} from "lucide-react"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

export function HeroMultiServiceMockup() {
  const prefersReducedMotion = useReducedMotion()
  const animate = !prefersReducedMotion

  return (
    <div className="relative w-72 xl:w-80">
      {/* Main card */}
      <motion.div
        className="rounded-2xl bg-white dark:bg-card border border-border/50 shadow-xl shadow-primary/[0.08] dark:shadow-none overflow-hidden"
        initial={animate ? { opacity: 0, y: 20 } : {}}
        animate={animate ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
      >
        {/* Header bar */}
        <div className="bg-slate-800 dark:bg-slate-900 px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary flex items-center justify-center shrink-0">
              <span className="text-[9px] font-black text-white leading-none">+</span>
            </div>
            <span className="text-[11px] font-semibold text-white/90 tracking-wide">InstantMed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-white/50">Doctor online now</span>
          </div>
        </div>

        {/* Completed service rows */}
        <div className="p-4 space-y-2">
          {[
            {
              icon: FileText,
              color: "emerald",
              title: "Medical Certificate",
              status: "Approved · sent to email",
              trailingIcon: CheckCircle2,
            },
            {
              icon: Pill,
              color: "cyan",
              title: "eScript",
              status: "Sent to phone via SMS",
              trailingIcon: Smartphone,
            },
            {
              icon: Stethoscope,
              color: "sky",
              title: "Treatment Plan",
              status: "Doctor reviewed",
              trailingIcon: CheckCircle2,
            },
          ].map(({ icon: Icon, color, title, status, trailingIcon: TrailingIcon }, i) => (
            <motion.div
              key={title}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border",
                color === "emerald" && "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
                color === "cyan" && "bg-cyan-50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30",
                color === "sky" && "bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30",
              )}
              initial={animate ? { opacity: 0, x: -8 } : {}}
              animate={animate ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.4 + i * 0.12, ease: "easeOut" }}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                color === "emerald" && "bg-emerald-100 dark:bg-emerald-950/50",
                color === "cyan" && "bg-cyan-100 dark:bg-cyan-950/50",
                color === "sky" && "bg-sky-100 dark:bg-sky-950/50",
              )}>
                <Icon className={cn(
                  "w-4 h-4",
                  color === "emerald" && "text-emerald-600 dark:text-emerald-400",
                  color === "cyan" && "text-cyan-600 dark:text-cyan-400",
                  color === "sky" && "text-sky-600 dark:text-sky-400",
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight">{title}</p>
                <p className={cn(
                  "text-[10px] font-medium",
                  color === "emerald" && "text-emerald-600 dark:text-emerald-400",
                  color === "cyan" && "text-cyan-600 dark:text-cyan-400",
                  color === "sky" && "text-sky-600 dark:text-sky-400",
                )}>{status}</p>
              </div>
              <TrailingIcon className={cn(
                "w-4 h-4 shrink-0",
                color === "emerald" && "text-emerald-500",
                color === "cyan" && "text-cyan-500",
                color === "violet" && "text-violet-500",
              )} />
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-muted/30 dark:bg-white/[0.03] border-t border-border/30 px-4 py-2 flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
          <span className="text-[9px] text-muted-foreground">AHPRA-registered doctor · Every request reviewed</span>
        </div>
      </motion.div>

      {/* Floating badge: top-left */}
      <motion.div
        className="absolute -top-3 -left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
        initial={animate ? { opacity: 0, scale: 0.8 } : {}}
        animate={animate ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.55, ease: "easeOut" }}
      >
        <Clock className="w-3.5 h-3.5 text-primary" />
        Takes ~2 min
      </motion.div>

      {/* Floating badge: top-right */}
      <motion.div
        className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] text-xs font-medium text-muted-foreground"
        initial={animate ? { opacity: 0, scale: 0.8 } : {}}
        animate={animate ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        24/7 available
      </motion.div>

      {/* Delivery notification overlay */}
      <motion.div
        className="absolute -bottom-8 -right-4 xl:-right-8 rounded-xl bg-white dark:bg-card border border-border/50 shadow-lg shadow-primary/[0.06] dark:shadow-none p-3 min-w-[200px]"
        initial={animate ? { opacity: 0, x: 20 } : {}}
        animate={animate ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.3, delay: 0.65, ease: "easeOut" }}
      >
        <motion.div
          className="space-y-2"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: animate ? 0.2 : 0, delayChildren: animate ? 0.3 : 0 } },
          }}
          initial="hidden"
          animate="visible"
        >
          {[
            { icon: CheckCircle2, iconClass: "text-success", text: "Form submitted", meta: "2m ago", bold: false },
            { icon: CheckCircle2, iconClass: "text-success", text: "Doctor reviewed", meta: "Just now", bold: false },
            { icon: Mail, iconClass: "text-primary", text: "Documents sent", meta: null, bold: true },
          ].map(({ icon: Icon, iconClass, text, meta, bold }) => (
            <motion.div
              key={text}
              className="flex items-center gap-2"
              variants={animate
                ? { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }
                : { hidden: { opacity: 1 }, visible: { opacity: 1 } }
              }
            >
              <Icon className={cn("w-3.5 h-3.5 shrink-0", iconClass)} />
              <span className={cn("text-[11px]", bold ? "font-medium text-foreground" : "text-foreground/60")}>
                {text}
              </span>
              {meta && <span className="text-[9px] text-muted-foreground ml-auto">{meta}</span>}
              {bold && (
                <span className="inline-flex items-center gap-0.5 ml-auto px-1.5 py-0.5 rounded-full bg-success/10 text-[9px] font-medium text-success animate-pulse">
                  Done
                </span>
              )}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  )
}
