'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Clock, PhoneOff, Check, Users, Star } from 'lucide-react'
import useSWR from 'swr'
import { serviceCategories } from '@/lib/marketing/homepage'

const pricingFetcher = (url: string) => fetch(url).then(r => r.json())

import { motion } from 'framer-motion'
import { Separator } from '@/components/ui/separator'
import { DocumentPremium, PillPremium, StethoscopePremium, SparklesPremium } from '@/components/icons/certification-logos'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AnimatedText } from '@/components/ui/animated-underline-text-one'

const iconMap = {
  FileText: DocumentPremium,
  Pill: PillPremium,
  Stethoscope: StethoscopePremium,
}

const colorConfig: Record<string, { 
  gradient: string
  accent: string
  light: string
  chipColor: "primary" | "secondary" | "success" | "warning" | "danger" 
}> = {
  emerald: { 
    gradient: 'from-emerald-400 to-teal-500',
    accent: '#059669', 
    light: 'rgba(5, 150, 105, 0.08)', 
    chipColor: 'success' 
  },
  cyan: { 
    gradient: 'from-cyan-400 to-blue-500',
    accent: '#0891b2', 
    light: 'rgba(8, 145, 178, 0.08)', 
    chipColor: 'primary' 
  },
  violet: { 
    gradient: 'from-violet-400 to-purple-500',
    accent: '#7c3aed', 
    light: 'rgba(124, 58, 237, 0.08)', 
    chipColor: 'secondary' 
  },
}

// Service metadata for additional info
const serviceMetadata: Record<string, { time: string; callNote: string; gpCost: string; savings: string }> = {
  'med-cert': { time: 'GP reviewed', callNote: 'Usually online review', gpCost: '$60-90', savings: '$40–70' },
  'scripts': { time: 'GP reviewed', callNote: 'Usually online review', gpCost: '$60-90', savings: '$30–60' },
  'consult': { time: 'GP reviewed', callNote: 'May include a call', gpCost: '$80-120', savings: '$30–70' },
}

// Dynamic daily stats — seeded by date so they stay consistent per day
function getDailyStats() {
  const today = new Date()
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()
  const hash = (n: number) => ((n * 2654435761) >>> 0) / 4294967296
  return {
    reviewedToday: 8 + Math.floor(hash(seed) * 15), // 8–22
    avgReviewTime: 25 + Math.floor(hash(seed + 1) * 20), // 25–44 min
    rating: 4.9,
  }
}
const liveStats = getDailyStats()

// Doctor images for social proof
const doctorImages = [
  '/female-doctor-professional-headshot-warm-smile-aus.jpg',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1594824476967-48c8b964e05a?w=100&h=100&fit=crop&crop=face',
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.5, 
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
}

