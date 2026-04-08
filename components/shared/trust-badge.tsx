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

import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import { useReducedMotion } from '@/components/ui/motion'
import { BADGE_REGISTRY, BADGE_PRESETS, resolveEntry, type BadgeId, type BadgeVariant, type PresetEntry, type BadgeConfig } from '@/lib/trust-badges'
import { getPatientCount } from '@/lib/social-proof'

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

// ── Styled badge sub-components ──────────────────────────────────────

// no_call — pulsing green dot
function NoCallBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
    </div>
  )
}

// no_speaking — silence ripple (CSS ping rings)
function NoSpeakingBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <span className="absolute inset-0 rounded-full border border-green-400 animate-ping opacity-75" />
        <Icon className={cn('w-3.5 h-3.5 shrink-0 relative', config.iconColor)} aria-hidden="true" />
      </div>
      <span>{config.label}</span>
    </div>
  )
}

// form_only — document lines fill in (Framer)
function FormOnlyBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
      {!reducedMotion && (
        <svg viewBox="0 0 24 14" width={24} height={14} aria-hidden="true">
          {[2, 7, 12].map((y, i) => (
            <motion.rect
              key={y}
              x={0}
              y={y}
              width={24}
              height={1.5}
              rx={1}
              fill="currentColor"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: i * 0.15, ease: 'easeOut' }}
              style={{ transformOrigin: 'left center' }}
            />
          ))}
        </svg>
      )}
    </div>
  )
}

// no_waiting_room — clock strikethrough overlay (Framer)
function NoWaitingRoomBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
        {!reducedMotion && (
          <svg
            viewBox="0 0 14 14"
            width={14}
            height={14}
            className="absolute inset-0 text-amber-600"
            aria-hidden="true"
          >
            <motion.line
              x1={0}
              y1={0}
              x2={14}
              y2={14}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray={20}
              initial={{ strokeDashoffset: 20 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </svg>
        )}
      </div>
      <span>{config.label}</span>
    </div>
  )
}

// no_appointment — CalendarX X strokes draw (Framer)
function NoAppointmentBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
        {!reducedMotion && (
          <svg
            viewBox="0 0 10 10"
            width={10}
            height={10}
            className="absolute inset-0 text-orange-600"
            aria-hidden="true"
          >
            <motion.path
              d="M2,2 L8,8"
              stroke="currentColor"
              strokeWidth={1.5}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
            <motion.path
              d="M8,2 L2,8"
              stroke="currentColor"
              strokeWidth={1.5}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.1, ease: 'easeOut' }}
            />
          </svg>
        )}
      </div>
      <span>{config.label}</span>
    </div>
  )
}

// from_your_phone — screen glow (CSS hover)
function FromYourPhoneBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <div className="transition-all duration-200 hover:brightness-110">
        <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      </div>
      <span>{config.label}</span>
    </div>
  )
}

// same_day — send nudge (CSS hover translate)
function SameDayBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <Icon
        className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-200 hover:translate-x-0.5', config.iconColor)}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </div>
  )
}

// ahpra — shimmer sweep (CSS group hover)
function AhpraBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  const Icon = config.icon

  const inner = (
    <div
      className={cn(
        'group relative overflow-hidden inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border cursor-help',
        config.pillClass,
        className,
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />
    </div>
  )

  if (!config.tooltip) return inner

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {inner}
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

// refund — hexagonal stamp (Framer, emerald)
function RefundBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
  const Icon = config.icon
  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
      style={{
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        padding: '6px 16px',
      }}
      initial={{ rotate: reducedMotion ? 0 : -3 }}
      animate={{ rotate: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
    </motion.div>
  )
}

// legally_valid — hexagonal stamp (Framer, indigo)
function LegallyValidBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
  const Icon = config.icon
  return (
    <motion.div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
      style={{
        clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
        padding: '6px 16px',
      }}
      initial={{ rotate: reducedMotion ? 0 : -3 }}
      animate={{ rotate: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
    </motion.div>
  )
}

// au_data — trailing dot pulse (CSS staggered)
function AuDataBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
      {[0, 0.3, 0.6].map((delay, i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-blue-500 animate-pulse inline-block mx-px"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  )
}

// stripe — wordmark card
function StripeBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  const inner = (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-card border border-[#635BFF]/20 hover:border-[#635BFF]/60 transition-colors shadow-sm cursor-help text-xs',
        className,
      )}
    >
      <Lock className="w-3.5 h-3.5 text-[#635BFF]" aria-hidden="true" />
      <span className="text-muted-foreground">Secured by</span>
      <svg viewBox="0 0 50 21" width={40} height={17} aria-label="Stripe">
        <text x="0" y="16" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="700" fill="#635BFF">stripe</text>
      </svg>
    </div>
  )

  if (!config.tooltip) return inner

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {inner}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[220px] text-xs">
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

// real_gp — ECG line draws (Framer)
function RealGpBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      <span>{config.label}</span>
      {!reducedMotion && (
        <svg viewBox="0 0 30 16" width={30} height={16} aria-hidden="true">
          <motion.path
            d="M0,8 L6,8 L8,2 L12,14 L16,2 L20,8 L30,8"
            stroke="currentColor"
            strokeWidth={1.5}
            fill="none"
            className="text-teal-600"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
      )}
    </div>
  )
}

// no_medicare — strikethrough overlay (Framer)
function NoMedicareBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <Icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
        <svg
          viewBox="0 0 14 14"
          width={14}
          height={14}
          className="absolute inset-0 text-amber-600"
          aria-hidden="true"
        >
          <motion.line
            x1={0}
            y1={0}
            x2={14}
            y2={14}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeDasharray={20}
            initial={{ strokeDashoffset: reducedMotion ? 0 : 20 }}
            animate={{ strokeDashoffset: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: 'easeOut' }}
          />
        </svg>
      </div>
      <span>{config.label}</span>
    </div>
  )
}

