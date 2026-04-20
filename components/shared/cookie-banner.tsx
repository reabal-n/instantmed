"use client"

import { X } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { updateConsent } from "@/lib/analytics/conversion-tracking"
import { cn } from "@/lib/utils"

const COOKIE_CONSENT_KEY = "instantmed_cookie_consent"
const COOKIE_CONSENT_VERSION = "1.0"
const NOTIFICATION_DURATION_MS = 8000

export type CookiePreferences = {
  essential: boolean
  analytics: boolean
  marketing: boolean
  version: string
  acceptedAt: string
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: true,
  marketing: true,
  version: COOKIE_CONSENT_VERSION,
  acceptedAt: "",
}

function syncGoogleConsent(preferences: CookiePreferences) {
  updateConsent({
    adStorage: preferences.marketing,
    adUserData: preferences.marketing,
    adPersonalization: preferences.marketing,
    analyticsStorage: preferences.analytics,
  })
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (checked: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full",
        "transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-muted dark:bg-white/10"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 transform rounded-full",
          "bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-0.5",
          checked ? "translate-x-4" : "translate-x-0.5"
        )}
      />
    </button>
  )
}

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    setIsVisible(false)
    setTimeout(() => setShowBanner(false), 300)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          syncGoogleConsent(parsed)
          setPreferences(parsed)
          return
        }
      } catch {
        // fall through to auto-accept
      }
    }

    // AU Privacy Act 1988 — implied consent model.
    // Accept all by default; show a brief notification so users can opt out.
    const defaults: CookiePreferences = { ...DEFAULT_PREFERENCES, acceptedAt: new Date().toISOString() }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(defaults))
    syncGoogleConsent(defaults)
    setPreferences(defaults)
    window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: defaults }))

    const showTimer = setTimeout(() => {
      setShowBanner(true)
      requestAnimationFrame(() => setIsVisible(true))

      // Auto-dismiss after notification duration
      dismissTimerRef.current = setTimeout(dismiss, NOTIFICATION_DURATION_MS)
    }, 1500)

    return () => {
      clearTimeout(showTimer)
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cancel auto-dismiss when user opens the detailed panel
  const handleOpenDetails = () => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    setShowDetails(true)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDetails) setShowDetails(false)
        else dismiss()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [showDetails, dismiss])

  const savePreferences = (prefs: CookiePreferences) => {
    const updated = { ...prefs, acceptedAt: new Date().toISOString() }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(updated))
    syncGoogleConsent(updated)
    setPreferences(updated)
    window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: updated }))
    dismiss()
  }

  const handleOptOutNonEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      version: COOKIE_CONSENT_VERSION,
      acceptedAt: "",
    })
  }

  const handleSavePreferences = () => savePreferences(preferences)

  if (!showBanner) return null

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:bottom-6 z-50 sm:max-w-xs",
        "transition-all duration-300 ease-out motion-reduce:transition-none",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
      role={showDetails ? "dialog" : "status"}
      aria-label={showDetails ? "Cookie settings" : "Cookie notice"}
    >
      <div className="bg-white dark:bg-card rounded-2xl shadow-lg border border-border/50 dark:border-white/15 overflow-hidden">
        {!showDetails ? (
          <div className="p-3.5">
            <div className="flex items-start gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground leading-snug">
                  We use cookies to measure performance and improve your experience.{" "}
                  <Link href="/privacy#cookies" className="underline hover:no-underline">
                    Privacy policy
                  </Link>
                </p>
              </div>
              <button
                onClick={dismiss}
                aria-label="Dismiss"
                className="shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors -mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2.5">
              <button
                onClick={handleOpenDetails}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline hover:no-underline"
              >
                Manage cookies
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground text-sm">Cookie settings</h3>
              <button
                onClick={() => setShowDetails(false)}
                aria-label="Back"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted dark:bg-white/5">
                <div>
                  <p className="text-sm font-medium text-foreground">Essential</p>
                  <p className="text-xs text-muted-foreground">Required for the site to work</p>
                </div>
                <span className="text-xs text-muted-foreground/60">Always on</span>
              </div>

              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted dark:bg-white/5">
                <label htmlFor="analytics-toggle" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium text-foreground">Analytics</p>
                  <p className="text-xs text-muted-foreground">Helps us improve the experience</p>
                </label>
                <Toggle
                  id="analytics-toggle"
                  checked={preferences.analytics}
                  onChange={(checked) => setPreferences(p => ({ ...p, analytics: checked }))}
                />
              </div>

              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted dark:bg-white/5">
                <label htmlFor="marketing-toggle" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium text-foreground">Marketing</p>
                  <p className="text-xs text-muted-foreground">Measures ad effectiveness</p>
                </label>
                <Toggle
                  id="marketing-toggle"
                  checked={preferences.marketing}
                  onChange={(checked) => setPreferences(p => ({ ...p, marketing: checked }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-border/50">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOptOutNonEssential}
                className="text-xs h-8 px-3 text-muted-foreground"
              >
                Essential only
              </Button>
              <Button
                size="sm"
                onClick={handleSavePreferences}
                className="h-8 px-4 bg-foreground hover:bg-foreground/90 text-background font-medium shadow-sm"
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function useCookieConsent(): CookiePreferences | null {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored) {
      try { setPreferences(JSON.parse(stored)) } catch { setPreferences(null) }
    }
    const handleUpdate = (e: CustomEvent<CookiePreferences>) => setPreferences(e.detail)
    window.addEventListener("cookieConsentUpdated", handleUpdate as EventListener)
    return () => window.removeEventListener("cookieConsentUpdated", handleUpdate as EventListener)
  }, [])

  return preferences
}

export function isCookieAllowed(type: "analytics" | "marketing"): boolean {
  if (typeof window === "undefined") return false
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!stored) return false
  try {
    return (JSON.parse(stored) as CookiePreferences)[type] === true
  } catch {
    return false
  }
}
