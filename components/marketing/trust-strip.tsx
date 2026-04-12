"use client"

/**
 * Unified Trust Strip
 *
 * Compact row of trust indicators for intake flows, checkout, and headers.
 * Delegates to TrustBadgeRow from the primitive library.
 *
 * Usage:
 *   <TrustStrip />                          // Default: AHPRA + Encrypted + Private
 *   <TrustStrip badges={["ahpra","encrypted","refund"]} />  // Med cert variant
 *   <TrustStrip badges={["ahpra","encrypted","tga"]} />     // Compliance variant
 *   <TrustStrip tooltips={false} />          // Without tooltips (headers)
 */

import { cn } from "@/lib/utils"
import { TrustBadgeRow } from "@/components/shared/trust-badge"
import type { BadgeId } from "@/lib/marketing/trust-badges"

type BadgeType = "ahpra" | "encrypted" | "private" | "refund" | "tga"

const OLD_TO_NEW: Record<BadgeType, BadgeId> = {
  ahpra: 'ahpra',
  encrypted: 'ssl',
  private: 'privacy',
  refund: 'refund',
  tga: 'tga',
}

const DEFAULT_BADGES: BadgeType[] = ["ahpra", "encrypted", "private"]

interface TrustStripProps {
  /** Which badges to show (default: ahpra, encrypted, private) */
  badges?: BadgeType[]
  /** Show tooltips on hover (default: true - handled automatically by TrustBadgeRow) */
  tooltips?: boolean
  /** Show pipe separators between items (no-op in new impl) */
  separators?: boolean
  /** Additional classes */
  className?: string
}

export function TrustStrip({
  badges = DEFAULT_BADGES,
  tooltips: _tooltips,
  separators: _separators,
  className,
}: TrustStripProps) {
  const mappedBadges = badges.map((b) => OLD_TO_NEW[b])

  return (
    <TrustBadgeRow
      badges={mappedBadges}
      className={cn("py-2", className)}
    />
  )
}