// instant_pdf — envelope fly (CSS group hover)
function InstantPdfBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  const Icon = config.icon
  return (
    <div
      className={cn(
        'group inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <Icon
        className={cn('w-3.5 h-3.5 shrink-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-0', config.iconColor)}
        aria-hidden="true"
      />
      <span>{config.label}</span>
    </div>
  )
}

// social_proof — counter animation (Framer)
function SocialProofBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
  const count = getPatientCount()
  const motionCount = useMotionValue(count - 30)
  const displayCount = useTransform(motionCount, Math.round)

  useEffect(() => {
    if (!reducedMotion) {
      const controls = animate(motionCount, count, { duration: 1.2, ease: 'easeOut' })
      return controls.stop
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
        config.pillClass,
        className,
      )}
    >
      <config.icon className={cn('w-3.5 h-3.5 shrink-0', config.iconColor)} aria-hidden="true" />
      {reducedMotion ? (
        <span>{count} Australians helped</span>
      ) : (
        <span>
          <motion.span>{displayCount}</motion.span> Australians helped
        </span>
      )}
    </div>
  )
}

// ── StyledBadge dispatcher ───────────────────────────────────────────

function StyledBadge({ id, className }: { id: BadgeId; className?: string }) {
  const config = BADGE_REGISTRY[id]
  const reducedMotion = useReducedMotion()

  switch (id) {
    case 'no_call':
      return <NoCallBadge config={config} className={className} />
    case 'no_speaking':
      return <NoSpeakingBadge config={config} className={className} />
    case 'form_only':
      return <FormOnlyBadge config={config} className={className} reducedMotion={reducedMotion} />
    case 'no_waiting_room':
      return <NoWaitingRoomBadge config={config} className={className} reducedMotion={reducedMotion} />
    case 'no_appointment':
      return <NoAppointmentBadge config={config} className={className} reducedMotion={reducedMotion} />
    case 'from_your_phone':
      return <FromYourPhoneBadge config={config} className={className} />
    case 'same_day':
      return <SameDayBadge config={config} className={className} />
    case 'ahpra':
      return <AhpraBadge config={config} className={className} />
    case 'refund':
      return <RefundBadge config={config} className={className} reducedMotion={reducedMotion} />
    case 'legally_valid':
      return <LegallyValidBadge config={config} className={className} reducedMotion={reducedMotion} />
    case 'au_data':
      return <AuDataBadge config={config} className={className} />
    case 'stripe':
      return <StripeBadge config={config} className={className} />
    case 'real_gp':
      return <RealGpBadge config={config} className={className} reducedMotion={reducedMotion} />
    case 'no_medicare':
      return <NoMedicareBadge config={config} className={className} reducedMotion={reducedMotion} />
    case 'instant_pdf':
      return <InstantPdfBadge config={config} className={className} />
    case 'social_proof':
      return <SocialProofBadge config={config} className={className} reducedMotion={reducedMotion} />
    default:
      return <PlainBadge id={id} className={className} />
  }
}

// ── Main TrustBadge export ───────────────────────────────────────────

export function TrustBadge({
  id,
  variant = 'plain',
  className,
}: {
  id: BadgeId
  variant?: BadgeVariant
  className?: string
}) {
  const config = BADGE_REGISTRY[id]
  if (variant === 'styled' && config.hasStyledTier) {
    return <StyledBadge id={id} className={className} />
  }
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
