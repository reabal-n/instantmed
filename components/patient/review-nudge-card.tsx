"use client"

import { X } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { capture } from "@/lib/analytics/capture"

const DISMISSED_KEY = "instantmed_review_dismissed"
const RE_PROMPT_DAYS = 90
// Route through the tracked redirect so the destination stays the rotating
// review platform (ProductReview by default). This consolidates on-site review
// intent onto the keystone AU listing answer engines cite, instead of splitting
// it to Google — the platform ProductReview review accrual (empty listing) is
// the #1 off-site citation blocker, and the day-2 email + delivery ReviewAskCard
// already route here. Matches ReviewAskCard.
const REVIEW_HREF =
  "/api/review-redirect?utm_source=patient_dashboard&utm_medium=review_card&utm_campaign=review"

/**
 * Post-delivery review nudge on the patient dashboard.
 *
 * Shown after the first ready document. Dismissible (localStorage), re-prompts
 * after 90 days, with a 500ms entrance delay so it never competes with primary
 * content. (Was `GoogleReviewCard`, which linked straight to Google and rendered
 * a 5-star badge — repointed + de-starred 2026-07-09.)
 *
 * Compliance (ADVERTISING_COMPLIANCE.md §6): ask-only — no star imagery, no
 * ratings/review counts on our own surface. Copy sets honest expectations for
 * the off-site flow (short sign-in at the end).
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
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss review prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-3 pr-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">How did we do?</p>
          <p className="text-sm text-muted-foreground">
            A quick review helps other people find us. It takes about a minute,
            including a short sign-in at the end, and a couple of sentences is plenty.
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="shrink-0"
        >
          <a href={REVIEW_HREF} target="_blank" rel="noopener noreferrer">
            Leave a review
          </a>
        </Button>
      </div>
    </div>
  )
}
