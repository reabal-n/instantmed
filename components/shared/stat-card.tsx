import type React from "react"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  trend?: {
    value: number
    label?: string
  }
  className?: string
  delay?: number
}

export function StatCard({ title, value, icon, trend, className, delay = 0 }: StatCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null
    if (trend.value > 0) return <ArrowUpRight className="w-3 h-3" />
    if (trend.value < 0) return <ArrowDownRight className="w-3 h-3" />
    return <Minus className="w-3 h-3" />
  }

  const getTrendColor = () => {
    if (!trend) return "text-muted-foreground"
    if (trend.value > 0) return "text-emerald-600"
    if (trend.value < 0) return "text-red-600"
    return "text-muted-foreground"
  }

  // Glow color based on trend
  const getGlowColor = () => {
    if (!trend) return "shadow-[0_8px_30px_rgb(59,130,246,0.15)]" // Blue default
    if (trend.value > 0) return "shadow-[0_8px_30px_rgb(34,197,94,0.2)]" // Emerald
    if (trend.value < 0) return "shadow-[0_8px_30px_rgb(239,68,68,0.15)]" // Red
    return "shadow-[0_8px_30px_rgb(59,130,246,0.15)]" // Blue
  }

  return (
    <div
      className={cn(
        // Glass surface
        "bg-white/70 dark:bg-white/5 backdrop-blur-xl",
        // Border
        "border border-white/40 dark:border-white/10",
        // Shape
        "p-5 rounded-2xl",
        // Glow shadow based on trend
        getGlowColor(),
        // Hover effects
        "hover:bg-white/90 dark:hover:bg-white/10",
        "hover:shadow-[0_12px_40px_rgb(59,130,246,0.2)] dark:hover:shadow-[0_12px_40px_rgb(139,92,246,0.2)]",
        // Animation
        "transition-all duration-300 ease-out",
        "animate-fade-in-up opacity-0",
        className
      )}
      style={{ animationDelay: `${delay}s`, animationFillMode: "forwards" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon && (
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
      {trend && (
        <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", getTrendColor())}>
          {getTrendIcon()}
          <span>
            {trend.value > 0 ? "+" : ""}
            {trend.value}%{trend.label && ` ${trend.label}`}
          </span>
        </div>
      )}
    </div>
  )
}
