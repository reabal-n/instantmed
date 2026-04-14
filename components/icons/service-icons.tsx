"use client"

import {
  FileCheck2,
  Heart,
  Pill,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react"

import { cn } from "@/lib/utils"

// ─── Shared icon system ───────────────────────────────────────────────────────
// Uses clean lucide-react icons on gradient tiles. White strokes on color = sharp, modern.

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText:  FileCheck2,
  Pill,
  Lightning: Zap,
  Sparkles,
  Heart,
  Flame:     TrendingDown,
}

export const serviceColorConfig: Record<string, { bg: string; text: string; from: string; to: string; shadow: string }> = {
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', from: '#10B981', to: '#059669', shadow: 'rgba(5,150,105,0.28)' },
  cyan:    { bg: 'bg-sky-50 dark:bg-sky-950/30',         text: 'text-sky-600 dark:text-sky-400',         from: '#0EA5E9', to: '#0284C7', shadow: 'rgba(2,132,199,0.28)' },
  blue:    { bg: 'bg-indigo-50 dark:bg-indigo-950/30',   text: 'text-indigo-600 dark:text-indigo-400',   from: '#6366F1', to: '#4F46E5', shadow: 'rgba(79,70,229,0.28)' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-950/30',   text: 'text-violet-600 dark:text-violet-400',   from: '#A855F7', to: '#7C3AED', shadow: 'rgba(124,58,237,0.28)' },
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
}

export function ServiceIconTile({ iconKey, color, size = 'md', className }: ServiceIconTileProps) {
  const Icon = iconComponents[iconKey] || FileCheck2
  const colors = serviceColorConfig[color] || serviceColorConfig.emerald
  const { tile, icon } = tileSizes[size]
  return (
    <div
      className={cn(tile, 'flex items-center justify-center flex-shrink-0', colors.bg, className)}
    >
      <Icon className={cn(icon, colors.text)} />
    </div>
  )
}
