"use client"

import { InfiniteSlider } from "@/components/ui/infinite-slider"
import { cn } from "@/lib/utils"
import { 
  LegitScriptLogo, 
  ISOLogo, 
  SOC2Logo, 
  SSLLogo, 
  AHPRALogo, 
  TGALogo, 
  PCIDSSLogo 
} from "@/components/icons/certification-logos"

const trustBadges = [
  { name: "LegitScript", label: "Certified", Logo: LegitScriptLogo },
  { name: "ISO 27001", label: "Certified", Logo: ISOLogo },
  { name: "SOC 2", label: "Type II", Logo: SOC2Logo },
  { name: "256-bit SSL", label: "Encrypted", Logo: SSLLogo },
  { name: "AHPRA", label: "Registered", Logo: AHPRALogo },
  { name: "TGA", label: "Approved", Logo: TGALogo },
  { name: "PCI DSS", label: "Compliant", Logo: PCIDSSLogo },
]

interface TrustBadgeSliderProps {
  className?: string
}

export function TrustBadgeSlider({ className }: TrustBadgeSliderProps) {
  return (
    <section className={cn("py-8 bg-content2/30 border-y border-divider", className)}>
      <div className="relative mx-auto max-w-6xl px-4">
        <h2 className="mb-6 text-center font-medium text-foreground text-xl tracking-tight md:text-2xl">
          <span className="text-muted-foreground">Trusted by patients.</span>
          <br />
          <span className="font-semibold">Certified & compliant.</span>
        </h2>
        <div className="mx-auto my-6 h-px max-w-sm bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
        
        <div className="overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]">
          <InfiniteSlider gap={48} reverse speed={80} speedOnHover={25}>
            {trustBadges.map((badge, index) => (
              <div
                key={`badge-${badge.name}-${index}`}
                className="flex items-center gap-3 shrink-0 px-4"
              >
                <div className="flex items-center justify-center shrink-0">
                  <badge.Logo className="h-6 w-6 md:h-7 md:w-7 opacity-90" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm font-semibold text-foreground whitespace-nowrap">
                    {badge.name}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {badge.label}
                  </span>
                </div>
              </div>
            ))}
          </InfiniteSlider>
        </div>
        
        <div className="mt-6 h-px bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
      </div>
    </section>
  )
}
