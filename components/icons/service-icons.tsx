"use client"

import {
  FileCheck2,
  Flame,
  Heart,
  Pill,
  Sparkles,
  Stethoscope,
  Zap,
} from "lucide-react"

import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"
import { cn } from "@/lib/utils"

// ─── Shared icon system ───────────────────────────────────────────────────────
//
// Service tiles render as colored soft-bg + outlined Lucide icon (default)
// or as playful illustrated sticker via `variant="sticker"`.
//
// Canon: DESIGN.md §7 — "White-filled SVG icons on a per-service
// gradient tile, or illustrated sticker in marketing contexts only."
//
// Consumers should import this via `@/lib/services/service-catalog`; this
// module is the low-level renderer.

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText:    FileCheck2,
  Pill,
  Lightning:   Zap,
  Sparkles,
  Stethoscope,
  Heart,
  Flame,
}

// Optional: illustrated sticker fallbacks. Only used when variant="sticker".
const stickerMap: Record<string, StickerIconName> = {
  FileText:    'medical-history',
  Pill:        'pill-bottle',
  Lightning:   'lightning',
  Sparkles:    'hair-brush',
  Stethoscope: 'stethoscope',
  Heart:       'heart-with-pulse',
  Flame:       'thermometer',
}

// Service colour tokens. Pair with lib/services/service-catalog.ts `colorToken`.
// violet is intentionally absent — prohibited per DESIGN.md §1 C1 sweep.
export const serviceColorConfig: Record<string, { bg: string; text: string; from: string; to: string; shadow: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', from: '#10B981', to: '#059669', shadow: 'rgba(5,150,105,0.28)' },
  cyan:    { bg: 'bg-sky-50 dark:bg-sky-950/30',         text: 'text-sky-600 dark:text-sky-400',         from: '#0EA5E9', to: '#0284C7', shadow: 'rgba(2,132,199,0.28)' },
  blue:    { bg: 'bg-indigo-50 dark:bg-indigo-950/30',   text: 'text-indigo-600 dark:text-indigo-400',   from: '#6366F1', to: '#4F46E5', shadow: 'rgba(79,70,229,0.28)' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-950/30',     text: 'text-amber-600 dark:text-amber-400',     from: '#F59E0B', to: '#D97706', shadow: 'rgba(217,119,6,0.28)' },
  pink:    { bg: 'bg-pink-50 dark:bg-pink-950/30',       text: 'text-pink-600 dark:text-pink-400',       from: '#EC4899', to: '#DB2777', shadow: 'rgba(219,39,119,0.28)' },
  rose:    { bg: 'bg-rose-50 dark:bg-rose-950/30',       text: 'text-rose-600 dark:text-rose-400',       from: '#F43F5E', to: '#E11D48', shadow: 'rgba(225,29,72,0.28)' },
  sky:     { bg: 'bg-sky-50 dark:bg-sky-950/30',         text: 'text-sky-600 dark:text-sky-400',         from: '#0EA5E9', to: '#0284C7', shadow: 'rgba(2,132,199,0.28)' },
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
  /**
   * Rendering style.
   * - `tile` (default): soft colored tile + outlined Lucide icon. Canonical.
   * - `sticker`: playful illustrated SVG. Marketing-only.
   */
  variant?: 'tile' | 'sticker'
  /** Passed to the underlying <img> loading attribute when variant="sticker". */
  stickerLoading?: 'lazy' | 'eager'
}

export function ServiceIconTile({ iconKey, color, size = 'md', className, variant = 'tile', stickerLoading = 'lazy' }: ServiceIconTileProps) {
  const colors = serviceColorConfig[color] || serviceColorConfig.emerald
  const { tile, icon } = tileSizes[size]
  const stickerSize = size === 'sm' ? 32 : size === 'md' ? 40 : 48

  if (variant === 'sticker') {
    const stickerName = stickerMap[iconKey]
    if (stickerName) {
      return (
        <div className={cn('flex items-center justify-center flex-shrink-0', className)}>
          <StickerIcon name={stickerName} size={stickerSize} loading={stickerLoading} />
        </div>
      )
    }
    // Fall through to tile if no sticker available for this iconKey.
  }

  const Icon = iconComponents[iconKey] || FileCheck2
  return (
    <div
      className={cn(tile, 'flex items-center justify-center flex-shrink-0', colors.bg, className)}
    >
      <Icon className={cn(icon, colors.text)} />
    </div>
  )
}
