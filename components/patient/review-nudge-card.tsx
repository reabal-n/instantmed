"use client"

import { PenLine, X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { capture } from "@/lib/analytics/capture"

const DISMISSED_KEY = "instantmed_review_dismissed"
const RE_PROMPT_DAYS = 90
const DESTINATIONS = [
  { token: "productreview", label: "Review on ProductReview" },
  { token: "google", label: "Review on Google" },
] as const

function hrefFor(destination: (typeof DESTINATIONS)[number]["token"]): string {
  const params = new URLSearchParams({
    utm_source: "patient_dashboard",
    utm_medium: "review_card",
    utm_campaign: "review",
    destination,
  })
  return `/api/review-redirect?${params.toString()}`
}

/**
 * Post-delivery review nudge on the patient dashboard.
 *
 * Shown after the first ready document. Dismissible (localStorage), re-prompts
 * after 90 days, with a 500ms entrance delay so it never competes with primary
 * content. (Was `GoogleReviewCard`, which linked straight to Google and rendered
 * a 5-star badge — repointed + de-starred 2026-07-09.)
 *
 * Compliance (ADVERTISING_COMPLIANCE.md §6): ask-only — no star imagery, no
 * ratings/review counts on our own surface. The two labelled destinations use
 * the same allowlisted redirect contract as ReviewAskCard.
 */
export function ReviewNudgeCard() {
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
      capture("review_nudge_shown")
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    setVisible(false)
    capture("review_nudge_dismissed")
  }

  return (
    <div className="relative rounded-xl border border-border/50 bg-white dark:bg-card shadow-sm p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <button
        onClick={handleDismiss}
        className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground sm:right-2 sm:top-2 sm:h-8 sm:w-8"
        aria-label="Dismiss review prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-3 pr-10 sm:pr-8">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">How did we do?</p>
          <p className="text-sm text-muted-foreground">
            A quick review helps other people find us. It takes about a minute,
            including a short sign-in at the end, and a couple of sentences is plenty.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {DESTINATIONS.map(({ token, label }, index) => (
            <Button
              key={token}
              asChild
              size="sm"
              variant={index === 0 ? "outline" : "ghost"}
              className="min-h-11 justify-center sm:min-h-8"
            >
              <a href={hrefFor(token)} target="_blank" rel="noopener noreferrer">
                {index === 0 ? <PenLine className="mr-2 h-4 w-4" /> : null}
                {label}
              </a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
