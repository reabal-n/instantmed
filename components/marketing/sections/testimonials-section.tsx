'use client'

import { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TestimonialItem {
  text: string
  image: string
  name: string
  role: string
}

export interface TestimonialsSectionProps {
  /** Testimonial data for the scrolling columns */
  testimonials: TestimonialItem[]
  /** Section heading */
  title: string
  /** Section subheading */
  subtitle?: string
  /** Badge text shown above the heading */
  badgeText?: string
  className?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Standalone testimonials section wrapping the scrolling columns layout.
 *
 * Provides section-level padding and overflow containment.
 * The underlying `TestimonialsColumnsWrapper` handles the animated columns.
 */
export function TestimonialsSection({
  testimonials,
  title,
  subtitle,
  badgeText = 'Patient Feedback',
  className,
}: TestimonialsSectionProps) {
  if (!testimonials || testimonials.length === 0) return null

  return (
    <section className={cn('py-4 overflow-hidden relative', className)}>
      <TestimonialsColumnsWrapper
        testimonials={testimonials}
        title={title}
        subtitle={subtitle}
        badgeText={badgeText}
        className="py-0 my-0"
      />
    </section>
  )
}

// Re-export the column wrapper for direct use if needed
export { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
