"use client"

import * as React from "react"
import { Card as HeroCard, CardHeader as HeroCardHeader, CardBody, CardFooter } from "@heroui/react"
import { cn } from "@/lib/utils"

/**
 * UIX Card - HeroUI Pro primary with shadcn-compatible API
 * Provides modernized glass-morphism design
 */

export interface CardProps {
  children: React.ReactNode
  className?: string
  isPressable?: boolean
  isHoverable?: boolean
  shadow?: "none" | "sm" | "md" | "lg"
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <HeroCard
      className={cn("transition-all duration-200", className)}
      classNames={{
        base: "bg-background/80 backdrop-blur-xl border border-default-100 shadow-lg hover:shadow-xl",
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
    <HeroCardHeader className={cn("flex flex-col gap-2", className)}>
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
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>
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
    <p className={cn("text-sm text-muted-foreground", className)}>
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
    <CardFooter className={cn("flex items-center gap-2 px-6 py-4", className)}>
      {children}
    </CardFooter>
  )
}

// Re-export for direct use
export { CardBody, CardFooter }
export { Card as UIXCard }
