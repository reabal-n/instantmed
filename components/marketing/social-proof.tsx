"use client"

import { useState } from "react"
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

/**
 * Social Proof Components
 * 
 * Testimonials, reviews, and social proof elements for landing pages.
 * Builds trust and increases conversion rates.
 */

interface Review {
  id: string
  name: string
  location?: string
  rating: number
  text: string
  date?: string
  service?: "medical-certificate" | "prescription" | "consultation"
  verified?: boolean
}

const SAMPLE_REVIEWS: Review[] = [
  {
    id: "1",
    name: "Sarah M.",
    location: "Sydney, NSW",
    rating: 5,
    text: "Had a stomach bug and couldn't face going to the GP. Got my certificate sorted in about 40 minutes. My employer accepted it without any questions.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
  },
  {
    id: "2",
    name: "James T.",
    location: "Melbourne, VIC",
    rating: 5,
    text: "I've used this twice now for repeat prescriptions. No waiting room, no phone tag with the clinic. Just answered a few questions and had my eScript within the hour.",
    date: "1 week ago",
    service: "prescription",
    verified: true,
  },
  {
    id: "3",
    name: "Michelle K.",
    location: "Brisbane, QLD",
    rating: 5,
    text: "Was genuinely too unwell to leave the house. The process was straightforward and the doctor's questions were thorough. Certificate came through quickly.",
    date: "3 days ago",
    service: "medical-certificate",
    verified: true,
  },
  {
    id: "4",
    name: "David L.",
    location: "Perth, WA",
    rating: 4,
    text: "Quick and efficient for my blood pressure medication renewal. Would have liked a phone option but the text-based system worked fine for my situation.",
    date: "1 month ago",
    service: "prescription",
    verified: true,
  },
  {
    id: "5",
    name: "Emma R.",
    location: "Adelaide, SA",
    rating: 5,
    text: "Working from home means I can't easily pop out for a GP visit. This saved me half a day. The doctor was thorough and my certificate was legitimate and accepted.",
    date: "2 weeks ago",
    service: "medical-certificate",
    verified: true,
  },
  {
    id: "6",
    name: "Chris P.",
    location: "Gold Coast, QLD",
    rating: 5,
    text: "Migraine hit me at 7pm and I needed a cert for the next day. Had it sorted by 8:30pm. Appreciated that doctors are available in the evenings.",
    date: "5 days ago",
    service: "medical-certificate",
    verified: true,
  },
]

/**
 * Star rating display
 */
function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizes[size],
            star <= rating
              ? "fill-amber-400 text-amber-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          )}
        />
      ))}
    </div>
  )
}

/**
 * Single review card
 */
interface ReviewCardProps {
  review: Review
  variant?: "default" | "compact" | "featured"
  className?: string
}

export function ReviewCard({ review, variant = "default", className }: ReviewCardProps) {
  if (variant === "compact") {
    return (
      <div className={cn("p-4 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/40 dark:border-white/10", className)}>
        <div className="flex items-center gap-2 mb-2">
          <StarRating rating={review.rating} size="sm" />
          {review.verified && (
            <span className="text-xs text-green-600 dark:text-green-400">Verified</span>
          )}
        </div>
        <p className="text-sm text-foreground line-clamp-3">{review.text}</p>
        <p className="text-xs text-muted-foreground mt-2">— {review.name}</p>
      </div>
    )
  }

  if (variant === "featured") {
    return (
      <div className={cn(
        "relative p-6 md:p-8 rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-lg dark:shadow-none",
        className
      )}>
        <Quote className="absolute top-4 right-4 w-8 h-8 text-primary/20" />
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
            {review.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-foreground">{review.name}</p>
            {review.location && (
              <p className="text-sm text-muted-foreground">{review.location}</p>
            )}
          </div>
        </div>
        <StarRating rating={review.rating} size="md" />
        <p className="text-foreground mt-4 leading-relaxed">{review.text}</p>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
          {review.date && (
            <span className="text-xs text-muted-foreground">{review.date}</span>
          )}
          {review.verified && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Verified patient
            </span>
          )}
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn(
      "p-5 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur-sm border border-white/40 dark:border-white/10",
      className
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
            {review.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{review.name}</p>
            {review.location && (
              <p className="text-xs text-muted-foreground">{review.location}</p>
            )}
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>
      <p className="text-sm text-foreground leading-relaxed">{review.text}</p>
      {(review.date || review.verified) && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
          {review.date && (
            <span className="text-xs text-muted-foreground">{review.date}</span>
          )}
          {review.verified && (
            <span className="text-xs text-green-600 dark:text-green-400">✓ Verified</span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Reviews grid
 */
interface ReviewsGridProps {
  reviews?: Review[]
  maxReviews?: number
  columns?: 2 | 3
  className?: string
}

export function ReviewsGrid({ 
  reviews = SAMPLE_REVIEWS, 
  maxReviews = 6,
  columns = 3,
  className 
}: ReviewsGridProps) {
  const displayReviews = reviews.slice(0, maxReviews)

  return (
    <div className={cn(
      "grid gap-4",
      columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      className
    )}>
      {displayReviews.map((review) => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </div>
  )
}

/**
 * Reviews carousel
 */
interface ReviewsCarouselProps {
  reviews?: Review[]
  autoPlay?: boolean
  interval?: number
  className?: string
}

export function ReviewsCarousel({ 
  reviews = SAMPLE_REVIEWS,
  autoPlay = true,
  interval = 5000,
  className 
}: ReviewsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const next = () => setCurrentIndex((i) => (i + 1) % reviews.length)
  const prev = () => setCurrentIndex((i) => (i - 1 + reviews.length) % reviews.length)

  // Auto-play
  useState(() => {
    if (!autoPlay) return
    const timer = setInterval(next, interval)
    return () => clearInterval(timer)
  })

  return (
    <div className={cn("relative", className)}>
      <div className="overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ReviewCard review={reviews[currentIndex]} variant="featured" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={prev}
          className="p-2 rounded-full bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
          aria-label="Previous review"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        
        <div className="flex items-center gap-2">
          {reviews.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentIndex
                  ? "bg-primary w-6"
                  : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400"
              )}
              aria-label={`Go to review ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="p-2 rounded-full bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
          aria-label="Next review"
        >
          <ChevronRight className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </div>
  )
}

/**
 * Aggregate rating display
 */
interface AggregateRatingProps {
  rating?: number
  reviewCount?: number
  className?: string
}

export function AggregateRating({ 
  rating = 4.9,
  reviewCount = 54,
  className 
}: AggregateRatingProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="text-3xl font-bold text-foreground">{rating}</div>
      <div>
        <StarRating rating={Math.round(rating)} size="md" />
        <p className="text-sm text-muted-foreground mt-0.5">
          Based on {reviewCount.toLocaleString()} reviews
        </p>
      </div>
    </div>
  )
}

/**
 * Compact social proof bar
 * Use in headers or above-the-fold
 */
export function SocialProofBar({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex flex-wrap items-center justify-center gap-4 py-3 px-4 text-sm",
      className
    )}>
      <div className="flex items-center gap-1.5">
        <StarRating rating={5} size="sm" />
        <span className="text-foreground font-medium">4.8</span>
        <span className="text-muted-foreground">from 2,847 reviews</span>
      </div>
      <span className="text-border">|</span>
      <span className="text-muted-foreground">12,000+ patients helped</span>
      <span className="text-border hidden sm:inline">|</span>
      <span className="text-muted-foreground hidden sm:inline">Australian doctors</span>
    </div>
  )
}
