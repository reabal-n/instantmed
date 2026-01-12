"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface BrandLogoProps {
  size?: "sm" | "md" | "lg"
  showText?: boolean
  className?: string
  href?: string
  onClick?: () => void
}

const sizeConfig = {
  sm: { logo: 28, text: "text-sm" },
  md: { logo: 36, text: "text-base" },
  lg: { logo: 44, text: "text-lg" },
}

export function BrandLogo({ 
  size = "sm", 
  showText = true, 
  className,
  href = "/",
  onClick,
}: BrandLogoProps) {
  const { logo, text } = sizeConfig[size]
  
  const content = (
    <>
      <div 
        className={cn(
          "relative rounded-xl overflow-hidden transition-all duration-300",
          "shadow-[0_2px_8px_rgba(251,191,36,0.2)]",
          "group-hover:shadow-[0_4px_20px_rgba(251,191,36,0.4)]",
          "group-hover:scale-105",
        )}
        style={{ width: logo, height: logo }}
      >
        <Image
          src="/branding/logo.png"
          alt="InstantMed"
          width={logo}
          height={logo}
          className="object-cover"
          priority
        />
      </div>
      {showText && (
        <span className={cn(
          "font-semibold text-foreground transition-colors duration-200",
          "group-hover:text-dawn-600",
          text
        )}>
          InstantMed
        </span>
      )}
    </>
  )

  if (href) {
    return (
      <Link 
        href={href} 
        className={cn("flex items-center gap-2 group", className)}
        aria-label="InstantMed home"
        onClick={onClick}
      >
        {content}
      </Link>
    )
  }

  return (
    <div className={cn("flex items-center gap-2 group", className)}>
      {content}
    </div>
  )
}
