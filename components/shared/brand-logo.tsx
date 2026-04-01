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
  sm: { iconSize: 28, textHeight: 17, textWidth: 110 },
  md: { iconSize: 32, textHeight: 20, textWidth: 130 },
  lg: { iconSize: 38, textHeight: 24, textWidth: 155 },
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
        src="/branding/logo.svg"
        alt="InstantMed"
        width={iconSize}
        height={iconSize}
        className="rounded-lg object-contain transition-opacity duration-200 group-hover:opacity-80"
        style={{ filter: "drop-shadow(0 0 8px rgba(37,99,235,0.35))" }}
        priority
        unoptimized
      />
      {!iconOnly && (
        <Image
          src="/branding/wordmark.png"
          alt="InstantMed"
          width={textWidth}
          height={textHeight}
          className="object-contain dark:brightness-0 dark:invert transition-opacity duration-200 group-hover:opacity-80"
          style={{ filter: "drop-shadow(0 0 6px rgba(37,99,235,0.2))" }}
          priority
          unoptimized
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
