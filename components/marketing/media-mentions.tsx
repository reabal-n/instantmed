'use client'

import Image from 'next/image'

import { cn } from '@/lib/utils'

const regulatoryPartners = [
  { name: 'AHPRA', logo: '/logos/AHPRA.png', width: 80 },
  { name: 'TGA', logo: '/logos/TGA.png', width: 64 },
  { name: 'Medicare', logo: '/logos/medicare.png', width: 52 },
  { name: 'RACGP', logo: '/logos/RACGP.png', width: 72 },
  // Text-only entries for partners without logo files
  { name: 'Stripe', logo: null, width: 0 },
  { name: 'ADHA', logo: null, width: 0 },
]

interface RegulatoryPartnersProps {
  className?: string
  /** Logo names to exclude */
  exclude?: string[]
}

function StripeLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 25" className={cn('h-5 w-auto', className)} aria-label="Stripe">
      <text x="0" y="19" fontFamily="system-ui, -apple-system, sans-serif" fontSize="20" fontWeight="700" fill="currentColor">stripe</text>
    </svg>
  )
}

function ADHALogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 56 18" className={cn('h-4 w-auto', className)} aria-label="ADHA">
      <text x="0" y="14" fontFamily="system-ui, -apple-system, sans-serif" fontSize="14" fontWeight="600" letterSpacing="1.5" fill="currentColor">ADHA</text>
    </svg>
  )
}

function LogoItem({ partner }: { partner: typeof regulatoryPartners[number] }) {
  if (partner.name === 'Stripe') {
    return <StripeLogo className="text-muted-foreground/50" />
  }
  if (partner.name === 'ADHA') {
    return <ADHALogo className="text-muted-foreground/50" />
  }
  if (!partner.logo) return null

  return (
    <Image
      src={partner.logo}
      alt={partner.name}
      width={partner.width}
      height={32}
      unoptimized
      className="h-6 sm:h-7 w-auto object-contain grayscale opacity-40 dark:invert dark:opacity-30"
    />
  )
}

export function RegulatoryPartners({ className, exclude = [] }: RegulatoryPartnersProps) {
  const visible = regulatoryPartners.filter((p) => !exclude.includes(p.name))

  return (
    <div className={cn('py-4 sm:py-6', className)}>
      {/* Label */}
      <p className="text-[10px] font-semibold text-muted-foreground/40 text-center mb-3 uppercase tracking-[0.15em]">
        Compliant with
      </p>

      {/* Static centered row */}
      <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 px-4">
        {visible.map((partner) => (
          <div key={partner.name} className="flex items-center shrink-0" title={partner.name}>
            <LogoItem partner={partner} />
          </div>
        ))}
      </div>
    </div>
  )
}

// Keep old export name for backwards compatibility
export { RegulatoryPartners as MediaMentions }
