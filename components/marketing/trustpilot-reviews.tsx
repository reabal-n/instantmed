"use client"

import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { getTestimonialsForColumns } from "@/lib/data/testimonials"

// Use centralized testimonials data
const reviewsForColumns = getTestimonialsForColumns().slice(0, 6)

export function TrustpilotReviews() {
  return (
    <section className="py-8 overflow-hidden relative">
      {/* Testimonials Columns */}
      <TestimonialsColumnsWrapper
        testimonials={reviewsForColumns}
        title="What our customers say"
        subtitle="See what our customers have to say about us."
        badgeText="Customer Reviews"
        className="py-0 my-0"
      />
    </section>
  )
}
