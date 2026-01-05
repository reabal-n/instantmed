"use client"

import { LogoCloud } from "@/components/ui/logo-cloud-3"
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
  // Convert trust badges to LogoCloud format
  const logos = trustBadges.map((badge) => ({
    alt: `${badge.name} - ${badge.label}`,
    Component: badge.Logo,
  }))

  return (
    <section className={cn("py-8 bg-content2/30 border-y border-divider", className)}>
      <div className="relative mx-auto max-w-6xl px-4">
        <h2 className="mb-5 text-center font-medium text-foreground text-xl tracking-tight md:text-2xl">
          <span className="text-muted-foreground">Trusted by experts.</span>
          <br />
          <span className="font-semibold">Used by the leaders.</span>
        </h2>
        <div className="mx-auto my-5 h-px max-w-sm bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
        
        <LogoCloud logos={logos} />
        
        <div className="mt-5 h-px bg-border [mask-image:linear-gradient(to_right,transparent,black,transparent)]" />
      </div>
    </section>
  )
}
