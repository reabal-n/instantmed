"use client"

/**
 * Cookie Consent Banner
 * 
 * DISCLOSURE_CONSENT_AUDIT P1: Cookie consent for GDPR/privacy compliance
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const COOKIE_CONSENT_KEY = "instantmed_cookie_consent"
const COOKIE_CONSENT_VERSION = "1.0"

export type CookiePreferences = {
  essential: boolean // Always true
  analytics: boolean
  marketing: boolean
  version: string
  acceptedAt: string
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  analytics: false,
  marketing: false,
  version: COOKIE_CONSENT_VERSION,
  acceptedAt: "",
}

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    // Check if consent already given
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences
        // Check if version matches - consent already given, don't show banner
        if (parsed.version === COOKIE_CONSENT_VERSION) {
          return
        }
      } catch {
        // Invalid stored data, show banner
      }
    }
    // Show banner after a short delay to avoid layout shift
    const timer = setTimeout(() => setShowBanner(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const savePreferences = (prefs: CookiePreferences) => {
    const updated = {
      ...prefs,
      acceptedAt: new Date().toISOString(),
    }
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(updated))
    setPreferences(updated)
    setShowBanner(false)

    // Dispatch event for analytics providers to check
    window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: updated }))
  }

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
      version: COOKIE_CONSENT_VERSION,
      acceptedAt: "",
    })
  }

  const handleRejectNonEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
      version: COOKIE_CONSENT_VERSION,
      acceptedAt: "",
    })
  }

  const handleSavePreferences = () => {
    savePreferences(preferences)
  }

  if (!showBanner) return null

  return (
    <div 
      className="fixed bottom-0 inset-x-0 z-50 p-4 bg-background/95 backdrop-blur-sm border-t shadow-lg"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="container mx-auto max-w-4xl">
        {!showDetails ? (
          // Simple view
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                We use cookies to improve your experience and analyze site usage.{" "}
                <Link href="/privacy#cookies" className="text-primary hover:underline">
                  Learn more
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowDetails(true)}
                className="text-xs"
              >
                Manage preferences
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRejectNonEssential}
              >
                Reject non-essential
              </Button>
              <Button 
                size="sm" 
                onClick={handleAcceptAll}
              >
                Accept all
              </Button>
            </div>
          </div>
        ) : (
          // Detailed preferences view
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Cookie Preferences</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDetails(false)}
                aria-label="Close preferences"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {/* Essential - always on */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium">Essential cookies</p>
                  <p className="text-xs text-muted-foreground">
                    Required for the platform to function (authentication, security)
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">Always on</div>
              </div>

              {/* Analytics */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Analytics cookies</p>
                  <p className="text-xs text-muted-foreground">
                    Help us understand how you use our platform (PostHog, Vercel Analytics)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(e) => setPreferences(p => ({ ...p, analytics: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </label>

              {/* Marketing */}
              <label className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Marketing cookies</p>
                  <p className="text-xs text-muted-foreground">
                    Measure advertising effectiveness (Google Analytics)
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(e) => setPreferences(p => ({ ...p, marketing: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRejectNonEssential}
              >
                Reject all non-essential
              </Button>
              <Button 
                size="sm" 
                onClick={handleSavePreferences}
              >
                Save preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook to get current cookie preferences
 */
export function useCookieConsent(): CookiePreferences | null {
  const [preferences, setPreferences] = useState<CookiePreferences | null>(null)

  useEffect(() => {
    const loadPreferences = () => {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (stored) {
        try {
          setPreferences(JSON.parse(stored))
        } catch {
          setPreferences(null)
        }
      }
    }

    loadPreferences()

    // Listen for updates
    const handleUpdate = (e: CustomEvent<CookiePreferences>) => {
      setPreferences(e.detail)
    }

    window.addEventListener("cookieConsentUpdated", handleUpdate as EventListener)
    return () => {
      window.removeEventListener("cookieConsentUpdated", handleUpdate as EventListener)
    }
  }, [])

  return preferences
}

/**
 * Check if a specific cookie type is allowed
 */
export function isCookieAllowed(type: "analytics" | "marketing"): boolean {
  if (typeof window === "undefined") return false
  
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (!stored) return false
  
  try {
    const prefs = JSON.parse(stored) as CookiePreferences
    return prefs[type] === true
  } catch {
    return false
  }
}
