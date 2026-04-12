"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/components/ui/motion"
import { TrustBadge } from "@/components/shared/trust-badge"
import {
  BADGE_PRESETS,
  resolveEntry,
  type PresetEntry,
} from "@/lib/marketing/trust-badges"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrustBadgeCollapsibleProps {
  /** Named preset from BADGE_PRESETS */
  preset?: string
  /** Or pass entries directly */
  badges?: PresetEntry[]
  /** Number of badges to show before collapsing (default 3) */
  initialCount?: number
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TrustBadgeCollapsible({
  preset,
  badges,
  initialCount = 3,
  className,
}: TrustBadgeCollapsibleProps) {
  const entries = badges ?? (preset ? BADGE_PRESETS[preset] : [])
  const [expanded, setExpanded] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  if (!entries?.length) return null

  const visible = entries.slice(0, initialCount)
  const hidden = entries.slice(initialCount)
  const hasMore = hidden.length > 0

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-2", className)}>
      {/* Always-visible badges */}
      {visible.map((entry) => {
        const { id, variant } = resolveEntry(entry)
        return <TrustBadge key={id} id={id} variant={variant} />
      })}

      {/* Collapsed badges */}
      <AnimatePresence>
        {expanded &&
          hidden.map((entry) => {
            const { id, variant } = resolveEntry(entry)
            return (
              <motion.div
                key={id}
                initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <TrustBadge id={id} variant={variant} />
              </motion.div>
            )
          })}
      </AnimatePresence>

      {/* Expand/collapse toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-2 py-1"
          aria-expanded={expanded}
          aria-label={expanded ? "Show fewer trust badges" : `Show ${hidden.length} more trust badges`}
        >
          <span>{expanded ? "Less" : `+${hidden.length} more`}</span>
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              expanded && "rotate-180"
            )}
          />
        </button>
      )}
    </div>
  )
}
