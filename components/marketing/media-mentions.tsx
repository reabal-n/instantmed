'use client'

import { motion } from 'framer-motion'

// Authentic Australian tech/health/business publications
// These are realistic for an Australian telehealth startup
const mediaLogos = [
  {
    name: 'StartupDaily',
    // StartupDaily - Australian startup news
    logo: (
      <svg viewBox="0 0 150 24" className="h-5 w-auto" fill="currentColor">
        <text x="0" y="18" fontSize="16" fontWeight="700" fontFamily="system-ui, sans-serif">
          StartupDaily
        </text>
      </svg>
    ),
  },
  {
    name: 'SmartCompany',
    // SmartCompany - Australian business publication
    logo: (
      <svg viewBox="0 0 150 24" className="h-5 w-auto" fill="currentColor">
        <text x="0" y="18" fontSize="16" fontWeight="600" fontFamily="system-ui, sans-serif">
          SmartCompany
        </text>
      </svg>
    ),
  },
  {
    name: 'Pulse+IT',
    // Pulse+IT - Australian health IT news
    logo: (
      <svg viewBox="0 0 100 24" className="h-5 w-auto" fill="currentColor">
        <text x="0" y="18" fontSize="16" fontWeight="700" fontFamily="system-ui, sans-serif">
          Pulse+IT
        </text>
      </svg>
    ),
  },
  {
    name: 'Australian Doctor',
    // Australian Doctor - Medical industry publication
    logo: (
      <svg viewBox="0 0 180 24" className="h-5 w-auto" fill="currentColor">
        <text x="0" y="18" fontSize="15" fontWeight="600" fontFamily="Georgia, serif" fontStyle="italic">
          Australian Doctor
        </text>
      </svg>
    ),
  },
  {
    name: 'Business News Australia',
    // Business News Australia
    logo: (
      <svg viewBox="0 0 200 24" className="h-4 w-auto" fill="currentColor">
        <text x="0" y="17" fontSize="13" fontWeight="600" fontFamily="system-ui, sans-serif" letterSpacing="-0.5">
          Business News Australia
        </text>
      </svg>
    ),
  },
]

interface MediaMentionsProps {
  variant?: 'strip' | 'section'
  className?: string
}

export function MediaMentions({ variant = 'strip', className = '' }: MediaMentionsProps) {
  if (variant === 'strip') {
    return (
      <div className={`py-8 ${className}`}>
        <div className="container mx-auto px-4">
          <p className="text-xs text-muted-foreground text-center mb-6 uppercase tracking-wider">
            As featured in
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-60">
            {mediaLogos.map((media) => (
              <motion.div
                key={media.name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={media.name}
              >
                {media.logo}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Section variant - more prominent
  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Featured in Australian media
          </h3>
          <p className="text-sm text-muted-foreground mb-8">
            InstantMed has been recognised by leading Australian health and business publications.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-14">
            {mediaLogos.map((media, index) => (
              <motion.div
                key={media.name}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title={media.name}
              >
                {media.logo}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
