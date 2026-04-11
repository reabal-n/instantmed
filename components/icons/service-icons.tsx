"use client"

import { cn } from "@/lib/utils"
import {
  FileCheck2,
  Pill,
  Zap,
  Sparkles,
  Heart,
  TrendingDown,
} from "lucide-react"

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
  const Icon = iconComponents[iconKey] || FileCheck2
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
      <Icon className={cn(icon, 'text-white')} />
    </div>
  )
}
