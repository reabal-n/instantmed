"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  showGradient?: boolean
  className?: string
  href?: string
  onClick?: () => void
}

const sizeConfig = {
  sm: { height: 24, width: 140 },
  md: { height: 30, width: 175 },
  lg: { height: 38, width: 220 },
}

export function BrandLogo({
  size = "sm",
  className,
  href = "/",
  onClick,
}: BrandLogoProps) {
  const { height, width } = sizeConfig[size]

  const content = (
    <Image
      src="/branding/wordmark.svg"
      alt="InstantMed"
      width={width}
      height={height}
      className="object-contain dark:brightness-0 dark:invert transition-opacity duration-200 group-hover:opacity-80"
      priority
    />
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
