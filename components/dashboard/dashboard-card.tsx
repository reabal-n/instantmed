"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Card tiers from docs/DESIGN_SYSTEM.md §5 (solid depth, dub.co pattern).
 *
 * - standard:    most common surface. Sky-toned shadow at 4% alpha.
 * - elevated:    feature cards, pricing, status panels. Sky-toned shadow at 6%, lifts on hover when interactive.
 * - highlighted: popular/featured cards with primary ring + stronger shadow.
 *
 * NEVER use frosted glass / backdrop-blur on content surfaces.
 * NEVER use black box-shadow.
 */
export type DashboardCardTier = "standard" | "elevated" | "highlighted"

const tierStyles: Record<DashboardCardTier, string> = {
  standard:
    "bg-white dark:bg-card border border-border/50 dark:border-white/15 " +
    "shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl " +
    "transition-[transform,box-shadow,border-color] duration-300",
  elevated:
    "bg-white dark:bg-card border border-border/50 dark:border-white/15 " +
    "shadow-md shadow-primary/[0.06] dark:shadow-none rounded-2xl " +
    "transition-[transform,box-shadow,border-color] duration-300",
  highlighted:
    "bg-white dark:bg-card border border-border/50 dark:border-white/15 " +
    "ring-2 ring-primary shadow-lg shadow-primary/[0.1] dark:shadow-none rounded-2xl " +
    "transition-[transform,box-shadow,border-color] duration-300",
}

const interactiveHoverStyles: Record<DashboardCardTier, string> = {
  standard: "hover:border-primary/40 hover:shadow-md hover:shadow-primary/[0.06]",
  elevated:
    "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/[0.08] hover:border-primary/40",
  highlighted:
    "hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/[0.15] hover:border-primary/50",
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
} as const

export interface DashboardCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  tier?: DashboardCardTier
  /** Default md. Pass none to control padding inside the card. */
  padding?: keyof typeof paddingClasses
  /** When true OR onClick is provided, applies hover lift treatment. */
  interactive?: boolean
  /**
   * @deprecated Use tier="elevated" instead.
   * Back-compat shim for the legacy 21st.dev DashboardCard.
   * FIXME(2026-10-29): remove after admin + doctor portal migrations land.
   */
  elevated?: boolean
  /**
   * @deprecated Removed. Cursor-following spotlight effect was banned by the
   * design system §17 (no decorative cursor effects). Prop accepted as a no-op
   * for back-compat but ignored.
   * FIXME(2026-10-29): remove after admin + doctor portal migrations land.
   */
  spotlight?: boolean
}

/**
 * DashboardCard
 *
 * Canonical solid-depth card for portal surfaces. Replaces the legacy
 * 21st.dev `dashboard-card` / `dashboard-card-elevated` classes from
 * `app/dashboard-styles.css`.
 *
 * @example
 *   <DashboardCard tier="elevated" padding="md">
 *     ...
 *   </DashboardCard>
 */
export const DashboardCard = forwardRef<HTMLDivElement, DashboardCardProps>(
  function DashboardCard(
    {
      children,
      className,
      tier,
      padding = "md",
      interactive,
      elevated,
      spotlight: _spotlight,
      onClick,
      ...rest
    },
    ref,
  ) {
    const resolvedTier: DashboardCardTier = tier ?? (elevated ? "elevated" : "standard")
    const isInteractive = Boolean(interactive ?? onClick)

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          tierStyles[resolvedTier],
          paddingClasses[padding],
          isInteractive && interactiveHoverStyles[resolvedTier],
          isInteractive && "cursor-pointer",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    )
  },
)
