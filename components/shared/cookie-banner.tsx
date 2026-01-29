"use client"

/**
 * Cookie Consent Banner
 * 
 * DISCLOSURE_CONSENT_AUDIT P1: Cookie consent for GDPR/privacy compliance
 */

import { useState, useEffect, useCallback } from "react"
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

function CookieIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 64 64" 
      className={className}
      aria-hidden="true"
    >
      {/* Cookie base with 3D gradient */}
      <defs>
        <radialGradient id="cookieGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#E8C87A" />
          <stop offset="50%" stopColor="#D4A853" />
          <stop offset="100%" stopColor="#B8863B" />
        </radialGradient>
        <radialGradient id="chipGrad" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#5D3A1A" />
          <stop offset="100%" stopColor="#3D2510" />
        </radialGradient>
        <radialGradient id="biteGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5E6C8" />
          <stop offset="100%" stopColor="#E8D4B0" />
        </radialGradient>
        <filter id="cookieShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15"/>
        </filter>
        {/* Clip path for bite mark */}
        <clipPath id="biteMask">
          <path d="M0,0 H64 V64 H0 V0 Z M52,12 a8,8 0 1,0 0,0.1" />
        </clipPath>
      </defs>
      
      <g clipPath="url(#biteMask)">
        {/* Cookie body */}
        <ellipse 
          cx="32" cy="34" rx="26" ry="24" 
          fill="url(#cookieGrad)" 
          filter="url(#cookieShadow)"
        />
        
        {/* Cookie edge highlight */}
        <ellipse 
          cx="32" cy="32" rx="26" ry="24" 
          fill="url(#cookieGrad)"
        />
        
        {/* Chocolate chips */}
        <ellipse cx="20" cy="26" rx="5" ry="4" fill="url(#chipGrad)" />
        <ellipse cx="38" cy="22" rx="4" ry="3.5" fill="url(#chipGrad)" />
        <ellipse cx="28" cy="38" rx="5" ry="4" fill="url(#chipGrad)" />
        <ellipse cx="44" cy="36" rx="4" ry="3.5" fill="url(#chipGrad)" />
        <ellipse cx="18" cy="42" rx="3.5" ry="3" fill="url(#chipGrad)" />
        
        {/* Chip highlights */}
        <ellipse cx="19" cy="25" rx="1.5" ry="1" fill="#7D4A2A" opacity="0.6" />
        <ellipse cx="37" cy="21" rx="1.2" ry="0.8" fill="#7D4A2A" opacity="0.6" />
        <ellipse cx="27" cy="37" rx="1.5" ry="1" fill="#7D4A2A" opacity="0.6" />
        
        {/* Cookie texture dots */}
        <circle cx="48" cy="28" r="2" fill="#C9975A" />
        <circle cx="14" cy="34" r="1.5" fill="#C9975A" />
        <circle cx="36" cy="46" r="1.8" fill="#C9975A" />
      </g>
      
      {/* Bite edge crumbs */}
      <circle cx="46" cy="8" r="1.5" fill="#D4A853" />
      <circle cx="58" cy="18" r="1.2" fill="#D4A853" />
      <circle cx="50" cy="5" r="1" fill="#E8C87A" />
    </svg>
  )
}

function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (checked: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full 
        transition-colors duration-200 ease-in-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2
        ${checked ? 'bg-sky-500' : 'bg-white/60 dark:bg-white/10'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full 
          bg-white shadow-sm ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}
          mt-0.5
        `}
      />
    </button>
  )
}

export function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
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
    const timer = setTimeout(() => {
      setShowBanner(true)
      // Trigger animation after mount
      requestAnimationFrame(() => setIsVisible(true))
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  // Escape key handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && showDetails) {
      setShowDetails(false)
    }
  }, [showDetails])

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])

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
      className={`
        fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 sm:max-w-sm
        transition-all duration-300 ease-out
        motion-reduce:transition-none
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="bg-white/90 dark:bg-white/10 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-white/10 overflow-hidden">
        {!showDetails ? (
          // Simple view - compact floating card
          <div className="p-4">
            <div className="flex items-start gap-3">
              <CookieIcon className="w-10 h-10 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-snug">
                  We use cookies to keep things running smoothly.{" "}
                  <Link 
                    href="/privacy#cookies" 
                    className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
                  >
                    Learn more
                  </Link>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4">
              <button 
                onClick={() => setShowDetails(true)}
                className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Manage
              </button>
              <div className="flex-1" />
              <Button 
                variant="ghost"
                size="sm" 
                onClick={handleRejectNonEssential}
                className="text-xs h-8 px-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Essential only
              </Button>
              <Button 
                size="sm" 
                onClick={handleAcceptAll}
                className="h-8 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium shadow-sm"
              >
                Accept all
              </Button>
            </div>
          </div>
        ) : (
          // Detailed preferences view
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CookieIcon className="w-6 h-6" />
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Cookie settings</h3>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowDetails(false)}
                aria-label="Close preferences"
                className="h-7 w-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {/* Essential - always on */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/60 dark:bg-white/5 backdrop-blur-sm">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Essential</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Required for the site to work
                  </p>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">Always on</span>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/60 dark:bg-white/5 backdrop-blur-sm">
                <label htmlFor="analytics-toggle" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Analytics</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Helps us improve the experience
                  </p>
                </label>
                <Toggle
                  id="analytics-toggle"
                  checked={preferences.analytics}
                  onChange={(checked) => setPreferences(p => ({ ...p, analytics: checked }))}
                />
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/60 dark:bg-white/5 backdrop-blur-sm">
                <label htmlFor="marketing-toggle" className="cursor-pointer flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Marketing</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Measures ad effectiveness
                  </p>
                </label>
                <Toggle
                  id="marketing-toggle"
                  checked={preferences.marketing}
                  onChange={(checked) => setPreferences(p => ({ ...p, marketing: checked }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button 
                variant="ghost"
                size="sm" 
                onClick={handleRejectNonEssential}
                className="text-xs h-8 px-3 text-slate-600 dark:text-slate-300"
              >
                Essential only
              </Button>
              <Button 
                size="sm" 
                onClick={handleSavePreferences}
                className="h-8 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium shadow-sm"
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
