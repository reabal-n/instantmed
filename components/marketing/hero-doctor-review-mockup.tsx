import { MessageSquareText } from "lucide-react"

import { MedCertHeroMockup } from "@/components/marketing/mockups/med-cert-hero-mockup"

/** The actual outcomes take precedence over invented dashboard widgets. */
export function HeroDoctorReviewMockup() {
  return (
    <div className="relative w-full">
      <MedCertHeroMockup compact />
      <div className="hero-delivery-enter relative mx-4 -mt-3 hidden items-start gap-3 rounded-xl border border-border/60 bg-white px-4 py-4 shadow-md shadow-primary/[0.06] dark:bg-card dark:shadow-none sm:flex">
        <MessageSquareText className="mt-1 h-5 w-5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden="true" />
        <div><p className="text-sm font-semibold">Or your eScript, straight to your phone.</p><p className="mt-1 text-sm text-muted-foreground">Digital delivery if the doctor prescribes.</p></div>
      </div>
    </div>
  )
}
