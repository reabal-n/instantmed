"use client"

import { InfiniteSlider } from "@/components/ui/infinite-slider"
import { cn } from "@/lib/utils"
import { 
  LegitScriptLogo, 
  ISOLogo, 
  HIPAALogo, 
  SOC2Logo, 
  SSLLogo, 
  AHPRALogo, 
  TGALogo, 
  PCIDSSLogo 
} from "@/components/icons/certification-logos"

const trustBadges = [
  { name: "LegitScript", label: "Certified", Logo: LegitScriptLogo },
  { name: "ISO 27001", label: "Certified", Logo: ISOLogo },
  { name: "HIPAA", label: "Compliant", Logo: HIPAALogo },
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
    <section className={cn("py-6 bg-content2/30 border-y border-divider", className)}>
      <div
        className={cn(
          "overflow-hidden mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
        )}
      >
        <InfiniteSlider gap={48} speed={35} speedOnHover={18}>
          {trustBadges.map((badge) => (
            <div
              key={badge.name}
              className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-all duration-300 scale-spring cursor-default px-3 py-2 rounded-xl hover:bg-background/60 hover:shadow-sm"
            >
              <badge.Logo className="w-7 h-7 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground leading-tight">{badge.name}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{badge.label}</span>
              </div>
            </div>
          ))}
        </InfiniteSlider>
      </div>
    </section>
  )
}
