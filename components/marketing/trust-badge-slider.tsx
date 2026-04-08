"use client"

import { cn } from "@/lib/utils"
import { DottedGrid } from "@/components/marketing/dotted-grid"
import { TrustBadgeGrid } from "@/components/shared/trust-badge"

interface TrustBadgeSliderProps {
  className?: string
}

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  return (
    <section className={cn('py-10 lg:py-14 relative', className)}>
      <DottedGrid />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        <TrustBadgeGrid badges={['ahpra', 'racgp', 'medical_director', 'tga']} />
      </div>
    </section>
  )
}
