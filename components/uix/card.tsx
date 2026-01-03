"use client"

import * as React from "react"
import { Card as HeroCard, CardHeader as HeroCardHeader, CardBody, CardFooter } from "@heroui/react"
import { cn } from "@/lib/utils"

/**
 * UIX Card - HeroUI Pro primary with shadcn-compatible API
 * Premium glass-morphism design with soft radius
 */

export interface CardProps {
  children: React.ReactNode
  className?: string
  isPressable?: boolean
  isHoverable?: boolean
  shadow?: "none" | "sm" | "md" | "lg"
  /** Enable glass effect backdrop */
  glass?: boolean
  /** Enable subtle hover lift */
  hoverable?: boolean
}

export function Card({ className, children, glass = true, hoverable = true, ...props }: CardProps) {
  return (
    <HeroCard
      className={cn("transition-all duration-300 ease-out", className)}
      classNames={{
        base: cn(
          "rounded-2xl overflow-hidden",
          glass && "bg-background/90 backdrop-blur-xl backdrop-saturate-150",
          "border border-default-100/50",
          "shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
          hoverable && "hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1"
        ),
      }}
      {...props}
    >
      {children}
    </HeroCard>
  )
}

export interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <HeroCardHeader className={cn("flex flex-col gap-2 px-6 py-5", className)}>
      {children}
    </HeroCardHeader>
  )
}

export interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ className, children }: CardTitleProps) {
  return (
    <h3 className={cn(
      "text-lg font-semibold leading-tight tracking-tight",
      "text-foreground",
      className
    )}>
      {children}
    </h3>
  )
}

export interface CardDescriptionProps {
  children: React.ReactNode
  className?: string
}

export function CardDescription({ className, children }: CardDescriptionProps) {
  return (
    <p className={cn("text-sm text-muted-foreground leading-relaxed", className)}>
      {children}
    </p>
  )
}

export interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ className, children }: CardContentProps) {
  return (
    <CardBody className={cn("px-6 py-4", className)}>
      {children}
    </CardBody>
  )
}

export interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooterWrapper({ className, children }: CardFooterProps) {
  return (
    <CardFooter className={cn(
      "flex items-center gap-3 px-6 py-4",
      "border-t border-default-100/50",
      className
    )}>
      {children}
    </CardFooter>
  )
}

// Re-export for direct use
export { CardBody, CardFooter }
export { Card as UIXCard }
