"use client"

import { cn } from "@/lib/utils"
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react"

type Status = "success" | "error" | "warning" | "info"

interface SuccessAnimationProps {
  status?: Status
  title: string
  description?: string
  className?: string
}

const statusConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    ringColor: "ring-emerald-500/20",
  },
  error: {
    icon: XCircle,
    bgColor: "bg-red-100 dark:bg-red-900/30",
    iconColor: "text-red-600 dark:text-red-400",
    ringColor: "ring-red-500/20",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    ringColor: "ring-amber-500/20",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    ringColor: "ring-blue-500/20",
  },
}

export function SuccessAnimation({
  status = "success",
  title,
  description,
  className,
}: SuccessAnimationProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div className={cn("flex flex-col items-center text-center", className)}>
      <div
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center mb-6",
          "ring-4",
          config.bgColor,
          config.ringColor,
          status === "success" && "animate-success-pulse"
        )}
      >
        <Icon className={cn("w-10 h-10", config.iconColor)} />
      </div>
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
    </div>
  )
}

export function SuccessCheckmark({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <svg
        className="w-16 h-16 text-emerald-500"
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="stroke-current opacity-20"
          cx="26"
          cy="26"
          r="24"
          strokeWidth="4"
          fill="none"
        />
        <circle
          className="stroke-current animate-[checkmark-circle_0.6s_ease-in-out_forwards]"
          cx="26"
          cy="26"
          r="24"
          strokeWidth="4"
          fill="none"
          strokeDasharray="150"
          strokeDashoffset="150"
          strokeLinecap="round"
          style={{
            transformOrigin: "center",
            transform: "rotate(-90deg)",
          }}
        />
        <path
          className="stroke-current animate-[checkmark-check_0.3s_ease-in-out_0.6s_forwards]"
          d="M14 27l8 8 16-16"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="50"
          strokeDashoffset="50"
        />
      </svg>
    </div>
  )
}
