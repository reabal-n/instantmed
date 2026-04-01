"use client"

import { useState, useEffect } from "react"
import { Star, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GOOGLE_REVIEW_URL } from "@/lib/constants"
import { capture } from "@/lib/analytics/capture"

const DISMISSED_KEY = "instantmed_review_dismissed"

/**
 * Google Review prompt card — shown on patient dashboard after first approved request.
 * Dismissible with localStorage persistence. Tracks analytics events.
 */
export function GoogleReviewCard() {
  const [dismissed, setDismissed] = useState(true) // default hidden to prevent flash

  useEffect(() => {
    const stored = localStorage.getItem(DISMISSED_KEY)
    if (!stored) {
      setDismissed(false)
      capture("google_review_card_shown")
    }
  }, [])

  if (dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    setDismissed(true)
    capture("google_review_card_dismissed")
  }

  const handleClick = () => {
    capture("google_review_card_clicked")
    // Don't dismiss — they might want to come back to it
  }

  return (
    <div className="relative rounded-xl border border-amber-200/60 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-500/20 p-4 sm:p-5">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss review prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 mt-0.5">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground mb-1">
            Had a good experience?
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            A quick Google review helps other Australians find us. Takes 30 seconds.
          </p>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-8 text-xs border-amber-300 hover:bg-amber-100 dark:border-amber-500/30 dark:hover:bg-amber-950/40"
            onClick={handleClick}
          >
            <a
              href={GOOGLE_REVIEW_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Leave a Google review
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
