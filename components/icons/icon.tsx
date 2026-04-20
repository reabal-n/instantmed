"use client"

/**
 * Unified Icon facade — single import for all InstantMed icon variants.
 *
 * variant="tile"    → ServiceIconTile: soft-bg + Lucide outline. Canonical for
 *                     service identification (nav, cards, request hub).
 * variant="sticker" → StickerIcon: illustrated SVG from /icons/stickers/*.svg.
 *                     Marketing-only: process steps, landing-page content.
 *
 * Usage:
 *   <Icon variant="tile" iconKey="FileText" color="emerald" size="md" />
 *   <Icon variant="sticker" name="stethoscope" size={48} />
 */

import { ServiceIconTile } from "@/components/icons/service-icons"
import { StickerIcon, type StickerIconName } from "@/components/icons/stickers"

interface TileProps {
  variant: "tile"
  iconKey: string
  color: string
  size?: "sm" | "md" | "lg"
  className?: string
}

interface StickerProps {
  variant: "sticker"
  name: StickerIconName
  size?: number
  className?: string
}

export type IconProps = TileProps | StickerProps

export function Icon(props: IconProps) {
  if (props.variant === "tile") {
    const { variant: _v, ...rest } = props
    return <ServiceIconTile {...rest} />
  }
  const { variant: _v, ...rest } = props
  return <StickerIcon {...rest} />
}
