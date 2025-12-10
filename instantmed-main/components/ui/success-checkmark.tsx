"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface SuccessCheckmarkProps {
  show?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  onAnimationComplete?: () => void
}

const sizes = {
  sm: { container: "w-12 h-12", icon: "w-5 h-5", ring: "w-14 h-14" },
  md: { container: "w-16 h-16", icon: "w-7 h-7", ring: "w-20 h-20" },
  lg: { container: "w-20 h-20", icon: "w-9 h-9", ring: "w-24 h-24" },
}

export function SuccessCheckmark({ show = false, size = "md", className, onAnimationComplete }: SuccessCheckmarkProps) {
  const [stage, setStage] = useState<"hidden" | "circle" | "check" | "complete">("hidden")

  useEffect(() => {
    if (show) {
      setStage("circle")
      const t1 = setTimeout(() => setStage("check"), 300)
      const t2 = setTimeout(() => {
        setStage("complete")
        onAnimationComplete?.()
      }, 800)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    } else {
      setStage("hidden")
    }
  }, [show, onAnimationComplete])

  if (stage === "hidden") return null

  const s = sizes[size]

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Expanding ring */}
      <div
        className={cn(
          s.ring,
          "absolute rounded-full bg-emerald-500/20 transition-all duration-500",
          stage === "circle" && "scale-0 opacity-100",
          stage === "check" && "scale-100 opacity-50",
          stage === "complete" && "scale-150 opacity-0",
        )}
      />

      {/* Main circle */}
      <div
        className={cn(
          s.container,
          "relative rounded-full bg-emerald-500 flex items-center justify-center transition-all duration-300",
          stage === "circle" && "scale-0",
          (stage === "check" || stage === "complete") && "scale-100",
        )}
      >
        {/* Checkmark */}
        <Check
          className={cn(
            s.icon,
            "text-white transition-all duration-300",
            stage === "circle" && "scale-0 opacity-0",
            stage === "check" && "scale-110 opacity-100",
            stage === "complete" && "scale-100 opacity-100",
          )}
          strokeWidth={3}
        />
      </div>
    </div>
  )
}
