"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type GlowBadgeStatus = "success" | "warning" | "error" | "info" | "neutral"

export interface GlowBadgeProps {
  status: GlowBadgeStatus
  children: ReactNode
  icon?: ReactNode
  pulse?: boolean
  size?: "sm" | "md"
  className?: string
}

/**
 * GlowBadge
 * 
 * Status badge with subtle glow effect.
 * Perfect for indicating request status, health indicators, etc.
 */
export function GlowBadge({
  status,
  children,
  icon,
  pulse = false,
  size = "md",
  className,
}: GlowBadgeProps) {
  const statusClass = `glow-badge-${status}`

  const sizeClasses = {
    sm: "text-[10px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  }

  return (
    <span
      className={cn(
        "glow-badge",
        statusClass,
        sizeClasses[size],
        pulse && status !== "success" && "animate-pulse",
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}

/**
 * Pre-configured status badges for common use cases
 */
export function SuccessBadge({ children, ...props }: Omit<GlowBadgeProps, "status">) {
  return <GlowBadge status="success" {...props}>{children}</GlowBadge>
}

export function WarningBadge({ children, ...props }: Omit<GlowBadgeProps, "status">) {
  return <GlowBadge status="warning" {...props}>{children}</GlowBadge>
}

export function ErrorBadge({ children, ...props }: Omit<GlowBadgeProps, "status">) {
  return <GlowBadge status="error" {...props}>{children}</GlowBadge>
}

export function InfoBadge({ children, ...props }: Omit<GlowBadgeProps, "status">) {
  return <GlowBadge status="info" {...props}>{children}</GlowBadge>
}

export function NeutralBadge({ children, ...props }: Omit<GlowBadgeProps, "status">) {
  return <GlowBadge status="neutral" {...props}>{children}</GlowBadge>
}
