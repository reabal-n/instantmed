"use client"

import { useEffect, useRef, useState } from "react"

import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Shared intersection hook
// ---------------------------------------------------------------------------

function useInViewOnce(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

// ---------------------------------------------------------------------------
// AnimatedProgressBar
// ---------------------------------------------------------------------------

export interface ProgressBarItem {
  label: string
  value: number
  maxValue?: number
  color?: string
}

interface AnimatedProgressBarProps {
  items: ProgressBarItem[]
  /** Show value labels on the right */
  showValues?: boolean
  className?: string
}

export function AnimatedProgressBar({ items, showValues = true, className }: AnimatedProgressBarProps) {
  const { ref, inView } = useInViewOnce()
  const prefersReducedMotion = useReducedMotion()
  const maxVal = Math.max(...items.map((i) => i.maxValue ?? i.value))

  return (
    <div ref={ref} className={cn("space-y-3", className)}>
      {items.map((item) => {
        const pct = maxVal > 0 ? (item.value / maxVal) * 100 : 0
        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{item.label}</span>
              {showValues && (
                <span className="text-muted-foreground tabular-nums">{item.value}%</span>
              )}
            </div>
            <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all ease-out",
                  prefersReducedMotion ? "duration-0" : "duration-700",
                  item.color ?? "bg-primary"
                )}
                style={{ width: inView || prefersReducedMotion ? `${pct}%` : "0%" }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AnimatedDonutChart
// ---------------------------------------------------------------------------

interface AnimatedDonutChartProps {
  /** Percentage value (0-100) */
  value: number
  /** Text label below the value */
  label: string
  /** Size in px */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Color class for the filled arc */
  color?: string
  className?: string
}

export function AnimatedDonutChart({
  value,
  label,
  size = 120,
  strokeWidth = 10,
  color = "text-primary",
  className,
}: AnimatedDonutChartProps) {
  const { ref, inView } = useInViewOnce()
  const prefersReducedMotion = useReducedMotion()

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <div ref={ref} className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />
          {/* Animated value ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={cn(
              color,
              prefersReducedMotion ? "" : "transition-[stroke-dashoffset] duration-1000 ease-out"
            )}
            strokeDasharray={circumference}
            strokeDashoffset={inView || prefersReducedMotion ? offset : circumference}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-semibold text-foreground tabular-nums">{value}%</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground font-medium text-center">{label}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// ComparisonBar
// ---------------------------------------------------------------------------

interface ComparisonBarProps {
  /** Our value */
  us: { label: string; value: string; subtext?: string }
  /** Competitor/GP value */
  them: { label: string; value: string; subtext?: string }
  /** Visual ratio (0-1, where our bar fills this fraction and theirs fills the rest) */
  ratio?: number
  className?: string
}

export function ComparisonBar({
  us,
  them,
  ratio = 0.3,
  className,
}: ComparisonBarProps) {
  const { ref, inView } = useInViewOnce()
  const prefersReducedMotion = useReducedMotion()

  return (
    <div ref={ref} className={cn("space-y-4", className)}>
      {/* Our bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">{us.label}</span>
          <span className="font-semibold text-primary tabular-nums">{us.value}</span>
        </div>
        <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full bg-primary",
              prefersReducedMotion ? "duration-0" : "transition-all duration-700 ease-out"
            )}
            style={{ width: inView || prefersReducedMotion ? `${ratio * 100}%` : "0%" }}
          />
        </div>
        {us.subtext && <p className="text-xs text-muted-foreground">{us.subtext}</p>}
      </div>

      {/* Their bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">{them.label}</span>
          <span className="font-medium text-muted-foreground tabular-nums">{them.value}</span>
        </div>
        <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full bg-muted-foreground/20",
              prefersReducedMotion ? "duration-0" : "transition-all duration-700 ease-out delay-200"
            )}
            style={{ width: inView || prefersReducedMotion ? "100%" : "0%" }}
          />
        </div>
        {them.subtext && <p className="text-xs text-muted-foreground">{them.subtext}</p>}
      </div>
    </div>
  )
}
