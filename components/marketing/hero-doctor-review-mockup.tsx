"use client"

import { motion } from "framer-motion"
import {
  CheckCircle2,
  FileText,
  Loader2,
  Pill,
  RefreshCcw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react"
import Image from "next/image"
import { useEffect, useState } from "react"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

const REVIEW_STEPS = [
  { id: "identity", label: "Identity verified" },
  { id: "assessment", label: "Clinical assessment" },
  { id: "decision", label: "Decision" },
] as const

type FloatPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"

interface FloatingCard {
  icon: typeof FileText
  iconClass: string
  bgClass: string
  title: string
  status: string
  statusClass: string
  position: FloatPosition
}

// Asymmetric placement so the four corners don't read as a grid.
// Each float has its own offset, keeping the composition organic.
const FLOATING_POSITIONS: Record<FloatPosition, string> = {
  "top-left": "-top-3 -left-6 sm:-left-10 lg:-left-12",
  "top-right": "-top-2 -right-4 sm:-right-8 lg:-right-10",
  "bottom-left": "-bottom-2 -left-4 sm:-left-8 lg:-left-12",
  "bottom-right": "-bottom-3 -right-5 sm:-right-10 lg:-right-14",
}

const FLOATS: FloatingCard[] = [
  {
    icon: FileText,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    title: "Medical certificate",
    status: "Approved",
    statusClass: "text-emerald-600 dark:text-emerald-400",
    position: "top-left",
  },
  {
    icon: Pill,
    iconClass: "text-primary",
    bgClass: "bg-primary/10 dark:bg-primary/15",
    title: "eScript",
    status: "Sent to phone",
    statusClass: "text-primary/80",
    position: "top-right",
  },
  {
    icon: RefreshCcw,
    iconClass: "text-sky-600 dark:text-sky-400",
    bgClass: "bg-sky-50 dark:bg-sky-950/40",
    title: "Repeat Rx",
    status: "$19.95 / mo",
    statusClass: "text-sky-600 dark:text-sky-400",
    position: "bottom-left",
  },
  {
    icon: Stethoscope,
    iconClass: "text-amber-600 dark:text-amber-400",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    title: "Treatment plan",
    status: "Ready",
    statusClass: "text-amber-600 dark:text-amber-400",
    position: "bottom-right",
  },
]

const CYCLE_MS = 1800
const REST_AT_END_MS = 1400

/**
 * Hero mockup — doctor-led, multi-output, sequenced.
 *
 * Replaces the previous kitchen-sink hero composition.
 *
 * Structure:
 *   - Primary card: "Your GP — reviewing now" with a 3-state progress
 *     sequence (Identity → Clinical assessment → Decision). The animation
 *     loops with a small rest at the end so it never feels frantic.
 *   - Four static floating output cards (cert, eScript, repeat Rx,
 *     treatment plan) at asymmetric corners. They mount in once with a
 *     stagger and stay still — no continuous motion noise.
 *
 * Anti-cert-mill positioning: the doctor IS the hero. Floating cards
 * prove platform breadth so the page reads as primary-care telehealth,
 * not a single-service mill.
 *
 * Constraints:
 *   - No real doctor name (CLAUDE.md: "Never advertise individual doctor names").
 *   - Reduced-motion users see the end state with no animation.
 *   - Parent must allow `overflow-visible` (floats clip otherwise).
 */
export function HeroDoctorReviewMockup() {
  const prefersReducedMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (prefersReducedMotion) return
    let timeout: ReturnType<typeof setTimeout>

    const tick = () => {
      setActiveIndex((current) => {
        const next = current + 1
        if (next >= REVIEW_STEPS.length) {
          // Hold at the final state for a beat before looping back, so the
          // sequence feels resolved, not relentless.
          timeout = setTimeout(() => setActiveIndex(0), REST_AT_END_MS)
          return REVIEW_STEPS.length - 1
        }
        timeout = setTimeout(tick, CYCLE_MS)
        return next
      })
    }

    timeout = setTimeout(tick, CYCLE_MS)
    return () => clearTimeout(timeout)
  }, [prefersReducedMotion])

  const animate = !prefersReducedMotion
  // For reduced motion: render the final state so the user sees the resolved sequence.
  const displayedIndex = animate ? activeIndex : REVIEW_STEPS.length - 1

  return (
    <div className="relative w-[280px] lg:w-[320px] xl:w-[340px]">
      {/* Primary card */}
      <motion.div
        className="relative rounded-2xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-xl shadow-primary/[0.08] dark:shadow-none overflow-hidden"
        initial={animate ? { opacity: 0, y: 16 } : false}
        animate={animate ? { opacity: 1, y: 0 } : { opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1, ease: [0, 0, 0.2, 1] }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-border/40">
          <div className="relative shrink-0">
            <Image
              src="https://api.dicebear.com/7.x/notionists/svg?seed=AU-GP-001"
              alt=""
              width={40}
              height={40}
              className="w-10 h-10 rounded-full bg-muted/40 dark:bg-white/5 ring-2 ring-white dark:ring-card"
              unoptimized
              loading="lazy"
            />
            <span
              aria-hidden="true"
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-card"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              Your GP
            </p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 leading-tight mt-0.5">
              <ShieldCheck className="w-3 h-3 text-primary" aria-hidden="true" />
              AHPRA registered
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              style={{ animation: animate ? "pulse 2.5s ease-in-out infinite" : undefined }}
              aria-hidden="true"
            />
            Reviewing
          </span>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-3">
          {REVIEW_STEPS.map((step, i) => {
            const isComplete = i < displayedIndex
            const isActive = i === displayedIndex
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 transition-opacity duration-300",
                  !isActive && !isComplete && "opacity-40",
                )}
              >
                <span className="shrink-0 w-5 h-5 flex items-center justify-center">
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" aria-hidden="true" />
                  ) : isActive ? (
                    <Loader2
                      className="w-4 h-4 text-primary"
                      style={{
                        animation: animate ? "spin 1.4s linear infinite" : undefined,
                      }}
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/30" aria-hidden="true" />
                  )}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium transition-colors duration-300",
                    isActive ? "text-foreground" : isComplete ? "text-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Footer hairline */}
        <div className="px-5 py-3 bg-muted/30 dark:bg-white/[0.03] border-t border-border/30 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Decision in minutes</span>
          <span className="text-[10px] font-mono text-muted-foreground tracking-wider">IM-2026</span>
        </div>
      </motion.div>

      {/* Floating outputs */}
      {FLOATS.map((card, i) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.title}
            className={cn(
              "z-10 inline-flex items-center gap-2.5 rounded-xl bg-white dark:bg-card border border-border/50 dark:border-white/15 shadow-lg shadow-primary/[0.06] dark:shadow-none px-3 py-2",
              FLOATING_POSITIONS[card.position],
            )}
            initial={animate ? { opacity: 0, scale: 0.92, y: 4 } : false}
            animate={animate ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1 }}
            transition={{
              duration: 0.32,
              delay: 0.45 + i * 0.12,
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
              <p className="text-[11px] font-semibold text-foreground">
                {card.title}
              </p>
              <p className={cn("text-[10px] font-medium", card.statusClass)}>
                {card.status}
              </p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
