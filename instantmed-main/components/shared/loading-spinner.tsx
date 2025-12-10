"use client"

import { cn } from "@/lib/utils"
import { Loader2, CheckCircle, AlertCircle, Stethoscope } from "lucide-react"
import { useEffect, useState } from "react"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  text?: string
  variant?: "default" | "medical" | "dots" | "pulse"
}

const sizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-12 h-12",
}

export function LoadingSpinner({ size = "md", className, text, variant = "default" }: LoadingSpinnerProps) {
  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-full bg-primary",
                size === "sm" ? "w-1.5 h-1.5" : size === "md" ? "w-2 h-2" : "w-3 h-3"
              )}
              style={{
                animation: "bounce 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.16}s`,
              }}
            />
          ))}
        </div>
        {text && <span className="text-sm text-muted-foreground ml-2">{text}</span>}
      </div>
    )
  }

  if (variant === "pulse") {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        <div className="relative">
          <div className={cn(sizes[size], "rounded-full bg-primary/20")} />
          <div
            className={cn(sizes[size], "absolute inset-0 rounded-full bg-primary animate-ping")}
            style={{ animationDuration: "1.5s" }}
          />
        </div>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
    )
  }

  if (variant === "medical") {
    return (
      <div className={cn("flex items-center justify-center gap-3", className)}>
        <div className="relative">
          <div className={cn(sizes[size], "rounded-full border-2 border-primary/20")} />
          <Stethoscope
            className={cn(
              sizes[size],
              "absolute inset-0 text-primary animate-pulse"
            )}
          />
        </div>
        {text && <span className="text-sm text-muted-foreground animate-pulse">{text}</span>}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <Loader2 className={cn(sizes[size], "animate-spin text-primary")} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

interface FullPageLoaderProps {
  text?: string
  subtext?: string
  showProgress?: boolean
}

export function FullPageLoader({ text = "Loading...", subtext, showProgress }: FullPageLoaderProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!showProgress) return

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev
        return prev + Math.random() * 10
      })
    }, 500)

    return () => clearInterval(interval)
  }, [showProgress])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-sm px-4">
        {/* Animated Logo */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#00E2B5] to-[#06B6D4] animate-pulse" />
          <div className="absolute inset-1 rounded-xl bg-background flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-primary animate-pulse" />
          </div>
          {/* Spinning ring */}
          <div
            className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary animate-spin"
            style={{ animationDuration: "1s" }}
          />
        </div>

        <h2 className="text-lg font-semibold mb-1">{text}</h2>
        {subtext && <p className="text-sm text-muted-foreground mb-4">{subtext}</p>}

        {showProgress && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00E2B5] to-[#06B6D4] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Loading dots */}
        <div className="flex justify-center gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-muted-foreground/30"
              style={{
                animation: "pulse 1.4s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface SkeletonCardProps {
  lines?: number
  className?: string
  showAvatar?: boolean
}

export function SkeletonCard({ lines = 3, className, showAvatar }: SkeletonCardProps) {
  return (
    <div className={cn("p-4 rounded-xl border border-border/50 bg-card/50 animate-pulse", className)}>
      {showAvatar && (
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-muted rounded mb-1" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        </div>
      )}
      <div className="h-5 w-1/3 bg-muted rounded mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted rounded mb-2"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  )
}

interface StatusIndicatorProps {
  status: "loading" | "success" | "error"
  text?: string
  className?: string
}

export function StatusIndicator({ status, text, className }: StatusIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {status === "loading" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
      {status === "success" && <CheckCircle className="w-4 h-4 text-green-500" />}
      {status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
      {text && (
        <span
          className={cn(
            "text-sm",
            status === "loading" && "text-muted-foreground",
            status === "success" && "text-green-600",
            status === "error" && "text-red-600"
          )}
        >
          {text}
        </span>
      )}
    </div>
  )
}
