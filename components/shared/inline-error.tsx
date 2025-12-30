"use client"

import { useEffect } from "react"
import { AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface InlineErrorProps {
  message?: string
  show?: boolean
  onDismiss?: () => void
  className?: string
  autoDismiss?: number // ms to auto dismiss
}

export function InlineError({ message, show = true, onDismiss, className, autoDismiss }: InlineErrorProps) {
  useEffect(() => {
    if (!show || !autoDismiss) return
    const timer = setTimeout(() => onDismiss?.(), autoDismiss)
    return () => clearTimeout(timer)
  }, [autoDismiss, onDismiss, show])

  if (!show || !message) return null

  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm animate-fade-in",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
      <span className="flex-1 text-destructive">{message}</span>
      {onDismiss && (
        <button
          onClick={() => {
            onDismiss()
          }}
          className="shrink-0 p-0.5 rounded hover:bg-destructive/10 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="w-3.5 h-3.5 text-destructive" />
        </button>
      )}
    </div>
  )
}
