"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Spotlight } from "@/components/ui/glowing-effect"

// =============================================================================
// PREMIUM STAT CARD - With spotlight glow effect
// =============================================================================

interface PremiumStatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  variant?: "default" | "warning" | "success" | "danger" | "info"
  trend?: { value: number; positive: boolean }
  delay?: number
}

const variantStyles = {
  default: {
    bg: "bg-card",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    spotlightColor: "oklch(0.65 0.15 185 / 0.08)",
  },
  warning: {
    bg: "bg-orange-50/80 dark:bg-orange-950/20 border-orange-200/50",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-500",
    spotlightColor: "oklch(0.7 0.18 60 / 0.1)",
  },
  success: {
    bg: "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200/50",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    spotlightColor: "oklch(0.7 0.18 155 / 0.1)",
  },
  danger: {
    bg: "bg-red-50/80 dark:bg-red-950/20 border-red-200/50",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-500",
    spotlightColor: "oklch(0.6 0.25 25 / 0.1)",
  },
  info: {
    bg: "bg-violet-50/80 dark:bg-violet-950/20 border-violet-200/50",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
    spotlightColor: "oklch(0.6 0.2 290 / 0.1)",
  },
}

export function PremiumStatCard({
  label,
  value,
  icon,
  variant = "default",
  trend,
  delay = 0,
}: PremiumStatCardProps) {
  const styles = variantStyles[variant]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.21, 0.47, 0.32, 0.98] 
      }}
    >
      <Spotlight color={styles.spotlightColor} size={200}>
        <div
          className={cn(
            "relative rounded-2xl p-5 border transition-all duration-300",
            "hover:shadow-xl hover:-translate-y-1 hover:shadow-primary/10",
            "dark:hover:shadow-primary/20",
            styles.bg
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
            <div className={cn("p-2 rounded-xl", styles.iconBg)}>
              <span className={styles.iconColor}>{icon}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <motion.span
              className="text-3xl font-bold text-foreground"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.2, type: "spring", stiffness: 200 }}
            >
              {value}
            </motion.span>
            {trend && (
              <span
                className={cn(
                  "text-xs font-medium px-1.5 py-0.5 rounded-full",
                  trend.positive
                    ? "text-emerald-700 bg-emerald-100"
                    : "text-red-700 bg-red-100"
                )}
              >
                {trend.positive ? "+" : ""}{trend.value}%
              </span>
            )}
          </div>
        </div>
      </Spotlight>
    </motion.div>
  )
}

// =============================================================================
// PREMIUM ACTION CARD - With gradient border and glow
// =============================================================================

interface PremiumActionCardProps {
  title: string
  description: string
  icon: ReactNode
  href: string
  gradient?: string
  delay?: number
}

export function PremiumActionCard({
  title,
  description,
  icon,
  href,
  gradient = "from-indigo-500 to-violet-600",
  delay = 0,
}: PremiumActionCardProps) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.4, 
        delay,
        ease: [0.21, 0.47, 0.32, 0.98] 
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className="group block"
    >
      <div className="relative rounded-2xl p-[1px] overflow-hidden">
        {/* Animated gradient border */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            gradient
          )}
        />
        {/* Subtle border for non-hover */}
        <div className="absolute inset-0 rounded-2xl border border-border group-hover:border-transparent transition-colors" />
        
        <div className="relative bg-card rounded-[calc(1rem-1px)] p-6">
          {/* Icon with gradient background */}
          <div
            className={cn(
              "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 text-white",
              "group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300",
              gradient
            )}
          >
            {icon}
          </div>
          
          <h3 className="font-heading font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
          
          {/* Arrow indicator */}
          <motion.div
            className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity"
            initial={{ x: -10 }}
            whileHover={{ x: 0 }}
          >
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </motion.div>
        </div>
      </div>
    </motion.a>
  )
}

// =============================================================================
// PREMIUM REQUEST CARD - For showing request items
// =============================================================================

interface PremiumRequestCardProps {
  title: string
  subtitle: string
  badge: ReactNode
  icon: ReactNode
  href: string
  variant?: "default" | "warning" | "in-progress" | "success"
  showPulse?: boolean
  delay?: number
}

const requestVariantStyles = {
  default: "border-border bg-card hover:bg-accent/50",
  warning: "border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 hover:bg-orange-50",
  "in-progress": "border-violet-200 bg-violet-50/30 dark:bg-violet-950/10 hover:bg-violet-50/60",
  success: "border-emerald-200 bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/60",
}

export function PremiumRequestCard({
  title,
  subtitle,
  badge,
  icon,
  href,
  variant = "default",
  showPulse = false,
  delay = 0,
}: PremiumRequestCardProps) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ 
        duration: 0.3, 
        delay,
        ease: [0.21, 0.47, 0.32, 0.98] 
      }}
      whileHover={{ x: 4 }}
      className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
        requestVariantStyles[variant]
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="text-muted-foreground">{icon}</span>
          {showPulse && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-violet-500 rounded-full animate-pulse" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge}
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </motion.a>
  )
}

// =============================================================================
// PREMIUM EMPTY STATE
// =============================================================================

interface PremiumEmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  actions?: ReactNode
}

export function PremiumEmptyState({
  icon,
  title,
  description,
  actions,
}: PremiumEmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="text-center py-12 px-6"
    >
      <motion.div
        className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center"
        animate={{ 
          y: [0, -8, 0],
          rotate: [0, 2, -2, 0],
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        <span className="text-primary">{icon}</span>
      </motion.div>
      <h3 className="font-heading font-semibold text-xl text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {actions && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {actions}
        </div>
      )}
    </motion.div>
  )
}

// =============================================================================
// PREMIUM SECTION HEADER
// =============================================================================

interface SectionHeaderProps {
  icon?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}

export function SectionHeader({ icon, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {subtitle}
          </span>
        )}
      </div>
      {action}
    </div>
  )
}

// =============================================================================
// PREMIUM GREETING HEADER
// =============================================================================

interface GreetingHeaderProps {
  name: string
  subtitle?: string
  action?: ReactNode
}

export function GreetingHeader({ name, subtitle, action }: GreetingHeaderProps) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, <span className="text-primary">{name}</span>
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {action}
    </motion.header>
  )
}

// =============================================================================
// PREMIUM QUICK REPEAT BANNER
// =============================================================================

interface QuickRepeatBannerProps {
  href: string
}

export function QuickRepeatBanner({ href }: QuickRepeatBannerProps) {
  return (
    <motion.a
      href={href}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      className="block"
    >
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20 p-5">
        {/* Subtle animated gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Need another certificate?</h3>
              <p className="text-sm text-muted-foreground">Quickly request based on your last submission</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-700 font-medium text-sm">
            Repeat request
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </motion.a>
  )
}
