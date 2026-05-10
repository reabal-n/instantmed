import { DottedGrid } from "@/components/marketing/dotted-grid"
import { TrustBadgeGrid } from "@/components/shared"
import { cn } from "@/lib/utils"

interface TrustBadgeSliderProps {
  className?: string
}

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  return (
    <section className={cn('py-10 lg:py-14 relative', className)}>
      <DottedGrid />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative">
        <TrustBadgeGrid
          badges={[
            { id: 'no_appointment', variant: 'styled' },
            { id: 'form_only', variant: 'styled' },
            { id: 'legitscript', variant: 'styled' },
            { id: 'google_pharmacy', variant: 'styled' },
          ]}
        />
      </div>
    </section>
  )
}
