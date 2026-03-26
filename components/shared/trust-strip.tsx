"use client"

/**
 * Unified Trust Strip
 *
 * Compact row of trust indicators for intake flows, checkout, and headers.
 * Replaces 4 near-identical TrustStrip components that were scattered across
 * repeat-rx, med-cert, prescription, and compliance-marquee.
 *
 * Usage:
 *   <TrustStrip />                          // Default: AHPRA + Encrypted + Private
 *   <TrustStrip badges={["ahpra","encrypted","refund"]} />  // Med cert variant
 *   <TrustStrip badges={["ahpra","encrypted","tga"]} />     // Compliance variant
 *   <TrustStrip tooltips={false} />          // Without tooltips (headers)
 */

import { BadgeCheck, Lock, Shield, CheckCircle2, FileCheck } from "lucide-react"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

type BadgeType = "ahpra" | "encrypted" | "private" | "refund" | "tga"

const BADGE_CONFIG: Record<BadgeType, {
  icon: typeof BadgeCheck
  iconColor: string
  label: string
  tooltip: string
}> = {
  ahpra: {
    icon: BadgeCheck,
    iconColor: "text-green-600",
    label: "AHPRA doctors",
    tooltip: "All doctors are AHPRA-registered",
  },
  encrypted: {
    icon: Lock,
    iconColor: "text-primary",
    label: "Encrypted",
    tooltip: "Bank-level 256-bit encryption protects your data",
  },
  private: {
    icon: Shield,
    iconColor: "text-blue-600",
    label: "100% private",
    tooltip: "We never sell your data",
  },
  refund: {
    icon: Shield,
    iconColor: "text-blue-600",
    label: "Full refund if not approved",
    tooltip: "Full refund if your request cannot be approved",
  },
  tga: {
    icon: FileCheck,
    iconColor: "text-primary",
    label: "TGA compliant",
    tooltip: "TGA-compliant prescribing and processes",
  },
}

const DEFAULT_BADGES: BadgeType[] = ["ahpra", "encrypted", "private"]

interface TrustStripProps {
  /** Which badges to show (default: ahpra, encrypted, private) */
  badges?: BadgeType[]
  /** Show tooltips on hover (default: true) */
  tooltips?: boolean
  /** Show pipe separators between items */
  separators?: boolean
  /** Additional classes */
  className?: string
}

export function TrustStrip({
  badges = DEFAULT_BADGES,
  tooltips = true,
  separators = false,
  className,
}: TrustStripProps) {
  const content = badges.map((badgeType, i) => {
    const config = BADGE_CONFIG[badgeType]
    const Icon = config.icon

    const badge = (
      <div
        key={badgeType}
        className={cn(
          "flex items-center gap-1.5",
          tooltips && "cursor-help"
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", config.iconColor)} aria-hidden="true" />
        <span>{config.label}</span>
      </div>
    )

    return (
      <span key={badgeType} className="contents">
        {tooltips ? (
          <Tooltip>
            <TooltipTrigger asChild>{badge}</TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px] text-xs">
              {config.tooltip}
            </TooltipContent>
          </Tooltip>
        ) : (
          badge
        )}
        {separators && i < badges.length - 1 && (
          <span className="text-muted-foreground/30">|</span>
        )}
      </span>
    )
  })

  const strip = (
    <div className={cn(
      "flex items-center justify-center gap-4 py-2 text-xs text-muted-foreground",
      className
    )}>
      {content}
    </div>
  )

  if (tooltips) {
    return <TooltipProvider>{strip}</TooltipProvider>
  }

  return strip
}
