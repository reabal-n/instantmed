'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/components/ui/motion'

const EMPLOYER_LOGOS = [
  { name: 'Woolworths', src: '/logos/woolworths.png' },
  { name: 'Coles', src: '/logos/coles.png' },
  { name: 'Commonwealth Bank', src: '/logos/commonwealthbank.png' },
  { name: 'ANZ', src: '/logos/ANZ.png' },
  { name: 'NAB', src: '/logos/nab.png' },
  { name: 'Westpac', src: '/logos/westpac.png' },
  { name: 'BHP', src: '/logos/BHP.png' },
  { name: 'Telstra', src: '/logos/telstra.png' },
  { name: 'JB Hi-Fi', src: '/logos/jbhifi.png' },
  { name: "McDonald's", src: '/logos/mcdonalds.png' },
  { name: 'Sonic Healthcare', src: '/logos/sonichealthcare.png' },
  { name: 'Bunnings', src: '/logos/bunnings.png' },
  { name: 'Amazon', src: '/logos/amazon.png' },
  { name: 'Qantas', src: '/logos/qantas.svg' },
  { name: 'Deloitte', src: '/logos/deloitte.svg' },
  { name: 'PwC', src: '/logos/pwc.svg' },
  { name: 'KPMG', src: '/logos/kpmg.svg' },
  { name: 'Bupa', src: '/logos/bupa.svg' },
]

interface EmployerLogoMarqueeProps {
  className?: string
}

export function EmployerLogoMarquee({ className }: EmployerLogoMarqueeProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div className={cn('py-8', className)}>
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-6">
        Accepted by employees at
      </p>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex">
          <div className={cn(
            'flex items-center gap-10 px-8',
            !prefersReducedMotion && 'animate-marquee',
          )}>
            {[...EMPLOYER_LOGOS, ...EMPLOYER_LOGOS].map((logo, i) => (
              <div key={i} className="shrink-0 h-8 w-24 flex items-center justify-center">
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={96}
                  height={32}
                  className="object-contain h-6 w-auto opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
