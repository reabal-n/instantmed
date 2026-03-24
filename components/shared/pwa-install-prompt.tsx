"use client"

import { useState, useEffect } from "react"
import { Download, X } from "@/lib/icons"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "instantmed_pwa_dismissed"
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * PWA Install Prompt — shows a subtle banner when the app is installable.
 * Only shown on mobile/tablet, after user has visited at least 2 pages,
 * and only in the patient dashboard (not marketing pages).
 */
export function PWAInstallPrompt({ className }: { className?: string }) {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION) return

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
      // Delay showing to avoid interrupting the user
      setTimeout(() => setIsVisible(true), 3000)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === "accepted") {
      setIsVisible(false)
    }
    setInstallEvent(null)
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }

  if (!isVisible) return null

  return (
    <div
      className={cn(
        "fixed bottom-20 left-4 right-4 z-40 lg:hidden",
        "bg-white dark:bg-card border border-border/50 dark:border-white/15",
        "rounded-2xl shadow-xl shadow-primary/[0.08] p-4",
        "animate-in slide-in-from-bottom duration-300",
        className,
      )}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Add InstantMed to home screen</p>
          <p className="text-xs text-muted-foreground">Quick access to your requests and certificates</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
