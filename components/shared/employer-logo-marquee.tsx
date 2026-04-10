'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useReducedMotion } from '@/components/ui/motion'
import { usePostHog } from '@/components/providers/posthog-provider'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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
  /** Hide the "Accepted by employees at" heading */
  hideHeading?: boolean
}

export function EmployerLogoMarquee({ className, hideHeading }: EmployerLogoMarqueeProps) {
  const prefersReducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLDivElement>(null)
  const posthog = usePostHog()
  const tracked = useRef(false)

  // #13 — Track marquee visibility in PostHog
  useEffect(() => {
    const el = sectionRef.current
    if (!el || tracked.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true
          posthog?.capture('employer_marquee_viewed', { page: window.location.pathname })
          observer.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [posthog])

  return (
    <div ref={sectionRef} className={cn('py-8', className)}>
      {!hideHeading && (
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 mb-6">
          Accepted by employees at
        </p>
      )}
      <div className="relative overflow-hidden group/marquee">
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex" aria-hidden="true">
          {/* #9 — Pause on hover, #12 — slower on mobile (animate-marquee-slow on sm:) */}
          <div className={cn(
            'flex items-center gap-10 px-8',
            !prefersReducedMotion && 'animate-marquee-slow sm:animate-marquee group-hover/marquee:[animation-play-state:paused]',
          )}>
            <TooltipProvider delayDuration={200}>
              {[...EMPLOYER_LOGOS, ...EMPLOYER_LOGOS].map((logo, i) => (
                /* #10 — Tooltip on hover */
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div className="shrink-0 h-8 w-24 flex items-center justify-center">
                      <Image
                        src={logo.src}
                        alt={logo.name}
                        width={96}
                        height={32}
                        /* #11 — Dark mode: boost brightness for SVG logos */
                        className="object-contain h-6 w-auto opacity-40 grayscale hover:opacity-70 hover:grayscale-0 transition-all duration-300 dark:brightness-150 dark:contrast-75"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Accepted by {logo.name} employees
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  )
}
