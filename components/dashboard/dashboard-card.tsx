"use client"

import { ReactNode, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"

export interface DashboardCardProps {
  children: ReactNode
  className?: string
  elevated?: boolean
  spotlight?: boolean
  padding?: "none" | "sm" | "md" | "lg"
  onClick?: () => void
}

/**
 * DashboardCard
 * 
 * Core glass-forward card component for dashboards.
 * Features subtle backdrop blur, glass borders, and optional spotlight effect.
 */
export function DashboardCard({
  children,
  className,
  elevated = false,
  spotlight = false,
  padding = "md",
  onClick,
}: DashboardCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!spotlight || !cardRef.current) return
    
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    cardRef.current.style.setProperty("--mouse-x", `${x}px`)
    cardRef.current.style.setProperty("--mouse-y", `${y}px`)
  }, [spotlight])

  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  }

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      className={cn(
        elevated ? "dashboard-card-elevated" : "dashboard-card",
        spotlight && "dashboard-spotlight",
        paddingClasses[padding],
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  )
}
