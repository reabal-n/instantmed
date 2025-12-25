"use client"

import { ReactNode, forwardRef } from "react"
import { useTilt } from "@/hooks/use-tilt"
import { cn } from "@/lib/utils"

interface TiltCardProps {
  children: ReactNode
  className?: string
  glareEnabled?: boolean
  tiltMax?: number
  scale?: number
  as?: "div" | "article" | "section"
}

export const TiltCard = forwardRef<HTMLDivElement, TiltCardProps>(
  function TiltCardInner({ children, className, glareEnabled = true, tiltMax = 8, scale = 1.02, as: Component = "div" }) {
    const { tiltRef, style, handlers, isHovering } = useTilt({ max: tiltMax, scale })

    return (
      <Component
        ref={tiltRef}
        className={cn("relative overflow-hidden", className)}
        style={style}
        {...handlers}
      >
        {children}
        
        {/* Glare effect */}
        {glareEnabled && (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
              isHovering && "opacity-100"
            )}
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.15) 0%, transparent 60%)`,
            }}
          />
        )}
        
        {/* Inner shadow for depth */}
        <div 
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300",
            isHovering && "opacity-100"
          )}
          style={{
            boxShadow: "inset 0 0 30px rgba(255,255,255,0.1)",
          }}
        />
      </Component>
    )
  }
)

TiltCard.displayName = "TiltCard"
