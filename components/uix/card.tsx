"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * UIX Card - Pure div with shadcn-compatible API
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

const shadowMap: Record<string, string> = {
  none: "shadow-none",
  sm: "shadow-sm",
  md: "shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
  lg: "shadow-[0_8px_32px_rgba(0,0,0,0.10)]",
}

export function Card({
  className,
  children,
  glass = true,
  hoverable = true,
  shadow = "md",
  isPressable,
  isHoverable,
  ...props
}: CardProps) {
  // isHoverable is a legacy alias for hoverable
  const isHover = isHoverable ?? hoverable

  return (
    <div
      className={cn(
        "rounded-2xl overflow-hidden",
        "transition-all duration-300 ease-out",
        glass && "bg-background/90 backdrop-blur-xl backdrop-saturate-150",
        !glass && "bg-background",
        "border border-default-100/50",
        shadowMap[shadow],
        isHover && "hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1",
        isPressable && "cursor-pointer active:scale-[0.98]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 px-6 py-5", className)}>
      {children}
    </div>
  )
}

export interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ className, children }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-tight tracking-tight",
        "text-foreground",
        className
      )}
    >
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
  return <div className={cn("px-6 py-4", className)}>{children}</div>
}

/** @deprecated Use CardContent instead - kept for backward compatibility */
export function CardBody({ className, children }: CardContentProps) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>
}

export interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooterWrapper({ className, children }: CardFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-6 py-4",
        "border-t border-default-100/50",
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-6 py-4",
        "border-t border-default-100/50",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Card as UIXCard }
