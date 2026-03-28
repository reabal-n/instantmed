"use client"

import { TestimonialsColumnsWrapper } from "@/components/ui/testimonials-columns-wrapper"
import { getTestimonialsForColumns } from "@/lib/data/testimonials"

// Use centralized testimonials data
const reviewsForColumns = getTestimonialsForColumns().slice(0, 6)

export function PatientReviews() {
  return (
    <section className="py-12 overflow-hidden relative">
      {/* Testimonials Columns */}
      <TestimonialsColumnsWrapper
        testimonials={reviewsForColumns}
        title="What our patients say"
        subtitle="Hear from Australians who've used InstantMed."
        className="py-0 my-0"
      />
      <p className="text-xs text-muted-foreground text-center mt-4 px-4">
        Individual experiences may vary. All requests are subject to doctor assessment.
      </p>
    </section>
  )
}
