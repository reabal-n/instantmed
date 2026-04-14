"use client"

import { AlertCircle, Bell, CheckCircle2, FileText, Inbox, Loader2 } from "lucide-react"
import type React from "react"

import { cn } from "@/lib/utils"

type AnimationName =
  | "confetti"
  | "empty-state"
  | "error"
  | "loading-files"
  | "loading"
  | "notification"
  | "success"

interface LottieAnimationProps {
  name: AnimationName
  loop?: boolean
  autoplay?: boolean
  className?: string
  size?: number
}

const iconMap: Record<AnimationName, React.ComponentType<{ className?: string }>> = {
  confetti: CheckCircle2,
  "empty-state": Inbox,
  error: AlertCircle,
  "loading-files": FileText,
  loading: Loader2,
  notification: Bell,
  success: CheckCircle2,
}

const colorMap: Record<AnimationName, string> = {
  confetti: "text-primary",
  "empty-state": "text-muted-foreground",
  error: "text-destructive",
  "loading-files": "text-muted-foreground",
  loading: "text-primary animate-spin",
  notification: "text-muted-foreground",
  success: "text-emerald-500",
}

export function LottieAnimation({
  name,
  className,
  size = 120,
}: LottieAnimationProps) {
  const Icon = iconMap[name]
  const color = colorMap[name]

  return (
    <div
      className={cn("flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Icon className={cn("w-1/2 h-1/2", color)} />
    </div>
  )
}
