'use client'

/**
 * TrustBadge primitive library
 *
 * Usage:
 *   <TrustBadge id="ahpra" />                       // plain (default)
 *   <TrustBadge id="no_call" variant="styled" />     // styled tier (Task 4)
 *   <TrustBadgeRow preset="hero_medcert" />          // preset row
 *   <TrustBadgeGrid preset="credential_grid" />      // 4-col card grid
 *   <TrustBadgeRow preset="trust_certifications" />  // LegitScript + Google cert logos
 */

import { useEffect } from 'react'
import Image from 'next/image'
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

// refund / legally_valid — hexagonal stamp (Framer) — shared implementation
function HexStampBadge({ config, className, reducedMotion }: { config: BadgeConfig; className?: string; reducedMotion: boolean }) {
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
          key={`dot-${i}`}
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

// legitscript — actual seal image with verify link
function LegitScriptBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <a
          href="https://www.legitscript.com/websites/?checker_keywords=instantmed.com.au"
          target="_blank"
          rel="noopener noreferrer"
          title="Verify LegitScript certification for instantmed.com.au"
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg',
            'bg-white dark:bg-card border border-[#00A651]/25 hover:border-[#00A651]/60',
            'shadow-sm transition-colors',
            className,
          )}
        >
          <Image
            src="/logos/legitscript.png"
            alt="LegitScript certified"
            width={26}
            height={28}
            unoptimized
            className="h-auto w-auto rounded-sm dark:bg-white/95 dark:p-0.5"
            style={{ width: 26, height: 28 }}
          />
          <div className="leading-tight">
            <p className="text-xs font-semibold text-foreground">LegitScript</p>
            <p className="text-[10px] text-muted-foreground">Certified</p>
          </div>
        </a>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] text-xs">
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

// google_pharmacy — Google "G" logo + Online Pharmacy Certified
function GooglePharmacyBadge({ config, className }: { config: BadgeConfig; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-help',
            'bg-white dark:bg-card border border-[#4285F4]/20 hover:border-[#4285F4]/50',
            'shadow-sm transition-colors',
            className,
          )}
        >
          {/* Google "G" multicolor SVG */}
          <svg viewBox="0 0 24 24" width={18} height={18} aria-label="Google" className="shrink-0">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <div className="leading-tight">
            <p className="text-xs font-semibold text-foreground">Google</p>
            <p className="text-[10px] text-muted-foreground">Pharmacy Certified</p>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[240px] text-xs">
        {config.tooltip}
      </TooltipContent>
    </Tooltip>
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
    if (reducedMotion) return
    const controls = animate(motionCount, count, { duration: 1.2, ease: 'easeOut' })
    return controls.stop
  }, [reducedMotion, count, motionCount])

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
      return <HexStampBadge config={config} className={className} reducedMotion={reducedMotion} />
    case 'legally_valid':
      return <HexStampBadge config={config} className={className} reducedMotion={reducedMotion} />
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
    case 'legitscript':
      return <LegitScriptBadge config={config} className={className} />
    case 'google_pharmacy':
      return <GooglePharmacyBadge config={config} className={className} />
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
          const { id } = resolveEntry(entry)
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
                  <p className="text-sm font-semibold text-foreground leading-tight">{config.label}</p>
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
