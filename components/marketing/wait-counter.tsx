"use client"

import type { ReactNode } from "react"

import { useReducedMotion } from "@/components/ui/motion"
import { QUEUE_DISPLAY_CAP, type WaitState } from "@/lib/brand/wait-counter"
import { cn } from "@/lib/utils"

interface WaitCounterProps {
  state: WaitState
  /**
   * Visual variant.
   *  - `inline`: meant to drop into an existing pill / trust line. Renders as
   *    a single inline element with the brand-coral pulse + tight copy.
   *  - `standalone`: meant to render on its own line above the hero. Larger
   *    type, stronger contrast, ideal for a hero accent above the H1.
   */
  variant?: "inline" | "standalone"
  className?: string
}

/**
 * Live wait-counter — signature brand device #1 (docs/BRAND.md §6.1).
 *
 * Renders a brand-coral pulsing dot plus current-state copy. Five state
 * variants drive five copy lines. Returns `null` when the data source signals
 * `hidden` (no recent data), so callers can render this unconditionally.
 *
 * The CSS keyframes `wait-pulse` are defined in `app/globals.css`. They
 * respect `prefers-reduced-motion` via the hook below.
 */
export function WaitCounter({ state, variant = "inline", className }: WaitCounterProps) {
  const reduced = useReducedMotion()

  if (state.variant === "hidden") return null

  const text = renderText(state)
  const isStandalone = variant === "standalone"

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        isStandalone
          ? "text-sm sm:text-base text-foreground/85"
          : "text-xs sm:text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full bg-[color:var(--brand-coral)] opacity-60",
            reduced ? "" : "animate-wait-pulse",
          )}
        />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--brand-coral)]" />
      </span>
      {text}
    </span>
  )
}

function renderText(state: WaitState): ReactNode {
  switch (state.variant) {
    case "live": {
      const minutes = state.medianMinutes
      if (typeof minutes !== "number") return <>Reviewing requests today</>
      const subject = subjectFor(state.service)
      return (
        <>
          {subject} reviewed in{" "}
          <strong className="text-foreground tabular-nums font-semibold">~{minutes} min</strong>{" "}
          today
        </>
      )
    }
    case "reviewing":
      return <>A doctor is reviewing requests right now</>
    case "queued": {
      const n = state.queueLength
      if (typeof n !== "number") return <>In review</>
      const display = n >= QUEUE_DISPLAY_CAP ? `${QUEUE_DISPLAY_CAP}+` : String(n)
      return (
        <>
          <strong className="text-foreground tabular-nums font-semibold">{display}</strong> ahead
          in the queue
        </>
      )
    }
    case "standby": {
      const at = state.resumeAt
      return (
        <>
          On standby. {at ? <>First review at <strong className="text-foreground">{at}</strong></> : <>Doctor reviews next session.</>}
        </>
      )
    }
    default:
      return null
  }
}

function subjectFor(service: WaitState["service"]): string {
  switch (service) {
    case "rx":
      return "Most repeat scripts"
    case "consult":
      return "Most consults"
    case "med-cert":
    default:
      return "Most med certs"
  }
}
