import Image from 'next/image'

import { cn } from '@/lib/utils'

const regulatoryPartners = [
  { name: 'AHPRA', logo: '/logos/AHPRA.png', width: 80, height: 40 },
  { name: 'TGA', logo: '/logos/TGA.png', width: 64, height: 38 },
  { name: 'Medicare', logo: '/logos/medicare.png', width: 52, height: 16 },
  // Text-only entries for partners without logo files
  { name: 'Stripe', logo: null, width: 0, height: 0 },
  { name: 'ADHA', logo: null, width: 0, height: 0 },
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
  // Single monochrome treatment: greyscale at 60% with a hover-to-100%
  // affordance so the row reads as a quiet compliance strip but rewards
  // attention. Bumped from opacity-40 which read as "washed out" in the
  // 2026-05-25 brand-spine review (yhf6).
  const logoClass =
    "object-contain grayscale opacity-60 transition-[opacity,filter] duration-200 hover:opacity-100 hover:grayscale-0 dark:invert dark:opacity-50 dark:hover:opacity-90"

  if (partner.name === 'Stripe') {
    return <StripeLogo className={cn('text-muted-foreground', logoClass)} />
  }
  if (partner.name === 'ADHA') {
    return <ADHALogo className={cn('text-muted-foreground', logoClass)} />
  }
  if (!partner.logo) return null

  return (
    <Image
      src={partner.logo}
      alt={partner.name}
      width={partner.width}
      height={partner.height}
      unoptimized
      style={{ height: 'auto' }}
      className={logoClass}
    />
  )
}

export function RegulatoryPartners({ className, exclude = [] }: RegulatoryPartnersProps) {
  const visible = regulatoryPartners.filter((p) => !exclude.includes(p.name))

  return (
    <div className={cn('py-6 sm:py-8', className)}>
      {/* Label */}
      <p className="text-[10px] font-semibold text-muted-foreground text-center mb-4 uppercase tracking-[0.15em]">
        Compliance stack
      </p>

      {/* Static centered row - gap bumped from 8/12 to 10/16 so the
          logos breathe horizontally. Tier 1 review 2026-05-25
          (brand-spine yhf6): "compliance logo row washed-out grey,
          cramped". */}
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-16 px-4">
        {visible.map((partner) => (
          <div key={partner.name} className="flex items-center shrink-0" title={partner.name}>
            <LogoItem partner={partner} />
          </div>
        ))}
      </div>
    </div>
  )
}
