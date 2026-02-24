"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  size?: "sm" | "md" | "lg"
  /** Show only the icon (no wordmark text) */
  iconOnly?: boolean
  className?: string
  href?: string
  onClick?: () => void
}

const sizeConfig = {
  sm: { iconSize: 28, textHeight: 18, textWidth: 108 },
  md: { iconSize: 32, textHeight: 22, textWidth: 132 },
  lg: { iconSize: 38, textHeight: 26, textWidth: 156 },
}

export function BrandLogo({
  size = "sm",
  iconOnly = false,
  className,
  href = "/",
  onClick,
}: BrandLogoProps) {
  const { iconSize, textHeight, textWidth } = sizeConfig[size]

  const content = (
    <span className="flex items-center gap-2">
      <Image
        src="/branding/logo.png"
        alt="InstantMed"
        width={iconSize}
        height={iconSize}
        className="rounded-lg object-contain transition-opacity duration-200 group-hover:opacity-80"
        priority
      />
      {!iconOnly && (
        <Image
          src="/branding/wordmark.png"
          alt="InstantMed"
          width={textWidth}
          height={textHeight}
          className="object-contain dark:brightness-0 dark:invert transition-opacity duration-200 group-hover:opacity-80"
          priority
        />
      )}
    </span>
  )

  if (href) {
    return (
      <Link
        href={href}
        className={cn("flex items-center group", className)}
        aria-label="InstantMed home"
        onClick={onClick}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={cn("flex items-center group", className)}>
      {content}
    </div>
  )
}