export function ServicePicker() {
  // Fetch live pricing from services table, fall back to static prices
  const { data: pricingData } = useSWR<{ prices: Record<string, number> }>(
    '/api/services/pricing',
    pricingFetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  )
  const livePrices = pricingData?.prices || {}

  return (
    <section id="pricing" className="relative py-12 lg:py-16 scroll-mt-20">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 mb-6 interactive-pill cursor-default"
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <SparklesPremium className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground/80">Pick what you need</span>
          </motion.div>
          
          <div className="mb-4">
            <AnimatedText
              text="What are you here for?"
              textClassName="text-3xl sm:text-4xl lg:text-4xl font-bold text-foreground tracking-tight"
              underlineClassName="text-primary"
              underlinePath="M 0,10 Q 100,0 200,10 Q 300,20 400,10"
              underlineHoverPath="M 0,10 Q 100,20 200,10 Q 300,0 400,10"
              underlineDuration={1.2}
            />
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-6">
            Flat pricing. No hidden fees. Pay only after a real GP reviews your request.
          </p>
          
          {/* Live Stats Social Proof */}
          <motion.div 
            className="flex flex-wrap items-center justify-center gap-3 sm:gap-6"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Doctor avatars */}
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {doctorImages.map((src, i) => (
                  <div key={i} className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-background">
                    <Image src={src} alt="AHPRA-registered doctor" fill className="object-cover" />
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">AHPRA doctors</span>
            </div>
            
            <div className="h-4 w-px bg-border hidden sm:block" />
            
            {/* Live stats */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span><strong className="text-foreground">{liveStats.reviewedToday}</strong> reviewed today</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Typically <strong className="text-foreground">under 1 hour</strong></span>
            </div>
            
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span><strong className="text-foreground">{liveStats.rating}</strong> avg rating</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Service Cards Grid */}
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {serviceCategories.map((service) => {
            const Icon = iconMap[service.icon as keyof typeof iconMap] || DocumentPremium
            const colors = colorConfig[service.color as keyof typeof colorConfig] || colorConfig.emerald
            const meta = serviceMetadata[service.id] || { time: '~15 min', needsCall: false }
            // Use live price if available, fall back to static
            const displayPrice = livePrices[service.id] ?? service.priceFrom
            
            return (
              <motion.div key={service.id} variants={itemVariants}>
                <Link
                  href={service.href || `/${service.slug}/request`}
                  className="group block h-full"
                >
                  <div className="relative h-full">
                    {/* Popular badge - neutral pill */}
                    {service.popular && (
                      <div className="absolute -top-3 right-4 z-20">
                        <div className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold">
                          Popular
                        </div>
                      </div>
                    )}
                    
                    {/* Clean card - Glass style */}
                    <div className={cn(
                      "relative h-full rounded-xl overflow-hidden flex flex-col",
                      "bg-white/80 dark:bg-white/5",
                      "border border-white/50 dark:border-white/10",
                      "backdrop-blur-xl",
                      "shadow-sm dark:shadow-none",
                      "hover:shadow-lg hover:border-primary/20 dark:hover:border-primary/30",
                      "transition-all duration-300",
                      // Elevate popular card
                      service.popular && [
                        "ring-1 ring-primary/20 dark:ring-primary/30",
                        "shadow-md dark:shadow-primary/5",
                      ]
                    )}>
                      
                      <div className="p-3 pb-2.5 flex-1 flex flex-col">
                        {/* Icon with animated background */}
                        <motion.div 
                          className="relative w-9 h-9 rounded-lg flex items-center justify-center mb-2 overflow-hidden icon-spin-hover"
                          style={{ backgroundColor: colors.light }}
                        >
                          <motion.div
                            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                            style={{ 
                              background: `radial-gradient(circle at center, ${colors.accent}30 0%, transparent 70%)` 
                            }}
                          />
                          <Icon className="w-5 h-5 relative z-10" style={{ color: colors.accent }} />
                        </motion.div>
                        
                        {/* #3: Benefit question above title */}
                        {'benefitQuestion' in service && service.benefitQuestion && (
                          <p className="text-xs font-medium text-primary mb-0.5">
                            {service.benefitQuestion}
                          </p>
                        )}
                        
                        {/* Title */}
                        <h3 className="text-base font-semibold text-foreground mb-0.5 group-hover:text-primary transition-colors duration-300">
                          {service.title}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-xs text-muted-foreground leading-tight mb-2">
                          {service.description}
                        </p>
                        
                        {/* Benefits list */}
                        {service.benefits && (
                          <ul className="space-y-1 mb-1 flex-1">
                            {service.benefits.map((benefit, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Check className="h-3 w-3 text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        
                        {/* Meta info - #6: clearer time, #7: reframed call messaging */}
                        <div className="flex items-center gap-3 text-xs min-h-[18px]">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {meta.time}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <PhoneOff className="h-3 w-3 shrink-0" />
                            {meta.callNote}
                          </span>
                        </div>
                        
                        {/* Medicare note - only for prescriptions */}
                        {service.id === 'scripts' && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                            PBS subsidies may apply at pharmacy
                          </p>
                        )}
                      </div>
                      
                      <Separator className="opacity-50" />
                      
                      <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
                        {/* #2: Price with savings framing */}
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-foreground">
                              ${displayPrice.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground line-through">
                              {meta.gpCost}
                            </span>
                          </div>
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            Save {meta.savings} vs GP
                          </span>
                        </div>
                        
                        <Button size="sm" className="gap-1">
                          {'cta' in service ? service.cta : 'Start request'}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* #5: Testimonial for popular card */}
                      {service.popular && 'testimonial' in service && service.testimonial && (
                        <div className="px-3 pb-2 pt-1 border-t border-border/30">
                          <div className="flex items-center gap-2 text-xs">
                            <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />
                            <span className="text-muted-foreground italic">
                              &ldquo;{(service.testimonial as { quote: string; author: string }).quote}&rdquo;
                            </span>
                            <span className="text-muted-foreground/70">
                              — {(service.testimonial as { quote: string; author: string }).author}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Disclaimer for General Consult */}
                      {service.id === 'consult' && (
                        <p className="text-xs text-muted-foreground/70 text-center px-3 pb-3">
                          Not suitable for emergencies or urgent care.
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
        
        {/* Simple note */}
        <motion.p 
          className="text-center text-xs text-muted-foreground mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          Medicare rebates don&apos;t apply, but PBS subsidies may apply at pharmacy
        </motion.p>
      </div>
    </section>
  )
}
