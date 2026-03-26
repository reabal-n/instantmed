'use client'

import { Star, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SOCIAL_PROOF } from '@/lib/social-proof'
import { getTestimonialsByService, type Testimonial } from '@/lib/data/testimonials'

interface IntakeReviewSocialProofProps {
  service: Testimonial['service']
  className?: string
}

/**
 * Compact social proof for intake review/checkout steps.
 * Shows a single rotating testimonial + trust indicators.
 */
export function IntakeReviewSocialProof({ service, className }: IntakeReviewSocialProofProps) {
  const testimonials = getTestimonialsByService(service).filter(t => t.rating === 5)
  // Pick one based on day to avoid layout shift from randomness
  const testimonial = testimonials[new Date().getDate() % testimonials.length]
  if (!testimonial) return null

  return (
    <div className={cn('space-y-3', className)}>
      {/* Trust indicators */}
      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>AHPRA doctors</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>{SOCIAL_PROOF.sameDayDeliveryPercent}% same day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{SOCIAL_PROOF.averageRating}/5 rating</span>
        </div>
      </div>

      {/* Single testimonial */}
      <div className="rounded-xl bg-muted/30 dark:bg-muted/10 border border-border/30 px-4 py-3">
        <div className="flex items-center gap-1 mb-1.5">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed italic">
          &ldquo;{testimonial.text}&rdquo;
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {testimonial.name}, {testimonial.location}
        </p>
      </div>
    </div>
  )
}
