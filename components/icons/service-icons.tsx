"use client"

import { cn } from "@/lib/utils"

interface IconProps {
  className?: string
  style?: React.CSSProperties
}

// ─── Filled icon components ───────────────────────────────────────────────────

// Certificate with ribbon seal — Medical Certificates
export function DocumentFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      <path
        d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
        fill="rgba(255,255,255,0.92)"
      />
      <path d="M14 2V8H20L14 2Z" fill="rgba(255,255,255,0.38)" />
      {/* Text lines */}
      <path
        d="M8 11H14M8 13.5H16"
        stroke="rgba(0,0,0,0.10)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Seal / checkmark badge */}
      <circle cx="15.5" cy="17.5" r="2.5" fill="rgba(255,255,255,0.5)" />
      <path
        d="M14.5 17.5L15.2 18.2L16.8 16.6"
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Prescription Rx symbol — Repeat Medication
export function PillFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      {/* Prescription pad background */}
      <rect x="4" y="3" width="16" height="18" rx="2.5" fill="rgba(255,255,255,0.92)" />
      {/* Rx symbol */}
      <path
        d="M8.5 9H11.5C12.6 9 13.5 9.9 13.5 11C13.5 12.1 12.6 13 11.5 13H8.5V9Z"
        fill="rgba(255,255,255,0.5)"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="1.1"
      />
      <path
        d="M8.5 9V17M11.5 13L14.5 17"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      {/* Refill dots */}
      <circle cx="9" cy="19.5" r="0.6" fill="rgba(0,0,0,0.10)" />
      <circle cx="11" cy="19.5" r="0.6" fill="rgba(0,0,0,0.10)" />
      <circle cx="13" cy="19.5" r="0.6" fill="rgba(0,0,0,0.10)" />
    </svg>
  )
}

// Shield with upward bolt — ED Treatment
export function LightningFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      {/* Shield shape */}
      <path
        d="M12 2L4 5.5V11C4 16.25 7.4 20.9 12 22C16.6 20.9 20 16.25 20 11V5.5L12 2Z"
        fill="rgba(255,255,255,0.92)"
      />
      {/* Inner shield highlight */}
      <path
        d="M12 4L6 6.8V11.2C6 15.2 8.6 18.8 12 19.8C15.4 18.8 18 15.2 18 11.2V6.8L12 4Z"
        fill="rgba(255,255,255,0.4)"
      />
      {/* Lightning bolt inside */}
      <path
        d="M13 7L9.5 13H12L11.5 17L15.5 11H12.5L13 7Z"
        fill="rgba(0,0,0,0.14)"
      />
    </svg>
  )
}

// Leaf with growth lines — Hair Loss Treatment
export function SparkleFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      {/* Leaf / regrowth shape */}
      <path
        d="M12 22C12 22 4 18 4 10C4 6 8 2 12 2C16 2 20 6 20 10C20 18 12 22 12 22Z"
        fill="rgba(255,255,255,0.92)"
      />
      {/* Inner vein lines — growth motif */}
      <path
        d="M12 6V18M9 9C9 9 10.5 11 12 11M15 9C15 9 13.5 11 12 11M9.5 13C9.5 13 11 14.5 12 14.5M14.5 13C14.5 13 13 14.5 12 14.5"
        stroke="rgba(0,0,0,0.10)"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Small sparkle accent */}
      <path
        d="M18 4L18.8 6.2L21 7L18.8 7.8L18 10L17.2 7.8L15 7L17.2 6.2L18 4Z"
        fill="rgba(255,255,255,0.5)"
      />
    </svg>
  )
}

// Heart with subtle cross — Women's Health
export function HeartFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      <path
        d="M20.84 4.61C20.3 4.07 19.66 3.64 18.96 3.36C18.26 3.08 17.51 2.94 16.76 2.94C15.83 2.94 14.94 3.16 14.15 3.57C13.68 3.82 13.26 4.14 12.9 4.52L12 5.42L11.1 4.52C10.74 4.14 10.32 3.82 9.85 3.57C9.06 3.16 8.17 2.94 7.24 2.94C6.49 2.94 5.74 3.08 5.04 3.36C4.34 3.64 3.7 4.07 3.16 4.61C1.98 5.79 1.33 7.38 1.33 9C1.33 10.62 1.98 12.21 3.16 13.39L12 22.22L20.84 13.39C22.02 12.21 22.67 10.62 22.67 9C22.67 7.38 22.02 5.79 20.84 4.61Z"
        fill="rgba(255,255,255,0.92)"
      />
      <path
        d="M12 9.5V13.5M10 11.5H14"
        stroke="rgba(0,0,0,0.14)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Scale with downward trend — Weight Loss
export function FlameFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      {/* Circular scale base */}
      <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.92)" />
      <circle cx="12" cy="12" r="7.5" fill="rgba(255,255,255,0.4)" />
      {/* Downward trend line */}
      <path
        d="M7 10L10 12L13 9.5L17 14"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow tip on trend */}
      <path
        d="M15 14H17V12"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Tick marks */}
      <path
        d="M12 3V4.5M12 19.5V21M3 12H4.5M19.5 12H21"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  )
}

// ─── Shared icon system ───────────────────────────────────────────────────────

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText:  DocumentFilledIcon,
  Pill:      PillFilledIcon,
  Lightning: LightningFilledIcon,
  Sparkles:  SparkleFilledIcon,
  Heart:     HeartFilledIcon,
  Flame:     FlameFilledIcon,
}

export const serviceColorConfig: Record<string, { from: string; to: string; shadow: string }> = {
  emerald: { from: '#10B981', to: '#059669', shadow: 'rgba(5,150,105,0.28)' },
  cyan:    { from: '#0EA5E9', to: '#0284C7', shadow: 'rgba(2,132,199,0.28)' },
  blue:    { from: '#6366F1', to: '#4F46E5', shadow: 'rgba(79,70,229,0.28)' },
  violet:  { from: '#A855F7', to: '#7C3AED', shadow: 'rgba(124,58,237,0.28)' },
  pink:    { from: '#EC4899', to: '#DB2777', shadow: 'rgba(219,39,119,0.28)' },
  rose:    { from: '#F43F5E', to: '#E11D48', shadow: 'rgba(225,29,72,0.28)' },
}

const tileSizes = {
  sm: { tile: 'w-8 h-8 rounded-lg',   icon: 'w-4 h-4' },
  md: { tile: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
  lg: { tile: 'w-12 h-12 rounded-xl', icon: 'w-6 h-6' },
}

interface ServiceIconTileProps {
  iconKey: string
  color: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ServiceIconTile({ iconKey, color, size = 'md', className }: ServiceIconTileProps) {
  const Icon = iconComponents[iconKey] || DocumentFilledIcon
  const colors = serviceColorConfig[color] || serviceColorConfig.emerald
  const { tile, icon } = tileSizes[size]
  return (
    <div
      className={cn(tile, 'flex items-center justify-center flex-shrink-0', className)}
      style={{
        background: `linear-gradient(135deg, ${colors.from}, ${colors.to})`,
        boxShadow: `0 3px 10px ${colors.shadow}`,
      }}
    >
      <Icon className={icon} />
    </div>
  )
}
