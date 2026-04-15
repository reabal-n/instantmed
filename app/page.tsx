import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

import {
  Hero,
  HowItWorks,
  MarketingFooter,
} from '@/components/marketing'
import { ComplianceMarquee } from '@/components/marketing/compliance-marquee'
import { MarketingPageShell } from '@/components/marketing/marketing-page-shell'
import { RegulatoryPartners } from '@/components/marketing/media-mentions'
// After-hours banner removed - redundant with DoctorAvailabilityPill in hero
import { ServiceCards } from '@/components/marketing/service-cards'

// Heavy below-fold section: framer-motion animations + testimonial columns.
// Dynamic import splits it into its own chunk so the main bundle stays lean.
// SSR enabled (default) keeps content in HTML for crawlers and CLS prevention.
const SocialProofSection = dynamic(
  () => import('@/components/marketing/social-proof-section').then(m => ({ default: m.SocialProofSection })),
)
import { CTABanner } from '@/components/sections'
import { FAQSection } from '@/components/sections'
import { FAQSchema, MedicalBusinessSchema, SpeakableSchema } from '@/components/seo/healthcare-schema'
import { HashScrollHandler } from '@/components/shared/hash-scroll-handler'
import { Navbar } from '@/components/shared/navbar'
import { ReturningPatientBanner } from '@/components/shared/returning-patient-banner'
import { PRICING_DISPLAY } from '@/lib/constants'
import { getFeatureFlags } from '@/lib/feature-flags'
import { faqItems } from '@/lib/marketing/homepage'
import { cn } from '@/lib/utils'

export const revalidate = 3600

// SEO metadata for homepage - critical for Google ranking
// Note: Avoid prescription drug terms (script, prescription) per Google Ads policy for Australia
export const metadata: Metadata = {
  title: { absolute: 'Online Doctor Australia | Consults, Repeat Rx, Med Certs, ED & Hair Loss | InstantMed' },
  description: `Doctor consultations from ${PRICING_DISPLAY.CONSULT}. Repeat medication from ${PRICING_DISPLAY.REPEAT_SCRIPT}. Medical certificates from ${PRICING_DISPLAY.MED_CERT} in under 30 minutes. AHPRA-registered Australian GPs, 100% online.`,
  keywords: [
    'online doctor australia',
    'telehealth australia',
    'medical certificate online',
    'online doctor',
    'sick certificate',
    'repeat medication online',
    'telehealth doctor',
    'virtual doctor australia',
    'ed treatment online',
    'hair loss treatment online',
  ],
  openGraph: {
    title: 'Online Doctor Australia | Consults, Repeat Rx, Med Certs, ED & Hair Loss | InstantMed',
    description: 'Online doctor consultations, repeat medication & medical certificates from AHPRA-registered Australian GPs. No video calls, 100% online.',
    type: 'website',
    locale: 'en_AU',
    url: 'https://instantmed.com.au',
    siteName: 'InstantMed',
    // OG image handled by app/opengraph-image.tsx convention file
  },
  twitter: {
    card: 'summary_large_image',
    title: 'InstantMed - Online Doctor Australia',
    description: 'Online doctor consultations, repeat medication & medical certificates from AHPRA-registered Australian GPs. No video calls, 100% online.',
    // Twitter image handled by app/opengraph-image.tsx convention file
  },
  alternates: {
    canonical: 'https://instantmed.com.au',
  },
}

// Loading skeleton for below-the-fold sections
function SectionSkeleton({ height = 'h-96' }: { height?: string }) {
  return <div className={cn(height, "animate-pulse bg-muted/20 rounded-xl")} />
}

// Streamed async component - fetches flags independently so the main page
// shell renders immediately without waiting for the DB call.
async function MaintenanceBanner() {
  const flags = await getFeatureFlags()
  if (!flags.maintenance_mode) return null
  return (
    <div className="mx-4 mt-2 rounded-2xl border border-warning-border bg-warning-light/50 px-4 py-3 flex items-center gap-3">
      <svg className="w-5 h-5 text-warning shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63" />
      </svg>
      <div>
        <p className="text-sm font-medium text-amber-900">We&apos;re currently performing maintenance.</p>
        <p className="text-xs text-warning">{(flags as { maintenance_message?: string }).maintenance_message || "New requests will be accepted soon."}</p>
      </div>
    </div>
  )
}

export default async function HomePage() {
  // Transform FAQ items for schema
  const faqSchemaData = faqItems.map(item => ({
    question: item.question,
    answer: item.answer
  }))

  return (
    <MarketingPageShell>
    <div className="min-h-screen overflow-x-hidden">
      {/* SEO Structured Data */}
      <MedicalBusinessSchema />
      <FAQSchema faqs={faqSchemaData} />
      <SpeakableSchema
        name="InstantMed - Online Doctor Australia"
        description={`Get medical certificates in under 30 minutes, 24/7. Repeat medication and discreet treatment for ED and hair loss from AHPRA-registered Australian doctors. ${PRICING_DISPLAY.FROM_MED_CERT}.`}
        url="/"
      />

      {/* Client component for hash navigation */}
      <HashScrollHandler />

      {/* Returning patient recognition */}
      <ReturningPatientBanner className="mx-4 mt-2" />

      <Navbar variant="marketing" />

      {/* Maintenance banner - streamed independently, doesn't block hero */}
      <Suspense fallback={null}>
        <MaintenanceBanner />
      </Suspense>

      <main className="relative">
        {/* 1. Hero with main value prop */}
        <Hero>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed sm:leading-normal lg:leading-relaxed text-balance">
            Real Australian doctors review every request - medical certificates from {PRICING_DISPLAY.MED_CERT}, repeat scripts, and discreet treatment for ED and hair loss. No appointments, no waiting rooms.
          </p>
        </Hero>

        {/* 2. Service cards - what we offer */}
        <ServiceCards />

        {/* 2.5 Regulatory authority logos */}
        <RegulatoryPartners />

        {/* 3. How it works - muted bg for rhythm */}
        <div className="bg-muted/30 dark:bg-white/[0.02]">
          <Suspense fallback={<SectionSkeleton />}>
            <HowItWorks />
          </Suspense>
        </div>

        {/* 4. Social proof */}
        <SocialProofSection />

        {/* 5. FAQs */}
        <FAQSection
          pill="FAQ"
          title="Before you start"
          subtitle="The stuff people actually want to know."
          items={faqItems}
          viewAllHref="/faq"
        />

        {/* 6. Final CTA */}
        <CTABanner
          title="Ready when you are"
          subtitle="Tell us what's going on, a doctor reviews it, and you're sorted. No appointments, no waiting rooms."
          ctaText="Get started"
          ctaHref="/request"
        />
      </main>

      {/* Compliance strip */}
      <ComplianceMarquee />

      {/* 7. Footer */}
      <MarketingFooter />
    </div>
    </MarketingPageShell>
  )
}
