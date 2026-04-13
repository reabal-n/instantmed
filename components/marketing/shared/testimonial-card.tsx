"use client"

import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestimonialData {
  name: string
  quote: string
  rating?: number
  location?: string
  service?: string
  avatar?: string
}

interface TestimonialCardBaseProps {
  testimonial: TestimonialData
  className?: string
}

interface CompactTestimonialCardProps extends TestimonialCardBaseProps {
  variant: "compact"
}

interface FeaturedTestimonialCardProps extends TestimonialCardBaseProps {
  variant: "featured"
}

interface EditorialTestimonialCardProps extends TestimonialCardBaseProps {
  variant: "editorial"
}

export type TestimonialCardProps =
  | CompactTestimonialCardProps
  | FeaturedTestimonialCardProps
  | EditorialTestimonialCardProps

// ---------------------------------------------------------------------------
// Star rating
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"
          )}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// DiceBear avatar
// ---------------------------------------------------------------------------

function TestimonialAvatar({ name, className }: { name: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- DiceBear SVG API, not a raster image
    <img
      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}`}
      alt=""
      className={cn("rounded-full bg-muted/50", className)}
      width={40}
      height={40}
    />
  )
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

/** Compact: name + quote + rating. For strips and horizontal scrolls. */
function CompactCard({ testimonial, className }: TestimonialCardBaseProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-card border border-border/50 dark:border-white/15",
        "shadow-sm shadow-primary/[0.04] dark:shadow-none rounded-xl",
        "p-4 space-y-2",
        className
      )}
    >
      {testimonial.rating && <StarRating rating={testimonial.rating} />}
      <p className="text-sm text-foreground leading-relaxed line-clamp-3">
        &ldquo;{testimonial.quote}&rdquo;
      </p>
      <p className="text-xs text-muted-foreground font-medium">{testimonial.name}</p>
    </div>
  )
}

/** Featured: avatar + location + service badge + full quote. For grids. */
function FeaturedCard({ testimonial, className }: TestimonialCardBaseProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-card border border-border/50 dark:border-white/15",
        "shadow-md shadow-primary/[0.06] dark:shadow-none rounded-2xl",
        "p-6 space-y-4",
        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/[0.08] transition-all duration-300",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <TestimonialAvatar name={testimonial.name} className="w-10 h-10" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{testimonial.name}</p>
          {testimonial.location && (
            <p className="text-xs text-muted-foreground">{testimonial.location}</p>
          )}
        </div>
      </div>

      {testimonial.rating && <StarRating rating={testimonial.rating} />}

      <p className="text-sm text-foreground/80 leading-relaxed">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      {testimonial.service && (
        <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-primary/5 text-primary/70 border border-primary/10">
          {testimonial.service}
        </span>
      )}
    </div>
  )
}

/** Editorial: large pull-quote with attribution. For hero or feature highlights. */
function EditorialCard({ testimonial, className }: TestimonialCardBaseProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-card border border-border/50 dark:border-white/15",
        "shadow-md shadow-primary/[0.06] dark:shadow-none rounded-2xl",
        "p-8 sm:p-10 text-center space-y-4",
        className
      )}
    >
      {testimonial.rating && (
        <div className="flex justify-center">
          <StarRating rating={testimonial.rating} />
        </div>
      )}

      <blockquote className="text-lg sm:text-xl font-light text-foreground leading-relaxed tracking-tight">
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      <div className="flex items-center justify-center gap-3 pt-2">
        <TestimonialAvatar name={testimonial.name} className="w-8 h-8" />
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
          {testimonial.location && (
            <p className="text-xs text-muted-foreground">{testimonial.location}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TestimonialCard(props: TestimonialCardProps) {
  switch (props.variant) {
    case "compact":
      return <CompactCard testimonial={props.testimonial} className={props.className} />
    case "featured":
      return <FeaturedCard testimonial={props.testimonial} className={props.className} />
    case "editorial":
      return <EditorialCard testimonial={props.testimonial} className={props.className} />
  }
}
