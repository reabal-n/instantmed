"use client"

import { PenLine } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ReviewAskCardProps {
  /** Which surface is asking. Becomes utm_source on the review redirect. */
  source: "patient_intake_detail" | "patient_documents"
  className?: string
}

/**
 * Post-delivery review ask.
 *
 * Rendered where the issued document is presented (intake detail page,
 * documents list). Offers the two review destinations as an explicit patient
 * choice (2026-08-07, supersedes the silent rotation): ProductReview first —
 * the answer-engine-cited keystone — Google second. Both link off-site through
 * /api/review-redirect with an allowlisted `destination` token, so clicks are
 * tracked as selection shares and the redirect can only reach the two known
 * platforms. Copy sets honest expectations (sign-in step, short review is
 * fine) and stays platform-honest: naming a destination on its own button is
 * labelling a choice, not endorsing a platform.
 *
 * Compliance: ask-only. No incentive, no star imagery, no review counts or
 * ratings rendered on our own surface (ADVERTISING_COMPLIANCE.md §6). The ask
 * never suggests what to write — honest reviews, good or bad.
 */
const DESTINATIONS = [
  { token: "productreview", label: "Review on ProductReview" },
  { token: "google", label: "Review on Google" },
] as const

export function ReviewAskCard({ source, className }: ReviewAskCardProps) {
  const hrefFor = (destination: string) => {
    const params = new URLSearchParams({
      utm_source: source,
      utm_medium: "post_delivery",
      utm_campaign: "review",
      destination,
    })
    return `/api/review-redirect?${params.toString()}`
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">How did we do?</p>
          <p className="text-sm text-muted-foreground">
            An honest review — good or bad — helps other people decide. It takes
            about a minute, including a short sign-in at the end, and a couple of
            sentences is plenty. Please don’t include medical details: reviews
            are public.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {DESTINATIONS.map(({ token, label }, index) => (
            <Button
              key={token}
              variant={index === 0 ? "outline" : "ghost"}
              size="sm"
              asChild
              className="min-h-11 justify-center sm:min-h-8"
            >
              <a href={hrefFor(token)} target="_blank" rel="noopener noreferrer">
                {index === 0 ? <PenLine className="h-4 w-4 mr-2" /> : null}
                {label}
              </a>
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
