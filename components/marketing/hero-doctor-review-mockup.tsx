"use client"

import { motion, useAnimationControls } from "framer-motion"
import {
  FileText,
  Pill,
  RefreshCcw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"
import { useEffect } from "react"

import { useReducedMotion } from "@/components/ui/motion"
import { PRICING_DISPLAY } from "@/lib/constants"
import { getApprovedClaim } from "@/lib/marketing/approved-claims"
import { cn } from "@/lib/utils"

const REVIEW_STEPS = [
  { id: "identity", label: "Identity check" },
  { id: "assessment", label: "Clinical assessment" },
  { id: "decision", label: "Decision" },
] as const

interface FloatingCard {
  icon: typeof FileText
  iconClass: string
  bgClass: string
  title: string
  status: string
  statusClass: string
}

const PRIMARY_CARD_VARIANTS = {
  hidden: { y: 16 },
  visible: { y: 0 },
  reduced: { y: 0, transition: { duration: 0, delay: 0 } },
}

const FLOAT_VARIANTS = {
  hidden: { opacity: 0, scale: 0.92, y: 4 },
  visible: { opacity: 1, scale: 1, y: 0 },
  reduced: { opacity: 1, scale: 1, y: 0, transition: { duration: 0, delay: 0 } },
}

const FLOATS: FloatingCard[] = [
  {
    icon: FileText,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    title: "Medical certificate",
    status: "Approved",
    statusClass: "text-emerald-700 dark:text-emerald-300",
  },
  {
    icon: Pill,
    iconClass: "text-primary",
    bgClass: "bg-primary/10 dark:bg-primary/15",
    title: "eScript",
    status: getApprovedClaim("prescription_escript_sent"),
    statusClass: "text-primary",
  },
  {
    icon: RefreshCcw,
    // Snap to the brand-coral signature accent. The previous sky-50 +
    // sky-600/700 combo read as off-palette blue-grey alongside the
    // emerald + primary + amber siblings (all of which are brand-aligned
    // semantics). Coral is the only non-CTA brand accent (see
    // docs/BRAND.md signature devices) and gives Repeat Rx its own
    // recognition beat without introducing a fifth colour stop. Tier 1
    // video-review fix 2026-05-26 (homepage-l0yn).
    iconClass: "text-brand-coral",
    bgClass: "bg-brand-coral/10 dark:bg-brand-coral/15",
    title: "Repeat Rx",
    status: `One-off ${PRICING_DISPLAY.REPEAT_SCRIPT}`,
    // Status is small text on a white card — use the AA-safe darkened coral
    // (icon + tint keep the bright signature --brand-coral). #FF6B5B as text
    // was ~2.8:1; the siblings already use their dark -700 shade for text.
    statusClass: "text-brand-coral-strong",
  },
  {
    icon: Stethoscope,
    iconClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    title: "Doctor plan",
    status: "Reviewed",
    statusClass: "text-amber-700 dark:text-amber-300",
  },
]

/**
 * A static example of doctor review with possible outputs beneath it.
 * Normal document flow keeps every label readable at narrow widths.
 * Entrance motion never simulates an active clinical request.
 */
export function HeroDoctorReviewMockup() {
  const prefersReducedMotion = useReducedMotion()
  const entranceControls = useAnimationControls()

  useEffect(() => {
    if (prefersReducedMotion) {
      entranceControls.stop()
      void entranceControls.set("reduced")
      return
    }

    void entranceControls.start("visible")
  }, [entranceControls, prefersReducedMotion])

  const animate = !prefersReducedMotion

  return (
    <div className="relative w-full max-w-[360px]" aria-label="Example of doctor review">
      {/* Primary card */}
      <motion.div
        data-reduced-motion-final="doctor-card"
        className="relative rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-xl shadow-primary/[0.08] dark:shadow-none overflow-hidden"
        variants={PRIMARY_CARD_VARIANTS}
        initial={animate ? "hidden" : "reduced"}
        animate={entranceControls}
        transition={{
          duration: prefersReducedMotion ? 0 : 0.3,
          delay: prefersReducedMotion ? 0 : 0.1,
          ease: [0, 0, 0.2, 1],
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-border/40">
          <div className="relative shrink-0">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/8 text-primary ring-2 ring-white dark:ring-card"
              aria-hidden="true"
            >
              <Stethoscope className="h-5 w-5" />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Doctor review
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 leading-tight mt-1">
              <ShieldCheck className="w-3 h-3 text-primary" aria-hidden="true" />
              AHPRA registered
            </p>
          </div>
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            Example
          </span>
        </div>

        {/* Steps */}
        <ol className="px-5 py-4 space-y-3">
          {REVIEW_STEPS.map((step, i) => (
            <li key={step.id} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
                {i + 1}
              </span>
              <span className="text-sm font-medium text-foreground">{step.label}</span>
            </li>
          ))}
        </ol>
      </motion.div>

      {/* Outputs stay clear of the review content at every viewport. */}
      <div className="mt-3 grid grid-cols-2 gap-3">
      {FLOATS.map((card, i) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.title}
            data-reduced-motion-final="doctor-float"
            className={cn(
              "min-w-0 flex items-center gap-2 rounded-xl bg-white px-3 py-3 shadow-sm shadow-primary/[0.06] pointer-events-none",
              "border border-border/50 dark:border-white/15 dark:bg-card dark:shadow-none",
            )}
            variants={FLOAT_VARIANTS}
            initial={animate ? "hidden" : "reduced"}
            animate={entranceControls}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.32,
              delay: prefersReducedMotion ? 0 : 0.45 + i * 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <span
              className={cn(
                "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center",
                card.bgClass,
              )}
              aria-hidden="true"
            >
              <Icon className={cn("w-3.5 h-3.5", card.iconClass)} />
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-foreground">
                {card.title}
              </p>
              <p className={cn("mt-1 text-xs font-medium", card.statusClass)}>
                {card.status}
              </p>
            </div>
          </motion.div>
        )
      })}
      </div>
    </div>
  )
}
