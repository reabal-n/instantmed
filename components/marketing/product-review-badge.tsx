import { Star } from "lucide-react"
import Image from "next/image"

import { PRODUCT_REVIEWS } from "@/lib/social-proof"

/** Linked, source-attributed rating. The verified snapshot lives in social-proof. */
export function ProductReviewBadge() {
  if (!PRODUCT_REVIEWS.enabled) return null

  return (
    <a
      href={PRODUCT_REVIEWS.reviewsUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`InstantMed on ProductReview, ${PRODUCT_REVIEWS.rating} out of 5 stars. Opens in a new tab.`}
      className="inline-flex min-h-11 flex-wrap items-center justify-start gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Image
        src="/logos/productreview.svg"
        alt="ProductReview.com.au"
        width={117}
        height={20}
        unoptimized
        className="h-5 w-[117px] dark:brightness-0 dark:invert"
      />
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${star <= PRODUCT_REVIEWS.rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground"}`}
          />
        ))}
      </span>
    </a>
  )
}
