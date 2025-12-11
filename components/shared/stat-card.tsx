import type React from "react"
import { Card } from "@/components/ui/card"
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

  return (
    <Card
      className={cn("glass-card p-5 rounded-2xl animate-fade-in-up opacity-0", className)}
      style={{ animationDelay: `${delay}s`, animationFillMode: "forwards" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon}
      </div>
      <p className="text-3xl font-semibold text-foreground">{value}</p>
      {trend && (
        <div className={cn("flex items-center gap-1 mt-1 text-xs", getTrendColor())}>
          {getTrendIcon()}
          <span>
            {trend.value > 0 ? "+" : ""}
            {trend.value}%{trend.label && ` ${trend.label}`}
          </span>
        </div>
      )}
    </Card>
  )
}
