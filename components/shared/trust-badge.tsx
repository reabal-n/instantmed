'use client'

/**
 * TrustBadge primitive library
 *
 * Usage:
 *   <TrustBadge id="ahpra" />                       // plain (default)
 *   <TrustBadge id="no_call" variant="styled" />     // styled tier (Task 4)
 *   <TrustBadgeRow preset="hero_medcert" />          // preset row
 *   <TrustBadgeGrid preset="credential_grid" />      // 4-col card grid
 */

import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { BADGE_REGISTRY, BADGE_PRESETS, resolveEntry, type BadgeId, type BadgeVariant, type PresetEntry } from '@/lib/trust-badges'

// ── Shared pill wrapper ──────────────────────────────────────────────

function PlainBadge({
  id,
  className,
}: {
  id: BadgeId
  className?: string
}) {
  const config = BADGE_REGISTRY[id]
  const Icon = config.icon
  const hasPill = config.pillClass !== null

  const inner = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium',
        hasPill && cn(
          'px-2.5 py-1 rounded-full border',
          config.pillClass,
        ),
        !hasPill && 'text-muted-foreground',
        className,
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
    </div>
  )

  if (!config.tooltip) return inner

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="cursor-help">{inner}</div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
        {config.tooltip}
        {config.tooltipHref && (
          <a
            href={config.tooltipHref}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-1 text-primary underline underline-offset-2"
          >
            Verify →
          </a>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

// ── Main TrustBadge export ───────────────────────────────────────────
// Styled implementations added in Task 4.

export function TrustBadge({
  id,
  variant = 'plain',
  className,
}: {
  id: BadgeId
  variant?: BadgeVariant
  className?: string
}) {
  // Styled tier implemented in Task 4; fall back to plain for now
  return <PlainBadge id={id} className={className} />
}

// ── TrustBadgeRow ────────────────────────────────────────────────────

interface TrustBadgeRowProps {
  /** Named preset from BADGE_PRESETS */
  preset?: string
  /** Or pass entries directly */
  badges?: PresetEntry[]
  className?: string
}

export function TrustBadgeRow({ preset, badges, className }: TrustBadgeRowProps) {
  const entries = badges ?? (preset ? BADGE_PRESETS[preset] : [])
  if (!entries?.length) return null

  return (
    <TooltipProvider>
      <div className={cn('flex flex-wrap items-center justify-center gap-2', className)}>
        {entries.map((entry) => {
          const { id, variant } = resolveEntry(entry)
          return <TrustBadge key={id} id={id} variant={variant} />
        })}
      </div>
    </TooltipProvider>
  )
}

// ── TrustBadgeGrid ───────────────────────────────────────────────────
// 4-col card grid — replaces TrustBadgeSlider

interface TrustBadgeGridProps {
  preset?: string
  badges?: PresetEntry[]
  className?: string
}

export function TrustBadgeGrid({ preset, badges, className }: TrustBadgeGridProps) {
  const entries = badges ?? (preset ? BADGE_PRESETS[preset] : [])
  if (!entries?.length) return null

  return (
    <TooltipProvider>
      <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
        {entries.map((entry) => {
          const { id, variant } = resolveEntry(entry)
          const config = BADGE_REGISTRY[id]
          const Icon = config.icon
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-card border border-border/30 shadow-md shadow-primary/[0.06] hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-help">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    config.pillClass ? config.pillClass.split(' ').slice(0, 2).join(' ') : 'bg-muted'
                  )}>
                    <Icon className={cn('w-5 h-5', config.iconColor)} aria-hidden="true" />
                  </div>
                  <TrustBadge id={id} variant={variant} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[200px] text-xs">
                {config.tooltip}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
