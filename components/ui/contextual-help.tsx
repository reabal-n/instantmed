"use client"

import { Info, HelpCircle, AlertCircle } from "@/lib/icons"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ContextualHelpProps {
  /** Help text content */
  content: string | React.ReactNode
  /** Tooltip trigger element (defaults to Info icon) */
  trigger?: React.ReactNode
  /** Icon variant */
  variant?: "info" | "help" | "alert"
  /** Placement of tooltip */
  placement?: "top" | "bottom" | "left" | "right"
  /** Custom className */
  className?: string
  /** Show as inline info card instead of tooltip */
  asCard?: boolean
}

export function ContextualHelp({
  content,
  trigger,
  variant = "info",
  placement = "top",
  className,
  asCard = false,
}: ContextualHelpProps) {
  const iconMap = {
    info: Info,
    help: HelpCircle,
    alert: AlertCircle,
  }

  const Icon = iconMap[variant]

  const defaultTrigger = (
    <button
      type="button"
      className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
      aria-label="Help"
    >
      <Icon className="w-4 h-4" />
    </button>
  )

  if (asCard) {
    return (
      <div
        className={cn(
          "p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800/40",
          className
        )}
      >
        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-900 dark:text-blue-100 flex-1">
            {typeof content === "string" ? <p>{content}</p> : content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {trigger || defaultTrigger}
        </TooltipTrigger>
        <TooltipContent side={placement}>
          {typeof content === "string" ? content : content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface InfoCardProps {
  /** Title */
  title: string
  /** Description/content */
  description: string | React.ReactNode
  /** Variant */
  variant?: "info" | "success" | "warning" | "error"
  /** Icon */
  icon?: React.ComponentType<{ className?: string }>
  /** Custom className */
  className?: string
}

export function InfoCard({
  title,
  description,
  variant = "info",
  icon: Icon,
  className,
}: InfoCardProps) {
  const variantStyles = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-100 dark:border-blue-800/40",
      iconColor: "text-blue-600",
      titleColor: "text-blue-900 dark:text-blue-100",
      textColor: "text-blue-700 dark:text-blue-300",
      defaultIcon: Info,
    },
    success: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-100 dark:border-green-800/40",
      iconColor: "text-green-600",
      titleColor: "text-green-900 dark:text-green-100",
      textColor: "text-green-700 dark:text-green-300",
      defaultIcon: Info,
    },
    warning: {
      bg: "bg-dawn-50 dark:bg-amber-950/30",
      border: "border-dawn-100 dark:border-amber-700/40",
      iconColor: "text-dawn-600",
      titleColor: "text-dawn-900 dark:text-dawn-100",
      textColor: "text-dawn-700 dark:text-dawn-300",
      defaultIcon: AlertCircle,
    },
    error: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-100 dark:border-red-800/40",
      iconColor: "text-red-600",
      titleColor: "text-red-900 dark:text-red-100",
      textColor: "text-red-700 dark:text-red-400",
      defaultIcon: AlertCircle,
    },
  }

  const styles = variantStyles[variant]
  const DisplayIcon = Icon || styles.defaultIcon

  return (
    <div
      className={cn(
        "p-3 rounded-xl border",
        styles.bg,
        styles.border,
        className
      )}
    >
      <div className="flex items-start gap-2">
        <DisplayIcon className={cn("w-4 h-4 mt-0.5 shrink-0", styles.iconColor)} />
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium mb-1 text-sm", styles.titleColor)}>{title}</p>
          <div className={cn("text-xs", styles.textColor)}>
            {typeof description === "string" ? <p>{description}</p> : description}
          </div>
        </div>
      </div>
    </div>
  )
}

