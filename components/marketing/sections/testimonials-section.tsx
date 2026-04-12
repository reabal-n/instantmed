'use client'

import { useState, useMemo } from 'react'
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
  /** Optional service tag for filtering (e.g., "Medical Certificate", "Prescription") */
  service?: string
}

export interface TestimonialsSectionProps {
  /** Testimonial data for the scrolling columns */
  testimonials: TestimonialItem[]
  /** Section heading */
  title: string
  /** Section subheading */
  subtitle?: string
  /** Show service filter pills when testimonials have service tags */
  showFilters?: boolean
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
  showFilters,
  className,
}: TestimonialsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  // Extract unique service tags for filter pills
  const serviceFilters = useMemo(() => {
    if (!showFilters) return []
    const tags = new Set<string>()
    for (const t of testimonials) {
      if (t.service) tags.add(t.service)
    }
    return Array.from(tags)
  }, [testimonials, showFilters])

  // Filter testimonials by active service
  const filtered = useMemo(() => {
    if (!activeFilter) return testimonials
    return testimonials.filter((t) => t.service === activeFilter)
  }, [testimonials, activeFilter])

  if (!testimonials || testimonials.length === 0) return null

  return (
    <section className={cn('py-4 overflow-hidden relative', className)}>
      {/* Service filter pills */}
      {serviceFilters.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 mb-4 flex-wrap">
          <button
            onClick={() => setActiveFilter(null)}
            className={cn(
              'text-xs px-3 py-1.5 rounded-full border transition-colors',
              !activeFilter
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted'
            )}
          >
            All
          </button>
          {serviceFilters.map((service) => (
            <button
              key={service}
              onClick={() => setActiveFilter(activeFilter === service ? null : service)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full border transition-colors',
                activeFilter === service
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted'
              )}
            >
              {service}
            </button>
          ))}
        </div>
      )}

      <TestimonialsColumnsWrapper
        testimonials={filtered}
        title={title}
        subtitle={subtitle}
        className="py-0 my-0"
      />
      <p className="text-xs text-muted-foreground text-center mt-4 px-4">
        Individual experiences may vary. All requests are subject to doctor assessment.
      </p>
    </section>
  )
}

// Re-export the column wrapper for direct use if needed
export { TestimonialsColumnsWrapper } from '@/components/ui/testimonials-columns-wrapper'
