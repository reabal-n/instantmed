"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  CreditCard, 
  MessageSquare,
  Loader2,
  Sparkles,
  FileText
} from "lucide-react"

// =============================================================================
// STATUS BADGE VARIANTS
// =============================================================================

type StatusVariant = 
  | "pending" 
  | "in-review" 
  | "approved" 
  | "declined" 
  | "needs-action" 
  | "needs-payment"
  | "awaiting-script"
  | "info"
  | "success"
  | "warning"
  | "danger"

interface StatusBadgeConfig {
  bg: string
  text: string
  icon: React.ElementType
  pulse?: boolean
}

const statusConfig: Record<StatusVariant, StatusBadgeConfig> = {
  pending: {
    bg: "bg-dawn-100 dark:bg-dawn-950/30",
    text: "text-dawn-700 dark:text-dawn-400",
    icon: Clock,
  },
  "in-review": {
    bg: "bg-violet-100 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-400",
    icon: Clock,
    pulse: true,
  },
  "awaiting-script": {
    bg: "bg-purple-100 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
    icon: FileText,
    pulse: true,
  },
  approved: {
    bg: "bg-emerald-100 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle,
  },
  declined: {
    bg: "bg-red-100 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    icon: XCircle,
  },
  "needs-action": {
    bg: "bg-indigo-100 dark:bg-indigo-950/30",
    text: "text-indigo-700 dark:text-indigo-400",
    icon: MessageSquare,
    pulse: true,
  },
  "needs-payment": {
    bg: "bg-orange-100 dark:bg-orange-950/30",
    text: "text-orange-700 dark:text-orange-400",
    icon: CreditCard,
    pulse: true,
  },
  info: {
    bg: "bg-blue-100 dark:bg-blue-950/30",
    text: "text-primary dark:text-blue-400",
    icon: AlertCircle,
  },
  success: {
    bg: "bg-emerald-100 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-400",
    icon: CheckCircle,
  },
  warning: {
    bg: "bg-dawn-100 dark:bg-dawn-950/30",
    text: "text-dawn-700 dark:text-dawn-400",
    icon: AlertCircle,
  },
  danger: {
    bg: "bg-red-100 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
    icon: XCircle,
  },
}

// =============================================================================
// PREMIUM STATUS BADGE
// =============================================================================

interface PremiumStatusBadgeProps {
  variant: StatusVariant
  label: string
  showIcon?: boolean
  showPulse?: boolean
  size?: "sm" | "md"
  className?: string
}

export function PremiumStatusBadge({
  variant,
  label,
  showIcon = true,
  showPulse,
  size = "sm",
  className,
}: PremiumStatusBadgeProps) {
  const config = statusConfig[variant]
  const Icon = config.icon
  const shouldPulse = showPulse ?? config.pulse

  // Generate accessible description
  const ariaLabel = `Status: ${label}${shouldPulse ? " (action required)" : ""}`

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        config.bg,
        config.text,
        className
      )}
    >
      {showIcon && (
        <span className="relative" aria-hidden="true">
          <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
          {shouldPulse && (
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          )}
        </span>
      )}
      <span>{label}</span>
    </span>
  )
}

// =============================================================================
// ANIMATED STATUS INDICATOR - For live/processing states
// =============================================================================

interface AnimatedStatusIndicatorProps {
  status: "idle" | "processing" | "success" | "error"
  label?: string
  className?: string
}

export function AnimatedStatusIndicator({
  status,
  label,
  className,
}: AnimatedStatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="relative flex h-3 w-3">
        {status === "processing" ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </>
        ) : status === "success" ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"
          />
        ) : status === "error" ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="relative inline-flex rounded-full h-3 w-3 bg-red-500"
          />
        ) : (
          <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground/30" />
        )}
      </span>
      {label && (
        <span className={cn(
          "text-sm font-medium",
          status === "processing" && "text-primary",
          status === "success" && "text-emerald-600",
          status === "error" && "text-red-600",
          status === "idle" && "text-muted-foreground"
        )}>
          {label}
        </span>
      )}
    </div>
  )
}

// =============================================================================
// PROGRESS STEP INDICATOR
// =============================================================================

interface ProgressStepProps {
  steps: Array<{
    label: string
    status: "complete" | "current" | "upcoming"
  }>
  className?: string
}

export function ProgressStepIndicator({ steps, className }: ProgressStepProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          {/* Step circle */}
          <motion.div
            initial={false}
            animate={{
              scale: step.status === "current" ? 1.1 : 1,
              backgroundColor:
                step.status === "complete"
                  ? "rgb(34 197 94)"
                  : step.status === "current"
                  ? "rgb(37 99 235)"
                  : "rgb(229 231 235)",
            }}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
              step.status === "complete" && "text-white",
              step.status === "current" && "text-white shadow-lg shadow-primary/30",
              step.status === "upcoming" && "text-muted-foreground"
            )}
          >
            {step.status === "complete" ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              index + 1
            )}
          </motion.div>

          {/* Connector */}
          {index < steps.length - 1 && (
            <div className="w-8 h-0.5 mx-1">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                    step.status === "complete"
                      ? "rgb(34 197 94)"
                      : "rgb(229 231 235)",
                }}
                className="h-full rounded-full"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// FEATURE BADGE - For "New", "Popular", "Beta" etc
// =============================================================================

interface FeatureBadgeProps {
  type: "new" | "popular" | "beta" | "pro" | "coming-soon"
  className?: string
}

const featureConfig = {
  new: {
    bg: "bg-gradient-to-r from-emerald-500 to-teal-500",
    label: "New",
  },
  popular: {
    bg: "bg-gradient-to-r from-violet-500 to-purple-500",
    label: "Popular",
  },
  beta: {
    bg: "bg-gradient-to-r from-dawn-500 to-orange-500",
    label: "Beta",
  },
  pro: {
    bg: "bg-gradient-to-r from-indigo-500 to-blue-500",
    label: "Pro",
  },
  "coming-soon": {
    bg: "bg-gradient-to-r from-gray-500 to-gray-600",
    label: "Coming Soon",
  },
}

export function FeatureBadge({ type, className }: FeatureBadgeProps) {
  const config = featureConfig[type]

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider text-white",
        config.bg,
        className
      )}
    >
      {type === "new" && <Sparkles className="h-2.5 w-2.5" />}
      {config.label}
    </motion.span>
  )
}

// =============================================================================
// LOADING BADGE - For inline loading states
// =============================================================================

interface LoadingBadgeProps {
  label?: string
  className?: string
}

export function LoadingBadge({ label = "Loading", className }: LoadingBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
        "bg-muted text-muted-foreground",
        className
      )}
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      {label}
    </span>
  )
}
