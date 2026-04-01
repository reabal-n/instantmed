import { cn } from "@/lib/utils"
import { Shield, Clock } from "lucide-react"

interface MedicalDisclaimerProps {
  reviewedDate?: string
  reviewedBy?: string
  className?: string
}

/**
 * Shared medical disclaimer for all YMYL (Your Money or Your Life) health content pages.
 * Provides E-E-A-T signals: medical review attribution, last reviewed date, and standard disclaimer.
 */
export function MedicalDisclaimer({
  reviewedDate,
  reviewedBy = "the InstantMed Medical Team",
  className,
}: MedicalDisclaimerProps) {
  const formattedDate = reviewedDate
    ? new Date(reviewedDate + "-01").toLocaleDateString("en-AU", {
        month: "long",
        year: "numeric",
      })
    : undefined

  return (
    <section className={cn("px-4 py-8", className)}>
      <div className="mx-auto max-w-3xl">
        <div className="border-t border-border/50 dark:border-white/10 pt-6">
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            This information is for general educational purposes only and does not constitute medical advice.
            Always consult a qualified healthcare professional before making decisions about your health.
            Content on this page has been reviewed by AHPRA-registered Australian doctors but does not
            replace a personalised medical consultation.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Clinically reviewed by {reviewedBy}
            </span>
            {formattedDate && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Last reviewed: {formattedDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
