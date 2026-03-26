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
  },
  {
    name: 'TGA',
    description: 'TGA-compliant prescribing',
    logo: '/logos/TGA.svg',
    width: 80,
  },
  {
    name: 'Medicare',
    description: 'Medicare Australia',
    logo: '/logos/medicare.svg',
    width: 90,
  },
  {
    name: 'RACGP',
    description: 'RACGP-aligned protocols',
    logo: '/logos/RACGP.jpg',
    width: 90,
  },
]

interface RegulatoryPartnersProps {
  variant?: 'strip' | 'section'
  className?: string
}

export function RegulatoryPartners({ variant = 'strip', className = '' }: RegulatoryPartnersProps) {
  const prefersReducedMotion = useReducedMotion()

  if (variant === 'strip') {
    return (
      <div className={cn('py-8', className)}>
        <div className="container mx-auto px-4">
          <p className="text-xs text-muted-foreground text-center mb-6 uppercase tracking-wider">
            Regulated by
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12">
            {regulatoryPartners.map((partner) => (
              <motion.div
                key={partner.name}
                initial={prefersReducedMotion ? {} : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity"
                title={partner.description}
              >
                <Image
                  src={partner.logo}
                  alt={partner.description}
                  width={partner.width}
                  height={32}
                  unoptimized
                  className="h-7 w-auto object-contain dark:brightness-0 dark:invert"
                />
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
            {regulatoryPartners.map((partner, index) => (
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
                  className="h-8 w-auto object-contain dark:brightness-0 dark:invert"
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
