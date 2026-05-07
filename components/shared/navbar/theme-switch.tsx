"use client"

import { Moon, SunMedium } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

interface ThemeSwitchProps {
  variant?: "desktop" | "mobile"
  className?: string
}

function SwitchTrack({ isDark }: { isDark: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border",
        "border-border/50 bg-white/75 shadow-sm shadow-primary/[0.04]",
        "transition-[background-color,border-color,box-shadow] duration-200",
        "dark:border-white/15 dark:bg-white/[0.07] dark:shadow-none",
      )}
    >
      <SunMedium
        className={cn(
          "absolute left-1.5 h-3.5 w-3.5 text-amber-500 transition-opacity duration-200",
          isDark ? "opacity-35" : "opacity-80",
        )}
      />
      <Moon
        className={cn(
          "absolute right-1.5 h-3.5 w-3.5 text-primary transition-opacity duration-200 dark:text-accent-teal",
          isDark ? "opacity-85" : "opacity-35",
        )}
      />
      <span
        className={cn(
          "absolute left-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full",
          "border border-border/60 bg-background text-foreground",
          "shadow-sm shadow-primary/[0.08] transition-transform duration-200 ease-out",
          "dark:border-white/15 dark:bg-card dark:shadow-none",
          isDark && "translate-x-5",
        )}
      />
    </span>
  )
}

export function ThemeSwitch({ variant = "desktop", className }: ThemeSwitchProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"
  const nextTheme = isDark ? "light" : "dark"

  const toggleTheme = () => {
    if (!mounted) return
    setTheme(nextTheme)
  }

  if (variant === "mobile") {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label={`Switch to ${nextTheme} mode`}
        onClick={toggleTheme}
        className={cn(
          "group flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3.5 text-left",
          "text-muted-foreground transition-colors duration-200",
          "hover:bg-card/70 hover:text-foreground dark:hover:bg-white/15",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/70 text-muted-foreground transition-colors group-hover:text-foreground dark:bg-white/10">
            {isDark ? <Moon className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">Appearance</span>
            <span className="block text-xs text-muted-foreground">{isDark ? "Quiet night" : "Morning light"}</span>
          </span>
        </span>
        <SwitchTrack isDark={isDark} />
      </button>
    )
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${nextTheme} mode`}
      onClick={toggleTheme}
      className={cn(
        "inline-flex h-8 items-center rounded-full p-0.5",
        "text-muted-foreground transition-[background-color,color] duration-200",
        "hover:bg-muted/50 hover:text-foreground dark:hover:bg-white/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className,
      )}
    >
      <SwitchTrack isDark={isDark} />
    </button>
  )
}
