'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Navbar } from '@/components/shared/navbar'
import { MarketingFooter } from './footer'
import { EmergencyDisclaimer } from '@/components/shared/emergency-disclaimer'
import { LiveWaitTime } from './live-wait-time'
import { StatsStrip } from './total-patients-counter'
import { MediaMentions } from './media-mentions'
import { TrustBadgeSlider } from './trust-badge-slider'
import { PricingSection as StandalonePricingSection } from '@/components/marketing/sections/pricing-section'
import { TestimonialsSection } from '@/components/marketing/sections/testimonials-section'
import { getTestimonialsByService, getTestimonialsForColumns } from '@/lib/data/testimonials'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { MarketingPageShell } from '@/components/shared/marketing-page-shell'
import { ImageTextSplit } from '@/components/sections'
import { CONTACT_EMAIL } from '@/lib/constants'

// Extracted sub-components
import { HeroSection } from '@/components/marketing/funnel/hero-section'
import { WhoItsForSection } from '@/components/marketing/funnel/who-its-for-section'
import { SpecializedServicesSection } from '@/components/marketing/funnel/specialized-services-section'
import { HowItWorksSection } from '@/components/marketing/funnel/how-it-works-section'
import { AfterSubmitSection } from '@/components/marketing/funnel/after-submit-section'
import { TrustSection } from '@/components/marketing/funnel/trust-section'
import { FaqSection } from '@/components/marketing/funnel/faq-section'
import { FinalCtaSection } from '@/components/marketing/funnel/final-cta-section'
import { colorClasses, iconMap } from '@/components/marketing/funnel/funnel-types'
import type { ServiceFunnelConfig } from '@/components/marketing/funnel/funnel-types'

// Re-export types for consumers
export type { ServiceFunnelConfig } from '@/components/marketing/funnel/funnel-types'

// ===========================================
// MAIN COMPONENT
// ===========================================

interface ServiceFunnelPageProps {
  config: ServiceFunnelConfig
  isDisabled?: boolean
  children?: React.ReactNode
}

export function ServiceFunnelPage({ config, isDisabled, children }: ServiceFunnelPageProps) {
  const colors = colorClasses[config.accentColor]

  // Get testimonials for scrolling columns (filtered by service)
  const serviceFilter = config.serviceId === 'med-cert' ? 'medical-certificate' as const : config.serviceId === 'repeat-script' ? 'prescription' as const : 'consultation' as const
  const serviceTestimonials = getTestimonialsByService(serviceFilter)
  const columnsData = serviceTestimonials.slice(0, 9).map(t => ({
    text: t.text,
    image: t.image || `https://api.dicebear.com/7.x/notionists/svg?seed=${t.name.replace(/\s/g, '')}`,
    name: `${t.name}${t.age ? `, ${t.age}` : ''}`,
    role: `${t.location}${t.role ? ` · ${t.role}` : ''}`,
  }))
  // Fallback to generic testimonials if service-specific ones are thin
  const testimonialsForColumns = columnsData.length >= 6 ? columnsData : getTestimonialsForColumns().slice(0, 9)

  return (
    <MarketingPageShell>
    <div className="min-h-screen overflow-x-hidden">

      {/* Temporarily unavailable banner */}
      {isDisabled && (
        <div className="sticky top-0 z-40 mx-4 mt-2 mb-0 rounded-2xl border border-warning-border bg-warning-light px-4 py-3 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning">
              This service is temporarily unavailable.
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-200">
              We&apos;ll be back soon.{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:no-underline">
                Contact us
              </a>{" "}
              if you have questions.
            </p>
          </div>
        </div>
      )}

      {/* Returning patient recognition */}
      <ReturningPatientBanner className="mx-4 mt-2" />

      <Navbar variant="marketing" />

      {/* Section 1: Hero */}
      <HeroSection config={config} colors={colors} isDisabled={isDisabled} />

      {/* Live wait time strip - right below hero like homepage */}
      <LiveWaitTime variant="strip" services={[config.serviceId === 'repeat-script' ? 'scripts' : config.serviceId === 'consult' ? 'consult' : 'med-cert']} />

      {/* Trust badge slider */}
      <TrustBadgeSlider />

      {/* Section 2: Who It's For */}
      <WhoItsForSection config={config} colors={colors} />

      {/* Specialized Services (optional - e.g. consult sub-types) */}
      {config.specializedServices && (
        <SpecializedServicesSection config={config} colors={colors} />
      )}

      {/* Section 3: How It Works */}
      <HowItWorksSection config={config} colors={colors} />

      {/* Section 4: What Happens After */}
      <AfterSubmitSection config={config} colors={colors} />

      {/* Optional: Image + Text Section */}
      {config.imageSection && (
        <ImageTextSplit
          title={config.imageSection.title}
          highlightWords={config.imageSection.highlightWords}
          description={config.imageSection.description}
          imageSrc={config.imageSection.imageSrc}
          imageAlt={config.imageSection.imageAlt}
          imagePosition={config.imageSection.imagePosition}
        >
          {config.imageSection.badges && (
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {config.imageSection.badges.map((badge) => {
                const BadgeIcon = iconMap[badge.icon] || CheckCircle2
                return (
                  <span key={badge.text} className="flex items-center gap-1.5">
                    <BadgeIcon className={cn('w-4 h-4', badge.color === 'success' ? 'text-success' : 'text-primary')} />
                    {badge.text}
                  </span>
                )
              })}
            </div>
          )}
        </ImageTextSplit>
      )}

      {/* Section 5: Pricing */}
      <StandalonePricingSection
        title={config.pricing.title}
        subtitle={config.pricing.subtitle}
        price={config.pricing.price}
        originalPrice={config.pricing.originalPrice}
        features={config.pricing.features}
        refundNote={config.pricing.refundNote}
        medicareNote={config.pricing.medicareNote}
        ctaText={isDisabled ? "Contact us" : config.hero.ctaText}
        ctaHref={isDisabled ? `/contact` : config.hero.ctaHref}
        colors={colors}
        showComparisonTable={config.serviceId === 'med-cert'}
      />

      {/* Section 6: Trust & Compliance */}
      <TrustSection config={config} colors={colors} />

      {/* Emergency Disclaimer */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <EmergencyDisclaimer />
        </div>
      </section>

      {/* Section 7: Social Proof - scrolling columns like homepage */}
      <TestimonialsSection
        testimonials={testimonialsForColumns}
        title={config.testimonials.title}
        subtitle={config.testimonials.subtitle}
      />

      {/* Stats + Media Mentions */}
      <StatsStrip className="bg-muted/20 dark:bg-muted/10 border-y border-border/30" />
      <MediaMentions variant="strip" className="bg-muted/10 dark:bg-muted/5" />

      {/* Optional deep content (guide sections, E-E-A-T) */}
      {children}

      {/* Section 8: FAQ */}
      {config.faq && (
        <FaqSection config={config} />
      )}

      {/* Final CTA */}
      <FinalCtaSection config={config} colors={colors} isDisabled={isDisabled} />

      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}
