"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface SectionPillProps {
  emoji?: string
  text: string
  hoverText?: string
  className?: string
}

export function SectionPill({ 
  emoji = "✨", 
  text, 
  hoverText,
  className 
}: SectionPillProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative inline-flex items-center gap-2.5 px-4 py-2 rounded-full cursor-default",
        "border border-border/60 bg-secondary/50",
        "transition-all duration-500 ease-out",
        "hover:border-foreground/20 hover:bg-secondary/80",
        "hover:shadow-[0_0_20px_rgba(0,0,0,0.04)]",
        className,
      )}
    >
      {/* Glowing floating emoji */}
      <span 
        className="text-base animate-float-gentle emoji-glow"
        style={{
          filter: "drop-shadow(0 0 8px rgba(0, 226, 181, 0.5))",
        }}
      >
        {emoji}
      </span>

      {/* Text with hover slide effect */}
      <div className="relative overflow-hidden h-5">
        <span
          className="block text-sm font-medium text-foreground transition-all duration-500"
          style={{
            transform: isHovered && hoverText ? "translateY(-100%)" : "translateY(0)",
            opacity: isHovered && hoverText ? 0 : 1,
          }}
        >
          {text}
        </span>

        {hoverText && (
          <span
            className="absolute top-0 left-0 text-sm font-medium text-foreground transition-all duration-500"
            style={{
              transform: isHovered ? "translateY(0)" : "translateY(100%)",
              opacity: isHovered ? 1 : 0,
            }}
          >
            {hoverText}
          </span>
        )}
      </div>
    </div>
  )
}
