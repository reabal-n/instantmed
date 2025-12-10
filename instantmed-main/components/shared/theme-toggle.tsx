"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className={cn("h-11 w-20 rounded-full bg-muted/50", className)} />
    )
  }

  const isDark = resolvedTheme === "dark" || theme === "dark"

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative h-11 w-20 rounded-full transition-all duration-500 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
        "active:scale-95",
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Liquid glass background */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-500 ease-out",
          "backdrop-blur-xl border",
          isDark
            ? "bg-gradient-to-br from-slate-800/90 via-slate-900/80 to-slate-950/90 border-slate-700/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]"
            : "bg-gradient-to-br from-white/90 via-slate-50/80 to-white/90 border-slate-200/50 shadow-[inset_0_1px_0_0_rgba(0,0,0,0.05)]"
        )}
      >
        {/* Glass reflection effect */}
        <div
          className={cn(
            "absolute inset-0 rounded-full transition-opacity duration-500",
            "bg-gradient-to-b from-white/20 via-transparent to-transparent",
            isDark ? "opacity-30" : "opacity-40"
          )}
        />
      </div>

      {/* Toggle thumb with liquid effect */}
      <div
        className={cn(
          "absolute top-1 left-1 h-9 w-9 rounded-full transition-all duration-500 ease-out",
          "flex items-center justify-center",
          "shadow-lg",
          isDark
            ? "translate-x-[2.5rem] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border border-slate-600/50"
            : "translate-x-0 bg-gradient-to-br from-white via-slate-50 to-white border border-slate-200/50",
          "before:absolute before:inset-0 before:rounded-full",
          isDark
            ? "before:bg-gradient-to-b before:from-white/10 before:via-transparent before:to-transparent"
            : "before:bg-gradient-to-b before:from-white/30 before:via-transparent before:to-transparent"
        )}
      >
        {/* Icon */}
        {isDark ? (
          <Moon className="h-4 w-4 text-slate-300 relative z-10" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500 relative z-10" />
        )}
      </div>

      {/* Background stars/moon for dark mode */}
      {isDark && (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div className="absolute top-2 left-6 h-1 w-1 rounded-full bg-slate-400/60 animate-pulse" />
          <div className="absolute top-4 right-8 h-0.5 w-0.5 rounded-full bg-slate-500/60 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-3 left-8 h-0.5 w-0.5 rounded-full bg-slate-400/60 animate-pulse" style={{ animationDelay: "1s" }} />
        </div>
      )}

      {/* Sun rays for light mode */}
      {!isDark && (
        <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="absolute w-1 h-6 bg-amber-400/20 rounded-full top-0 left-1/2 -translate-x-1/2 -translate-y-full" />
            <div className="absolute w-1 h-6 bg-amber-400/20 rounded-full top-1/2 right-0 translate-x-full -translate-y-1/2 rotate-90" />
            <div className="absolute w-1 h-6 bg-amber-400/20 rounded-full bottom-0 left-1/2 -translate-x-1/2 translate-y-full" />
            <div className="absolute w-1 h-6 bg-amber-400/20 rounded-full top-1/2 left-0 -translate-x-full -translate-y-1/2 rotate-90" />
          </div>
        </div>
      )}
    </button>
  )
}
