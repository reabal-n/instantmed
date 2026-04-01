'use client'

import { Star } from 'lucide-react'
import { GOOGLE_REVIEWS } from '@/lib/social-proof'

/**
 * Google Reviews Badge
 *
 * Renders a "★ X.X on Google (N reviews)" badge linking to the
 * InstantMed Google Business reviews page.
 *
 * Gates on GOOGLE_REVIEWS.enabled — renders nothing until you flip that flag
 * and add a real Place ID + counts from the Google Business dashboard.
 *
 * Usage: drop anywhere social proof is needed. Homepage hero, service landing
 * pages, trust sections. Do not render in portals.
 */
export function GoogleReviewsBadge({ className }: { className?: string }) {
  if (!GOOGLE_REVIEWS.enabled || GOOGLE_REVIEWS.count === 0) return null

  const stars = Math.round(GOOGLE_REVIEWS.rating * 2) / 2 // round to nearest 0.5

  return (
    <a
      href={GOOGLE_REVIEWS.reviewsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-border transition-all duration-200 text-sm no-underline ${className ?? ''}`}
      aria-label={`${GOOGLE_REVIEWS.rating} stars on Google — ${GOOGLE_REVIEWS.count} reviews`}
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
            className={`w-3 h-3 ${i <= Math.floor(stars) ? 'text-amber-400 fill-amber-400' : i - 0.5 <= stars ? 'text-amber-400 fill-amber-200' : 'text-muted-foreground/30 fill-muted-foreground/10'}`}
          />
        ))}
      </span>

      <span className="font-semibold text-foreground">{GOOGLE_REVIEWS.rating.toFixed(1)}</span>
      <span className="text-muted-foreground text-xs">
        ({GOOGLE_REVIEWS.count.toLocaleString()})
      </span>
    </a>
  )
}
