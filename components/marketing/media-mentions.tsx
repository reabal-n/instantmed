'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

const regulatoryPartners = [
  {
    name: 'AHPRA',
    description: 'AHPRA-registered doctors',
    logo: '/logos/AHPRA.svg',
    width: 100,
    isSvg: true,
  },
  {
    name: 'TGA',
    description: 'TGA-compliant prescribing',
    logo: '/logos/TGA.svg',
    width: 80,
    isSvg: true,
  },
  {
    name: 'Medicare',
    description: 'Medicare Australia',
    logo: '/logos/medicare.svg',
    width: 90,
    isSvg: true,
  },
  {
    name: 'RACGP',
    description: 'RACGP-aligned protocols',
    logo: '/logos/RACGP.jpg',
    width: 90,
    isSvg: false,
  },
]

interface RegulatoryPartnersProps {
  variant?: 'strip' | 'section'
  className?: string
  /** Logo names to exclude (e.g. ["Medicare"] on pages where Medicare rebates don't apply) */
  exclude?: string[]
}

export function RegulatoryPartners({ variant = 'strip', className = '', exclude = [] }: RegulatoryPartnersProps) {
  const prefersReducedMotion = useReducedMotion()
  const visiblePartners = regulatoryPartners.filter((p) => !exclude.includes(p.name))

  if (variant === 'strip') {
    return (
      <div className={cn('py-10', className)}>
        <div className="container mx-auto px-4">
          <p className="text-xs font-medium text-muted-foreground/60 text-center mb-8 uppercase tracking-widest">
            Regulated by
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
            {visiblePartners.map((partner, index) => (
              <motion.div
                key={partner.name}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: prefersReducedMotion ? 0 : index * 0.08, duration: 0.35 }}
                className="flex flex-col items-center gap-2 group"
                title={partner.description}
              >
                <div className="rounded-xl bg-white dark:bg-card border border-border/40 dark:border-white/10 shadow-sm px-5 py-3 flex items-center justify-center transition-shadow group-hover:shadow-md">
                  <Image
                    src={partner.logo}
                    alt={partner.description}
                    width={partner.width}
                    height={40}
                    unoptimized
                    className={cn(
                      "h-9 w-auto object-contain",
                      partner.isSvg
                        ? "dark:brightness-0 dark:invert"
                        : "rounded dark:bg-white/90 dark:p-0.5"
                    )}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground/70 font-medium tracking-wide uppercase">{partner.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Section variant
  return (
    <section className={cn('py-12', className)}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Regulated by Australian health authorities
          </h3>
          <p className="text-sm text-muted-foreground mb-8">
            All doctors are AHPRA-registered. Prescriptions are TGA-compliant.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-14">
            {visiblePartners.map((partner, index) => (
              <motion.div
                key={partner.name}
                initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: prefersReducedMotion ? 0 : index * 0.1 }}
                className="opacity-70 hover:opacity-100 transition-opacity"
                title={partner.description}
              >
                <Image
                  src={partner.logo}
                  alt={partner.description}
                  width={partner.width}
                  height={40}
                  unoptimized
                  className={cn(
                    "h-8 w-auto object-contain",
                    partner.isSvg
                      ? "dark:brightness-0 dark:invert"
                      : "rounded dark:bg-white/90 dark:p-0.5"
                  )}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// Keep old export name for backwards compatibility
export { RegulatoryPartners as MediaMentions }
