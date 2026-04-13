'use client'

import Image from 'next/image'

import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

const REGULATOR_LOGOS = [
  { name: 'AHPRA', src: '/logos/AHPRA.png', width: 120, height: 40 },
  { name: 'TGA', src: '/logos/TGA.png', width: 80, height: 40 },
  { name: 'Medicare', src: '/logos/medicare.png', width: 110, height: 40 },
  { name: 'RACGP', src: '/logos/RACGP.png', width: 90, height: 40 },
  { name: 'NATA', src: '/logos/NATA.png', width: 80, height: 40 },
  { name: 'ADHA', src: '/logos/adha.png', width: 110, height: 40 },
]

interface RegulatorLogoMarqueeProps {
  className?: string
  label?: string
}

export function RegulatorLogoMarquee({
  className,
  label = 'Regulated by',
}: RegulatorLogoMarqueeProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('py-8', className)}>
      {label && (
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-6">
          {label}
        </p>
      )}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex" aria-hidden="true">
          <div className={cn(
            'flex items-center gap-12 px-8',
            !prefersReducedMotion && 'animate-marquee-slow',
          )}>
            {/* Duplicate for seamless loop */}
            {[...REGULATOR_LOGOS, ...REGULATOR_LOGOS].map((logo, i) => (
              <div key={i} className="shrink-0 flex items-center justify-center h-10 w-28">
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={logo.width}
                  height={logo.height}
                  className="object-contain h-8 w-auto opacity-50 grayscale hover:opacity-80 hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
