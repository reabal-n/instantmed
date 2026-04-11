"use client"

import { useState, useEffect } from "react"
import { Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"
import { capture } from "@/lib/analytics/capture"

const DISMISSED_KEY = "instantmed_review_dismissed"
const TRACKING_URL = `${GOOGLE_REVIEW_URL}?utm_source=dashboard&utm_medium=review_card&utm_campaign=review`
const RE_PROMPT_DAYS = 90

/**
 * Google Review prompt card - shown on patient dashboard after first approved request.
 * Google-branded pill design with multicolor G icon, star rating, and CTA.
 * Dismissible with localStorage persistence. Re-prompts after 90 days.
 * Shows with a 500ms entrance delay to avoid competing with primary content.
 */
export function GoogleReviewCard() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY)
    if (stored) {
      // Re-prompt after 90 days
      const dismissedAt = parseInt(stored, 10)
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
      if (daysSince < RE_PROMPT_DAYS) return
    }
    // Delayed entrance so dashboard content loads first
    const timer = setTimeout(() => {
      setVisible(true)
      capture("google_review_card_shown")
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    setVisible(false)
    capture("google_review_card_dismissed")
  }

  const handleClick = () => {
    capture("google_review_card_clicked")
  }

  return (
    <div className="relative rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss review prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 pr-6">
        {/* Google G icon */}
        <div className="shrink-0">
          <svg className="w-7 h-7" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <span className="text-sm font-semibold text-foreground">5.0</span>
            <span className="text-xs text-muted-foreground">on Google</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Help other Australians find fast, easy healthcare.
          </p>
        </div>

        {/* CTA */}
        <div className="shrink-0">
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleClick}
          >
            <a
              href={TRACKING_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Leave a review
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
