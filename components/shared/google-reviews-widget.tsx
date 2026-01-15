'use client'

import { Star, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface GoogleReview {
  id: string
  author: string
  rating: number
  text: string
  date: string
  avatarInitial: string
}

// Sample reviews - in production, these would come from Google Business API
const reviews: GoogleReview[] = [
  {
    id: '1',
    author: 'Sarah M.',
    rating: 5,
    text: 'Exactly what I needed. Got my medical certificate in about 40 minutes while I was still in bed with the flu. The doctor was thorough and asked good follow-up questions.',
    date: '2 weeks ago',
    avatarInitial: 'S'
  },
  {
    id: '2',
    author: 'James T.',
    rating: 5,
    text: 'Super easy process. I was skeptical about online medical certificates but this was completely legit. My employer accepted it no questions asked.',
    date: '1 month ago',
    avatarInitial: 'J'
  },
  {
    id: '3',
    author: 'Michelle K.',
    rating: 5,
    text: 'Much better than waiting 3 days for a GP appointment just to get a sick note. Quick, professional, and the certificate looked exactly like what you\'d get from a clinic.',
    date: '3 weeks ago',
    avatarInitial: 'M'
  },
  {
    id: '4',
    author: 'David L.',
    rating: 4,
    text: 'Good service overall. Took a bit longer than expected (about an hour) but the doctor was very professional and asked appropriate questions about my symptoms.',
    date: '1 month ago',
    avatarInitial: 'D'
  },
  {
    id: '5',
    author: 'Emma R.',
    rating: 5,
    text: 'Used this for a repeat prescription. So much easier than trying to get an appointment with my regular GP. Script was at the pharmacy within an hour.',
    date: '2 weeks ago',
    avatarInitial: 'E'
  },
]

interface GoogleReviewsWidgetProps {
  className?: string
  maxReviews?: number
  variant?: 'full' | 'compact' | 'inline'
}

export function GoogleReviewsWidget({ 
  className, 
  maxReviews = 3,
  variant = 'full'
}: GoogleReviewsWidgetProps) {
  const displayReviews = reviews.slice(0, maxReviews)
  const averageRating = 4.9
  const totalReviews = 847

  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star 
              key={star} 
              className={cn(
                "w-4 h-4",
                star <= Math.floor(averageRating) 
                  ? "text-amber-500 fill-amber-500" 
                  : "text-slate-300"
              )} 
            />
          ))}
        </div>
        <span className="text-sm font-medium">{averageRating}</span>
        <span className="text-sm text-muted-foreground">
          ({totalReviews} reviews on Google)
        </span>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800",
        className
      )}>
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <div>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className="w-4 h-4 text-amber-500 fill-amber-500" 
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {averageRating} · {totalReviews} Google reviews
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className={cn("py-16 bg-slate-50 dark:bg-slate-900/50", className)}>
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg className="w-8 h-8" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <h2 className="text-2xl font-bold text-foreground">Google Reviews</h2>
          </div>
          
          {/* Overall rating */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className="w-6 h-6 text-amber-500 fill-amber-500" 
                />
              ))}
            </div>
            <span className="text-2xl font-bold text-foreground">{averageRating}</span>
            <span className="text-muted-foreground">
              based on {totalReviews} reviews
            </span>
          </div>
        </div>

        {/* Reviews grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {displayReviews.map((review) => (
            <div 
              key={review.id}
              className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                  {review.avatarInitial}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{review.author}</p>
                  <p className="text-xs text-muted-foreground">{review.date}</p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    className={cn(
                      "w-4 h-4",
                      star <= review.rating 
                        ? "text-amber-500 fill-amber-500" 
                        : "text-slate-300"
                    )} 
                  />
                ))}
              </div>

              {/* Review text */}
              <p className="text-sm text-muted-foreground line-clamp-4">
                {review.text}
              </p>
            </div>
          ))}
        </div>

        {/* View more link */}
        <div className="text-center">
          <Link 
            href="https://g.page/r/instantmed/review" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            View all reviews on Google
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
