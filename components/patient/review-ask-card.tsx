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
 * documents list). Links off-site through /api/review-redirect so clicks are
 * tracked and the destination stays the rotating review platform
 * (ProductReview by default). Copy is destination-neutral and sets honest
 * expectations for the off-site flow (sign-in step, short review is fine).
 *
 * Compliance: ask-only. No incentive, no star imagery, no review counts or
 * ratings rendered on our own surface (ADVERTISING_COMPLIANCE.md §6).
 */
export function ReviewAskCard({ source, className }: ReviewAskCardProps) {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: "post_delivery",
    utm_campaign: "review",
  })
  const href = `/api/review-redirect?${params.toString()}`

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-white dark:bg-card shadow-md shadow-primary/[0.06] p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 min-w-0">
          <p className="text-sm font-medium">How did we do?</p>
          <p className="text-sm text-muted-foreground">
            A quick review helps other people find us. It takes about a minute,
            including a short sign-in at the end, and a couple of sentences is plenty.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <a href={href} target="_blank" rel="noopener noreferrer">
            <PenLine className="h-4 w-4 mr-2" />
            Leave a review
          </a>
        </Button>
      </div>
    </div>
  )
}
