"use client"

import { cn } from "@/lib/utils"

interface IconProps {
  className?: string
  style?: React.CSSProperties
}

// ─── Filled icon components ───────────────────────────────────────────────────

// Document with page-fold — Medical Certificates
export function DocumentFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      <path
        d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z"
        fill="rgba(255,255,255,0.92)"
      />
      <path d="M14 2V8H20L14 2Z" fill="rgba(255,255,255,0.38)" />
      <path
        d="M8 11.5H16M8 14.5H16M8 17.5H12"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Pill capsule — Repeat Medication
export function PillFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      <path
        d="M8.5 3.5C7.4 2.4 5.6 2.4 4.5 3.5C3.4 4.6 3.4 6.4 4.5 7.5L16.5 19.5C17.6 20.6 19.4 20.6 20.5 19.5C21.6 18.4 21.6 16.6 20.5 15.5L8.5 3.5Z"
        fill="rgba(255,255,255,0.92)"
      />
      <path
        d="M16.5 19.5L20.5 15.5C21.6 16.6 21.6 18.4 20.5 19.5C19.4 20.6 17.6 20.6 16.5 19.5Z"
        fill="rgba(255,255,255,0.42)"
      />
      <path
        d="M6.5 11.5L12.5 5.5"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Lightning bolt — ED Treatment
export function LightningFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      <path
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        fill="rgba(255,255,255,0.92)"
      />
      <path
        d="M13 5.5L6.5 14H11.5L11 19L17.5 10H12.5L13 5.5Z"
        fill="rgba(255,255,255,0.3)"
      />
    </svg>
  )
}

// Four-point star + satellite — Hair Loss Treatment
export function SparkleFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      <path
        d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z"
        fill="rgba(255,255,255,0.92)"
      />
      <path
        d="M19 3L20 5.5L22.5 6.5L20 7.5L19 10L18 7.5L15.5 6.5L18 5.5L19 3Z"
        fill="rgba(255,255,255,0.5)"
      />
      <circle cx="5.5" cy="17.5" r="1.2" fill="rgba(255,255,255,0.38)" />
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

// Flame — Weight Loss
export function FlameFilledIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn("w-6 h-6", className)} style={style}>
      <path
        d="M12.5 2C12.5 2 17 7.5 17 11.5C17 11.5 19 10 19 8C19 8 22 11.5 22 15C22 19.42 17.52 23 12 23C6.48 23 2 19.42 2 15C2 9 8 5.5 8 5.5C8 5.5 8.5 8.5 11 10.5C11 6.5 12.5 2 12.5 2Z"
        fill="rgba(255,255,255,0.92)"
      />
      <path
        d="M12 13C12 13 14 11.5 14 14.5C14 16.43 13.1 18 12 18C10.9 18 10 16.43 10 14.5C10 11.5 12 13 12 13Z"
        fill="rgba(255,255,255,0.38)"
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
