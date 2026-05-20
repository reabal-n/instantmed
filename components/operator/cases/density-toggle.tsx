"use client"

import { Rows2, Rows3, Rows4 } from "lucide-react"

import { cn } from "@/lib/utils"

import type { Density } from "@/lib/operator/cases/types"

type DensityToggleProps = {
  value: Density
  onValueChange: (next: Density) => void
  className?: string
}

const OPTIONS: Array<{ value: Density; label: string; Icon: typeof Rows2 }> = [
  { value: "compact", label: "Compact", Icon: Rows4 },
  { value: "comfortable", label: "Comfortable", Icon: Rows3 },
  { value: "spacious", label: "Spacious", Icon: Rows2 },
]

export function DensityToggle({
  value,
  onValueChange,
  className,
}: DensityToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Row density"
      className={cn(
        "inline-flex items-center rounded-md border border-border/60 bg-card p-0.5",
        className,
      )}
    >
      {OPTIONS.map(({ value: v, label, Icon }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onValueChange(v)}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-sm text-muted-foreground transition-colors",
              "hover:text-foreground hover:bg-muted/60",
              active && "bg-muted text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
