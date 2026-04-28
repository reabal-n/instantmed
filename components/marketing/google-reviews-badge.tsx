'use client'

import { Star } from 'lucide-react'

import { GOOGLE_REVIEWS } from '@/lib/social-proof'

/**
 * Google Reviews Badge — stars-only.
 *
 * Renders the Google G mark followed by 5 stars filled to the current
 * GBP rating. Deliberately omits the numeric rating and review count;
 * leading with a small N (currently 3 reviews) reads as anaemic in a
 * hero/trust context, but the multicolour Google mark + 5 stars carries
 * the trust signal cleanly. Links through to the GBP reviews page.
 *
 * Gates on GOOGLE_REVIEWS.enabled — renders nothing until the flag is
 * flipped on `lib/social-proof/index.ts`.
 *
 * Usage: trust strips, social-proof sections. Do not render in portals.
 */
export function GoogleReviewsBadge({ className }: { className?: string }) {
  if (!GOOGLE_REVIEWS.enabled || GOOGLE_REVIEWS.count === 0) return null

  const rating = GOOGLE_REVIEWS.rating
  const filled = Math.round(rating)

  return (
    <a
      href={GOOGLE_REVIEWS.reviewsUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Read our Google reviews, ${rating.toFixed(1)} of 5`}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-[box-shadow,border-color] duration-200 no-underline ${className ?? ''}`}
    >
      {/* Google G mark */}
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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

      {/* Stars */}
      <span className="flex items-center gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i <= filled ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/40 fill-muted-foreground/15'}`}
          />
        ))}
      </span>
    </a>
  )
}
