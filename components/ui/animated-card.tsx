"use client"

import { cn } from "@/lib/utils"
import { forwardRef } from "react"

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number
  hover?: boolean
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ className, delay = 0, hover = true, children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass-card rounded-2xl p-5 opacity-0 animate-fade-in",
          hover && "hover-lift transition-all duration-300",
          className
        )}
        style={{
          animationDelay: `${delay}s`,
          animationFillMode: "forwards",
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)

AnimatedCard.displayName = "AnimatedCard"

interface StatCardProps {
  label: string
  value: string | number
  icon?: React.ReactNode
  trend?: { value: number; positive: boolean }
  delay?: number
}

export function StatCard({ label, value, icon, trend, delay = 0 }: StatCardProps) {
  return (
    <AnimatedCard delay={delay} className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground/60">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-foreground animate-count-up">{value}</span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.positive ? "text-emerald-600" : "text-red-600"
            )}
          >
            {trend.positive ? "+" : ""}{trend.value}%
          </span>
        )}
      </div>
    </AnimatedCard>
  )
}

interface ActionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  href: string
  delay?: number
}

export function ActionCard({ title, description, icon, href, delay = 0 }: ActionCardProps) {
  return (
    <a href={href}>
      <AnimatedCard
        delay={delay}
        className="group cursor-pointer hover:border-primary/20"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <div>
            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
              {title}
            </p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </AnimatedCard>
    </a>
  )
}
