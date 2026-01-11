"use client"

import { useState } from "react"
import { Zap, Clock, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface PriorityUpsellProps {
  selected: boolean
  onToggle: (selected: boolean) => void
  basePrice: number
  className?: string
}

export function PriorityUpsell({ selected, onToggle, basePrice: _basePrice, className }: PriorityUpsellProps) {
  const [_isHovered, setIsHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={() => onToggle(!selected)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
        selected
          ? "border-dawn-500 bg-dawn-50 dark:bg-dawn-950/20"
          : "border-border hover:border-dawn-300 hover:bg-dawn-50/50 dark:hover:bg-dawn-950/10",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            selected ? "bg-dawn-500 text-white" : "bg-dawn-100 text-dawn-600 dark:bg-dawn-900/30",
          )}
        >
          <Zap className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground">Priority Review</h3>
            <span
              className={cn(
                "text-sm font-bold px-2 py-0.5 rounded-full transition-colors",
                selected
                  ? "bg-dawn-500 text-white"
                  : "bg-dawn-100 text-dawn-700 dark:bg-dawn-900/50 dark:text-dawn-300",
              )}
            >
              +$10
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-1">Jump to the front of the queue</p>

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>15 min guaranteed</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>First in queue</span>
            </div>
          </div>
        </div>

        {/* Checkbox indicator */}
        <div
          className={cn(
            "shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            selected ? "border-dawn-500 bg-dawn-500" : "border-muted-foreground/30",
          )}
        >
          {selected && <CheckCircle className="w-3 h-3 text-white" />}
        </div>
      </div>
    </button>
  )
}
